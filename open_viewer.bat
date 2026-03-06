@echo off
echo ========================================
echo OpenClaw MMO - 打开观战界面
echo ========================================
echo.

cd /d "%~dp0"

echo 正在打开观战界面...
echo.
echo 提示：
echo   - 确保API服务器已启动（运行 start_websocket.bat）
echo   - 观战界面会自动连接到 http://localhost:8000
echo   - 运行 auto_battle_with_websocket.py 开始自动对战
echo.
echo ========================================

start "" "public\index.html"

echo 观战界面已打开！
pause
