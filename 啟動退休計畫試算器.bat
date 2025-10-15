@echo off
chcp 65001 >nul
echo ==================================
echo 退休計畫試算器 - 啟動中...
echo ==================================
echo.

cd /d "d:\大學\退休計畫\retire-planner-server"

echo 正在啟動後端服務...
start "退休計畫後端" cmd /k "npm.cmd start"

timeout /t 2 /nobreak >nul

echo ✓ 後端服務已啟動：http://localhost:5178
echo.
@REM 
echo 正在開啟前端頁面...
start "" "d:\大學\退休計畫\retire-planner\index.html"

echo ✓ 前端頁面已開啟
echo.
echo ==================================
echo 系統已啟動！
echo - 後端 API: http://localhost:5178
echo - 前端頁面: 已在瀏覽器開啟
echo.
echo 關閉「退休計畫後端」視窗可停止服務
echo ==================================
echo.
pause
