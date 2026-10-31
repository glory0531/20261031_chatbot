import http from 'http';
import fs from 'fs';
import path from 'path';
import { exec, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import {
  checkForUpdate,
  downloadAndStageUpdate,
  extractStagedUpdate,
  readCurrentVersion,
  ROOT_DIR
} from '../server/updater.js';
import { createLocalBackup } from '../server/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 24700;

function checkAlreadyRunning() {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${PORT}/api/settings`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(800, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function openBrowser(url) {
  const startCmd = process.platform === 'win32' ? `start "" "${url}"` : `open "${url}"`;
  exec(startCmd, (err) => {
    if (err) console.error('[Browser] 브라우저 열기 실패:', err.message);
  });
}

function isAutoUpdateOnStartEnabled() {
  try {
    const dbPath = path.join(ROOT_DIR, 'data', 'storage.json');
    if (fs.existsSync(dbPath)) {
      const parsed = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
      if (parsed?.settings?.autoUpdateOnStart === false) return false;
    }
  } catch {}
  return true;
}

async function tryAutoUpdateBeforeStart() {
  if (!isAutoUpdateOnStartEnabled()) return false;

  try {
    const state = await checkForUpdate({ timeoutMs: 3500 });
    if (!state.configured || !state.updateAvailable) return false;

    console.log('==============================================================');
    console.log(` ✨ 새 업데이트 발견! (v${state.currentVersion} ➡️ v${state.latestVersion})`);
    console.log(' 💾 내 데이터(data/)를 자동 백업하고 최신 버전을 적용합니다...');
    console.log('==============================================================');

    const meta = await downloadAndStageUpdate({ backupFn: createLocalBackup });
    extractStagedUpdate({
      zipPath: meta.zipPath,
      rootDir: ROOT_DIR,
      fromVersion: meta.fromVersion,
      toVersion: meta.toVersion,
      changelog: meta.changelog
    });

    console.log(` ✅ v${readCurrentVersion()} 업데이트 적용 완료! 최신 버전으로 시작합니다.\n`);
    return true;
  } catch (err) {
    console.warn(` ⚠️ [자동 업데이트 건너뜀] ${err.message} (기존 버전으로 정상 실행합니다)`);
    return false;
  }
}

async function main() {
  const isRunning = await checkAlreadyRunning();

  if (isRunning) {
    console.log('==============================================================');
    console.log('       🍪 [ShaBot / 오픈 샤봇] 방송용 챗봇 & 통합 대시보드');
    console.log('==============================================================');
    console.log(` ✨ 이미 샤봇 서버가 포트 ${PORT}에서 실행 중입니다!`);
    console.log(' 🌐 웹 브라우저에서 관리자 대시보드를 열었습니다.');
    console.log(` 📍 대시보드 주소: http://localhost:${PORT}`);
    console.log('==============================================================');
    openBrowser(`http://localhost:${PORT}`);
    return;
  }

  // 시작 전 자동 업데이트 확인 및 적용
  const didUpdate = await tryAutoUpdateBeforeStart();

  // 브라우저 자동 오픈
  setTimeout(() => {
    openBrowser(`http://localhost:${PORT}`);
  }, 1200);

  if (didUpdate) {
    // 업데이트된 최신 모듈 캐시를 깨끗하게 로드하기 위해 새 Node 자식 프로세스로 실행
    const child = spawn(process.execPath, [path.join(ROOT_DIR, 'server', 'server.js')], {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      env: { ...process.env }
    });
    child.on('exit', (code) => process.exit(code ?? 0));
    return;
  }

  // 서버 기동
  await import('../server/server.js');
}

main().catch(console.error);
