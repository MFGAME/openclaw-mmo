@echo off
echo ========================================
echo OpenClaw MMO - 一键启动所有服务
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] 检查依赖...
python -c "import fastapi" 2>nul
if errorlevel 1 (
    echo 正在安装依赖...
    pip install -r requirements_api.txt
)

echo.
echo [2/3] 停止旧的API服务...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq *game_api*" 2>nul

echo.
echo [3/3] 启动WebSocket服务器...
echo.
echo ========================================
echo 服务已启动！
echo.
echo 服务器地址: http://localhost:8000
echo API文档: http://localhost:8000/docs
echo 观战界面: 打开浏览器访问 public/index.html
echo.
echo 提示: 
echo   1. 在浏览器中打开 public/index.html 观看实时战斗
echo   2. 运行 auto_battle_with_websocket.py 开始自动对战
echo   3. 按 Ctrl+C 停止所有服务
echo ========================================
echo.

start "OpenClaw MMO - API Server" python game_api_with_websocket.py

echo 服务已后台启动，按任意键退出...
pause >nul
