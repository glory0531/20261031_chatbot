import http from 'http';
import { exec } from 'child_process';
import { startTunnel, stopTunnel, getTunnelState } from '../server/tunnelManager.js';

function checkServerRunning() {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${process.env.PORT || 24700}/api/settings`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function copyToClipboard(text) {
  return new Promise((resolve) => {
    const proc = exec('clip', (err) => {
      resolve(!err);
    });
    proc.stdin.write(text);
    proc.stdin.end();
  });
}

function openBrowser(url) {
  const startCmd = process.platform === 'win32' ? `start "" "${url}"` : `open "${url}"`;
  exec(startCmd, () => {});
}

async function main() {
  console.log('==============================================================');
  console.log('       🍪 [ShaBot / 샤봇] 시청자 공개 링크 생성기');
  console.log('==============================================================');
  console.log(' ⏳ 샤봇 서버 및 Cloudflare 보안 터널을 연결하는 중...');

  // 1. 샤봇 서버 실행 여부 확인
  let isRunning = await checkServerRunning();
  if (!isRunning) {
    console.log(' 🚀 샤봇 백엔드 서버를 시작합니다...');
    await import('../server/server.js');
    await new Promise(r => setTimeout(r, 1500));
  }

  // 2. 터널 시작
  try {
    const tunnel = await startTunnel(Number(process.env.PORT) || 24700);
    if (!tunnel.publicUrl) {
      throw new Error(tunnel.error || '공개 주소를 발급받지 못했습니다.');
    }

    const viewerUrl = `${tunnel.publicUrl}/view`;

    // 3. 클립보드에 자동 복사
    await copyToClipboard(viewerUrl);

    console.log('');
    console.log('==============================================================');
    console.log(' ✨ [성공] 시청자 공개 링크가 성공적으로 생성되었습니다!');
    console.log('==============================================================');
    console.log('');
    console.log(` 🌐 시청자 공유용 주소:  \x1b[33m${viewerUrl}\x1b[0m`);
    console.log('');
    console.log(' 📋 링크가 클립보드에 자동 복사되었습니다! (Ctrl + V 로 붙여넣기)');
    console.log(' 💡 치지직 방송 설명란, 방송 공지, 디스코드에 공유해보세요.');
    console.log('');
    console.log(' 📱 시청자가 스마트폰/PC에서 볼 수 있는 내용:');
    console.log('    - 📅 주간 방송 일정표 (요일별 시간 & 콘텐츠)');
    console.log('    - 🎵 실시간 노래 신청곡 대기열');
    console.log('    - 📋 시청자 참여 & 미션 신청 현황');
    console.log('    - 📜 치지직 챗봇 명령어 사전 (!출첵, !sr, !신청 등)');
    console.log('    - 🏆 포인트 랭킹 순위표');
    console.log('');
    console.log(' 🛡️  스트리머 관리자 대시보드 및 치지직 API 비밀키는 100% 안전하게 보호됩니다.');
    console.log('==============================================================');
    console.log(' ℹ️  이 창을 닫으시거나 Ctrl + C를 누르면 공개 링크가 즉시 종료됩니다.');
    console.log('==============================================================');

    // 시청자 페이지 미리보기 브라우저 오픈 여부
    openBrowser(viewerUrl);

    // 프로세스 유지
    process.on('SIGINT', () => {
      console.log('\n🛑 공개 링크를 안전하게 종료합니다...');
      stopTunnel();
      process.exit(0);
    });

  } catch (err) {
    console.error('\n❌ [오류] 공개 링크 생성 실패:', err.message);
    process.exit(1);
  }
}

main().catch(console.error);
