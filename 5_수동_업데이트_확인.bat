@echo off
chcp 65001 >nul
title [ShaBot] Manual Update Check

cd /d "%~dp0"

call "%~dp0scripts\env_node.bat"
if errorlevel 1 goto :ERR

"%NODE_EXE%" "%~dp0scripts\manualUpdate.js" --apply
echo.
pause
exit /b 0

:ERR
echo.
pause
exit /b 1
