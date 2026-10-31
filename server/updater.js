import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import axios from 'axios';
import AdmZip from 'adm-zip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const UPDATE_TMP_DIR = path.join(DATA_DIR, '.update_tmp');
const LAST_UPDATE_FILE = path.join(DATA_DIR, 'last_update.json');

let ioInstance = null;
let checkTimer = null;

// 런타임 업데이트 상태 캐시
let updateState = {
  currentVersion: '1.0.0',
  latestVersion: '1.0.0',
  updateAvailable: false,
  configured: false,
  repo: '',
  releaseUrl: '',
  downloadUrl: '',
  publishedAt: '',
  changelog: [],
  checking: false,
  updating: false,
  phase: 'idle', // 'idle' | 'checking' | 'downloading' | 'applying' | 'restarting' | 'error'
  lastCheckedAt: 0,
  error: null,
  justUpdated: null
};

export function setUpdaterSocketIO(io) {
  ioInstance = io;
}

function broadcastUpdateState() {
  if (ioInstance) {
    ioInstance.emit('update_state', getUpdateState());
  }
}

export function readCurrentVersion(rootDir = ROOT_DIR) {
  try {
    const pkgPath = path.join(rootDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.version) return String(pkg.version).trim();
    }
  } catch {}
  try {
    const verPath = path.join(rootDir, 'version.json');
    if (fs.existsSync(verPath)) {
      const ver = JSON.parse(fs.readFileSync(verPath, 'utf-8'));
      if (ver.version) return String(ver.version).trim();
    }
  } catch {}
  return '1.0.0';
}

export function readReleaseConfig(rootDir = ROOT_DIR) {
  const defaultCfg = {
    appName: 'ShaBot',
    repo: '',
    branch: 'main',
    checkIntervalMinutes: 30,
    manifestUrl: '',
    protectedPaths: [
      'data',
      'runtime',
      '.env',
      '.git',
      'dist-release',
      'release.config.local.json',
      '제작자_업데이트_배포.bat'
    ]
  };

  let merged = { ...defaultCfg };
  try {
    const cfgPath = path.join(rootDir, 'release.config.json');
    if (fs.existsSync(cfgPath)) {
      merged = { ...merged, ...JSON.parse(fs.readFileSync(cfgPath, 'utf-8')) };
    }
  } catch {}

  try {
    const localCfgPath = path.join(rootDir, 'release.config.local.json');
    if (fs.existsSync(localCfgPath)) {
      merged = { ...merged, ...JSON.parse(fs.readFileSync(localCfgPath, 'utf-8')) };
    }
  } catch {}

  if (process.env.SHABOT_UPDATE_REPO) {
    merged.repo = process.env.SHABOT_UPDATE_REPO.trim();
  }
  if (process.env.SHABOT_UPDATE_MANIFEST_URL) {
    merged.manifestUrl = process.env.SHABOT_UPDATE_MANIFEST_URL.trim();
  }

  // GitHub 전체 URL이 입력된 경우 owner/repo 형식으로 정규화
  if (merged.repo) {
    merged.repo = normalizeGitHubRepo(merged.repo);
  }

  return merged;
}

export function normalizeGitHubRepo(input = '') {
  const trimmed = String(input).trim().replace(/\.git$/i, '').replace(/\/+$/, '');
  const match = trimmed.match(/github\.com[/:]([^/]+\/[^/]+)/i);
  if (match) return match[1];
  if (/^[^/\s]+\/[^/\s]+$/.test(trimmed)) return trimmed;
  return '';
}

export function compareSemver(vA, vB) {
  const clean = (v) => String(v || '0.0.0').replace(/^v/i, '').split('-')[0].split('.').map(n => parseInt(n, 10) || 0);
  const a = clean(vA);
  const b = clean(vB);
  for (let i = 0; i < 3; i++) {
    if ((a[i] || 0) > (b[i] || 0)) return 1;
    if ((a[i] || 0) < (b[i] || 0)) return -1;
  }
  return 0;
}

