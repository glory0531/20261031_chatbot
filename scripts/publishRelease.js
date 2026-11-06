import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import readline from 'readline';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_RELEASE_DIR = path.join(ROOT_DIR, 'dist-release');

const args = process.argv.slice(2);
const isCi = args.includes('--ci');
const isLocalOnly = args.includes('--local-only') || isCi;

function getArgValue(prefix) {
  const found = args.find((a) => a.startsWith(`${prefix}=`));
  return found ? found.slice(prefix.length + 1).trim() : null;
}

function ask(rl, question) {
  return new Promise((resolve) => rl.question(question, (ans) => resolve(ans.trim())));
}

function parseGithubRepo(input) {
  if (!input) return '';
  let cleaned = input.trim().replace(/\.git$/i, '').replace(/\/+$/, '');
  const matchUrl = cleaned.match(/github\.com[:/]([^/]+\/[^/]+)$/i);
  if (matchUrl) return matchUrl[1];
  if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(cleaned)) return cleaned;
  return '';
}

function bumpSemver(current, type) {
  const parts = String(current || '1.0.0')
    .replace(/^v/i, '')
    .split('.')
    .map((n) => parseInt(n, 10) || 0);
  while (parts.length < 3) parts.push(0);
  if (type === 'major') return `${parts[0] + 1}.0.0`;
  if (type === 'minor') return `${parts[0]}.${parts[1] + 1}.0`;
  return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function addDirectoryFiltered(zip, absDir, zipPrefix, filterFn) {
  if (!fs.existsSync(absDir)) return;
  const entries = fs.readdirSync(absDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(absDir, entry.name);
    const relZipPath = zipPrefix ? `${zipPrefix}/${entry.name}` : entry.name;
    if (filterFn && !filterFn(relZipPath, entry)) continue;
    if (entry.isDirectory()) {
      addDirectoryFiltered(zip, fullPath, relZipPath, filterFn);
    } else if (entry.isFile()) {
      const parentZipFolder = path.posix.dirname(relZipPath);
      zip.addLocalFile(fullPath, parentZipFolder === '.' ? '' : parentZipFolder);
    }
  }
}

function addCoreAppFilesToZip(zip) {
  // 1. 서버 코드
  addDirectoryFiltered(zip, path.join(ROOT_DIR, 'server'), 'server');

  // 2. 빌드된 프론트엔드 정적 에셋
  addDirectoryFiltered(zip, path.join(ROOT_DIR, 'client', 'dist'), 'client/dist');

  // 3. 사용자용 스크립트 (제작자 배포 전용 publishRelease.js 제외)
  addDirectoryFiltered(
    zip,
    path.join(ROOT_DIR, 'scripts'),
    'scripts',
    (relPath) => !relPath.endsWith('publishRelease.js')
  );

  // 4. 루트 필수 파일 및 사용자용 실행 배치파일
  const rootFiles = [
    '1_샤봇_시작.bat',
    '2_샤봇_종료.bat',
    '3_시청자_공개링크_열기.bat',
    '4_데이터_관리_및_백업.bat',
    '5_수동_업데이트_확인.bat',
    '6_공개링크_종료.bat',
    'package.json',
    'package-lock.json',
    'release.config.json',
    'version.json',
    'README.md',
    '무료_배포_사용설명서.md',
    'LICENSE',
    'Dockerfile',
    'docker-compose.yml',
    '.dockerignore'
  ];

  for (const fileName of rootFiles) {
    const fullPath = path.join(ROOT_DIR, fileName);
    if (fs.existsSync(fullPath)) {
      zip.addLocalFile(fullPath, '');
    }
  }
}

function ensureGitConfig() {
  try {
    execSync('git rev-parse --is-inside-work-tree', { cwd: ROOT_DIR, stdio: 'ignore' });
  } catch {
    execSync('git init -b main', { cwd: ROOT_DIR, stdio: 'inherit' });
  }

  let userName = '';
  let userEmail = '';
  try {
    userName = execSync('git config user.name', { cwd: ROOT_DIR, encoding: 'utf-8' }).trim();
  } catch {}
  try {
    userEmail = execSync('git config user.email', { cwd: ROOT_DIR, encoding: 'utf-8' }).trim();
  } catch {}

  if (!userName) {
    execSync('git config user.name "ShaBot Publisher"', { cwd: ROOT_DIR });
  }
  if (!userEmail) {
    execSync('git config user.email "publisher@shabot.local"', { cwd: ROOT_DIR });
  }
}

function configureGitRemote(repoSlug) {
  if (!repoSlug) return;
  const remoteUrl = `https://github.com/${repoSlug}.git`;
  try {
    const existing = execSync('git remote get-url origin', { cwd: ROOT_DIR, encoding: 'utf-8' }).trim();
    if (existing !== remoteUrl) {
      execSync(`git remote set-url origin "${remoteUrl}"`, { cwd: ROOT_DIR, stdio: 'inherit' });
    }
  } catch {
    execSync(`git remote add origin "${remoteUrl}"`, { cwd: ROOT_DIR, stdio: 'inherit' });
  }
}

async function main() {
  const pkgPath = path.join(ROOT_DIR, 'package.json');
  const lockPath = path.join(ROOT_DIR, 'package-lock.json');
  const verPath = path.join(ROOT_DIR, 'version.json');
  const releaseCfgPath = path.join(ROOT_DIR, 'release.config.json');

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const verInfo = fs.existsSync(verPath)
    ? JSON.parse(fs.readFileSync(verPath, 'utf-8'))
    : { version: pkg.version || '1.0.0', changelog: [] };
  const releaseCfg = fs.existsSync(releaseCfgPath)
    ? JSON.parse(fs.readFileSync(releaseCfgPath, 'utf-8'))
    : {
        provider: 'github',
        repo: '',
        branch: 'main',
        checkIntervalMinutes: 30,
        updateAssetPrefix: 'ShaBot-Update-',
        portableAssetPrefix: 'ShaBot-Portable-'
      };

  const currentVersion = pkg.version || verInfo.version || '1.0.0';
  let targetVersion = getArgValue('--version') || currentVersion;
  let changelog = verInfo.changelog?.length ? verInfo.changelog : ['정식 배포 패키지 빌드 및 안정화'];
  let shouldPushGit = !isLocalOnly;

  const notesArg = getArgValue('--notes');
  if (notesArg) {
    changelog = notesArg.split('|').map((s) => s.trim()).filter(Boolean);
  }

  const repoArg = getArgValue('--repo');
  if (repoArg) {
    const parsed = parseGithubRepo(repoArg);
    if (parsed) releaseCfg.repo = parsed;
  }

  if (!isCi && !args.includes('--local-only') && !getArgValue('--version')) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
      console.log('==============================================================');
      console.log('   🚀 [오픈 샤봇] 제작자 원클릭 배포 & 전체 자동 업데이트 발행기');
      console.log('==============================================================');
      console.log(` 📌 현재 버전: v${currentVersion}`);
      console.log(` 🔗 연결된 GitHub 저장소: ${releaseCfg.repo ? `https://github.com/${releaseCfg.repo}` : '(아직 설정되지 않음)'}`);
      console.log('--------------------------------------------------------------');

      // 1. GitHub 저장소 최초 1회 설정
      if (!releaseCfg.repo) {
        console.log('\n[1단계] 원격 자동 업데이트용 GitHub 공개(Public) 저장소를 연결합니다.');
        console.log('  예시: https://github.com/내아이디/ShaBot-Official');
        console.log('  (아직 저장소를 안 만드셨다면 그냥 Enter를 누르세요! 로컬 배포용 ZIP만 먼저 생성합니다.)');
        const repoInput = await ask(rl, '👉 GitHub 저장소 주소 입력: ');
        if (repoInput) {
          const parsedRepo = parseGithubRepo(repoInput);
          if (!parsedRepo) {
            console.log('❌ 올바른 GitHub 주소 형식이 아닙니다. (예: https://github.com/id/repo)');
            process.exit(1);
          }
          releaseCfg.repo = parsedRepo;
          fs.writeFileSync(releaseCfgPath, JSON.stringify(releaseCfg, null, 2) + '\n', 'utf-8');
          console.log(`✅ 저장소 연결 완료: ${releaseCfg.repo}`);
        } else {
          shouldPushGit = false;
          console.log('ℹ️  원격 푸시 없이 로컬 배포용 ZIP 패키지(dist-release/)만 생성합니다.');
        }
      }

      // 2. 버전 선택
      const nextPatch = bumpSemver(currentVersion, 'patch');
      const nextMinor = bumpSemver(currentVersion, 'minor');
      const nextMajor = bumpSemver(currentVersion, 'major');

      console.log('\n[2단계] 배포할 새 버전을 선택하세요:');
      console.log(`  [1] 패치 업데이트 -> v${nextPatch} (버그 수정 / 소규모 개선 - 기본 추천)`);
      console.log(`  [2] 마이너 업데이트 -> v${nextMinor} (새로운 기능 추가)`);
      console.log(`  [3] 메이저 업데이트 -> v${nextMajor} (대규모 개편)`);
      console.log(`  [4] 현재 버전 유지 -> v${currentVersion} (최초 v${currentVersion} 배포용)`);
      console.log('  * 직접 버전 번호(예: 1.0.5)를 입력하셔도 됩니다.');

      const verChoice = await ask(rl, `👉 선택 (기본값 1 -> v${nextPatch}): `);
      if (!verChoice || verChoice === '1') targetVersion = nextPatch;
      else if (verChoice === '2') targetVersion = nextMinor;
      else if (verChoice === '3') targetVersion = nextMajor;
      else if (verChoice === '4') targetVersion = currentVersion;
      else targetVersion = verChoice.replace(/^v/i, '');

      // 3. 변경사항(Changelog) 입력
      console.log('\n[3단계] 사용자 대시보드에 표시할 업데이트 내용을 입력하세요.');
      console.log('  (쉼표(,)로 여러 줄 구분 가능 / 비워두면 기본 문구 사용)');
      const notesInput = await ask(rl, '👉 변경 내역: ');
      if (notesInput) {
        changelog = notesInput
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
    } finally {
      rl.close();
    }
  }

  targetVersion = targetVersion.replace(/^v/i, '');
  const releasedAt = new Date().toISOString().split('T')[0];

  // CI 태그에서 실행된 경우 GITHUB_REPOSITORY 자동 반영 가능
  if (isCi && !releaseCfg.repo && process.env.GITHUB_REPOSITORY) {
    releaseCfg.repo = process.env.GITHUB_REPOSITORY;
  }

  if (!isCi) {
    // 1) 버전 메타데이터 갱신
    pkg.version = targetVersion;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');

    if (fs.existsSync(lockPath)) {
      try {
        const lockJson = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
        lockJson.version = targetVersion;
        if (lockJson.packages && lockJson.packages['']) {
          lockJson.packages[''].version = targetVersion;
        }
        fs.writeFileSync(lockPath, JSON.stringify(lockJson, null, 2) + '\n', 'utf-8');
      } catch {}
    }

    const updatedVerJson = {
      version: targetVersion,
      releasedAt,
      channel: 'stable',
      changelog
    };
    fs.writeFileSync(verPath, JSON.stringify(updatedVerJson, null, 2) + '\n', 'utf-8');
    fs.writeFileSync(releaseCfgPath, JSON.stringify(releaseCfg, null, 2) + '\n', 'utf-8');

    // 2) 프론트엔드 최신 프로덕션 빌드
    console.log('\n🔨 [1/3] 웹 대시보드 프로덕션 빌드 중 (client/dist)...');
    execSync('npm --prefix client run build', { cwd: ROOT_DIR, stdio: 'inherit' });
  } else {
    fs.writeFileSync(releaseCfgPath, JSON.stringify(releaseCfg, null, 2) + '\n', 'utf-8');
    // CI 모드에서는 client/dist가 아직 없으면 빌드
    if (!fs.existsSync(path.join(ROOT_DIR, 'client', 'dist', 'index.html'))) {
      console.log('\n🔨 [CI] client/dist 프로덕션 빌드 실행...');
      execSync('npm --prefix client run build', { cwd: ROOT_DIR, stdio: 'inherit' });
    }
  }

  // 3) 배포용 ZIP 아카이브 2종 + manifest.json 생성
  console.log(`\n📦 [2/3] 배포 패키지 생성 중 (v${targetVersion})...`);
  if (!fs.existsSync(DIST_RELEASE_DIR)) {
    fs.mkdirSync(DIST_RELEASE_DIR, { recursive: true });
  }

  const updateFileName = `ShaBot-Update-v${targetVersion}.zip`;
  const portableFileName = `ShaBot-Portable-v${targetVersion}.zip`;
  const updateZipPath = path.join(DIST_RELEASE_DIR, updateFileName);
  const portableZipPath = path.join(DIST_RELEASE_DIR, portableFileName);
  const manifestPath = path.join(DIST_RELEASE_DIR, 'manifest.json');

  // 3-A. 경량 OTA 업데이트 패치 ZIP (기존 사용자 자동 업데이트용)
  const updateZip = new AdmZip();
  addCoreAppFilesToZip(updateZip);
  updateZip.writeZip(updateZipPath);

  // 3-B. 올인원 포터블 배포 ZIP (신규 스트리머 최초 다운로드용 - runtime/node + node_modules 포함)
  const runtimeNodeDir = path.join(ROOT_DIR, 'runtime', 'node');
  const runtimeNodeExe = path.join(runtimeNodeDir, 'node.exe');
  if (!fs.existsSync(runtimeNodeExe)) {
    console.log('📥 포터블 node.exe 패키징 준비 중 (자동 다운로드)...');
    fs.mkdirSync(runtimeNodeDir, { recursive: true });
    try {
      execSync('powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri \'https://nodejs.org/dist/v22.14.0/win-x64/node.exe\' -OutFile \'' + runtimeNodeExe.replace(/\\/g, '/') + '\' -UseBasicParsing"', { stdio: 'inherit' });
    } catch (e) {
      console.warn('⚠️ 포터블 node.exe 다운로드 실패:', e.message);
    }
  }

  const portableZip = new AdmZip();
  addCoreAppFilesToZip(portableZip);

  if (fs.existsSync(runtimeNodeExe)) {
    portableZip.addLocalFile(runtimeNodeExe, 'runtime/node');
    console.log('   📦 [Portable] 독립 실행 엔진(runtime/node/node.exe) 패키징 포함 완료');
  }
  const devOnlyDirs = new Set([
    'node_modules/.bin',
    'node_modules/concurrently',
    'node_modules/rxjs',
    'node_modules/@types',
    'node_modules/undici-types'
  ]);
  addDirectoryFiltered(portableZip, path.join(ROOT_DIR, 'node_modules'), 'node_modules', (relPath) => {
    for (const skip of devOnlyDirs) {
      if (relPath === skip || relPath.startsWith(`${skip}/`)) return false;
    }
    return true;
  });
  portableZip.writeZip(portableZipPath);

  const updateSha256 = sha256File(updateZipPath);
  const portableSha256 = sha256File(portableZipPath);

  const manifest = {
    version: targetVersion,
    releasedAt,
    changelog,
    updateAsset: updateFileName,
    updateSha256,
    portableAsset: portableFileName,
    portableSha256
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');

  const updateSizeMb = (fs.statSync(updateZipPath).size / (1024 * 1024)).toFixed(2);
  const portableSizeMb = (fs.statSync(portableZipPath).size / (1024 * 1024)).toFixed(2);

  console.log(`   ✅ 경량 업데이트 번들: dist-release/${updateFileName} (${updateSizeMb} MB)`);
  console.log(`   ✅ 신규 배포용 포터블: dist-release/${portableFileName} (${portableSizeMb} MB)`);
  console.log(`   ✅ 무결성 매니페스트 : dist-release/manifest.json`);

  // 4) Git 커밋 + 태그 + 원격 푸시 (GitHub Actions가 자동으로 Release 에셋 게시!)
  if (shouldPushGit && releaseCfg.repo) {
    console.log(`\n🌐 [3/3] GitHub(${releaseCfg.repo})로 v${targetVersion} 업데이트 발행 중...`);
    ensureGitConfig();
    configureGitRemote(releaseCfg.repo);

    execSync('git add -A', { cwd: ROOT_DIR, stdio: 'inherit' });
    try {
      execSync(`git commit -m "chore(release): v${targetVersion}"`, { cwd: ROOT_DIR, stdio: 'inherit' });
    } catch {
      console.log('ℹ️  변경된 커밋 파일이 없어 기존 커밋에 태그를 생성합니다.');
    }

    const tagName = `v${targetVersion}`;
    try {
      execSync(`git tag -f "${tagName}"`, { cwd: ROOT_DIR, stdio: 'inherit' });
    } catch {}

    const branch = releaseCfg.branch || 'main';
    execSync(`git push -u origin ${branch}`, { cwd: ROOT_DIR, stdio: 'inherit' });
    execSync(`git push -f origin "${tagName}"`, { cwd: ROOT_DIR, stdio: 'inherit' });

    console.log('\n==============================================================');
    console.log(` 🎉 [배포 완료] v${targetVersion} 업데이트가 성공적으로 발행되었습니다!`);
    console.log(` 🔗 릴리즈 확인: https://github.com/${releaseCfg.repo}/releases`);
    console.log(' 💡 약 1~2분 뒤 GitHub Actions 빌드가 끝나면 모든 사용자의 샤봇에');
    console.log('    자동으로 새 버전 알림과 시작 시 자동 패치가 적용됩니다!');
    console.log('==============================================================');
  } else if (!isCi) {
    console.log('\n==============================================================');
    console.log(` 🎉 [패키징 완료] 로컬 배포 파일이 준비되었습니다! (v${targetVersion})`);
    console.log(` 📂 폴더 위치: ${DIST_RELEASE_DIR}`);
    console.log(`   - 신규 사용자 전달용: ${portableFileName}`);
    console.log(`   - 자동 업데이트 패치용: ${updateFileName}`);
    if (!releaseCfg.repo) {
      console.log('\n 💡 모든 사용자 자동 업데이트를 켜시려면 GitHub 공개 저장소를 만든 뒤');
      console.log('    다시 [제작자_업데이트_배포.bat]을 실행해 주소를 1회 입력해 주세요!');
    }
    console.log('==============================================================');
  }
}

main().catch((err) => {
  console.error('\n❌ [배포 오류]:', err.message);
  process.exit(1);
});
