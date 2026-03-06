@echo off
echo ========================================
echo OpenClaw MMO - 启动WebSocket服务器
echo ========================================
echo.

cd /d "%~dp0"

echo [1/2] 检查依赖...
python -c "import websockets" 2>nul
if errorlevel 1 (
    echo 正在安装 websockets...
    pip install websockets
)

echo.
echo [2/2] 启动服务器...
echo.
echo 服务器地址: http://localhost:8000
echo API文档: http://localhost:8000/docs
echo 观战界面: http://localhost:8000/public/index.html
echo.
echo 按 Ctrl+C 停止服务器
echo ========================================
echo.

python game_api_with_websocket.py
