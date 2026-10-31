import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { extractStagedUpdate } from '../server/updater.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const oldPid = parseInt(process.argv[2], 10);
const zipPath = process.argv[3];
const fromVersion = process.argv[4] || '';
const toVersion = process.argv[5] || '';

function isProcessRunning(pid) {
  if (!pid || isNaN(pid)) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function waitForOldProcessExit(pid, maxWaitMs = 5000) {
  const start = Date.now();
  while (isProcessRunning(pid) && Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, 200));
  }
  if (isProcessRunning(pid)) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {}
    await new Promise(r => setTimeout(r, 400));
  }
}

async function run() {
  try {
    await waitForOldProcessExit(oldPid);

    let changelog = [];
    try {
      const metaPath = path.join(path.dirname(zipPath), 'meta.json');
      if (fs.existsSync(metaPath)) {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        changelog = meta.changelog || [];
      }
    } catch {}

    extractStagedUpdate({
      zipPath,
      rootDir: ROOT_DIR,
      fromVersion,
      toVersion,
      changelog
    });

    // 새 버전 서버 백그라운드 재실행
    const serverEntry = path.join(ROOT_DIR, 'server', 'server.js');
    const child = spawn(process.execPath, [serverEntry], {
      cwd: ROOT_DIR,
      detached: true,
      windowsHide: true,
      stdio: 'ignore',
      env: { ...process.env }
    });
    child.unref();
  } catch (err) {
    const errLog = path.join(ROOT_DIR, 'data', 'update_error.log');
    try {
      fs.appendFileSync(errLog, `[${new Date().toISOString()}] ${err.stack || err.message}\n`);
    } catch {}
    // 실패하더라도 기존 서버가 죽어있지 않도록 재기동 보장
    const serverEntry = path.join(ROOT_DIR, 'server', 'server.js');
    const child = spawn(process.execPath, [serverEntry], {
      cwd: ROOT_DIR,
      detached: true,
      windowsHide: true,
      stdio: 'ignore',
      env: { ...process.env }
    });
    child.unref();
  }
}

run();
