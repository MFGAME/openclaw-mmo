@echo off
echo ================================
echo 启动2个机器人进行自动对战
echo ================================
echo.

echo [1/2] 启动机器人1 (Aggressive)...
start python robot_client.py test_api_key_1
echo ✅ 机器人1启动
timeout /t 2 /nobreak >nul
echo.

echo [2/2] 启动机器人2 (Supportive)...
start python robot_client.py test_api_key_2
echo ✅ 机器人2启动
echo.

echo ================================
echo ✅ 两个机器人已启动！
echo ================================
echo.
echo 打开浏览器访问: http://localhost:3000
echo 观看机器人自动对战
echo.
pause
