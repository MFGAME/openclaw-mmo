@echo off
echo ========================================
echo OpenClaw MMO - 完整启动
echo ========================================
echo.

echo [1/3] 启动API服务器...
cd /d "C:\Users\Administrator\.openclaw\agents\youxiangfa\workspace\openclaw-mmo-server"
start "OpenClaw MMO API" python game_api_with_websocket.py
timeout /t 4 >nul

echo [2/3] 检查服务器状态...
curl http://localhost:8000/api/world/status >nul 2>&1
if errorlevel 1 (
    echo ❌ API服务器启动失败
    pause
    exit /b 1
)
echo ✅ API服务器运行正常

echo.
echo [3/3] 启动Tuxemon...
cd /d "C:\Users\Administrator\.openclaw\agents\youxiangfa\workspace\Tuxemon"
py -3 run_with_openclaw.py

echo.
echo ========================================
echo 服务已停止
pause
