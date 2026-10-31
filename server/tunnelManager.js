import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLOUDFLARED_BIN = path.join(
  __dirname,
  '../node_modules/cloudflared/bin/' + (process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared')
);

let tunnelProcess = null;
let publicUrl = null;
let startedAt = null;
let ioRef = null;
let tunnelStatus = 'stopped'; // 'stopped' | 'starting' | 'running' | 'error'
let lastError = null;

export function setTunnelSocketIO(io) {
  ioRef = io;
}

export function getTunnelState() {
  return {
    status: tunnelStatus,
    isRunning: tunnelStatus === 'running',
    publicUrl,
    viewerUrl: publicUrl ? `${publicUrl}/view` : null,
    startedAt,
    error: lastError
  };
}

export async function startTunnel(port = 24700) {
  if (tunnelStatus === 'running' && publicUrl) {
    return getTunnelState();
  }

  tunnelStatus = 'starting';
  lastError = null;
  if (ioRef) ioRef.emit('tunnel_update', getTunnelState());

  return new Promise((resolve, reject) => {
    try {
      tunnelProcess = spawn(CLOUDFLARED_BIN, [
        'tunnel',
        '--url', `http://localhost:${port}`,
        '--no-autoupdate'
      ]);

      let resolved = false;

      const onData = (data) => {
        const str = data.toString();
        const match = str.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
        if (match && !resolved) {
          resolved = true;
          publicUrl = match[0];
          tunnelStatus = 'running';
          startedAt = Date.now();
          console.log(`[Cloudflare Tunnel] 🌐 시청자 공개 주소 생성 성공: ${publicUrl}`);
          console.log(`[Cloudflare Tunnel] 📱 시청자 전용 페이지: ${publicUrl}/view`);
          if (ioRef) ioRef.emit('tunnel_update', getTunnelState());
          resolve(getTunnelState());
        }
      };

      tunnelProcess.stdout.on('data', onData);
      tunnelProcess.stderr.on('data', onData);

      tunnelProcess.on('error', (err) => {
        console.error('[Cloudflare Tunnel] 프로세스 오류:', err);
        tunnelStatus = 'error';
        lastError = err.message;
        if (ioRef) ioRef.emit('tunnel_update', getTunnelState());
        if (!resolved) {
          resolved = true;
          reject(err);
        }
      });

      tunnelProcess.on('exit', (code) => {
        console.log(`[Cloudflare Tunnel] 프로세스 종료 (코드: ${code})`);
        tunnelStatus = 'stopped';
        publicUrl = null;
        tunnelProcess = null;
        if (ioRef) ioRef.emit('tunnel_update', getTunnelState());
      });

      // 15초 타임아웃
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          if (tunnelStatus === 'starting') {
            tunnelStatus = 'error';
            lastError = '터널 생성 시간 초과';
            if (ioRef) ioRef.emit('tunnel_update', getTunnelState());
          }
          resolve(getTunnelState());
        }
      }, 15000);

    } catch (err) {
      tunnelStatus = 'error';
      lastError = err.message;
      if (ioRef) ioRef.emit('tunnel_update', getTunnelState());
      reject(err);
    }
  });
}

export function stopTunnel() {
  if (tunnelProcess) {
    try {
      tunnelProcess.kill('SIGTERM');
    } catch (e) {
      try {
        tunnelProcess.kill('SIGKILL');
      } catch (_) {}
    }
    tunnelProcess = null;
  }
  tunnelStatus = 'stopped';
  publicUrl = null;
  startedAt = null;
  if (ioRef) ioRef.emit('tunnel_update', getTunnelState());
  return getTunnelState();
}
