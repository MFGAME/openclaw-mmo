"""
OpenClaw 机器人客户端 SDK
用于机器人连接到OpenClaw MMO世界
"""
import requests
import json
import time
import random
from typing import Optional, List, Dict


class OpenClawRobot:
    """OpenClaw机器人客户端"""
    
    def __init__(self, api_key: str, server_url: str = "http://localhost:8000"):
        """
        初始化机器人
        
        Args:
            api_key: API密钥
            server_url: 服务器地址
        """
        self.api_key = api_key
        self.server_url = server_url
        self.robot_id = None
        self.name = None
        self.personality = None
        self.monsters = []
        
    def register(self, name: str, personality: str = "aggressive") -> Dict:
        """
        注册机器人
        
        Args:
            name: 机器人名称
            personality: AI性格（aggressive/supportive/collector）
        
        Returns:
            注册结果
        """
        response = requests.post(
            f"{self.server_url}/api/robot/register",
            json={
                "api_key": self.api_key,
                "name": name,
                "personality": personality
            }
        )
        data = response.json()
        
        if data.get('success'):
            self.robot_id = data['robot_id']
            self.name = name
            self.personality = personality
            print(f"✅ 机器人注册成功: {name} ({personality})")
        
        return data
    
    def create_monster(self, monster_slug: str, level: int = 5) -> Dict:
        """
        创建怪物
        
        Args:
            monster_slug: 怪物标识
            level: 怪物等级
        
        Returns:
            创建结果
        """
        response = requests.post(
            f"{self.server_url}/api/monster/create",
            json={
                "robot_id": self.robot_id,
                "monster_slug": monster_slug,
                "level": level
            }
        )
        data = response.json()
        
        if data.get('success'):
            self.monsters.append(data['monster'])
            print(f"✅ 怪物创建成功: {monster_slug} Lv.{level}")
        
        return data
    
    def get_monsters(self) -> Dict:
        """获取机器人的所有怪物"""
        response = requests.get(
            f"{self.server_url}/api/robot/{self.robot_id}/monsters"
        )
        data = response.json()
        
        if data.get('success'):
            self.monsters = data['monsters']
        
        return data
    
    def create_battle(self, target_robot_id: str) -> Dict:
        """
        创建对战
        
        Args:
            target_robot_id: 目标机器人ID
        
        Returns:
            对战信息
        """
        # 获取双方怪物
        my_monsters = [m['id'] for m in self.monsters[:3]]
        
        if len(my_monsters) == 0:
            print("❌ 没有可用的怪物")
            return {"success": False, "error": "No monsters available"}
        
        response = requests.post(
            f"{self.server_url}/api/battle/create",
            json={
                "player1_id": self.robot_id,
                "player2_id": target_robot_id,
                "player1_monsters": my_monsters,
                "player2_monsters": my_monsters  # 临时使用相同的怪物
            }
        )
        data = response.json()
        
        if data.get('success'):
            print(f"⚔️  对战创建成功: {data['battle_id']}")
        
        return data
    
    def execute_action(self, battle_id: str, monster_id: str, technique_id: str, target_id: str) -> Dict:
        """
        执行战斗行动
        
        Args:
            battle_id: 对战ID
            monster_id: 怪物ID
            technique_id: 技能ID
            target_id: 目标ID
        
        Returns:
            行动结果
        """
        response = requests.post(
            f"{self.server_url}/api/battle/action",
            json={
                "battle_id": battle_id,
                "monster_id": monster_id,
                "technique_id": technique_id,
                "target_id": target_id
            }
        )
        return response.json()
    
    def get_world_status(self) -> Dict:
        """获取世界状态"""
        response = requests.get(f"{self.server_url}/api/world/status")
        return response.json()
    
    def list_robots(self) -> Dict:
        """列出所有机器人"""
        response = requests.get(f"{self.server_url}/api/robots")
        return response.json()


class AggressiveAI:
    """激进型AI - 优先对战"""
    
    def decide_action(self, battle_state: Dict, my_monsters: List[Dict]) -> Dict:
        """
        AI决策
        
        Args:
            battle_state: 战斗状态
            my_monsters: 我的怪物列表
        
        Returns:
            行动决策
        """
        # 选择最强怪物
        strongest = max(my_monsters, key=lambda m: m['attack'])
        
        # 选择最强技能
        techniques = strongest.get('techniques', ['struggle'])
        technique = techniques[0] if techniques else 'struggle'
        
        # 选择敌方HP最高的怪物
        enemy_monsters = battle_state.get('player2_monsters', [])
        alive_enemies = [m for m in enemy_monsters if m['hp'] > 0]
        target = alive_enemies[0] if alive_enemies else None
        
        if not target:
            return None
        
        return {
            "monster_id": strongest['id'],
            "technique_id": technique,
            "target_id": target['id']
        }


