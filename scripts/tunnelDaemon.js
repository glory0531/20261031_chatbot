import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient } from 'socket.io-client';
import localtunnel from 'localtunnel';
import { install as installCloudflared } from 'cloudflared';

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

// 초기 설정값 로드 (tunnel.json 우선, 환경 변수 폴백)
function loadInitialConfig() {
  let saved = {};
  try {
    if (fs.existsSync(TUNNEL_STATE_FILE)) {
      saved = JSON.parse(fs.readFileSync(TUNNEL_STATE_FILE, 'utf-8')) || {};
    }
  } catch {}

  return {
    provider: process.env.TUNNEL_PROVIDER || saved.provider || 'cloudflare',
    mode: process.env.TUNNEL_MODE || saved.mode || 'quick',
    token: process.env.TUNNEL_TOKEN !== undefined ? process.env.TUNNEL_TOKEN : (saved.token || ''),
    subdomain: process.env.TUNNEL_SUBDOMAIN !== undefined ? process.env.TUNNEL_SUBDOMAIN : (saved.subdomain || ''),
    customDomain: process.env.TUNNEL_CUSTOM_DOMAIN !== undefined ? process.env.TUNNEL_CUSTOM_DOMAIN : (saved.customDomain || ''),
    startedAt: saved.startedAt || Date.now()
  };
}

const initCfg = loadInitialConfig();
let provider = initCfg.provider;
let mode = initCfg.mode;
let token = initCfg.token;
let subdomain = initCfg.subdomain;
let customDomain = initCfg.customDomain;
const startedAt = initCfg.startedAt;

let activeTunnelProcess = null;
let activeLtTunnel = null;
let publicUrl = null;
let tunnelStatus = 'starting'; // 'starting' | 'running' | 'stopped' | 'error'
let lastError = null;
let mainSocketClient = null;
let isMainServerOnline = false;
let isShuttingDown = false;
let reconnectTimer = null;
let offlineLiveStatusOverride = null;

// 사용자가 명시적으로 중지했는지 확인
function isDesiredRunning() {
  if (isShuttingDown) return false;
  try {
    if (fs.existsSync(TUNNEL_STATE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(TUNNEL_STATE_FILE, 'utf-8'));
      if (parsed && parsed.desiredRunning === false) {
        return false;
      }
    }
  } catch {}
  return true;
}

// 1. 상태 파일 저장 함수
function saveTunnelState() {
  try {
    const dataDir = path.dirname(TUNNEL_STATE_FILE);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    let desiredRunning = !isShuttingDown;
    try {
      if (fs.existsSync(TUNNEL_STATE_FILE)) {
        const existing = JSON.parse(fs.readFileSync(TUNNEL_STATE_FILE, 'utf-8'));
        if (existing && existing.desiredRunning === false) {
          desiredRunning = false;
        }
      }
    } catch {}

    const state = {
      status: tunnelStatus,
      isRunning: tunnelStatus === 'running',
      desiredRunning,
      publicUrl,
      viewerUrl: publicUrl ? `${publicUrl}/view` : null,
      provider,
      mode,
      subdomain,
      token,
      customDomain,
      daemonPid: process.pid,
      tunnelPid: activeTunnelProcess?.pid || null,
      daemonPort: DAEMON_PORT,
      mainPort: MAIN_PORT,
      isBackground: true,
      isMainServerOnline,
      startedAt,
      error: lastError
    };
    fs.writeFileSync(TUNNEL_STATE_FILE, JSON.stringify(state, null, 2) + '\n', 'utf-8');
  } catch (err) {
    console.error('[TunnelDaemon] 상태 저장 실패:', err.message);
  }
}

// 민감 정보 제외한 설정 객체 정제
function sanitizeSettings(settings = {}) {
  const copy = { ...settings };
  delete copy.chzzkClientSecret;
  delete copy.chzzkAccessToken;
  delete copy.chzzkRefreshToken;
  return {
    prefix: '!',
    botName: '샤봇',
    streamerName: '스트리머',
    fandomName: '시청자',
    pointName: '칩',
    chipName: '칩',
    attendPoints: 100,
    attendStreakBonus: 20,
    themePreset: 'chzzk-emerald',
    ...copy,
    onboardingCompleted: true
  };
}

