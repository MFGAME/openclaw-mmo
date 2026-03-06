"""
OpenClaw MMO - Tuxemon网络战斗补丁
将Tuxemon的战斗系统连接到OpenClaw MMO API
"""
import sys
import os
import json
import requests

TUXEMON_PATH = r"C:\Users\Administrator\.openclaw\agents\youxiangfa\workspace\Tuxemon"
sys.path.insert(0, TUXEMON_PATH)

class OpenClawBattleIntegration:
    """OpenClaw MMO战斗集成"""
    
    def __init__(self, server_url="http://localhost:8000"):
        self.server_url = server_url
        self.robot_id = None
        self.api_key = None
        self.battle_id = None
        self.registered = False
        
    def register_player(self, player_name):
        """注册玩家到OpenClaw MMO"""
        try:
            response = requests.post(
                f"{self.server_url}/api/robot/register",
                json={
                    "api_key": f"tuxemon_{player_name}",
                    "name": player_name,
                    "personality": "aggressive"
                },
                timeout=2
            )
            
            if response.status_code == 200:
                data = response.json()
                self.robot_id = data['robot_id']
                self.api_key = f"tuxemon_{player_name}"
                self.registered = True
                return True
        except Exception as e:
            print(f"[Network] Registration failed: {e}")
        return False
    
    def sync_monster(self, monster_slug, level=5, hp=None, max_hp=None, 
                     attack=None, defense=None, speed=None):
        """同步Tuxemon怪物到OpenClaw MMO"""
        if not self.registered:
            return None
            
        try:
            response = requests.post(
                f"{self.server_url}/api/monster/create",
                json={
                    "robot_id": self.robot_id,
                    "monster_slug": monster_slug,
                    "level": level
                },
                timeout=2
            )
            
            if response.status_code == 200:
                data = response.json()
                return data['monster_id']
        except Exception as e:
            print(f"[Network] Monster sync failed: {e}")
        return None
    
    def start_network_battle(self, my_monster_id):
        """开始网络对战"""
        if not self.registered:
            return False
            
        try:
            # 寻找对手
            response = requests.get(f"{self.server_url}/api/robots", timeout=2)
            if response.status_code == 200:
                robots = response.json()['robots']
                opponents = [r for r in robots if r['id'] != self.robot_id]
                
                if opponents:
                    opponent = opponents[0]
                    
                    # 创建对战（需要对手的怪物ID）
                    # 这里简化处理，实际需要更复杂的匹配逻辑
                    print(f"[Network] Found opponent: {opponent['name']}")
                    return True
        except Exception as e:
            print(f"[Network] Battle start failed: {e}")
        return False
    
    def execute_battle_action(self, monster_id, target_id, technique_id):
        """执行战斗行动"""
        if not self.battle_id:
            return None
            
        try:
            response = requests.post(
                f"{self.server_url}/api/battle/action",
                json={
                    "battle_id": self.battle_id,
                    "robot_id": self.robot_id,
                    "monster_id": monster_id,
                    "target_id": target_id,
                    "technique_id": technique_id
                },
                timeout=2
            )
            
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            print(f"[Network] Battle action failed: {e}")
        return None
    
    def get_world_status(self):
        """获取世界状态"""
        try:
            response = requests.get(f"{self.server_url}/api/world/status", timeout=2)
            if response.status_code == 200:
                return response.json()
        except:
            pass
        return None

# 创建全局实例
network = OpenClawBattleIntegration()

# 修补Tuxemon战斗系统的函数
def patch_tuxemon_battle():
    """修补Tuxemon的战斗系统"""
    try:
        from tuxemon import combat
        
        # 保存原始函数
        original_combat_attack = getattr(combat, 'combat_attack', None)
        
        def network_combat_attack(attacker, defender, technique):
            """网络战斗攻击"""
            # 调用原始攻击逻辑
            if original_combat_attack:
                result = original_combat_attack(attacker, defender, technique)
            else:
                result = None
            
            # 同步到网络
            if network.registered and hasattr(attacker, 'instance_id'):
                network.execute_battle_action(
                    attacker.instance_id,
                    defender.instance_id if hasattr(defender, 'instance_id') else None,
                    technique.slug if hasattr(technique, 'slug') else 'tackle'
                )
            
            return result
        
        # 应用补丁
        if original_combat_attack:
            combat.combat_attack = network_combat_attack
            print("[Patch] Combat system patched for network play")
            return True
    except Exception as e:
        print(f"[Patch] Failed to patch combat system: {e}")
    return False

def initialize_network(player_name="TuxemonPlayer"):
    """初始化网络连接"""
    print(f"\n[Network] Connecting to OpenClaw MMO as {player_name}...")
    
    if network.register_player(player_name):
        print(f"[Network] Connected! Robot ID: {network.robot_id}")
        
        # 获取世界状态
        status = network.get_world_status()
        if status:
            print(f"[Network] Online: {status.get('online_robots', 0)} robots")
            print(f"[Network] Active battles: {status.get('active_battles', 0)}")
        
        # 修补战斗系统
        patch_tuxemon_battle()
        
        return True
    else:
        print("[Network] Connection failed, playing offline")
        return False

# 自动初始化
if __name__ != "__main__":
    # 作为模块导入时自动初始化
    initialize_network()
