@echo off
chcp 65001 >nul

pushd "%~dp0.."
set "ROOT_DIR=%CD%"
popd

set "PORTABLE_NODE_DIR=%ROOT_DIR%\runtime\node"
set "NODE_EXE="
set "NPM_CMD="

if exist "%PORTABLE_NODE_DIR%\node.exe" goto :USE_PORTABLE

where node >nul 2>nul
if errorlevel 1 goto :BOOTSTRAP

set "NODE_MAJOR="
for /f "delims=" %%v in ('node -p "process.versions.node.split('.')[0]" 2^>nul') do set "NODE_MAJOR=%%v"
if not defined NODE_MAJOR goto :BOOTSTRAP
if %NODE_MAJOR% LSS 18 goto :BOOTSTRAP

set "NODE_EXE=node"
set "NPM_CMD=npm"
goto :CHECK_MODULES

:BOOTSTRAP
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT_DIR%\scripts\bootstrap-node.ps1"
if errorlevel 1 goto :ERR_BOOTSTRAP
if not exist "%PORTABLE_NODE_DIR%\node.exe" goto :NO_NODE
goto :USE_PORTABLE

:ERR_BOOTSTRAP
echo.
echo [오류] 포터블 Node.js 자동 준비에 실패했습니다.
echo 공식 Releases에서 최신 포터블 압축파일(ShaBot-Portable-vX.X.X.zip)을 다운로드해 주세요.
exit /b 1

:USE_PORTABLE
set "PATH=%PORTABLE_NODE_DIR%;%PATH%"
set "NODE_EXE=%PORTABLE_NODE_DIR%\node.exe"
set "NPM_CMD=%PORTABLE_NODE_DIR%\npm.cmd"
goto :CHECK_MODULES

:NO_NODE
echo [ERROR] Node.js runtime not found.
exit /b 1

:CHECK_MODULES
if exist "%ROOT_DIR%\node_modules\express\package.json" exit /b 0

where npm >nul 2>nul
if not errorlevel 1 (
  set "NPM_CMD=npm"
  goto :DO_INSTALL
)

if exist "%PORTABLE_NODE_DIR%\npm.cmd" (
  set "NPM_CMD=%PORTABLE_NODE_DIR%\npm.cmd"
  goto :DO_INSTALL
)

goto :ERR_NEED_PORTABLE_ZIP

:DO_INSTALL
echo.
echo [오픈 샤봇] 필수 서버 라이브러리를 설치합니다...
pushd "%ROOT_DIR%"
call "%NPM_CMD%" install --omit=dev --no-audit --no-fund
set "INSTALL_ERR=%ERRORLEVEL%"
popd
if not "%INSTALL_ERR%"=="0" goto :ERR_NEED_PORTABLE_ZIP
exit /b 0

:ERR_NEED_PORTABLE_ZIP
echo.
echo =======================================================================
echo  [안내] 현재 폴더는 개발용 소스코드(Code - Download ZIP)입니다.
echo =======================================================================
echo  실행 엔진과 필수 모듈이 모두 포함된 [공식 무설치 포터블 압축파일]을
echo  다운로드하시면 추가 설치 없이 1초 만에 바로 실행됩니다.
echo.
echo  👉 공식 다운로드 링크:
echo  https://github.com/glory0531/20261031_chatbot/releases/latest
echo.
echo  인터넷 브라우저에서 공식 다운로드 페이지를 엽니다...
echo =======================================================================
start https://github.com/glory0531/20261031_chatbot/releases/latest
exit /b 1