// 2. 메인 서버 스냅샷 로드 함수 (샤봇이 켜져있거나 꺼져있을 때 모두 최신 데이터 반환)
function readCachedSnapshot() {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
      const db = JSON.parse(raw);
      const streamerName = db.status?.channelName || db.settings?.streamerName || '스트리머';
      const baseStatus = {
        botEnabled: true,
        channelId: db.settings?.chzzkChannelId || '',
        channelName: streamerName,
        title: `${streamerName}의 방송 라운지`,
        category: 'talk',
        viewers: 0,
        ...(db.status || {}),
        ...(offlineLiveStatusOverride || {})
      };

      if (!isMainServerOnline) {
        baseStatus.isShaBotOffline = true;
        if (!offlineLiveStatusOverride) {
          baseStatus.isLive = false;
        }
      } else {
        baseStatus.isShaBotOffline = false;
      }

      return {
        status: baseStatus,
        settings: sanitizeSettings({
          ...(db.settings || {}),
          streamerName
        }),
        commands: db.commands || [],
        defaultCommands: db.defaultCommands || {},
        users: db.users || {},
        schedules: db.schedules || [],
        weeklySchedules: db.weeklySchedules || {},
        activeWeekKey: db.activeWeekKey || '',
        songRequests: db.songRequests || { current: null, queue: [], settings: { enabled: true, maxQueueSize: 20, maxPerUser: 2, minCost: 0, currency: 'chips', volume: 75 } },
        generalRequests: db.generalRequests || [],
        fund: db.fund || { enabled: false, title: '', goalPoints: 50000, currentPoints: 0, recentDonors: [] },
        prediction: db.prediction || { status: 'closed', title: '', options: [] },
        roulette: db.roulette || { items: [], cost: 500, history: [] },
        tunnel: {
          status: tunnelStatus,
          isRunning: tunnelStatus === 'running',
          publicUrl,
          viewerUrl: publicUrl ? `${publicUrl}/view` : null,
          provider,
          mode,
          subdomain
        }
      };
    }
  } catch (e) {
    console.warn('[TunnelDaemon] 스냅샷 로드 경고:', e.message);
  }

  return {
    status: { channelName: '스트리머', isLive: false, isShaBotOffline: !isMainServerOnline },
    settings: sanitizeSettings({}),
    commands: [],
    defaultCommands: {},
    users: {},
    schedules: [],
    weeklySchedules: {},
    activeWeekKey: '',
    songRequests: { current: null, queue: [], settings: { enabled: true, maxQueueSize: 20, maxPerUser: 2, minCost: 0, currency: 'chips', volume: 75 } },
    generalRequests: [],
    fund: { enabled: false, title: '', goalPoints: 50000, currentPoints: 0, recentDonors: [] },
    prediction: { status: 'closed', title: '', options: [] },
    roulette: { items: [], cost: 500, history: [] },
    tunnel: {
      status: tunnelStatus,
      isRunning: tunnelStatus === 'running',
      publicUrl,
      viewerUrl: publicUrl ? `${publicUrl}/view` : null,
      provider,
      mode,
      subdomain
    }
  };
}

