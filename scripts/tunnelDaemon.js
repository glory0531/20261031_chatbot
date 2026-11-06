import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient } from 'socket.io-client';
import localtunnel from 'localtunnel';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const MAIN_PORT = Number(process.env.MAIN_PORT) || 24700;
const DAEMON_PORT = Number(process.env.DAEMON_PORT) || 24710;
const TUNNEL_STATE_FILE = path.join(ROOT_DIR, 'data', 'tunnel.json');
const STORAGE_FILE = path.join(ROOT_DIR, 'data', 'storage.json');
const CLIENT_DIST = path.join(ROOT_DIR, 'client', 'dist');

const CLOUDFLARED_BIN = path.join(
  ROOT_DIR,
  'node_modules/cloudflared/bin/' + (process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared')
);

// 환경 변수 또는 저장된 설정에서 옵션 읽기
let provider = process.env.TUNNEL_PROVIDER || 'cloudflare'; // 'cloudflare' | 'localtunnel'
let mode = process.env.TUNNEL_MODE || 'quick'; // 'quick' | 'token' | 'subdomain'
let token = process.env.TUNNEL_TOKEN || '';
let subdomain = process.env.TUNNEL_SUBDOMAIN || '';
let customDomain = process.env.TUNNEL_CUSTOM_DOMAIN || '';

let activeTunnelProcess = null;
let activeLtTunnel = null;
let publicUrl = null;
let tunnelStatus = 'starting'; // 'starting' | 'running' | 'stopped' | 'error'
let lastError = null;
let mainSocketClient = null;
let isMainServerOnline = false;

// 1. 상태 파일 저장 함수
function saveTunnelState() {
  try {
    const dataDir = path.dirname(TUNNEL_STATE_FILE);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    const state = {
      status: tunnelStatus,
      isRunning: tunnelStatus === 'running',
      publicUrl,
      viewerUrl: publicUrl ? `${publicUrl}/view` : null,
      provider,
      mode,
      subdomain,
      token,
      customDomain,
      daemonPid: process.pid,
      daemonPort: DAEMON_PORT,
      mainPort: MAIN_PORT,
      isBackground: true,
      isMainServerOnline,
      startedAt: Date.now(),
      error: lastError
    };
    fs.writeFileSync(TUNNEL_STATE_FILE, JSON.stringify(state, null, 2) + '\n', 'utf-8');
  } catch (err) {
    console.error('[TunnelDaemon] 상태 저장 실패:', err.message);
  }
}

// 2. 메인 서버 스냅샷 로드 함수 (샤봇 꺼져있을 때 사용)
function readCachedSnapshot() {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
      const db = JSON.parse(raw);
      const streamerName = db.settings?.streamerName || db.status?.channelName || '스트리머';

      return {
        status: {
          ...(db.status || {}),
          channelName: streamerName,
          isLive: false,
          isShaBotOffline: true
        },
        settings: {
          botName: db.settings?.botName || '샤봇',
          streamerName,
          fandomName: db.settings?.fandomName || '팬덤',
          pointName: db.settings?.pointName || 'P',
          chipName: db.settings?.chipName || '칩',
          prefix: db.settings?.prefix || '!',
          chzzkChannelId: db.settings?.chzzkChannelId || '',
          themePreset: db.settings?.themePreset || 'chzzk-emerald'
        },
        commands: db.commands || [],
        defaultCommands: db.defaultCommands || {},
        schedules: db.schedules || [],
        weeklySchedules: db.weeklySchedules || {},
        activeWeekKey: db.activeWeekKey || '',
        songRequests: db.songRequests || { queue: [], settings: { enabled: true } },
        generalRequests: db.generalRequests || [],
        fund: db.fund || { enabled: false },
        prediction: db.prediction || { status: 'closed' },
        roulette: db.roulette || { items: [] },
        tunnel: {
          status: tunnelStatus,
          isRunning: tunnelStatus === 'running',
          publicUrl,
          viewerUrl: publicUrl ? `${publicUrl}/view` : null
        }
      };
    }
  } catch (e) {
    console.warn('[TunnelDaemon] 스냅샷 로드 경고:', e.message);
  }

  return {
    status: { channelName: '스트리머', isLive: false, isShaBotOffline: true },
    settings: { botName: '샤봇', streamerName: '스트리머', prefix: '!', pointName: 'P', chipName: '칩' },
    commands: [],
    defaultCommands: {},
    schedules: [],
    weeklySchedules: {},
    activeWeekKey: '',
    songRequests: { queue: [], settings: { enabled: true } },
    generalRequests: [],
    tunnel: {
      status: tunnelStatus,
      isRunning: tunnelStatus === 'running',
      publicUrl,
      viewerUrl: publicUrl ? `${publicUrl}/view` : null
    }
  };
}

