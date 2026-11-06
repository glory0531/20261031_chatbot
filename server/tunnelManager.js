import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const TUNNEL_STATE_FILE = path.join(ROOT_DIR, 'data', 'tunnel.json');
const DAEMON_SCRIPT = path.join(ROOT_DIR, 'scripts', 'tunnelDaemon.js');

let ioRef = null;

export function setTunnelSocketIO(io) {
  ioRef = io;
}

// 윈도우/리눅스 공통 프로세스 생존 여부 체크
function isProcessAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return false;
  }
}

// 상태 파일 읽기
function readStateFile() {
  try {
    if (fs.existsSync(TUNNEL_STATE_FILE)) {
      const raw = fs.readFileSync(TUNNEL_STATE_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch {}
  return null;
}

export function getTunnelState() {
  const saved = readStateFile();
  if (saved && saved.daemonPid && isProcessAlive(saved.daemonPid) && saved.status === 'running') {
    return {
      status: 'running',
      isRunning: true,
      publicUrl: saved.publicUrl || null,
      viewerUrl: saved.viewerUrl || (saved.publicUrl ? `${saved.publicUrl}/view` : null),
      provider: saved.provider || 'cloudflare',
      mode: saved.mode || 'quick',
      subdomain: saved.subdomain || '',
      token: saved.token || '',
      customDomain: saved.customDomain || '',
      isBackground: true,
      startedAt: saved.startedAt || null,
      error: null
    };
  }

  // 프로세스가 죽어있는 경우 상태 리셋
  return {
    status: 'stopped',
    isRunning: false,
    publicUrl: null,
    viewerUrl: null,
    provider: saved?.provider || 'cloudflare',
    mode: saved?.mode || 'quick',
    subdomain: saved?.subdomain || '',
    token: saved?.token || '',
    customDomain: saved?.customDomain || '',
    isBackground: false,
    startedAt: null,
    error: saved?.error || null
  };
}

export async function startTunnel(options = {}) {
  const currentState = getTunnelState();
  if (currentState.isRunning && currentState.publicUrl) {
    return currentState;
  }

  if (ioRef) {
    ioRef.emit('tunnel_update', {
      ...currentState,
      status: 'starting',
      isRunning: false
    });
  }

  const {
    provider = 'cloudflare',
    mode = 'quick',
    token = '',
    subdomain = '',
    customDomain = ''
  } = options;

  // 기존 데몬이 혹시 남아있다면 정리
  const oldState = readStateFile();
  if (oldState?.daemonPid && isProcessAlive(oldState.daemonPid)) {
    try { process.kill(oldState.daemonPid, 'SIGTERM'); } catch {}
  }

  // tunnelDaemon.js를 완전히 분리된 백그라운드 프로세스(Detached)로 기동
  const child = spawn(process.execPath, [DAEMON_SCRIPT], {
    cwd: ROOT_DIR,
    detached: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      TUNNEL_PROVIDER: provider,
      TUNNEL_MODE: mode,
      TUNNEL_TOKEN: token,
      TUNNEL_SUBDOMAIN: subdomain,
      TUNNEL_CUSTOM_DOMAIN: customDomain,
      MAIN_PORT: '24700',
      DAEMON_PORT: '24710'
    }
  });

  child.unref();

  // tunnel.json이 'running' 상태로 기록될 때까지 대기 (최대 25초)
  const startTime = Date.now();
  return new Promise((resolve) => {
    const timer = setInterval(() => {
      const state = getTunnelState();
      if (state.isRunning && state.publicUrl) {
        clearInterval(timer);
        console.log(`[TunnelManager] 🌐 독립 백그라운드 터널 활성화 완료: ${state.publicUrl}`);
        if (ioRef) ioRef.emit('tunnel_update', state);
        resolve(state);
        return;
      }

      if (Date.now() - startTime > 25000) {
        clearInterval(timer);
        const timeoutState = {
          ...state,
          status: 'error',
          error: '공개 링크 생성 시간이 초과되었습니다 (25초).'
        };
        if (ioRef) ioRef.emit('tunnel_update', timeoutState);
        resolve(timeoutState);
      }
    }, 600);
  });
}

export function stopTunnel() {
  const saved = readStateFile();

  // 1. 데몬 HTTP 종료 엔드포인트 호출
  try {
    const req = http.request({
      hostname: 'localhost',
      port: 24710,
      path: '/__tunnel/stop',
      method: 'POST',
      timeout: 1000
    });
    req.on('error', () => {});
    req.end();
  } catch {}

  // 2. 프로세스 직접 종료
  if (saved?.daemonPid && isProcessAlive(saved.daemonPid)) {
    try {
      process.kill(saved.daemonPid, 'SIGTERM');
    } catch {
      try { process.kill(saved.daemonPid, 'SIGKILL'); } catch {}
    }
  }

  // 3. 상태 파일 갱신
  if (fs.existsSync(TUNNEL_STATE_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(TUNNEL_STATE_FILE, 'utf-8'));
      parsed.status = 'stopped';
      parsed.isRunning = false;
      parsed.publicUrl = null;
      parsed.viewerUrl = null;
      fs.writeFileSync(TUNNEL_STATE_FILE, JSON.stringify(parsed, null, 2) + '\n', 'utf-8');
    } catch {}
  }

  const stoppedState = {
    status: 'stopped',
    isRunning: false,
    publicUrl: null,
    viewerUrl: null,
    provider: saved?.provider || 'cloudflare',
    mode: saved?.mode || 'quick',
    subdomain: saved?.subdomain || '',
    isBackground: false,
    startedAt: null,
    error: null
  };

  console.log('[TunnelManager] 🛑 시청자 공개링크가 종료되었습니다.');
  if (ioRef) ioRef.emit('tunnel_update', stoppedState);
  return stoppedState;
}

// 서버 시작 시 기존 백그라운드 터널 상태 자동 감지
export function syncTunnelOnStartup() {
  const state = getTunnelState();
  if (state.isRunning && state.publicUrl) {
    console.log(`==============================================================`);
    console.log(` 🌐 [공개링크 감지] 기존 백그라운드 터널이 유지되고 있습니다!`);
    console.log(` 🔗 시청자 주소: \x1b[33m${state.viewerUrl || state.publicUrl}\x1b[0m`);
    console.log(` 💡 샤봇과 실시간 브릿지가 자동으로 연결되었습니다.`);
    console.log(`==============================================================`);
  }
  return state;
}
