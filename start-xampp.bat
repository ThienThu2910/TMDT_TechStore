@echo off
setlocal
cd /d "%~dp0"
title TECHSTORE - XAMPP

echo ==============================================
echo   TECHSTORE - MySQL XAMPP + Node.js
echo ==============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [X] Chua cai Node.js 20+. Cai ban LTS tai https://nodejs.org roi chay lai.
  pause
  exit /b 1
)
node -e "if (Number(process.versions.node.split('.')[0]) < 20) process.exit(1)"
if errorlevel 1 (
  echo [X] Can Node.js phien ban 20 tro len. Hay cap nhat Node.js roi chay lai.
  pause
  exit /b 1
)

if not exist backend\.env copy backend\.env.example backend\.env >nul
for /f "tokens=2 delims==" %%P in ('findstr /b "DB_PORT=" backend\.env') do set "DB_PORT=%%P"
if "%DB_PORT%"=="" set "DB_PORT=3306"

echo [1/4] Kiem tra MySQL XAMPP tai 127.0.0.1:%DB_PORT% ...
powershell -NoProfile -Command "try { $c = New-Object Net.Sockets.TcpClient; $c.Connect('127.0.0.1',[int]'%DB_PORT%'); $c.Close(); exit 0 } catch { exit 1 }"
if errorlevel 1 (
  echo [X] MySQL chua chay tai cong %DB_PORT%.
  echo     Mo XAMPP Control Panel, bam Start o dong MySQL, roi chay lai file nay.
  echo     Neu XAMPP dung cong khac, sua DB_PORT trong backend\.env.
  pause
  exit /b 1
)
echo     OK - MySQL dang chay.

if not exist node_modules (
  echo [2/4] Cai thu vien lan dau ^(can Internet^) ...
  call npm install
  if errorlevel 1 ( echo [X] npm install loi. & pause & exit /b 1 )
) else (
  echo [2/4] Thu vien Node.js da duoc cai.
)

echo [3/4] Tao / cap nhat database techstore_db ^(giu nguyen du lieu cu^) ...
call npm run db:setup
if errorlevel 1 ( echo [X] Khong nap duoc database. Xem thong bao o tren. & pause & exit /b 1 )

echo [4/4] Khoi dong giao dien va API ...
echo     Giao dien : http://localhost:5173
echo     API       : http://localhost:5000/api/health
echo     Nhan Ctrl+C de dung.
echo.
start "" "http://localhost:5173"
call npm run dev
pause
