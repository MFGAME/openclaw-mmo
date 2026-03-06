"""
综合测试脚本 - 测试所有功能
"""
import requests
import time
import sys
import io

# 设置UTF-8编码
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE_URL = "http://localhost:8000"

def test_api_server():
    """测试API服务器"""
    print("\n" + "="*50)
    print("测试1: API服务器")
    print("="*50)
    
    try:
        response = requests.get(f"{BASE_URL}/")
        if response.status_code == 200:
            print("✅ API服务器运行正常")
            return True
        else:
            print(f"❌ API服务器响应异常: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 无法连接到API服务器: {str(e)}")
        return False

def test_robot_registration():
    """测试机器人注册"""
    print("\n" + "="*50)
    print("测试2: 机器人注册")
    print("="*50)
    
    try:
        response = requests.post(f"{BASE_URL}/api/robot/register", json={
            "api_key": "test_key_001",
            "name": "TestBot",
            "personality": "aggressive"
        })
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 机器人注册成功: {data['robot_id']}")
            return data['robot_id']
        else:
            print(f"❌ 机器人注册失败: {response.text}")
            return None
    except Exception as e:
        print(f"❌ 机器人注册异常: {str(e)}")
        return None

def test_monster_creation(robot_id):
    """测试怪物创建"""
    print("\n" + "="*50)
    print("测试3: 怪物创建")
    print("="*50)
    
    try:
        response = requests.post(f"{BASE_URL}/api/monster/create", json={
            "robot_id": robot_id,
            "monster_slug": "aardart",
            "level": 5
        })
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 怪物创建成功: {data['monster']['name']} (Lv.{data['monster']['level']})")
            return data['monster_id']
        else:
            print(f"❌ 怪物创建失败: {response.text}")
            return None
    except Exception as e:
        print(f"❌ 怪物创建异常: {str(e)}")
        return None

def test_battle_system(robot1_id, robot2_id, monster1_id, monster2_id):
    """测试战斗系统"""
    print("\n" + "="*50)
    print("测试4: 战斗系统")
    print("="*50)
    
    try:
        # 创建对战
        battle_response = requests.post(f"{BASE_URL}/api/battle/create", json={
            "player1_id": robot1_id,
            "player2_id": robot2_id,
            "player1_monsters": [monster1_id],
            "player2_monsters": [monster2_id]
        })
        
        if battle_response.status_code != 200:
            print(f"❌ 对战创建失败: {battle_response.text}")
            return False
        
        battle_data = battle_response.json()
        battle_id = battle_data['battle_id']
        print(f"✅ 对战创建成功: {battle_id}")
        
        # 执行几回合战斗
        for i in range(3):
            action_response = requests.post(f"{BASE_URL}/api/battle/action", json={
                "battle_id": battle_id,
                "robot_id": robot1_id,
                "monster_id": monster1_id,
                "target_id": monster2_id,
                "technique_id": "tackle"
            })
            
            if action_response.status_code != 200:
                print(f"❌ 战斗行动失败: {action_response.text}")
                return False
            
            action_data = action_response.json()
            print(f"  回合{action_data['log']['turn']}: 造成{action_data['damage']}点伤害")
            
            if action_data['battle_ended']:
                print(f"✅ 战斗结束，胜者: {action_data['winner_id']}")
                return True
        
        print("✅ 战斗系统运行正常")
        return True
        
    except Exception as e:
        print(f"❌ 战斗系统测试异常: {str(e)}")
        return False

def test_world_status():
    """测试世界状态"""
    print("\n" + "="*50)
    print("测试5: 世界状态")
    print("="*50)
    
    try:
        response = requests.get(f"{BASE_URL}/api/world/status")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 世界状态获取成功:")
            print(f"  在线机器人: {data['online_robots']}")
            print(f"  总怪物数: {data['total_monsters']}")
            print(f"  进行中对战: {data['active_battles']}")
            print(f"  已完成对战: {data['completed_battles']}")
            return True
        else:
            print(f"❌ 世界状态获取失败: {response.text}")
            return False
    except Exception as e:
        print(f"❌ 世界状态测试异常: {str(e)}")
        return False

def main():
    print("="*50)
    print("🧪 OpenClaw MMO - 综合测试")
    print("="*50)
    
    results = []
    
    # 测试1: API服务器
    results.append(("API服务器", test_api_server()))
    
    # 测试2: 机器人注册
    robot1_id = test_robot_registration()
    results.append(("机器人注册", robot1_id is not None))
    
    if not robot1_id:
        print("\n❌ 机器人注册失败，无法继续测试")
        return
    
    # 创建第二个机器人
    response = requests.post(f"{BASE_URL}/api/robot/register", json={
        "api_key": "test_key_002",
        "name": "TestBot2",
        "personality": "supportive"
    })
    robot2_id = response.json()['robot_id']
    
    # 测试3: 怪物创建
    monster1_id = test_monster_creation(robot1_id)
    results.append(("怪物创建", monster1_id is not None))
    
    if not monster1_id:
        print("\n❌ 怪物创建失败，无法继续测试")
        return
    
    monster2_response = requests.post(f"{BASE_URL}/api/monster/create", json={
        "robot_id": robot2_id,
        "monster_slug": "aardorn",
        "level": 5
    })
    monster2_id = monster2_response.json()['monster_id']
    
    # 测试4: 战斗系统
    results.append(("战斗系统", test_battle_system(robot1_id, robot2_id, monster1_id, monster2_id)))
    
    # 测试5: 世界状态
    results.append(("世界状态", test_world_status()))
    
    # 汇总结果
    print("\n" + "="*50)
    print("📊 测试结果汇总")
    print("="*50)
    
    for test_name, result in results:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"{test_name}: {status}")
    
    total = len(results)
    passed = sum(1 for _, result in results if result)
    
    print("\n" + "="*50)
    print(f"总计: {passed}/{total} 测试通过")
    print("="*50)

if __name__ == "__main__":
    main()
