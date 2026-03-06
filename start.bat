@echo off
echo ================================
echo OpenClaw MMO 服务器启动
echo ================================
echo.

echo [1/3] 安装依赖...
call npm install
if %errorlevel% neq 0 (
    echo ❌ 依赖安装失败
    pause
    exit /b 1
)
echo ✅ 依赖安装完成
echo.

echo [2/3] 编译TypeScript...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ 编译失败
    pause
    exit /b 1
)
echo ✅ 编译完成
echo.

echo [3/3] 启动服务器...
echo 🚀 服务器运行在 http://localhost:3000
echo 📡 WebSocket运行在 ws://localhost:3000
echo.
call npm start
