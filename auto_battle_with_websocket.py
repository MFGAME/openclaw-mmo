"""
自动对战演示（带WebSocket实时通知）
"""
import requests
import time
import sys
import io
import random

# 设置UTF-8编码
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE_URL = "http://localhost:8000"

def register_robot(api_key, name, personality):
    """注册机器人"""
    response = requests.post(f"{BASE_URL}/api/robot/register", json={
        "api_key": api_key,
        "name": name,
        "personality": personality
    })
    
    if response.status_code != 200:
        print(f"❌ 机器人注册失败: {response.text}")
        return None
    
    data = response.json()
    print(f"✅ 机器人注册成功: {data['robot_id']} ({name})")
    return data['robot_id']

def create_monster(robot_id, slug, level=5):
    """创建怪物"""
    response = requests.post(f"{BASE_URL}/api/monster/create", json={
        "robot_id": robot_id,
        "monster_slug": slug,
        "level": level
    })
    
    if response.status_code != 200:
        print(f"❌ 怪物创建失败: {response.text}")
        return None
    
    data = response.json()
    print(f"✅ 怪物创建成功: {data['monster']['name']} (Lv.{data['monster']['level']})")
    return data['monster_id']

def create_battle(player1_id, player2_id, player1_monsters, player2_monsters):
    """创建对战"""
    response = requests.post(f"{BASE_URL}/api/battle/create", json={
        "player1_id": player1_id,
        "player2_id": player2_id,
        "player1_monsters": player1_monsters,
        "player2_monsters": player2_monsters
    })
    
    if response.status_code != 200:
        print(f"❌ 对战创建失败: {response.text}")
        return None
    
    data = response.json()
    print(f"✅ 对战创建成功: {data['battle_id']}")
    return data['battle_id']

def execute_battle_action(battle_id, robot_id, monster_id, target_id, technique_id):
    """执行战斗行动"""
    response = requests.post(f"{BASE_URL}/api/battle/action", json={
        "battle_id": battle_id,
        "robot_id": robot_id,
        "monster_id": monster_id,
        "target_id": target_id,
        "technique_id": technique_id
    })
    
    if response.status_code != 200:
        print(f"❌ 战斗行动失败: {response.text}")
        return None
    
    data = response.json()
    return data

def main():
    print("="*50)
    print("🎮 OpenClaw MMO - 自动对战演示")
    print("="*50)
    print("\n提示：打开浏览器访问 http://localhost:8000/public/index.html 观看实时战斗\n")
    
    # 创建两个机器人
    robot1_id = register_robot("api_key_001", "AggressiveBot", "aggressive")
    robot2_id = register_robot("api_key_002", "SupportiveBot", "supportive")
    
    if not robot1_id or not robot2_id:
        print("\n❌ 机器人创建失败")
        return
    
    # 为每个机器人创建怪物
    monster1_id = create_monster(robot1_id, "aardart", level=5)
    monster2_id = create_monster(robot2_id, "dollfin", level=5)  # 使用水属性的Dollfin
    
    if not monster1_id or not monster2_id:
        print("\n❌ 怪物创建失败")
        return
    
    # 等待2秒，让WebSocket连接建立
    print("\n⏳ 等待WebSocket连接...")
    time.sleep(2)
    
    # 创建对战
    battle_id = create_battle(robot1_id, robot2_id, [monster1_id], [monster2_id])
    
    if not battle_id:
        print("\n❌ 对战创建失败")
        return
    
    print(f"\n⚔️ 对战开始！")
    print(f"   {robot1_id} vs {robot2_id}")
    print("="*50)
    
    # 自动战斗循环
    turn = 1
    while True:
        print(f"\n--- 回合 {turn} ---")
        
        # 机器人1攻击
        result1 = execute_battle_action(battle_id, robot1_id, monster1_id, monster2_id, "tackle")
        
        if result1:
            print(f"  {result1['log']['attacker']} → {result1['log']['defender']}")
            print(f"  技能: {result1['log']['technique']}")
            print(f"  伤害: {result1['log']['damage']} ({result1['log']['type_effectiveness']})")
            print(f"  对方HP: {result1['log']['defender_hp']}")
            
            if result1['battle_ended']:
                print(f"\n🏆 战斗结束！胜者: {result1['winner_id']}")
                break
        
        # 机器人2反击
        result2 = execute_battle_action(battle_id, robot2_id, monster2_id, monster1_id, "tackle")
        
        if result2:
            print(f"  {result2['log']['attacker']} → {result2['log']['defender']}")
            print(f"  技能: {result2['log']['technique']}")
            print(f"  伤害: {result2['log']['damage']} ({result2['log']['type_effectiveness']})")
            print(f"  对方HP: {result2['log']['defender_hp']}")
            
            if result2['battle_ended']:
                print(f"\n🏆 战斗结束！胜者: {result2['winner_id']}")
                break
        
        # 等待1秒，模拟思考时间
        time.sleep(1)
        turn += 1
        
        # 最多20回合
        if turn > 20:
            print("\n⚠️ 回合数达到上限，战斗结束")
            break
    
    print("\n" + "="*50)
    print("✅ 演示完成！")
    print("="*50)

if __name__ == "__main__":
    main()