// 오프라인 상태에서도 치지직 공개 API를 통해 실시간 방송 여부/방제/프로필 동기화
function fetchJsonHttps(url) {
  return new Promise((resolve) => {
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json'
        },
        timeout: 3500
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

async function syncChzzkStatusWhenOffline() {
  try {
    const snap = readCachedSnapshot();
    const channelId = snap.status?.channelId || snap.settings?.chzzkChannelId || '';
    if (!channelId || !/^[a-f0-9]{32}$/i.test(channelId)) {
      return snap.status;
    }

    const [channelRes, liveRes] = await Promise.all([
      fetchJsonHttps(`https://api.chzzk.naver.com/service/v1/channels/${channelId}`),
      fetchJsonHttps(`https://api.chzzk.naver.com/polling/v2/channels/${channelId}/live-status`)
    ]);

    const chContent = channelRes?.content;
    const liveContent = liveRes?.content;

    if (chContent || liveContent) {
      offlineLiveStatusOverride = {
        channelId,
        channelName: chContent?.channelName || snap.status?.channelName || '스트리머',
        channelImageUrl: chContent?.channelImageUrl || snap.status?.channelImageUrl || '',
        followerCount: chContent?.followerCount ?? snap.status?.followerCount ?? 0,
        isLive: liveContent ? liveContent.status === 'OPEN' : Boolean(chContent?.openLive),
        title: liveContent?.liveTitle || snap.status?.title || '',
        category: liveContent?.liveCategoryValue || liveContent?.liveCategory || snap.status?.category || 'talk',
        viewers: liveContent?.concurrentUserCount ?? 0
      };
    }
  } catch {}
  return readCachedSnapshot().status;
}

// 3. 메인 서버 상태 확인
async function checkMainServer() {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${MAIN_PORT}/api/version`, (res) => {
      res.resume();
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
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// 내부 데몬 제어 엔드포인트
app.get('/__tunnel/state', (req, res) => {
  res.json({
    status: tunnelStatus,
    isRunning: tunnelStatus === 'running',
    desiredRunning: isDesiredRunning(),
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
  isShuttingDown = true;
  res.json({ success: true, message: '터널 데몬을 종료합니다.' });
  setTimeout(() => shutdown(), 200);
});

// API 프록시 또는 오프라인 스냅샷 핸들러
app.use('/api', async (req, res) => {
  const isUp = await checkMainServer();
  isMainServerOnline = isUp;

  if (isUp) {
    try {
      const targetUrl = `http://127.0.0.1:${MAIN_PORT}${req.originalUrl}`;
      const headers = { ...req.headers };
      delete headers.host;

      const proxyReq = http.request(
        targetUrl,
        {
          method: req.method,
          headers,
          timeout: 5000
        },
        (proxyRes) => {
          res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
          proxyRes.pipe(res);
        }
      );

      proxyReq.on('error', () => {
        serveOfflineApi(req, res);
      });

      if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
        proxyReq.write(JSON.stringify(req.body));
      }
      proxyReq.end();
      return;
    } catch {
      return serveOfflineApi(req, res);
    }
  }

  return serveOfflineApi(req, res);
});

async function serveOfflineApi(req, res) {
  const pathPart = req.path.toLowerCase();

  if (pathPart.includes('/sync')) {
    const updatedStatus = await syncChzzkStatusWhenOffline();
    io.emit('status_update', updatedStatus);
    return res.json({ success: true, data: updatedStatus });
  }

  const snapshot = readCachedSnapshot();

  if (pathPart === '/status') {
    return res.json({ success: true, data: snapshot.status });
  }
  if (pathPart === '/settings') {
    return res.json({ success: true, data: snapshot.settings });
  }
  if (pathPart.startsWith('/schedules') || pathPart.startsWith('/schedule')) {
    return res.json({
      success: true,
      data: snapshot.schedules,
      weeklySchedules: snapshot.weeklySchedules,
      activeWeekKey: snapshot.activeWeekKey
    });
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
  if (pathPart.startsWith('/tunnel')) {
    return res.json({ success: true, data: snapshot.tunnel });
  }

  return res.json({ success: true, data: null, offline: true });
}

// 로컬에서 데몬 포트(24710) 루트(/)로 접속 시 /view로 자동 안내
app.get('/', (req, res, next) => {
  const host = (req.headers.host || '').toLowerCase();
  if (host.startsWith('localhost:') || host.startsWith('127.0.0.1:')) {
    return res.redirect('/view');
  }
  next();
});

// HTML 캐시 무효화 헤더
app.use((req, res, next) => {
  if (req.path === '/' || req.path.startsWith('/view') || req.path.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// 정적 파일 서빙 (시청자 페이지 번들)
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }
  }));
  app.get('*', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
} else {
  app.get('*', (req, res) => {
    res.send('<h1>ShaBot Viewer Daemon is running. (client/dist not built yet)</h1>');
  });
}

