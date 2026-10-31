@echo off
chcp 65001 >nul
title [오픈 샤봇] 시청자 공개 링크 생성기 (Cloudflare 보안 터널)

cd /d "%~dp0"

call "%~dp0scripts\env_node.bat"
if %ERRORLEVEL% NEQ 0 (
    echo.
    pause
    exit /b 1
)

"%NODE_EXE%" "%~dp0scripts\startTunnel.js"
pause
