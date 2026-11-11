import { exec } from 'child_process';
import { stopTunnel, getTunnelState } from '../server/tunnelManager.js';

const PORT = Number(process.env.PORT) || 24700;
const DAEMON_PORT = 24710;
const args = process.argv.slice(2);
const stopAll = args.includes('--all');
const tunnelOnly = args.includes('--tunnel-only');

function killPort(port) {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      exec(`netstat -ano | findstr ":${port}" | findstr "LISTENING"`, (err, stdout) => {
        if (err || !stdout.trim()) return resolve(false);

        const lines = stdout.trim().split('\n');
        const pids = new Set();
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && !isNaN(pid) && Number(pid) > 0) pids.add(pid);
        }

        if (pids.size === 0) return resolve(false);

        let killed = 0;
        pids.forEach((pid) => {
          exec(`taskkill /F /PID ${pid}`, () => {
            killed++;
            if (killed === pids.size) resolve(true);
          });
        });
      });
    } else {
      exec(`lsof -ti:${port} | xargs kill -9`, () => resolve(true));
    }
  });
}

async function main() {
  console.log('==============================================================');
  console.log(tunnelOnly
    ? '       🛑 [ShaBot / 샤봇] 시청자 공개링크 공유 중지'
    : '       🛑 [ShaBot / 샤봇] 메인 서버 프로세스 종료'
  );
  console.log('==============================================================');

  if (tunnelOnly) {
    stopTunnel();
    await killPort(DAEMON_PORT);
    console.log('✅ 시청자 대시보드 공개 링크 및 백그라운드 터널이 완전히 종료되었습니다.');
    return;
  }

  // 1. 메인 샤봇 서버(24700)만 종료
  const mainKilled = await killPort(PORT);
  if (mainKilled) {
    console.log(`✅ 샤봇 메인 서버(포트 ${PORT})가 정상적으로 종료되었습니다.`);
  } else {
    console.log(`ℹ️  현재 ${PORT}번 포트에서 실행 중인 샤봇 메인 서버가 없습니다.`);
  }

  // 2. 백그라운드 시청자 대시보드 공개 링크는 묻지 않고 계속 유지 (--all 옵션일 때만 종료)
  const tunnelState = getTunnelState();
  if (tunnelState.isRunning) {
    if (stopAll) {
      stopTunnel();
      await killPort(DAEMON_PORT);
      console.log('🛑 시청자 공개 링크도 함께 종료되었습니다.');
    } else {
      console.log('');
      console.log('🌐 [백그라운드 유지 중] 시청자 대시보드 공개 링크는 꺼지지 않고 계속 유지됩니다!');
      console.log(`   🔗 시청자 주소: ${tunnelState.viewerUrl || tunnelState.publicUrl}`);
      console.log('   💡 공유를 중지하려면 샤봇을 다시 열어 [공유 중지]를 누르거나 [6_공개링크_종료.bat]을 실행하세요.');
    }
  }

  console.log('==============================================================');
}

main().catch(console.error);
