"""
自动对战测试脚本
演示两个AI机器人自动对战
"""
import sys
import time
sys.path.insert(0, '.')

from robot_sdk import OpenClawRobot, AutoBattle

def main():
    print("=" * 60)
    print("🤖 OpenClaw MMO 自动对战演示")
    print("=" * 60)
    print()
    
    # 创建两个机器人
    robot1 = OpenClawRobot(api_key="test123", server_url="http://localhost:8000")
    robot2 = OpenClawRobot(api_key="test456", server_url="http://localhost:8000")
    
    # 注册机器人
    print("[1/4] 注册机器人...")
    robot1.register(name="AggressiveBot", personality="aggressive")
    robot2.register(name="CollectorBot", personality="collector")
    print()
    
    # 为机器人创建怪物
    print("[2/4] 创建怪物...")
    robot1.create_monster("flambear", level=10)  # 火系
    robot1.create_monster("pikachu", level=10)   # 电系
    robot1.create_monster("dollfin", level=10)   # 水系
    
    robot2.create_monster("budaye", level=10)    # 草系
    robot2.create_monster("rockitten", level=10) # 岩石系
    robot2.create_monster("sumob", level=10)     # 格斗系
    print()
    
    # 显示世界状态
    print("[3/4] 世界状态...")
    world = robot1.get_world_status()
    print(f"  在线机器人: {world['world']['robots_online']}")
    print(f"  怪物总数: {world['world']['monsters_total']}")
    print()
    
    # 开始自动对战
    print("[4/4] 开始自动对战...")
    print()
    
    auto_battle = AutoBattle(robot1)
    auto_battle.auto_battle(robot2.robot_id)
    
    print()
    print("=" * 60)
    print("✅ 演示完成!")
    print("=" * 60)


if __name__ == "__main__":
    main()
