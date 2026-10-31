@echo off
chcp 65001 >nul
title [오픈 샤봇] 실시간 치지직 챗봇 및 통합 대시보드

cd /d "%~dp0"

call "%~dp0scripts\env_node.bat"
if %ERRORLEVEL% NEQ 0 (
    echo.
    pause
    exit /b 1
)

"%NODE_EXE%" "%~dp0scripts\launcher.js"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [안내] 샤봇 서버가 비정상 종료되었습니다. 위 로그를 확인해 주세요.
    pause
)

