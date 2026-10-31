@echo off
chcp 65001 >nul

set "ROOT_DIR=%~dp0.."
pushd "%ROOT_DIR%"
set "ROOT_DIR=%CD%"
popd

set "PORTABLE_NODE_DIR=%ROOT_DIR%\runtime\node"
set "NODE_EXE="
set "NPM_CMD="

if exist "%PORTABLE_NODE_DIR%\node.exe" (
    set "PATH=%PORTABLE_NODE_DIR%;%PATH%"
    set "NODE_EXE=%PORTABLE_NODE_DIR%\node.exe"
    set "NPM_CMD=%PORTABLE_NODE_DIR%\npm.cmd"
    goto :CHECK_MODULES
)

where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    for /f "delims=" %%v in ('node -p "process.versions.node.split('.')[0]" 2^>nul') do set "NODE_MAJOR=%%v"
    if defined NODE_MAJOR (
        if %NODE_MAJOR% GEQ 18 (
            set "NODE_EXE=node"
            set "NPM_CMD=npm"
            goto :CHECK_MODULES
        )
    )
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT_DIR%\scripts\bootstrap-node.ps1"
if %ERRORLEVEL% NEQ 0 (
    exit /b 1
)

if exist "%PORTABLE_NODE_DIR%\node.exe" (
    set "PATH=%PORTABLE_NODE_DIR%;%PATH%"
    set "NODE_EXE=%PORTABLE_NODE_DIR%\node.exe"
    set "NPM_CMD=%PORTABLE_NODE_DIR%\npm.cmd"
) else (
    echo [오류] Node.js 실행 파일을 찾을 수 없습니다.
    exit /b 1
)

:CHECK_MODULES
if not exist "%ROOT_DIR%\node_modules\express\package.json" (
    echo.
    echo [초기 구성] 필수 서버 라이브러리를 설치하고 있습니다... 잠시만 기다려 주세요.
    pushd "%ROOT_DIR%"
    call "%NPM_CMD%" install --omit=dev --no-audit --no-fund
    if %ERRORLEVEL% NEQ 0 (
        popd
        echo [오류] 필수 라이브러리 설치에 실패했습니다.
        exit /b 1
    )
    popd
)

exit /b 0
