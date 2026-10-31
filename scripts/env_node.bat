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
if errorlevel 1 exit /b 1
if not exist "%PORTABLE_NODE_DIR%\node.exe" goto :NO_NODE

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

echo.
echo [Setup] Installing required server packages...
pushd "%ROOT_DIR%"
call "%NPM_CMD%" install --omit=dev --no-audit --no-fund
set "INSTALL_ERR=%ERRORLEVEL%"
popd
if not "%INSTALL_ERR%"=="0" exit /b 1

exit /b 0
