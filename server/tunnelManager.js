import { spawn, execSync } from 'child_process';
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
let stateWatcherStarted = false;
let lastBroadcastUrl = null;
let lastBroadcastRunning = null;

export function setTunnelSocketIO(io) {
  ioRef = io;
  startTunnelStateWatcher();
}

// 윈도우/리눅스 공통 프로세스 생존 여부 체크
function isProcessAlive(pid) {
  if (!pid || typeof pid !== 'number') return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

// 상태 파일 읽기
export function readStateFile() {
  try {
    if (fs.existsSync(TUNNEL_STATE_FILE)) {
      const raw = fs.readFileSync(TUNNEL_STATE_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch {}
  return null;
}

// 상태 파일 쓰기 (원자적 보장)
function writeStateFile(data) {
  try {
    const dir = path.dirname(TUNNEL_STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(TUNNEL_STATE_FILE, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  } catch (err) {
    console.warn('[TunnelManager] 상태 파일 기록 실패:', err.message);
  }
}

// tunnel.json 변경 감시 -> 대시보드 실시간 반영 (재연결 등으로 URL 갱신 시)
function startTunnelStateWatcher() {
  if (stateWatcherStarted) return;
  stateWatcherStarted = true;

  setInterval(() => {
    if (!ioRef) return;
    const state = getTunnelState();
    if (state.publicUrl !== lastBroadcastUrl || state.isRunning !== lastBroadcastRunning) {
      lastBroadcastUrl = state.publicUrl;
      lastBroadcastRunning = state.isRunning;
      ioRef.emit('tunnel_update', state);
    }
  }, 2000);
}

export function getTunnelState() {
  const saved = readStateFile();
  const daemonAlive = saved?.daemonPid && isProcessAlive(Number(saved.daemonPid));

  if (saved && daemonAlive && (saved.status === 'running' || saved.status === 'starting')) {
    return {
      status: saved.status,
      isRunning: saved.status === 'running',
      desiredRunning: saved.desiredRunning !== false,
      publicUrl: saved.publicUrl || null,
      viewerUrl: saved.viewerUrl || (saved.publicUrl ? `${saved.publicUrl}/view` : null),
      provider: saved.provider || 'cloudflare',
      mode: saved.mode || 'quick',
      subdomain: saved.subdomain || '',
      token: saved.token || '',
      customDomain: saved.customDomain || '',
      isBackground: true,
      startedAt: saved.startedAt || null,
      error: saved.error || null
    };
  }

  return {
    status: 'stopped',
    isRunning: false,
    desiredRunning: Boolean(saved?.desiredRunning),
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

// 윈도우에서 콘솔 창(X 버튼) 종료에도 죽지 않도록 WMI(Win32_Process.Create)로 완전 분리 기동
function spawnDetachedDaemon(envVars) {
  if (process.platform === 'win32') {
    try {
      const nodeExe = process.execPath.replace(/'/g, "''");
      const scriptPath = DAEMON_SCRIPT.replace(/'/g, "''");
      const workDir = ROOT_DIR.replace(/'/g, "''");

      const psScript = [
        `$sw = New-CimInstance -ClassName Win32_ProcessStartup -ClientOnly -Property @{ ShowWindow = [uint16]0 }`,
        `$cmd = '"' + '${nodeExe}' + '" "' + '${scriptPath}' + '"'`,
        `$res = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = $cmd; CurrentDirectory = '${workDir}'; ProcessStartupInformation = $sw }`,
        `if ($res.ReturnValue -ne 0) { exit 1 }`
      ].join('; ');

      execSync(`powershell -NoProfile -NonInteractive -WindowStyle Hidden -Command "${psScript}"`, {
        cwd: ROOT_DIR,
        stdio: 'ignore',
        windowsHide: true,
        timeout: 8000
      });
      return;
    } catch (err) {
      console.warn('[TunnelManager] WMI 분리 실행 폴백 사용:', err.message);
    }
  }

  const child = spawn(process.execPath, [DAEMON_SCRIPT], {
    cwd: ROOT_DIR,
    detached: true,
    windowsHide: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      ...envVars
    }
  });
  child.unref();
}

// 강제 프로세스 트리 종료 유틸 (종료 요청 시에만 사용)
function forceKillPid(pid) {
  if (!pid || !isProcessAlive(Number(pid))) return;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /F /T /PID ${Number(pid)}`, { stdio: 'ignore', windowsHide: true });
    } else {
      process.kill(Number(pid), 'SIGTERM');
    }
  } catch {
    try {
      process.kill(Number(pid), 'SIGKILL');
    } catch {}
  }
}

export async function startTunnel(options = {}) {
  const currentState = getTunnelState();
  if (currentState.isRunning && currentState.publicUrl && !options.forceRestart) {
    return currentState;
  }

  const saved = readStateFile() || {};
  const provider = options.provider || saved.provider || 'cloudflare';
  const mode = options.mode || saved.mode || 'quick';
  const token = options.token !== undefined ? options.token : (saved.token || '');
  const subdomain = options.subdomain !== undefined ? options.subdomain : (saved.subdomain || '');
  const customDomain = options.customDomain !== undefined ? options.customDomain : (saved.customDomain || '');

  // 기존 데몬이 남아있다면 먼저 정리
  if (saved.daemonPid && isProcessAlive(Number(saved.daemonPid))) {
    forceKillPid(saved.daemonPid);
  }
  if (saved.tunnelPid && isProcessAlive(Number(saved.tunnelPid))) {
    forceKillPid(saved.tunnelPid);
  }

  // 데몬이 시작 즉시 읽을 수 있도록 desiredRunning: true와 설정값을 tunnel.json에 먼저 저장
  const initialData = {
    status: 'starting',
    isRunning: false,
    desiredRunning: true,
    publicUrl: null,
    viewerUrl: null,
    provider,
    mode,
    subdomain,
    token,
    customDomain,
    daemonPid: null,
    tunnelPid: null,
    daemonPort: 24710,
    mainPort: 24700,
    isBackground: true,
    startedAt: Date.now(),
    error: null
  };
  writeStateFile(initialData);

  if (ioRef) {
    ioRef.emit('tunnel_update', {
      ...initialData,
      status: 'starting',
      isRunning: false
    });
  }

  // 콘솔 창과 완전히 분리된 백그라운드 데몬 기동
  spawnDetachedDaemon({
    TUNNEL_PROVIDER: provider,
    TUNNEL_MODE: mode,
    TUNNEL_TOKEN: token,
    TUNNEL_SUBDOMAIN: subdomain,
    TUNNEL_CUSTOM_DOMAIN: customDomain,
    MAIN_PORT: '24700',
    DAEMON_PORT: '24710'
  });

  // tunnel.json이 'running' 또는 'error' 상태로 기록될 때까지 대기 (최대 25초)
  const startTime = Date.now();
  return new Promise((resolve) => {
    const timer = setInterval(() => {
      const latestFile = readStateFile();
      const state = getTunnelState();

      if (state.isRunning && state.publicUrl) {
        clearInterval(timer);
        lastBroadcastUrl = state.publicUrl;
        lastBroadcastRunning = true;
        console.log(`[TunnelManager] 🌐 독립 백그라운드 시청자 대시보드 공유 시작 완료: ${state.viewerUrl || state.publicUrl}`);
        if (ioRef) ioRef.emit('tunnel_update', state);
        resolve(state);
        return;
      }

      if (latestFile?.status === 'error' && latestFile?.error) {
        clearInterval(timer);
        const errState = {
          ...state,
          status: 'error',
          isRunning: false,
          error: latestFile.error
        };
        if (ioRef) ioRef.emit('tunnel_update', errState);
        resolve(errState);
        return;
      }

      if (Date.now() - startTime > 25000) {
        clearInterval(timer);
        const timeoutState = {
          ...state,
          status: 'error',
          isRunning: false,
          error: '공개 링크 생성 시간이 초과되었습니다 (25초). 네트워크 상태를 확인 후 다시 시도해주세요.'
        };
        if (ioRef) ioRef.emit('tunnel_update', timeoutState);
        resolve(timeoutState);
      }
    }, 500);
  });
}

export function stopTunnel() {
  const saved = readStateFile();

  // 1. 먼저 상태 파일에 desiredRunning: false 및 stopped를 기록하여 자동 재시작 차단
  const stoppedFileState = {
    status: 'stopped',
    isRunning: false,
    desiredRunning: false,
    publicUrl: null,
    viewerUrl: null,
    provider: saved?.provider || 'cloudflare',
    mode: saved?.mode || 'quick',
    subdomain: saved?.subdomain || '',
    token: saved?.token || '',
    customDomain: saved?.customDomain || '',
    daemonPid: null,
    tunnelPid: null,
    isBackground: false,
    startedAt: null,
    error: null
  };
  writeStateFile(stoppedFileState);

  // 2. 데몬 HTTP 종료 엔드포인트 호출
  try {
    const req = http.request({
      hostname: '127.0.0.1',
      port: 24710,
      path: '/__tunnel/stop',
      method: 'POST',
      timeout: 800
    });
    req.on('error', () => {});
    req.end();
  } catch {}

  // 3. 프로세스 트리 강제 정리 (cloudflared 및 데몬 모두 확실히 종료)
  if (saved?.tunnelPid) {
    forceKillPid(saved.tunnelPid);
  }
  if (saved?.daemonPid) {
    forceKillPid(saved.daemonPid);
  }

  lastBroadcastUrl = null;
  lastBroadcastRunning = false;

  console.log('[TunnelManager] 🛑 시청자 대시보드 공개 링크 공유가 중지되었습니다.');
  if (ioRef) ioRef.emit('tunnel_update', stoppedFileState);
  return stoppedFileState;
}

// 서버 시작 시 기존 백그라운드 터널 상태 자동 감지 및 미종료 공유 자동 복구
export async function syncTunnelOnStartup() {
  const saved = readStateFile();
  const state = getTunnelState();

  if (state.isRunning && state.publicUrl) {
    console.log(`==============================================================`);
    console.log(` 🌐 [시청자 대시보드] 기존 백그라운드 공개 링크가 유지되고 있습니다!`);
    console.log(` 🔗 시청자 주소: \x1b[33m${state.viewerUrl || state.publicUrl}\x1b[0m`);
    console.log(` 💡 샤봇과 실시간 브릿지가 자동으로 연결되었습니다.`);
    console.log(`==============================================================`);
    if (ioRef) ioRef.emit('tunnel_update', state);
    return state;
  }

  // 사용자가 이전에 공유를 시작했고 아직 [공유 중지]를 누르지 않은 상태(desiredRunning: true)라면 자동 복구!
  if (saved && saved.desiredRunning === true) {
    console.log(`==============================================================`);
    console.log(` 🔄 [시청자 대시보드] 이전 공유 유지 설정을 감지하여 공개 링크를 자동 복구합니다...`);
    console.log(`==============================================================`);
    try {
      const restored = await startTunnel({
        provider: saved.provider || 'cloudflare',
        mode: saved.mode || 'quick',
        token: saved.token || '',
        subdomain: saved.subdomain || '',
        customDomain: saved.customDomain || ''
      });
      if (restored.isRunning && restored.publicUrl) {
        console.log(` ✨ [자동 복구 완료] 시청자 공개 주소: \x1b[33m${restored.viewerUrl || restored.publicUrl}\x1b[0m`);
      }
      return restored;
    } catch (err) {
      console.warn('[TunnelManager] 공개 링크 자동 복구 실패:', err.message);
    }
  }

  return state;
}