// 3. 메인 서버 상태 확인
async function checkMainServer() {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${MAIN_PORT}/api/settings`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(600, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// 4. Express 서버 및 Socket.IO 구성
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: '*' }
});

// 내부 데몬 제어 엔드포인트
app.get('/__tunnel/state', (req, res) => {
  res.json({
    status: tunnelStatus,
    isRunning: tunnelStatus === 'running',
    publicUrl,
    viewerUrl: publicUrl ? `${publicUrl}/view` : null,
    provider,
    mode,
    subdomain,
    isMainServerOnline,
    error: lastError
  });
});

app.post('/__tunnel/stop', (req, res) => {
  res.json({ success: true, message: '터널 데몬을 종료합니다.' });
  setTimeout(() => shutdown(), 300);
});

// API 프록시 또는 오프라인 스냅샷 핸들러
app.use('/api', async (req, res, next) => {
  const isUp = await checkMainServer();
  isMainServerOnline = isUp;

  if (isUp) {
    // 메인 서버가 켜져 있으면 실시간으로 프록시 전달
    try {
      const targetUrl = `http://localhost:${MAIN_PORT}${req.originalUrl}`;
      const headers = { ...req.headers };
      delete headers.host;

      const proxyReq = http.request(
        targetUrl,
        {
          method: req.method,
          headers
        },
        (proxyRes) => {
          res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
          proxyRes.pipe(res);
        }
      );

      proxyReq.on('error', (err) => {
        console.warn('[Proxy Error]:', err.message);
        serveOfflineApi(req, res);
      });

      if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
        proxyReq.write(JSON.stringify(req.body));
      }
      proxyReq.end();
      return;
    } catch {
      serveOfflineApi(req, res);
      return;
    }
  }

  // 메인 서버가 꺼져 있으면 로컬 스냅샷 서빙
  serveOfflineApi(req, res);
});

function serveOfflineApi(req, res) {
  const snapshot = readCachedSnapshot();
  const pathPart = req.path.toLowerCase();

  if (pathPart.includes('/sync') || pathPart === '/status') {
    return res.json({ success: true, data: snapshot.status });
  }
  if (pathPart === '/settings') {
    return res.json({ success: true, data: snapshot.settings });
  }
  if (pathPart.startsWith('/schedules') || pathPart.startsWith('/schedule')) {
    if (pathPart.includes('weekly')) {
      return res.json({ success: true, data: snapshot.weeklySchedules, activeWeekKey: snapshot.activeWeekKey });
    }
    return res.json({ success: true, data: snapshot.schedules });
  }
  if (pathPart.startsWith('/commands')) {
    if (pathPart.includes('default')) {
      return res.json({ success: true, data: snapshot.defaultCommands });
    }
    return res.json({ success: true, data: snapshot.commands });
  }
  if (pathPart.startsWith('/sr') || pathPart.startsWith('/song')) {
    return res.json({ success: true, data: snapshot.songRequests });
  }
  if (pathPart.startsWith('/requests')) {
    return res.json({ success: true, data: snapshot.generalRequests });
  }

  res.json({ success: true, data: null, offline: true });
}

