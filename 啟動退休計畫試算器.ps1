# 退休計畫試算器 - 啟動腳本
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "退休計畫試算器 - 啟動中..." -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# 切換到後端資料夾
$serverPath = "d:\大學\退休計畫\retire-planner-server"
Set-Location -Path $serverPath

Write-Host "正在啟動後端服務..." -ForegroundColor Yellow

# 啟動後端服務（背景執行）
$job = Start-Job -ScriptBlock {
    Set-Location -Path $using:serverPath
    npm.cmd start
}

# 等待 2 秒讓後端啟動
Start-Sleep -Seconds 2

Write-Host "✓ 後端服務已啟動：http://localhost:5178" -ForegroundColor Green
Write-Host ""

# 開啟前端頁面
$frontendPath = "d:\大學\退休計畫\retire-planner\index.html"
Write-Host "正在開啟前端頁面..." -ForegroundColor Yellow
Start-Process $frontendPath

Write-Host "✓ 前端頁面已開啟" -ForegroundColor Green
Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "系統已啟動！" -ForegroundColor Green
Write-Host "- 後端 API: http://localhost:5178" -ForegroundColor White
Write-Host "- 前端頁面: 已在瀏覽器開啟" -ForegroundColor White
Write-Host ""
Write-Host "按 Ctrl+C 可停止後端服務" -ForegroundColor Yellow
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# 持續顯示後端日誌
Receive-Job -Job $job -Wait
