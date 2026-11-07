import http from 'http';
import { exec } from 'child_process';
import { startTunnel, getTunnelState } from '../server/tunnelManager.js';

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
  console.log('       🐻 [ShaBot / 샤봇] 시청자 공개 링크 백그라운드 생성기');
  console.log('==============================================================');
  console.log(' ⏳ 백그라운드 터널 데몬 및 시청자 전용 서버 연결 중...');

  try {
    const tunnel = await startTunnel({ provider: 'cloudflare', mode: 'quick' });
    if (!tunnel.publicUrl) {
      throw new Error(tunnel.error || '공개 주소를 발급받지 못했습니다.');
    }

    const viewerUrl = tunnel.viewerUrl || `${tunnel.publicUrl}/view`;

    // 클립보드에 자동 복사
    await copyToClipboard(viewerUrl);

    console.log('');
    console.log('==============================================================');
    console.log(' ✨ [성공] 시청자 공개 링크가 백그라운드에 성공적으로 등록되었습니다!');
    console.log('==============================================================');
    console.log('');
    console.log(` 🌐 시청자 전용 주소:  \x1b[33m${viewerUrl}\x1b[0m`);
    console.log('');
    console.log(' 📋 링크가 클립보드에 자동 복사되었습니다! (Ctrl + V 로 붙여넣기)');
    console.log(' 💡 치지직 방송 설명란, 방송 공지, 디스코드에 공유해보세요.');
    console.log('');
    console.log(' 📱 시청자가 스마트폰/PC에서 볼 수 있는 내용:');
    console.log('    - 📅 주간 방송 일정표 (요일별 시간 & 콘텐츠)');
    console.log('    - 🎵 실시간 노래 신청곡 대기열');
    console.log('    - 📋 시청자 참여 & 미션 신청 현황');
    console.log('    - 📜 치지직 챗봇 명령어 사전 (!출첵, !sr, !신청 등)');
    console.log('');
    console.log(' 🛡️  [백그라운드 자동 상주 안내]');
    console.log('    - 이 창이나 샤봇 창을 닫아도 링크는 백그라운드에서 계속 유지됩니다.');
    console.log('    - 완전히 종료하시려면 대시보드 또는 [6_공개링크_종료.bat]을 실행하세요.');
    console.log('==============================================================');

    openBrowser(viewerUrl);

  } catch (err) {
    console.error('\n❌ [오류] 공개 링크 생성 실패:', err.message);
    process.exit(1);
  }
}

main().catch(console.error);
