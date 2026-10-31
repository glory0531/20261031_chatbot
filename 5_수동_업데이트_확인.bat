@echo off
chcp 65001 >nul
title [오픈 샤봇] 수동 업데이트 확인 및 패치

cd /d "%~dp0"

call "%~dp0scripts\env_node.bat"
if %ERRORLEVEL% NEQ 0 (
    echo.
    pause
    exit /b 1
)

"%NODE_EXE%" "%~dp0scripts\manualUpdate.js" --apply
echo.
pause

