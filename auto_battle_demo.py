"""
自动对战脚本
演示两个机器人自动对战
"""
import sys
import os
import time
import random

sys.path.insert(0, os.path.dirname(__file__))

from robot_sdk import OpenClawRobot, AutoBattle

def main():
    print("=" * 60)
    print("OpenClaw MMO 自动对战演示")
    print("=" * 60)
    print()
    
    # 创建机器人1（激进型）
    robot1 = OpenClawRobot(api_key="demo_key_1", server_url="http://localhost:8000")
    robot1.register(name="AggressiveBot", personality="aggressive")
    
    # 给机器人1创建怪物
    robot1.create_monster("flambear", level=10)  # 火系
    robot1.create_monster("dollfin", level=8)    # 水系
    robot1.create_monster("budaye", level=9)     # 草系
    
    print()
    
    # 创建机器人2（收集型）
    robot2 = OpenClawRobot(api_key="demo_key_2", server_url="http://localhost:8000")
    robot2.register(name="CollectorBot", personality="collector")
    
    # 给机器人2创建怪物
    robot2.create_monster("pikachu", level=10)   # 电系
    robot2.create_monster("sumob", level=8)      # 格斗系
    robot2.create_monster("nightmerge", level=9) # 暗系
    
    print()
    print("=" * 60)
    print("准备开始对战！")
    print("=" * 60)
    print()
    
    # 显示机器人状态
    print(f"🤖 {robot1.name} ({robot1.personality})")
    print(f"   怪物数量: {len(robot1.monsters)}")
    for monster in robot1.monsters:
        print(f"   - {monster['name']} Lv.{monster['level']} (HP: {monster['hp']}/{monster['max_hp']})")
    
    print()
    print(f"🤖 {robot2.name} ({robot2.personality})")
    print(f"   怪物数量: {len(robot2.monsters)}")
    for monster in robot2.monsters:
        print(f"   - {monster['name']} Lv.{monster['level']} (HP: {monster['hp']}/{monster['max_hp']})")
    
    print()
    input("按回车键开始对战...")
    print()
    
    # 创建自动战斗系统
    battle_system1 = AutoBattle(robot1)
    battle_system2 = AutoBattle(robot2)
    
    # 发起对战
    battle_system1.auto_battle(robot2.robot_id)
    
    print()
    print("=" * 60)
    print("对战演示结束！")
    print("=" * 60)
    
    # 显示世界状态
    world = robot1.get_world_status()
    print()
    print("🌍 世界状态:")
    print(f"   在线机器人: {world['world']['robots_online']}")
    print(f"   怪物总数: {world['world']['monsters_total']}")
    print(f"   活跃对战: {world['world']['battles_active']}")
    print(f"   已完成对战: {world['world']['battles_completed']}")


if __name__ == "__main__":
    main()
