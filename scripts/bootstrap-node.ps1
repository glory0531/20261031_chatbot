param(
  [string]$NodeVersion = "20.18.3"
)

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RootDir = (Resolve-Path (Join-Path $ScriptDir "..")).Path
$RuntimeDir = Join-Path $RootDir "runtime"
$NodeDir = Join-Path $RuntimeDir "node"
$NodeExe = Join-Path $NodeDir "node.exe"

if (Test-Path $NodeExe) {
  exit 0
}

$Arch = if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") { "arm64" } else { "x64" }
$FolderName = "node-v$NodeVersion-win-$Arch"
$ZipUrl = "https://nodejs.org/dist/v$NodeVersion/$FolderName.zip"
$TmpZip = Join-Path $RuntimeDir "node-portable.zip"
$TmpExtract = Join-Path $RuntimeDir "_extract_tmp"

Write-Host ""
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "  [오픈 샤봇] 최초 1회 포터블 실행 엔진(Node.js) 자동 준비 중" -ForegroundColor Yellow
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "  PC에 Node.js가 없어도 걱정하지 마세요!"
Write-Host "  샤봇 폴더 내부(runtime/node)에만 독립 엔진을 자동으로 구성합니다."
Write-Host "  다운로드 주소: $ZipUrl"
Write-Host ""

New-Item -ItemType Directory -Force -Path $RuntimeDir | Out-Null

if (Test-Path $TmpZip) { Remove-Item -Force $TmpZip }
if (Test-Path $TmpExtract) { Remove-Item -Recurse -Force $TmpExtract }

try {
  Write-Host "  [1/2] 공식 Node.js 포터블 패키지 다운로드 중... (약 10~20초 소요)" -ForegroundColor Gray
  Invoke-WebRequest -Uri $ZipUrl -OutFile $TmpZip -UseBasicParsing

  Write-Host "  [2/2] 압축 해제 및 환경 구성 중..." -ForegroundColor Gray
  Expand-Archive -Path $TmpZip -DestinationPath $TmpExtract -Force

  $ExtractedInner = Join-Path $TmpExtract $FolderName
  if (-not (Test-Path $ExtractedInner)) {
    throw "압축 해제된 폴더를 찾을 수 없습니다: $ExtractedInner"
  }

  if (Test-Path $NodeDir) { Remove-Item -Recurse -Force $NodeDir }
  Move-Item -Path $ExtractedInner -Destination $NodeDir

  Remove-Item -Force $TmpZip -ErrorAction SilentlyContinue
  Remove-Item -Recurse -Force $TmpExtract -ErrorAction SilentlyContinue

  if (-not (Test-Path $NodeExe)) {
    throw "포터블 node.exe 설치 확인에 실패했습니다."
  }

  Write-Host "  [완료] 포터블 실행 엔진 준비가 끝났습니다!" -ForegroundColor Green
  Write-Host ""
  exit 0
} catch {
  Write-Host ""
  Write-Host "  [오류] 포터블 Node.js 자동 다운로드에 실패했습니다: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "  인터넷 연결을 확인하시거나 https://nodejs.org 에서 LTS 버전을 설치해 주세요." -ForegroundColor Yellow
  exit 1
}

