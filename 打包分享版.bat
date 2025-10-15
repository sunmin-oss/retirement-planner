@echo off
chcp 65001 >nul
echo ==================================
echo 退休計畫試算器 - 打包工具
echo ==================================
echo.

set OUTPUT_DIR=%~dp0退休計畫試算器_打包版
set SOURCE_DIR=%~dp0

echo 正在建立打包資料夾...
if exist "%OUTPUT_DIR%" rmdir /s /q "%OUTPUT_DIR%"
mkdir "%OUTPUT_DIR%"

echo.
echo 正在複製檔案...
xcopy "%SOURCE_DIR%retire-planner" "%OUTPUT_DIR%\retire-planner\" /E /I /Y /Q
xcopy "%SOURCE_DIR%retire-planner-server" "%OUTPUT_DIR%\retire-planner-server\" /E /I /Y /Q
copy "%SOURCE_DIR%啟動退休計畫試算器.bat" "%OUTPUT_DIR%\" /Y
copy "%SOURCE_DIR%使用說明.md" "%OUTPUT_DIR%\" /Y

echo.
echo 正在建立安裝說明...
(
echo 退休計畫試算器 - 安裝與使用指南
echo ===================================
echo.
echo 安裝步驟：
echo 1. 請先安裝 Node.js
echo    - 下載網址：https://nodejs.org/
echo    - 選擇 LTS 版本
echo    - 安裝時全部使用預設選項
echo.
echo 2. 安裝完成後，重新開機
echo.
echo 3. 雙擊執行「啟動退休計畫試算器.bat」
echo.
echo 4. 會自動開啟瀏覽器顯示試算器頁面
echo.
echo 使用說明：
echo - 詳細功能請參考「使用說明.md」
echo - 如遇到問題，請確認 Node.js 是否正確安裝
echo.
echo 停止服務：
echo - 關閉「退休計畫後端」的 CMD 視窗即可
echo.
echo 聯絡資訊：
echo - 有問題歡迎聯繫專案作者
) > "%OUTPUT_DIR%\安裝說明.txt"

echo.
echo 正在壓縮...
powershell -command "Compress-Archive -Path '%OUTPUT_DIR%\*' -DestinationPath '%SOURCE_DIR%退休計畫試算器_分享版.zip' -Force"

echo.
echo ==================================
echo 打包完成！
echo 分享檔案位置：
echo %SOURCE_DIR%退休計畫試算器_分享版.zip
echo.
echo 可以透過以下方式分享：
echo - 雲端硬碟（Google Drive, OneDrive）
echo - Email 附件
echo - USB 隨身碟
echo ==================================
echo.
pause
