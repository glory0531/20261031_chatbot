@echo off
chcp 65001 >nul
title [오픈 샤봇 제작자 전용] 원클릭 업데이트 빌드 및 배포

cd /d "%~dp0"

call "%~dp0scripts\env_node.bat"
if %ERRORLEVEL% NEQ 0 (
    echo.
    pause
    exit /b 1
)

"%NODE_EXE%" "%~dp0scripts\publishRelease.js"
echo.
pause

