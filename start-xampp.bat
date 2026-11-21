@echo off
setlocal
cd /d "%~dp0"
title TECHSTORE

echo ==============================================
echo   TECHSTORE - chay voi XAMPP (MySQL)
echo ==============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [X] Chua cai Node.js. Tai ban LTS tai https://nodejs.org roi chay lai file nay.
  pause
  exit /b 1
)

echo [1/4] Kiem tra MySQL cua XAMPP o 127.0.0.1:3306 ...
powershell -NoProfile -Command "try { $c = New-Object Net.Sockets.TcpClient('127.0.0.1',3306); $c.Close(); exit 0 } catch { exit 1 }"
if errorlevel 1 (
  echo [X] MySQL chua chay.
  echo     Mo XAMPP Control Panel va bam Start o dong MySQL, doi chu MySQL chuyen nen xanh, roi chay lai file nay.
  pause
  exit /b 1
)
echo     OK - MySQL dang chay.

if not exist node_modules (
  echo [2/4] Cai thu vien lan dau ^(can Internet, mat vai phut^) ...
  call npm install
  if errorlevel 1 ( echo [X] npm install loi. & pause & exit /b 1 )
) else (
  echo [2/4] Thu vien da duoc cai san.
)

if not exist backend\.env copy backend\.env.example backend\.env >nul

echo [3/4] Tao / cap nhat database techstore_db ^(an toan, khong ghi de du lieu cu^) ...
call npm run db:setup
if errorlevel 1 ( echo [X] Khong nhap duoc database. Xem thong bao o tren. & pause & exit /b 1 )

echo [4/4] Khoi dong website ...
echo     Giao dien : http://localhost:5173
echo     API       : http://localhost:5000/api/health
echo     Nhan Ctrl+C de dung.
echo.
start "" "http://localhost:5173"
call npm run dev
pause
