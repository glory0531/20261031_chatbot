@echo off
chcp 65001 >nul
title [오픈 샤봇] 내 방송 데이터 백업 및 관리

cd /d "%~dp0"
if not exist "%~dp0data" mkdir "%~dp0data"
if not exist "%~dp0data\backups" mkdir "%~dp0data\backups"

:MENU
cls
echo ==============================================================
echo        [오픈 샤봇] 내 시청자 포인트 및 설정 데이터 관리
echo ==============================================================
echo.
echo   * 샤봇 자동 업데이트 시에도 data 폴더는 절대 삭제되지 않습니다.
echo   * 다른 PC로 이사할 때는 data\storage.json 파일만 복사해 가세요!
echo.
echo   [1] 지금 즉시 수동 백업본 만들기 (data\backups 폴더에 저장)
echo   [2] 내 데이터 폴더(data) 탐색기로 열기
echo   [3] 전체 데이터 초기화 (주의: 포인트/명령어/설정 초기화)
echo   [4] 닫기
echo.
echo ==============================================================
set /p CHOICE="원하시는 메뉴 번호를 입력하고 Enter를 누르세요 (1~4): "

if "%CHOICE%"=="1" goto :BACKUP
if "%CHOICE%"=="2" goto :OPEN_DIR
if "%CHOICE%"=="3" goto :RESET_DATA
if "%CHOICE%"=="4" exit /b 0
goto :MENU

:BACKUP
if not exist "%~dp0data\storage.json" (
    echo.
    echo [안내] 아직 생성된 데이터 파일(data\storage.json)이 없습니다.
    echo        1_샤봇_시작.bat을 한 번 이상 실행하면 자동 생성됩니다.
    pause
    goto :MENU
)
for /f "delims=" %%t in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set "STAMP=%%t"
copy /Y "%~dp0data\storage.json" "%~dp0data\backups\storage_manual_%STAMP%.json" >nul
echo.
echo [완료] 백업 파일이 생성되었습니다!
echo        위치: data\backups\storage_manual_%STAMP%.json
echo.
pause
goto :MENU

:OPEN_DIR
explorer "%~dp0data"
goto :MENU

:RESET_DATA
echo.
echo [경고] 정말 모든 시청자 포인트, 출석 기록, 커스텀 명령어를 초기화하시겠습니까?
echo        (안전장치로 초기화 직전 백업본이 data\backups 에 자동 보관됩니다.)
set /p CONFIRM="초기화하려면 '초기화' 라고 정확히 입력하세요: "
if not "%CONFIRM%"=="초기화" (
    echo 취소되었습니다.
    timeout /t 2 >nul
    goto :MENU
)
if exist "%~dp0data\storage.json" (
    for /f "delims=" %%t in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set "STAMP=%%t"
    copy /Y "%~dp0data\storage.json" "%~dp0data\backups\storage_before_reset_%STAMP%.json" >nul
    del /Q "%~dp0data\storage.json"
)
echo.
echo [완료] 데이터가 초기화되었습니다. 샤봇을 재시작하면 초기 마법사부터 시작됩니다.
pause
goto :MENU

