@echo off
chcp 65001 >nul
title [ShaBot] Chzzk Chatbot and Dashboard

cd /d "%~dp0"

call "%~dp0scripts\env_node.bat"
if errorlevel 1 goto :ERR

"%NODE_EXE%" "%~dp0scripts\launcher.js"
if errorlevel 1 goto :CRASH
exit /b 0

:ERR
echo.
pause
exit /b 1

:CRASH
echo.
echo [안내] 샤봇 서버가 종료되었습니다. 위 로그를 확인해 주세요.
pause
exit /b 1
