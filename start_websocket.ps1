# OpenClaw MMO - 启动WebSocket服务器 (PowerShell)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "OpenClaw MMO - 启动WebSocket服务器" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 切换到脚本目录
Set-Location $PSScriptRoot

# 检查依赖
Write-Host "[1/2] 检查依赖..." -ForegroundColor Yellow
try {
    python -c "import websockets" 2>$null
} catch {
    Write-Host "正在安装 websockets..." -ForegroundColor Yellow
    pip install websockets
}

# 启动服务器
Write-Host ""
Write-Host "[2/2] 启动服务器..." -ForegroundColor Yellow
Write-Host ""
Write-Host "服务器地址: " -NoNewline
Write-Host "http://localhost:8000" -ForegroundColor Green
Write-Host "API文档: " -NoNewline
Write-Host "http://localhost:8000/docs" -ForegroundColor Green
Write-Host "观战界面: " -NoNewline
Write-Host "http://localhost:8000/public/index.html" -ForegroundColor Green
Write-Host ""
Write-Host "按 Ctrl+C 停止服务器" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

python game_api_with_websocket.py