function parseChangelogBody(body) {
  if (!body) return [];
  if (Array.isArray(body)) return body.filter(Boolean);
  return String(body)
    .split(/\r?\n/)
    .map(line => line.replace(/^[-*•]\s*/, '').trim())
    .filter(line => line && !line.startsWith('#'));
}

export function loadJustUpdatedNotice() {
  try {
    if (fs.existsSync(LAST_UPDATE_FILE)) {
      const raw = JSON.parse(fs.readFileSync(LAST_UPDATE_FILE, 'utf-8'));
      // 최근 24시간 이내 업데이트 결과만 유지
      if (raw && Date.now() - (raw.updatedAt || 0) < 86400000) {
        return raw;
      }
    }
  } catch {}
  return null;
}

export function dismissJustUpdatedNotice() {
  updateState.justUpdated = null;
  try {
    if (fs.existsSync(LAST_UPDATE_FILE)) fs.unlinkSync(LAST_UPDATE_FILE);
  } catch {}
  broadcastUpdateState();
}

export function getUpdateState() {
  const cfg = readReleaseConfig();
  const currentVersion = readCurrentVersion();
  updateState.currentVersion = currentVersion;
  updateState.repo = cfg.repo || '';
  updateState.configured = Boolean(cfg.repo || cfg.manifestUrl);
  if (!updateState.justUpdated) {
    updateState.justUpdated = loadJustUpdatedNotice();
  }
  return { ...updateState };
}

/**
 * 원격 GitHub Releases (또는 커스텀 매니페스트 URL)에서 최신 버전을 조회합니다.
 */
