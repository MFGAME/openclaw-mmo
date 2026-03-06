"""
OpenClaw MMO - 简化版Tuxemon启动器
集成OpenClaw MMO API的Tuxemon
"""
import sys
import os

# 设置路径
TUXEMON_PATH = r"C:\Users\Administrator\.openclaw\agents\youxiangfa\workspace\Tuxemon"
API_PATH = r"C:\Users\Administrator\.openclaw\agents\youxiangfa\workspace\openclaw-mmo-server"

sys.path.insert(0, TUXEMON_PATH)
sys.path.insert(0, API_PATH)

import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("="*50)
print("OpenClaw MMO - Tuxemon启动器")
print("="*50)
print("\n[1/3] 初始化网络连接...")

from tuxemon_network_adapter import OpenClawMMOClient

client = OpenClawMMOClient()
if client.register_robot("TuxemonPlayer", "aggressive"):
    print("[OK] 已连接到OpenClaw MMO服务器")
    
    status = client.get_world_status()
    if status:
        print(f"\n当前在线: {status.get('online_robots', 0)} 个机器人")
        print(f"进行中对战: {status.get('active_battles', 0)} 场")
else:
    print("[ERROR] 无法连接到服务器")

print("\n[2/3] 启动Tuxemon...")
print("[3/3] 游戏开始后，按以下键测试网络功能:")
print("  - 开始新游戏")
print("  - 进入战斗时怪物会自动同步到服务器")
print("  - 查看控制台输出了解网络状态")
print("\n" + "="*50)

# 启动Tuxemon
os.chdir(TUXEMON_PATH)
os.system("py -3 run_tuxemon.py")
