param(
  [string]$NodeVersion = "22.14.0",
  [switch]$EnsureNpm
)

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RootDir = (Resolve-Path (Join-Path $ScriptDir "..")).Path
$RuntimeDir = Join-Path $RootDir "runtime"
$NodeDir = Join-Path $RuntimeDir "node"
$NodeExe = Join-Path $NodeDir "node.exe"
$NpmCmd = Join-Path $NodeDir "npm.cmd"

if ((Test-Path $NodeExe) -and (-not $EnsureNpm -or (Test-Path $NpmCmd))) {
  exit 0
}

$Arch = if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") { "arm64" } else { "x64" }
$ZipName = "node-v$NodeVersion-win-$Arch"
$ZipUrl = "https://nodejs.org/dist/v$NodeVersion/$ZipName.zip"
$TempZip = Join-Path $RuntimeDir "$ZipName.zip"
$TempExtract = Join-Path $RuntimeDir "_node_extract"

Write-Host ""
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "  [오픈 샤봇] 무설치 포터블 실행 엔진(Node.js + npm) 자동 준비 중" -ForegroundColor Yellow
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "  PC에 Node.js가 없어도 걱정하지 마세요!"
Write-Host "  샤봇 폴더(runtime/node)에 독립 실행 엔진을 직접 구성합니다."
Write-Host "  다운로드 주소: $ZipUrl"
Write-Host ""

New-Item -ItemType Directory -Force -Path $NodeDir | Out-Null

try {
  Write-Host "  [1/2] 공식 Node.js + npm 포터블 패키지 다운로드 중..." -ForegroundColor Gray
  Invoke-WebRequest -Uri $ZipUrl -OutFile $TempZip -UseBasicParsing

  Write-Host "  [2/2] 포터블 실행 엔진 압축 해제 중..." -ForegroundColor Gray
  if (Test-Path $TempExtract) { Remove-Item -Recurse -Force $TempExtract }
  Expand-Archive -Path $TempZip -DestinationPath $TempExtract -Force

  $InnerDir = Join-Path $TempExtract $ZipName
  if (-not (Test-Path (Join-Path $InnerDir "node.exe"))) {
    throw "압축 해제 후 node.exe를 찾을 수 없습니다."
  }

  Copy-Item -Path (Join-Path $InnerDir "*") -Destination $NodeDir -Recurse -Force

  if (-not (Test-Path $NodeExe)) {
    throw "node.exe 설치 확인에 실패했습니다."
  }

  Write-Host "  [완료] 포터블 실행 엔진(Node.js + npm) 준비가 끝났습니다!" -ForegroundColor Green
  Write-Host ""
  exit 0
} catch {
  Write-Host ""
  $errDetail = $_.Exception.Message
  Write-Host "  [오류] 포터블 Node.js 자동 준비에 실패했습니다: $errDetail" -ForegroundColor Red
  Write-Host "  인터넷 연결을 확인하시거나 https://nodejs.org 에서 LTS 버전을 설치해 주세요." -ForegroundColor Yellow
  Write-Host ""
  exit 1
} finally {
  if (Test-Path $TempZip) { Remove-Item -Force $TempZip -ErrorAction SilentlyContinue }
  if (Test-Path $TempExtract) { Remove-Item -Recurse -Force $TempExtract -ErrorAction SilentlyContinue }
}
