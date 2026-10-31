import { exec } from 'child_process';

const PORT = Number(process.env.PORT) || 24700;

console.log('==============================================================');
console.log('       🛑 [ShaBot / 샤봇] 서버 프로세스 종료');
console.log('==============================================================');

if (process.platform === 'win32') {
  exec(`netstat -ano | findstr ":${PORT}" | findstr "LISTENING"`, (err, stdout) => {
    if (err || !stdout.trim()) {
      console.log(`ℹ️  현재 ${PORT}번 포트에서 실행 중인 샤봇 서버가 없습니다.`);
      return;
    }

    const lines = stdout.trim().split('\n');
    const pids = new Set();
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && !isNaN(pid)) {
        pids.add(pid);
      }
    }

    if (pids.size === 0) {
      console.log('ℹ️  종료할 샤봇 프로세스를 찾지 못했습니다.');
      return;
    }

    pids.forEach((pid) => {
      exec(`taskkill /F /PID ${pid}`, (killErr) => {
        if (!killErr) {
          console.log(`✅ 샤봇 서버(PID: ${pid})가 정상적으로 종료되었습니다.`);
        }
      });
    });
  });
} else {
  exec(`lsof -ti:${PORT} | xargs kill -9`, () => {
    console.log('✅ 샤봇 서버가 종료되었습니다.');
  });
}