class SupportiveAI:
    """辅助型AI - 优先探索和支援"""
    
    def decide_action(self, battle_state: Dict, my_monsters: List[Dict]) -> Dict:
        """
        AI决策
        
        Args:
            battle_state: 战斗状态
            my_monsters: 我的怪物列表
        
        Returns:
            行动决策
        """
        # 选择速度最快的怪物
        fastest = max(my_monsters, key=lambda m: m['speed'])
        
        # 选择敌方速度最快的怪物
        enemy_monsters = battle_state.get('player2_monsters', [])
        alive_enemies = [m for m in enemy_monsters if m['hp'] > 0]
        target = max(alive_enemies, key=lambda m: m['speed']) if alive_enemies else None
        
        if not target:
            return None
        
        techniques = fastest.get('techniques', ['struggle'])
        technique = techniques[0] if techniques else 'struggle'
        
        return {
            "monster_id": fastest['id'],
            "technique_id": technique,
            "target_id": target['id']
        }


class CollectorAI:
    """收集型AI - 优先收集和防御"""
    
    def decide_action(self, battle_state: Dict, my_monsters: List[Dict]) -> Dict:
        """
        AI决策
        
        Args:
            battle_state: 战斗状态
            my_monsters: 我的怪物列表
        
        Returns:
            行动决策
        """
        # 选择防御最高的怪物
        tankiest = max(my_monsters, key=lambda m: m['defense'])
        
        # 选择敌方攻击最高的怪物
        enemy_monsters = battle_state.get('player2_monsters', [])
        alive_enemies = [m for m in enemy_monsters if m['hp'] > 0]
        target = max(alive_enemies, key=lambda m: m['attack']) if alive_enemies else None
        
        if not target:
            return None
        
        techniques = tankiest.get('techniques', ['struggle'])
        technique = techniques[0] if techniques else 'struggle'
        
        return {
            "monster_id": tankiest['id'],
            "technique_id": technique,
            "target_id": target['id']
        }


class AutoBattle:
    """自动战斗系统"""
    
    def __init__(self, robot: OpenClawRobot):
        """
        初始化自动战斗
        
        Args:
            robot: 机器人实例
        """
        self.robot = robot
        
        # 根据性格选择AI
        if robot.personality == "aggressive":
            self.ai = AggressiveAI()
        elif robot.personality == "supportive":
            self.ai = SupportiveAI()
        else:
            self.ai = CollectorAI()
    
    def auto_battle(self, target_robot_id: str):
        """
        自动战斗
        
        Args:
            target_robot_id: 目标机器人ID
        """
        # 创建对战
        battle_data = self.robot.create_battle(target_robot_id)
        
        if not battle_data.get('success'):
            print("❌ 创建对战失败")
            return
        
        battle_id = battle_data['battle_id']
        battle = battle_data['battle']
        
        print(f"\n⚔️  对战开始: {self.robot.name} vs {target_robot_id}")
        print("=" * 60)
        
        # 自动战斗循环
        while battle['status'] == 'ongoing':
            # AI决策
            my_monsters = battle['player1_monsters'] if battle['player1_id'] == self.robot.robot_id else battle['player2_monsters']
            
            action = self.ai.decide_action(battle, [m for m in my_monsters if m['hp'] > 0])
            
            if not action:
                print("❌ 无法决策")
                break
            
            # 执行行动
            result = self.robot.execute_action(
                battle_id,
                action['monster_id'],
                action['technique_id'],
                action['target_id']
            )
            
            if result.get('success'):
                log = result.get('log', {})
                print(f"回合 {battle['current_turn']}: {log.get('attacker')} 使用 {log.get('technique')} → {log.get('defender')}")
                print(f"  伤害: {log.get('damage')} | {log.get('type_effectiveness')}")
                print(f"  敌方HP: {log.get('defender_hp')}")
                
                if result.get('battle_ended'):
                    print("\n" + "=" * 60)
                    winner = result.get('winner_id')
                    if winner == self.robot.robot_id:
                        print(f"🎉 {self.robot.name} 获胜!")
                    else:
                        print(f"💔 {self.robot.name} 战败!")
                    print("=" * 60)
                    break
            
            # 更新战斗状态
            battle = self.robot.get_battle(battle_id)['battle']
            
            # 等待1秒
            time.sleep(1)
    
    def get_battle(self, battle_id: str) -> Dict:
        """获取对战信息"""
        response = requests.get(f"{self.robot.server_url}/api/battle/{battle_id}")
        return response.json()


# 示例使用
if __name__ == "__main__":
    # 创建机器人
    robot = OpenClawRobot(api_key="test123", server_url="http://localhost:8000")
    
    # 注册机器人
    robot.register(name="AI_Robot_1", personality="aggressive")
    
    # 创建怪物
    robot.create_monster("flambear", level=10)  # 火系怪物
    robot.create_monster("dollfin", level=10)   # 水系怪物
    robot.create_monster("budaye", level=10)    # 草系怪物
    
    # 获取世界状态
    world = robot.get_world_status()
    print(f"\n🌍 世界状态:")
    print(f"  在线机器人: {world['world']['robots_online']}")
    print(f"  怪物总数: {world['world']['monsters_total']}")
    print(f"  活跃对战: {world['world']['battles_active']}")
