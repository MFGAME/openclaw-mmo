"""
测试剩余的API接口
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_monster_creation():
    """测试怪物创建接口"""
    print("\n" + "="*50)
    print("测试1: 怪物创建接口")
    print("="*50)
    
    # 先注册机器人
    robot_response = requests.post(f"{BASE_URL}/api/robot/register", json={
        "api_key": "test_api_key_001",
        "name": "TestRobot",
        "personality": "aggressive"
    })
    
    if robot_response.status_code != 200:
        print(f"❌ 机器人注册失败: {robot_response.text}")
        return None
    
    robot_data = robot_response.json()
    robot_id = robot_data["robot_id"]
    print(f"✅ 机器人注册成功: {robot_id}")
    
    # 测试创建怪物
    monster_response = requests.post(f"{BASE_URL}/api/monster/create", json={
        "robot_id": robot_id,
        "monster_slug": "aardart",
        "level": 5,
        "nickname": "小食蚁兽"
    })
    
    if monster_response.status_code != 200:
        print(f"❌ 怪物创建失败: {monster_response.text}")
        return None
    
    monster_data = monster_response.json()
    print(f"✅ 怪物创建成功:")
    print(json.dumps(monster_data, indent=2, ensure_ascii=False))
    
    return robot_id, monster_data['monster_id']

def test_battle_creation(robot_id_1, robot_id_2, monster_id_1, monster_id_2):
    """测试对战创建接口"""
    print("\n" + "="*50)
    print("测试2: 对战创建接口")
    print("="*50)
    
    # 创建对战
    battle_response = requests.post(f"{BASE_URL}/api/battle/create", json={
        "player1_id": robot_id_1,
        "player2_id": robot_id_2,
        "player1_monsters": [monster_id_1],
        "player2_monsters": [monster_id_2]
    })
    
    if battle_response.status_code != 200:
        print(f"❌ 对战创建失败: {battle_response.text}")
        return None
    
    battle_data = battle_response.json()
    print(f"✅ 对战创建成功:")
    print(f"  - 对战ID: {battle_data['battle_id']}")
    print(f"  - 玩家1: {battle_data['battle']['player1_id']}")
    print(f"  - 玩家2: {battle_data['battle']['player2_id']}")
    print(f"  - 状态: {battle_data['battle']['status']}")
    
    return battle_data['battle_id']

def test_battle_action(battle_id, robot_id, monster_id, target_id, technique_id):
    """测试战斗行动接口"""
    print("\n" + "="*50)
    print("测试3: 战斗行动接口")
    print("="*50)
    
    action_response = requests.post(f"{BASE_URL}/api/battle/action", json={
        "battle_id": battle_id,
        "robot_id": robot_id,
        "monster_id": monster_id,
        "target_id": target_id,
        "technique_id": technique_id
    })
    
    if action_response.status_code != 200:
        print(f"❌ 战斗行动失败: {action_response.text}")
        return None
    
    action_data = action_response.json()
    print(f"✅ 战斗行动成功:")
    print(json.dumps(action_data, indent=2, ensure_ascii=False))
    
    return action_data

def main():
    import sys
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    
    print("\n" + "="*50)
    print("🧪 OpenClaw MMO API 测试套件")
    print("="*50)
    
    # 测试1: 创建两个机器人和怪物
    result1 = test_monster_creation()
    if not result1:
        print("\n❌ 测试失败: 无法创建第一个机器人/怪物")
        return
    
    robot_id_1, monster_id_1 = result1
    
    # 创建第二个机器人
    robot_response = requests.post(f"{BASE_URL}/api/robot/register", json={
        "api_key": "test_api_key_002",
        "name": "TestRobot2",
        "personality": "supportive"
    })
    
    robot_id_2 = robot_response.json()["robot_id"]
    print(f"\n✅ 第二个机器人注册成功: {robot_id_2}")
    
    # 为第二个机器人创建怪物
    monster_response = requests.post(f"{BASE_URL}/api/monster/create", json={
        "robot_id": robot_id_2,
        "monster_slug": "aardorn",
        "level": 5,
        "nickname": "小土豚"
    })
    
    monster_id_2 = monster_response.json()["monster_id"]
    print(f"✅ 第二个怪物的怪物创建成功: {monster_id_2}")
    
    # 测试2: 创建对战
    battle_id = test_battle_creation(robot_id_1, robot_id_2, monster_id_1, monster_id_2)
    if not battle_id:
        print("\n❌ 测试失败: 无法创建对战")
        return
    
    # 测试3: 执行几回合战斗
    for i in range(3):
        print(f"\n--- 回合 {i+1} ---")
        # 玩家1攻击玩家2
        result = test_battle_action(battle_id, robot_id_1, monster_id_1, monster_id_2, "tackle")
        if not result:
            break
        
        # 玩家2反击玩家1
        result = test_battle_action(battle_id, robot_id_2, monster_id_2, monster_id_1, "tackle")
        if not result:
            break
    
    print("\n" + "="*50)
    print("✅ 所有测试完成！")
    print("="*50)

if __name__ == "__main__":
    main()