// Socket.IO 연결 처리 (시청자 접속 즉시 스냅샷 전송 후 실시간 동기화)
io.on('connection', async (socket) => {
  socket.emit('initial_state', readCachedSnapshot());

  const isUp = await checkMainServer();
  isMainServerOnline = isUp;
  if (!isUp) {
    const updatedStatus = await syncChzzkStatusWhenOffline();
    socket.emit('status_update', updatedStatus);
  }
});

// storage.json 파일 변경 감지 (스트리머가 설정/일정/명령어 저장 시 즉시 시청자에게 브로드캐스트)
try {
  fs.watchFile(STORAGE_FILE, { interval: 2000 }, () => {
    const snap = readCachedSnapshot();
    io.emit('initial_state', snap);
  });
} catch {}

// 메인 서버(24700)와의 실시간 소켓 동기화 브릿지
function connectMainServerBridge() {
  if (mainSocketClient) {
    try { mainSocketClient.disconnect(); } catch {}
  }

  mainSocketClient = ioClient(`http://127.0.0.1:${MAIN_PORT}`, {
    reconnection: true,
    reconnectionDelay: 2000,
    timeout: 3000
  });

  mainSocketClient.on('connect', () => {
    console.log('[Bridge] ⚡ 메인 샤봇 서버(24700)와 실시간 브릿지 연결 성공!');
    isMainServerOnline = true;
    offlineLiveStatusOverride = null;
    saveTunnelState();
    io.emit('initial_state', readCachedSnapshot());
  });

  mainSocketClient.on('disconnect', async () => {
    console.log('[Bridge] 🌙 메인 샤봇 서버 연결 종료 (시청자 대시보드는 백그라운드에서 계속 유지됩니다)');
    isMainServerOnline = false;
    saveTunnelState();
    const updatedStatus = await syncChzzkStatusWhenOffline();
    io.emit('status_update', updatedStatus);
  });

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

// 터널 비정상 종료 시 자동 재연결 예약 (사용자가 공유 중지를 누르기 전까지 24시간 유지)
function scheduleReconnect(reason) {
  if (!isDesiredRunning()) {
    tunnelStatus = 'stopped';
    saveTunnelState();
    return;
  }
  if (reconnectTimer) clearTimeout(reconnectTimer);
  console.log(`[Tunnel] 🔄 터널 연결 끊김 감지 (${reason}). 3초 후 자동으로 재연결합니다...`);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (isDesiredRunning()) {
      startTunnelProcess().catch(console.error);
    }
  }, 3000);
}

// cloudflared 바이너리 존재 확인 및 자동 설치
async function ensureCloudflaredBinary() {
  if (fs.existsSync(CLOUDFLARED_BIN)) return;
  console.log('[Tunnel] 📦 cloudflared 바이너리를 자동 설치합니다...');
  const binDir = path.dirname(CLOUDFLARED_BIN);
  if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true });
  await installCloudflared(CLOUDFLARED_BIN);
}

