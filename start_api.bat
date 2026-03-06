@echo off
echo ================================
echo OpenClaw MMO API 服务器启动
echo ================================
echo.

echo [1/2] 安装依赖...
pip install -r requirements_api.txt
if %errorlevel% neq 0 (
    echo ❌ 依赖安装失败
    pause
    exit /b 1
)
echo ✅ 依赖安装完成
echo.

echo [2/2] 启动API服务器...
echo 🚀 API服务器运行在 http://localhost:8000
echo 📖 API文档: http://localhost:8000/docs
echo.
python game_api.py

pause
