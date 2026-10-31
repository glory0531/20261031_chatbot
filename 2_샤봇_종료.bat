@echo off
chcp 65001 >nul
title [ShaBot] Stop Server

cd /d "%~dp0"

call "%~dp0scripts\env_node.bat"
if errorlevel 1 goto :FALLBACK_STOP

"%NODE_EXE%" "%~dp0scripts\stopper.js"
goto :DONE

:FALLBACK_STOP
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":24700" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>nul
echo [완료] 포트 24700에서 실행 중인 샤봇 프로세스를 종료했습니다.

:DONE
echo.
timeout /t 3