export async function checkForUpdate({ timeoutMs = 4500 } = {}) {
  const cfg = readReleaseConfig();
  const currentVersion = readCurrentVersion();

  updateState.currentVersion = currentVersion;
  updateState.repo = cfg.repo || '';
  updateState.configured = Boolean(cfg.repo || cfg.manifestUrl);

  if (!updateState.configured) {
    updateState.latestVersion = currentVersion;
    updateState.updateAvailable = false;
    updateState.phase = 'idle';
    updateState.error = null;
    return getUpdateState();
  }

  updateState.checking = true;
  updateState.phase = 'checking';
  updateState.error = null;
  broadcastUpdateState();

  try {
    let remoteVersion = currentVersion;
    let downloadUrl = '';
    let releaseUrl = '';
    let publishedAt = '';
    let changelog = [];
    let sha256 = '';

    // 1. 커스텀 매니페스트 URL이 지정된 경우 (사설 서버 또는 로컬 E2E 테스트 지원)
    if (cfg.manifestUrl) {
      let data = {};
      if (cfg.manifestUrl.startsWith('file://')) {
        data = JSON.parse(fs.readFileSync(fileURLToPath(cfg.manifestUrl), 'utf-8'));
      } else {
        const res = await axios.get(cfg.manifestUrl, { timeout: timeoutMs });
        data = res.data || {};
      }
      remoteVersion = String(data.version || currentVersion).replace(/^v/i, '');
      downloadUrl = data.downloadUrl || '';
      releaseUrl = data.releaseUrl || cfg.manifestUrl;
      publishedAt = data.releasedAt || data.publishedAt || '';
      changelog = parseChangelogBody(data.changelog || data.notes);
      sha256 = data.sha256 || data.updateSha256 || '';
    } else if (cfg.repo) {
      // 2. GitHub 공식 Releases API 우선 조회
      const headers = {
        'User-Agent': 'ShaBot-AutoUpdater',
        'Accept': 'application/vnd.github+json'
      };
      try {
        const relRes = await axios.get(`https://api.github.com/repos/${cfg.repo}/releases/latest`, {
          headers,
          timeout: timeoutMs
        });
        const rel = relRes.data;
        remoteVersion = String(rel.tag_name || rel.name || currentVersion).replace(/^v/i, '').trim();
        releaseUrl = rel.html_url || `https://github.com/${cfg.repo}/releases`;
        publishedAt = rel.published_at || '';
        changelog = parseChangelogBody(rel.body);

        const assets = Array.isArray(rel.assets) ? rel.assets : [];
        // 경량 업데이트 패키지(ShaBot-Update-*.zip) 최우선, 없으면 포터블 전체 ZIP, 없으면 zipball
        const updateAsset =
          assets.find(a => /ShaBot-Update-.*\.zip$/i.test(a.name)) ||
          assets.find(a => /ShaBot-Portable-.*\.zip$/i.test(a.name)) ||
          assets.find(a => /\.zip$/i.test(a.name));

        downloadUrl = updateAsset ? updateAsset.browser_download_url : (rel.zipball_url || '');

        // manifest.json 에셋이 함께 첨부되어 있다면 SHA-256 해시 확인
        const manifestAsset = assets.find(a => a.name === 'manifest.json');
        if (manifestAsset?.browser_download_url) {
          try {
            const mRes = await axios.get(manifestAsset.browser_download_url, { timeout: 3000 });
            if (mRes.data?.updateSha256 && updateAsset?.name?.includes('Update')) {
              sha256 = mRes.data.updateSha256;
            }
            if (Array.isArray(mRes.data?.changelog) && mRes.data.changelog.length > 0) {
              changelog = mRes.data.changelog;
            }
          } catch {}
        }
      } catch (ghErr) {
        // 아직 GitHub Release가 하나도 없을 경우(404), 기본 브랜치의 version.json 확인
        if (ghErr.response?.status === 404) {
          const branch = cfg.branch || 'main';
          const verRes = await axios.get(`https://raw.githubusercontent.com/${cfg.repo}/${branch}/version.json`, {
            timeout: timeoutMs
          });
          if (verRes.data?.version) {
            remoteVersion = String(verRes.data.version).replace(/^v/i, '').trim();
            publishedAt = verRes.data.releasedAt || '';
            changelog = parseChangelogBody(verRes.data.changelog);
            releaseUrl = `https://github.com/${cfg.repo}`;
            downloadUrl = verRes.data.downloadUrl || `https://api.github.com/repos/${cfg.repo}/zipball/${branch}`;
          }
        } else {
          throw ghErr;
        }
      }
    }

    const isNewer = compareSemver(remoteVersion, currentVersion) > 0 && Boolean(downloadUrl);

    updateState = {
      ...updateState,
      currentVersion,
      latestVersion: remoteVersion || currentVersion,
      updateAvailable: isNewer,
      releaseUrl,
      downloadUrl,
      publishedAt,
      changelog,
      sha256,
      checking: false,
      phase: 'idle',
      lastCheckedAt: Date.now(),
      error: null
    };
  } catch (err) {
    updateState.checking = false;
    updateState.phase = 'idle';
    updateState.lastCheckedAt = Date.now();
    updateState.error = err.message || '업데이트 확인 실패';
  }

  broadcastUpdateState();
  return getUpdateState();
}

/**
 * 최신 업데이트 ZIP을 다운로드하고 무결성을 검증한 뒤 임시 스테이징 폴더에 준비합니다.
 */