// 정적 파일 서빙 (대시보드 / 시청자 페이지 번들)
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get('*', (req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
} else {
  app.get('*', (req, res) => {
    res.send('<h1>ShaBot Viewer Daemon is running. (client/dist not built yet)</h1>');
  });
}

// Socket.IO 연결 처리
io.on('connection', async (socket) => {
  const isUp = await checkMainServer();
  isMainServerOnline = isUp;

  if (isUp) {
    try {
      const res = await fetch(`http://localhost:${MAIN_PORT}/api/settings`);
      if (res.ok) {
        // 메인 서버 소켓과 연결된 상태라면 메인 서버에서 전달받은 초기상태 사용
      }
    } catch {}
  }

  // 메인 서버가 꺼져있거나 초기 연결 시 스냅샷 상태 즉시 전송
  const snapshot = readCachedSnapshot();
  socket.emit('initial_state', snapshot);
});

// 메인 서버(24700)와의 실시간 소켓 동기화 브릿지
function connectMainServerBridge() {
  if (mainSocketClient) {
    try { mainSocketClient.disconnect(); } catch {}
  }

  mainSocketClient = ioClient(`http://localhost:${MAIN_PORT}`, {
    reconnection: true,
    reconnectionDelay: 2000,
    timeout: 3000
  });

  mainSocketClient.on('connect', () => {
    console.log('[Bridge] ⚡ 메인 샤봇 서버(24700)와 실시간 브릿지 연결 성공!');
    isMainServerOnline = true;
    saveTunnelState();
  });

  mainSocketClient.on('disconnect', () => {
    console.log('[Bridge] 🌙 메인 샤봇 서버 연결 종료 (시청자 페이지는 오프라인 캐시 모드로 안전 유지)');
    isMainServerOnline = false;
    saveTunnelState();
    // 시청자들에게 오프라인 상태 브로드캐스트
    io.emit('status_update', {
      ...readCachedSnapshot().status,
      isLive: false,
      isShaBotOffline: true
    });
  });

  // 메인 서버의 실시간 이벤트를 외부 시청자들에게 그대로 릴레이
  const relayEvents = [
    'initial_state', 'status_update', 'settings_update', 'commands_update',
    'default_commands_update', 'automessages_update', 'points_update',
    'sr_update', 'requests_update', 'fund_update', 'prediction_update',
    'roulette_update', 'schedules_update', 'weekly_schedules_update',
    'active_week_update', 'chat_message'
  ];

  relayEvents.forEach((evt) => {
    mainSocketClient.on(evt, (data) => {
      io.emit(evt, data);
    });
  });
}

// 5. 실제 터널 기동 함수
async function startTunnelProcess() {
  tunnelStatus = 'starting';
  saveTunnelState();

  try {
    // A) localtunnel 서브도메인 모드
    if (provider === 'localtunnel' || mode === 'subdomain') {
      console.log(`[Tunnel] 🚀 Localtunnel 시작 (서브도메인: ${subdomain || '랜덤'})...`);
      activeLtTunnel = await localtunnel({
        port: DAEMON_PORT,
        subdomain: subdomain || undefined
      });

      publicUrl = activeLtTunnel.url;
      tunnelStatus = 'running';
      console.log(`[Tunnel] 🌐 공개 주소 생성 성공: ${publicUrl}`);
      saveTunnelState();

      activeLtTunnel.on('close', () => {
        console.log('[Tunnel] Localtunnel 세션 종료');
        tunnelStatus = 'stopped';
        saveTunnelState();
      });

      activeLtTunnel.on('error', (err) => {
        console.error('[Tunnel] Localtunnel 오류:', err.message);
        tunnelStatus = 'error';
        lastError = err.message;
        saveTunnelState();
      });

      return;
    }

    // B) Cloudflare Named Tunnel (토큰 사용)
    if (mode === 'token' && token) {
      console.log(`[Tunnel] 🛡️ Cloudflare 고정 터널 시작 (토큰 연동)...`);
      activeTunnelProcess = spawn(CLOUDFLARED_BIN, [
        'tunnel',
        'run',
        '--token', token
      ]);

      publicUrl = customDomain || 'https://cloudflare-named-tunnel-active';
      tunnelStatus = 'running';
      saveTunnelState();

      activeTunnelProcess.on('exit', (code) => {
        console.log(`[Tunnel] Cloudflare 프로세스 종료 (코드: ${code})`);
        tunnelStatus = 'stopped';
        saveTunnelState();
      });

      return;
    }

    // C) Cloudflare Quick Tunnel (기본 모드 - 백그라운드 유지)
    console.log(`[Tunnel] 🌐 Cloudflare Quick Tunnel 시작 (포트: ${DAEMON_PORT})...`);
    activeTunnelProcess = spawn(CLOUDFLARED_BIN, [
      'tunnel',
      '--url', `http://localhost:${DAEMON_PORT}`,
      '--no-autoupdate'
    ]);

    const onData = (data) => {
      const str = data.toString();
      const match = str.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
      if (match && !publicUrl) {
        publicUrl = match[0];
        tunnelStatus = 'running';
        console.log(`[Tunnel] 🌐 Cloudflare 공개 주소 생성 완료: ${publicUrl}`);
        saveTunnelState();
      }
    };

    activeTunnelProcess.stdout.on('data', onData);
    activeTunnelProcess.stderr.on('data', onData);

    activeTunnelProcess.on('error', (err) => {
      console.error('[Tunnel] Cloudflare 오류:', err.message);
      tunnelStatus = 'error';
      lastError = err.message;
      saveTunnelState();
    });

    activeTunnelProcess.on('exit', (code) => {
      console.log(`[Tunnel] Cloudflare 종료 (코드: ${code})`);
      tunnelStatus = 'stopped';
      saveTunnelState();
    });

  } catch (err) {
    console.error('[Tunnel] 터널 시작 중 예외 발생:', err);
    tunnelStatus = 'error';
    lastError = err.message;
    saveTunnelState();
  }
}

// 6. 정상 종료 핸들러
function shutdown() {
  console.log('[TunnelDaemon] 🛑 터널 데몬을 정상 종료합니다...');
  tunnelStatus = 'stopped';
  saveTunnelState();

  if (activeLtTunnel) {
    try { activeLtTunnel.close(); } catch {}
    activeLtTunnel = null;
  }
  if (activeTunnelProcess) {
    try { activeTunnelProcess.kill('SIGTERM'); } catch {}
    try { activeTunnelProcess.kill('SIGKILL'); } catch {}
    activeTunnelProcess = null;
  }
  if (mainSocketClient) {
    try { mainSocketClient.disconnect(); } catch {}
  }

  try {
    if (fs.existsSync(TUNNEL_STATE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(TUNNEL_STATE_FILE, 'utf-8'));
      parsed.status = 'stopped';
      parsed.isRunning = false;
      fs.writeFileSync(TUNNEL_STATE_FILE, JSON.stringify(parsed, null, 2) + '\n', 'utf-8');
    }
  } catch {}

  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 1000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// 7. 메인 실행
server.listen(DAEMON_PORT, () => {
  console.log(`==============================================================`);
  console.log(` 🌐 [ShaBot Tunnel Daemon] 백그라운드 뷰어 서버 가동 (포트: ${DAEMON_PORT})`);
  console.log(` 💡 샤봇 콘솔 창을 닫아도 시청자 공개링크는 안전하게 계속 유지됩니다.`);
  console.log(`==============================================================`);

  connectMainServerBridge();
  startTunnelProcess().catch(console.error);
});

