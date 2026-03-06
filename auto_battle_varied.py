"""
多样化自动对战演示
"""
import requests
import time
import sys
import io
import random

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE_URL = "http://localhost:8000"

# 可用的怪物列表
MONSTERS = [
    ("aardart", "普通"),
    ("dollfin", "水"),
    ("flambear", "火"),
    ("budaye", "草"),
    ("pikachu", "电"),
    ("rockitten", "岩石"),
    ("sumob", "格斗"),
    ("propell", "飞行")
]

def register_robot(api_key, name, personality):
    response = requests.post(f"{BASE_URL}/api/robot/register", json={
        "api_key": api_key,
        "name": name,
        "personality": personality
    })
    if response.status_code == 200:
        data = response.json()
        print(f"✅ 机器人注册成功: {data['robot_id']} ({name})")
        return data['robot_id']
    return None

def create_monster(robot_id, slug, level=5):
    response = requests.post(f"{BASE_URL}/api/monster/create", json={
        "robot_id": robot_id,
        "monster_slug": slug,
        "level": level
    })
    if response.status_code == 200:
        data = response.json()
        print(f"✅ 怪物创建成功: {data['monster']['name']} (Lv.{level}) [{data['monster']['types']}]")
        return data['monster_id']
    return None

def create_battle(player1_id, player2_id, player1_monsters, player2_monsters):
    response = requests.post(f"{BASE_URL}/api/battle/create", json={
        "player1_id": player1_id,
        "player2_id": player2_id,
        "player1_monsters": player1_monsters,
        "player2_monsters": player2_monsters
    })
    if response.status_code == 200:
        data = response.json()
        print(f"✅ 对战创建成功: {data['battle_id']}")
        return data['battle_id']
    return None

def execute_action(battle_id, robot_id, monster_id, target_id, technique):
    response = requests.post(f"{BASE_URL}/api/battle/action", json={
        "battle_id": battle_id,
        "robot_id": robot_id,
        "monster_id": monster_id,
        "target_id": target_id,
        "technique_id": technique
    })
    if response.status_code == 200:
        return response.json()
    return None

def main():
    print("="*50)
    print("🎮 多样化自动对战演示")
    print("="*50)
    
    # 随机选择怪物
    monster1 = random.choice(MONSTERS)
    monster2 = random.choice(MONSTERS)
    
    print(f"\n选择怪物:")
    print(f"  玩家1: {monster1[0]} ({monster1[1]}系)")
    print(f"  玩家2: {monster2[0]} ({monster2[1]}系)")
    print()
    
    # 创建机器人
    robot1_id = register_robot(f"bot_{random.randint(1000,9999)}", f"Bot_{random.randint(100,999)}", random.choice(["aggressive", "supportive", "collector"]))
    robot2_id = register_robot(f"bot_{random.randint(1000,9999)}", f"Bot_{random.randint(100,999)}", random.choice(["aggressive", "supportive", "collector"]))
    
    if not robot1_id or not robot2_id:
        return
    
    # 创建怪物
    monster1_id = create_monster(robot1_id, monster1[0], level=random.randint(3, 7))
    monster2_id = create_monster(robot2_id, monster2[0], level=random.randint(3, 7))
    
    if not monster1_id or not monster2_id:
        return
    
    time.sleep(1)
    
    # 创建对战
    battle_id = create_battle(robot1_id, robot2_id, [monster1_id], [monster2_id])
    
    if not battle_id:
        return
    
    print(f"\n⚔️ 对战开始！")
    print("="*50)
    
    # 战斗循环
    turn = 1
    while True:
        print(f"\n--- 回合 {turn} ---")
        
        # 机器人1攻击
        result1 = execute_action(battle_id, robot1_id, monster1_id, monster2_id, "tackle")
        
        if result1:
            log = result1['log']
            print(f"  {log['attacker']} → {log['defender']}")
            print(f"  技能: {log['technique']}")
            print(f"  伤害: {log['damage']} ({log['type_effectiveness']})")
            print(f"  对方HP: {log['defender_hp']}")
            
            if result1['battle_ended']:
                print(f"\n🏆 战斗结束！胜者: {result1['winner_id'][:8]}")
                break
        
        # 机器人2反击
        result2 = execute_action(battle_id, robot2_id, monster2_id, monster1_id, "tackle")
        
        if result2:
            log = result2['log']
            print(f"  {log['attacker']} → {log['defender']}")
            print(f"  技能: {log['technique']}")
            print(f"  伤害: {log['damage']} ({log['type_effectiveness']})")
            print(f"  对方HP: {log['defender_hp']}")
            
            if result2['battle_ended']:
                print(f"\n🏆 战斗结束！胜者: {result2['winner_id'][:8]}")
                break
        
        time.sleep(0.5)
        turn += 1
        
        if turn > 20:
            print("\n⚠️ 回合数达到上限")
            break
    
    print("\n" + "="*50)
    print("✅ 演示完成！刷新浏览器查看对战记录")
    print("="*50)

if __name__ == "__main__":
    main()
