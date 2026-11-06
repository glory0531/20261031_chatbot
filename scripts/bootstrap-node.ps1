param(
  [string]$NodeVersion = "22.14.0"
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
$DirectNodeUrl = "https://nodejs.org/dist/v$NodeVersion/win-$Arch/node.exe"

Write-Host ""
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "  [오픈 샤봇] 무설치 포터블 실행 엔진(Node.js) 자동 준비 중" -ForegroundColor Yellow
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "  PC에 Node.js가 없어도 걱정하지 마세요!"
Write-Host "  샤봇 폴더(runtime/node)에 독립 실행 엔진을 직접 다운로드합니다."
Write-Host "  다운로드 주소: $DirectNodeUrl"
Write-Host ""

New-Item -ItemType Directory -Force -Path $NodeDir | Out-Null

try {
  Write-Host "  [1/1] 공식 독립 실행 엔진(node.exe) 다운로드 중... (약 5~10초 소요)" -ForegroundColor Gray
  Invoke-WebRequest -Uri $DirectNodeUrl -OutFile $NodeExe -UseBasicParsing

  if (-not (Test-Path $NodeExe)) {
    throw "node.exe 다운로드 확인에 실패했습니다."
  }

  Write-Host "  [완료] 포터블 실행 엔진 준비가 끝났습니다!" -ForegroundColor Green
  Write-Host ""
  exit 0
} catch {
  Write-Host ""
  $errDetail = $_.Exception.Message
  Write-Host "  [오류] 포터블 Node.js 자동 다운로드에 실패했습니다: $errDetail" -ForegroundColor Red
  Write-Host "  인터넷 연결을 확인하시거나 https://nodejs.org 에서 LTS 버전을 설치해 주세요." -ForegroundColor Yellow
  Write-Host ""
  exit 1
}
