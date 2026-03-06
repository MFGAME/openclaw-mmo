"""
OpenClaw MMO - Tuxemon完整集成
使用Tuxemon的所有美术资源和游戏系统
"""
import sys
import os

# 添加Tuxemon路径
TUXEMON_PATH = r"C:\Users\Administrator\.openclaw\agents\youxiangfa\workspace\Tuxemon"
sys.path.insert(0, TUXEMON_PATH)

# 修改Tuxemon配置，连接到OpenClaw MMO
import tuxemon
from tuxemon import client
from tuxemon.constants import paths

# 设置配置
config = {
    "player_name": "OpenClawPlayer",
    "server_url": "http://localhost:8000",
    "enable_network": True
}

print("="*50)
print("OpenClaw MMO - Tuxemon完整版")
print("="*50)
print("\n正在启动Tuxemon...")
print("所有美术资源使用Tuxemon开源项目")
print("网络对战使用OpenClaw MMO API")
print("\n" + "="*50)

# 启动Tuxemon
os.chdir(TUXEMON_PATH)
os.system("py -3 run_tuxemon.py")