// 5. 실제 터널 기동 함수
async function startTunnelProcess() {
  if (!isDesiredRunning()) return;

  if (!publicUrl) {
    tunnelStatus = 'starting';
    lastError = null;
    saveTunnelState();
  }

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
      lastError = null;
      console.log(`[Tunnel] 🌐 공개 주소 생성 성공: ${publicUrl}`);
      saveTunnelState();

      activeLtTunnel.on('close', () => {
        activeLtTunnel = null;
        scheduleReconnect('localtunnel close');
      });

      activeLtTunnel.on('error', (err) => {
        console.error('[Tunnel] Localtunnel 오류:', err.message);
        lastError = err.message;
        try { activeLtTunnel?.close(); } catch {}
        activeLtTunnel = null;
        scheduleReconnect('localtunnel error');
      });

      return;
    }

    await ensureCloudflaredBinary();

    // B) Cloudflare Named Tunnel (토큰 사용)
    if (mode === 'token' && token) {
      console.log(`[Tunnel] 🛡️ Cloudflare 고정 터널 시작 (토큰 연동)...`);
      activeTunnelProcess = spawn(
        CLOUDFLARED_BIN,
        ['tunnel', '--no-autoupdate', 'run', '--token', token],
        { windowsHide: true }
      );

      publicUrl = customDomain ? customDomain.replace(/\/+$/, '') : 'https://cloudflare-named-tunnel-active';
      tunnelStatus = 'running';
      lastError = null;
      saveTunnelState();

      activeTunnelProcess.on('error', (err) => {
        console.error('[Tunnel] Cloudflare 프로세스 오류:', err.message);
        lastError = err.message;
        activeTunnelProcess = null;
        scheduleReconnect('cloudflared token error');
      });

      activeTunnelProcess.on('exit', (code) => {
        activeTunnelProcess = null;
        scheduleReconnect(`cloudflared token exit (${code})`);
      });

      return;
    }

    // C) Cloudflare Quick Tunnel (기본 추천 모드 - 비밀번호 없이 즉시 접속 & 백그라운드 유지)
    console.log(`[Tunnel] 🌐 Cloudflare Quick Tunnel 시작 (포트: ${DAEMON_PORT})...`);
    let resolvedThisRun = false;

    activeTunnelProcess = spawn(
      CLOUDFLARED_BIN,
      [
        'tunnel',
        '--url', `http://127.0.0.1:${DAEMON_PORT}`,
        '--no-autoupdate'
      ],
      { windowsHide: true }
    );
    saveTunnelState();

    const onData = (data) => {
      const str = data.toString();
      const match = str.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
      if (match && !resolvedThisRun) {
        resolvedThisRun = true;
        publicUrl = match[0];
        tunnelStatus = 'running';
        lastError = null;
        console.log(`[Tunnel] 🌐 Cloudflare 공개 주소 생성 완료: ${publicUrl}`);
        saveTunnelState();
      }
    };

    activeTunnelProcess.stdout.on('data', onData);
    activeTunnelProcess.stderr.on('data', onData);

    activeTunnelProcess.on('error', (err) => {
      console.error('[Tunnel] Cloudflare 오류:', err.message);
      lastError = err.message;
      activeTunnelProcess = null;
      scheduleReconnect('cloudflared quick error');
    });

    activeTunnelProcess.on('exit', (code) => {
      console.log(`[Tunnel] Cloudflare 종료 (코드: ${code})`);
      activeTunnelProcess = null;
      scheduleReconnect(`cloudflared quick exit (${code})`);
    });

  } catch (err) {
    console.error('[Tunnel] 터널 시작 중 예외 발생:', err);
    lastError = err.message;
    if (!publicUrl) {
      tunnelStatus = 'error';
      saveTunnelState();
    }
    scheduleReconnect('exception');
  }
}

// 6. 정상 종료 핸들러 (사용자가 공유 중지를 눌렀을 때만 호출)
function shutdown() {
  isShuttingDown = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  console.log('[TunnelDaemon] 🛑 터널 데몬을 정상 종료합니다...');
  tunnelStatus = 'stopped';
  publicUrl = null;

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
      parsed.desiredRunning = false;
      parsed.publicUrl = null;
      parsed.viewerUrl = null;
      parsed.daemonPid = null;
      parsed.tunnelPid = null;
      fs.writeFileSync(TUNNEL_STATE_FILE, JSON.stringify(parsed, null, 2) + '\n', 'utf-8');
    }
  } catch {}

  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 800);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// 7. 메인 실행
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`[TunnelDaemon] 포트 ${DAEMON_PORT}에서 이미 데몬이 실행 중입니다.`);
    process.exit(0);
  }
});

server.listen(DAEMON_PORT, '0.0.0.0', () => {
  console.log(`==============================================================`);
  console.log(` 🌐 [ShaBot Tunnel Daemon] 백그라운드 시청자 대시보드 서버 가동 (포트: ${DAEMON_PORT})`);
  console.log(` 💡 샤봇 콘솔 창을 닫아도 시청자 대시보드는 안전하게 계속 유지됩니다.`);
  console.log(`==============================================================`);

  connectMainServerBridge();
  startTunnelProcess().catch(console.error);
});
