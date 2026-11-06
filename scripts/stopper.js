import { exec } from 'child_process';
import readline from 'readline';
import { stopTunnel, getTunnelState } from '../server/tunnelManager.js';

const PORT = Number(process.env.PORT) || 24700;
const DAEMON_PORT = 24710;
const args = process.argv.slice(2);
const stopAll = args.includes('--all');
const tunnelOnly = args.includes('--tunnel-only');

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => {
    rl.close();
    resolve(ans.trim().toLowerCase());
  }));
}

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
          if (pid && !isNaN(pid)) pids.add(pid);
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
    ? '       🛑 [ShaBot / 샤봇] 시청자 공개링크 종료'
    : '       🛑 [ShaBot / 샤봇] 서버 프로세스 종료'
  );
  console.log('==============================================================');

  if (tunnelOnly) {
    stopTunnel();
    await killPort(DAEMON_PORT);
    console.log('✅ 시청자 공개링크 및 백그라운드 터널이 성공적으로 종료되었습니다.');
    return;
  }

  // 1. 메인 샤봇 서버(24700) 종료
  const mainKilled = await killPort(PORT);
  if (mainKilled) {
    console.log(`✅ 샤봇 메인 서버(포트 ${PORT})가 정상적으로 종료되었습니다.`);
  } else {
    console.log(`ℹ️  현재 ${PORT}번 포트에서 실행 중인 샤봇 메인 서버가 없습니다.`);
  }

  // 2. 백그라운드 터널 상태 확인
  const tunnelState = getTunnelState();
  if (tunnelState.isRunning) {
    console.log('');
    console.log(`🌐 [알림] 현재 시청자 공개링크가 백그라운드에서 유지 중입니다!`);
    console.log(`   주소: ${tunnelState.viewerUrl || tunnelState.publicUrl}`);
    console.log('');

    let shouldStopTunnel = stopAll;
    if (!stopAll) {
      const ans = await ask('👉 공개링크도 함께 종료하시겠습니까? (y/N, 기본값 N - 엔터 시 링크 유지): ');
      shouldStopTunnel = ans === 'y' || ans === 'yes';
    }

    if (shouldStopTunnel) {
      stopTunnel();
      await killPort(DAEMON_PORT);
      console.log('🛑 공개링크도 함께 안전하게 종료되었습니다.');
    } else {
      console.log('✨ 공개링크는 백그라운드에서 계속 유지됩니다!');
      console.log('   (추후 링크를 완전히 끄시려면 [6_공개링크_종료.bat]을 실행하세요.)');
    }
  }

  console.log('==============================================================');
}

main().catch(console.error);