export async function downloadAndStageUpdate({ backupFn } = {}) {
  const state = await checkForUpdate({ timeoutMs: 8000 });
  if (!state.updateAvailable || !state.downloadUrl) {
    throw new Error('적용 가능한 새 업데이트가 없습니다.');
  }

  updateState.updating = true;
  updateState.phase = 'downloading';
  updateState.error = null;
  broadcastUpdateState();

  try {
    if (typeof backupFn === 'function') {
      backupFn(`pre_update_v${state.currentVersion}`);
    }

    if (fs.existsSync(UPDATE_TMP_DIR)) {
      fs.rmSync(UPDATE_TMP_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(UPDATE_TMP_DIR, { recursive: true });

    const zipPath = path.join(UPDATE_TMP_DIR, 'update.zip');

    // 로컬 파일 프로토콜(file://) 및 원격 HTTP(S) 모두 지원
    if (state.downloadUrl.startsWith('file://')) {
      const localSrc = fileURLToPath(state.downloadUrl);
      fs.copyFileSync(localSrc, zipPath);
    } else {
      const response = await axios.get(state.downloadUrl, {
        responseType: 'arraybuffer',
        timeout: 60000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        headers: { 'User-Agent': 'ShaBot-AutoUpdater' }
      });
      fs.writeFileSync(zipPath, Buffer.from(response.data));
    }

    // SHA-256 해시 검증 (제공된 경우)
    if (state.sha256) {
      const fileBuf = fs.readFileSync(zipPath);
      const actualHash = crypto.createHash('sha256').update(fileBuf).digest('hex');
      if (actualHash.toLowerCase() !== state.sha256.toLowerCase()) {
        throw new Error('업데이트 파일 해시 검증에 실패했습니다 (파일 손상 감지).');
      }
    }

    // ZIP 압축 무결성 및 필수 파일(package.json) 존재 여부 검증
    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();
    if (!entries || entries.length === 0) {
      throw new Error('빈 업데이트 압축 파일입니다.');
    }

    const meta = {
      fromVersion: state.currentVersion,
      toVersion: state.latestVersion,
      changelog: state.changelog || [],
      stagedAt: Date.now(),
      zipPath
    };
    fs.writeFileSync(path.join(UPDATE_TMP_DIR, 'meta.json'), JSON.stringify(meta, null, 2), 'utf-8');

    return meta;
  } catch (err) {
    updateState.updating = false;
    updateState.phase = 'error';
    updateState.error = err.message;
    broadcastUpdateState();
    throw err;
  }
}

/**
 * 스테이징된 update.zip을 루트 폴더에 안전하게 덮어씌웁니다.
 * data/, runtime/, node_modules/, .env 등 보호 경로는 절대 덮어쓰거나 삭제하지 않습니다.
 */
export function extractStagedUpdate({ zipPath, rootDir = ROOT_DIR, fromVersion = '', toVersion = '', changelog = [] }) {
  const cfg = readReleaseConfig(rootDir);
  const protectedTopDirs = new Set([
    ...(cfg.protectedPaths || []),
    'data',
    'runtime',
    'node_modules',
    '.git',
    '.env',
    'dist-release',
    'release.config.local.json',
    '제작자_업데이트_배포.bat'
  ].map(p => p.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase()));

  let oldDepsJson = '{}';
  try {
    const oldPkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
    oldDepsJson = JSON.stringify(oldPkg.dependencies || {});
  } catch {}

  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries().filter(e => !e.isDirectory);

  // 모든 항목이 단일 최상위 폴더(예: ShaBot/ 또는 owner-repo-sha/) 안에 들어있는지 자동 판별
  let stripPrefix = '';
  if (entries.length > 0) {
    const firstParts = entries.map(e => e.entryName.replace(/\\/g, '/').split('/')[0]);
    const candidate = firstParts[0];
    const hasRootPackageJson = entries.some(e => e.entryName.replace(/\\/g, '/') === 'package.json');
    if (!hasRootPackageJson && candidate && firstParts.every(p => p === candidate)) {
      stripPrefix = candidate + '/';
    }
  }

  // 새 프론트엔드 번들이 포함되어 있으면 구버전 해시 에셋 정리
  const hasNewDistIndex = entries.some(e => {
    let rp = e.entryName.replace(/\\/g, '/');
    if (stripPrefix && rp.startsWith(stripPrefix)) rp = rp.slice(stripPrefix.length);
    return rp === 'client/dist/index.html';
  });
  if (hasNewDistIndex) {
    const oldAssetsDir = path.join(rootDir, 'client', 'dist', 'assets');
    if (fs.existsSync(oldAssetsDir)) {
      try {
        fs.rmSync(oldAssetsDir, { recursive: true, force: true });
      } catch {}
    }
  }

  for (const entry of entries) {
    let relPath = entry.entryName.replace(/\\/g, '/');
    if (stripPrefix && relPath.startsWith(stripPrefix)) {
      relPath = relPath.slice(stripPrefix.length);
    }
    if (!relPath || relPath.includes('..')) continue;

    const topSegment = relPath.split('/')[0].toLowerCase();
    const normalizedLower = relPath.toLowerCase();

    if (
      protectedTopDirs.has(topSegment) ||
      protectedTopDirs.has(normalizedLower) ||
      normalizedLower.startsWith('client/node_modules/')
    ) {
      continue;
    }

    const targetPath = path.join(rootDir, relPath);
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.writeFileSync(targetPath, entry.getData());
  }

  // 신규 package.json에 의존성 패키지가 추가/변경된 경우에만 npm install 자동 실행
  let newDepsJson = '{}';
  let resolvedNewVersion = toVersion;
  try {
    const newPkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
    newDepsJson = JSON.stringify(newPkg.dependencies || {});
    if (!resolvedNewVersion && newPkg.version) resolvedNewVersion = newPkg.version;
  } catch {}

  if (oldDepsJson !== newDepsJson) {
    const npmBin = getPortableOrSystemNpm(rootDir);
    try {
      execSync(`"${npmBin}" install --omit=dev --no-audit --no-fund`, {
        cwd: rootDir,
        stdio: 'inherit'
      });
    } catch (npmErr) {
      console.warn('[Updater] npm install warning:', npmErr.message);
    }
  }

  // 업데이트 완료 기록 저장
  try {
    const targetDataDir = path.join(rootDir, 'data');
    if (!fs.existsSync(targetDataDir)) fs.mkdirSync(targetDataDir, { recursive: true });
    fs.writeFileSync(
      path.join(targetDataDir, 'last_update.json'),
      JSON.stringify({
        fromVersion: fromVersion || '이전 버전',
        toVersion: resolvedNewVersion || readCurrentVersion(rootDir),
        changelog,
        updatedAt: Date.now()
      }, null, 2),
      'utf-8'
    );
  } catch {}

  // 임시 파일 정리
  try {
    if (fs.existsSync(UPDATE_TMP_DIR)) {
      fs.rmSync(UPDATE_TMP_DIR, { recursive: true, force: true });
    }
  } catch {}
}

function getPortableOrSystemNpm(rootDir = ROOT_DIR) {
  const portableNpm = path.join(rootDir, 'runtime', 'node', process.platform === 'win32' ? 'npm.cmd' : 'bin/npm');
  if (fs.existsSync(portableNpm)) return portableNpm;
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

/**
 * 실행 중인 서버에서 분리된 워커 프로세스를 띄워 무중단(2초 재시작) 업데이트를 수행합니다.
 */
export function spawnLiveUpdateWorkerAndRestart({ server, meta }) {
  updateState.updating = true;
  updateState.phase = 'restarting';
  broadcastUpdateState();

  const workerScript = path.join(ROOT_DIR, 'scripts', 'applyUpdateWorker.js');
  const child = spawn(
    process.execPath,
    [workerScript, String(process.pid), meta.zipPath, meta.fromVersion || '', meta.toVersion || ''],
    {
      cwd: ROOT_DIR,
      detached: true,
      windowsHide: true,
      stdio: 'ignore',
      env: { ...process.env }
    }
  );
  child.unref();

  setTimeout(() => {
    try {
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(0), 600);
    } catch {
      process.exit(0);
    }
  }, 350);
}

/**
 * 백그라운드 정기 업데이트 확인 스케줄러 시작
 */
export function startUpdateChecker(io) {
  if (io) setUpdaterSocketIO(io);
  if (checkTimer) clearInterval(checkTimer);

  const cfg = readReleaseConfig();
  const intervalMs = Math.max(5, Number(cfg.checkIntervalMinutes) || 30) * 60 * 1000;

  // 서버 기동 5초 후 최초 확인
  setTimeout(() => {
    checkForUpdate().catch(() => {});
  }, 5000);

  checkTimer = setInterval(() => {
    checkForUpdate().catch(() => {});
  }, intervalMs);
}
