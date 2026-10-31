import http from 'http';
import {
  checkForUpdate,
  downloadAndStageUpdate,
  extractStagedUpdate,
  readCurrentVersion,
  ROOT_DIR
} from '../server/updater.js';
import { createLocalBackup } from '../server/db.js';

const PORT = Number(process.env.PORT) || 24700;

function triggerLiveServerUpdate() {
  return new Promise((resolve) => {
    const req = http.request(
      `http://localhost:${PORT}/api/update/apply`,
      { method: 'POST', timeout: 10000 },
      (res) => {
        let body = '';
        res.on('data', chunk => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ running: true, data: JSON.parse(body) });
          } catch {
            resolve({ running: true, data: null });
          }
        });
      }
    );
    req.on('error', () => resolve({ running: false }));
    req.end();
  });
}

async function main() {
  console.log('==============================================================');
  console.log('       🔄 [ShaBot / 오픈 샤봇] 원격 업데이트 확인 도구');
  console.log('==============================================================');
  console.log(` 📌 현재 설치된 버전: v${readCurrentVersion()}`);
  console.log(' 🔍 공식 배포 저장소에서 최신 버전을 확인하고 있습니다...\n');

  const state = await checkForUpdate({ timeoutMs: 8000 });

  if (!state.configured) {
    console.log('ℹ️  아직 원격 업데이트 GitHub 저장소(release.config.json)가 설정되지 않았습니다.');
    return;
  }

  if (state.error) {
    console.log(`❌ 업데이트 확인 중 오류가 발생했습니다: ${state.error}`);
    return;
  }

  if (!state.updateAvailable) {
    console.log(`✅ 현재 최신 버전(v${state.currentVersion})을 사용 중입니다!`);
    return;
  }

  console.log(`✨ 새로운 업데이트가 있습니다! (v${state.currentVersion} ➡️ v${state.latestVersion})`);
  if (state.changelog?.length > 0) {
    console.log('\n📋 [패치노트]');
    state.changelog.forEach((line) => console.log(`  • ${line}`));
    console.log('');
  }

  if (process.argv.includes('--check')) {
    return;
  }

  // 서버가 이미 실행 중이면 라이브 업데이트 API로 안전 재시작 요청
  const live = await triggerLiveServerUpdate();
  if (live.running && live.data?.success) {
    console.log('🚀 실행 중인 샤봇 서버에 안전 업데이트 및 자동 재시작을 요청했습니다!');
    console.log('   잠시 후 대시보드가 최신 버전으로 자동 새로고침됩니다.');
    return;
  }

  // 서버가 꺼져 있는 경우 직접 패치 적용
  console.log('💾 시청자 데이터(data/storage.json) 자동 백업 및 업데이트 다운로드 중...');
  const meta = await downloadAndStageUpdate({ backupFn: createLocalBackup });
  extractStagedUpdate({
    zipPath: meta.zipPath,
    rootDir: ROOT_DIR,
    fromVersion: meta.fromVersion,
    toVersion: meta.toVersion,
    changelog: meta.changelog
  });

  console.log(`\n🎉 업데이트 완료! 현재 버전: v${readCurrentVersion()}`);
  console.log('   이제 [1_샤봇_시작.bat]을 실행하시면 최신 버전으로 구동됩니다.');
}

main().catch((err) => {
  console.error('❌ 업데이트 실패:', err.message);
  process.exit(1);
});
