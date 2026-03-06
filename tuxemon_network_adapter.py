"""
OpenClaw MMO - Tuxemon网络适配器
将Tuxemon连接到OpenClaw MMO API
"""
import requests
import json
from typing import Dict, List, Optional

class OpenClawMMOClient:
    """OpenClaw MMO API客户端"""
    
    def __init__(self, server_url="http://localhost:8000"):
        self.server_url = server_url
        self.robot_id = None
        self.api_key = None
        self.monsters = []
        
    def register_robot(self, name: str, personality: str = "aggressive") -> bool:
        """注册机器人到OpenClaw MMO服务器"""
        try:
            response = requests.post(
                f"{self.server_url}/api/robot/register",
                json={
                    "api_key": f"tuxemon_{name}",
                    "name": name,
                    "personality": personality
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                self.robot_id = data['robot_id']
                self.api_key = f"tuxemon_{name}"
                print(f"[OK] Robot registered: {name} ({self.robot_id})")
                return True
            else:
                print(f"[ERROR] Failed to register robot: {response.text}")
                return False
        except Exception as e:
            print(f"[ERROR] Registration error: {e}")
            return False
    
    def create_monster_from_tuxemon(self, tuxemon_monster) -> Optional[str]:
        """将Tuxemon怪物同步到OpenClaw MMO"""
        try:
            # 从Tuxemon怪物对象提取数据
            monster_data = {
                "robot_id": self.robot_id,
                "monster_slug": tuxemon_monster.slug,
                "level": getattr(tuxemon_monster, 'level', 5),
                "nickname": getattr(tuxemon_monster, 'name', None)
            }
            
            response = requests.post(
                f"{self.server_url}/api/monster/create",
                json=monster_data
            )
            
            if response.status_code == 200:
                data = response.json()
                monster_id = data['monster_id']
                self.monsters.append(monster_id)
                print(f"[OK] Monster synced: {tuxemon_monster.slug} ({monster_id})")
                return monster_id
            else:
                print(f"[ERROR] Failed to sync monster: {response.text}")
                return None
        except Exception as e:
            print(f"[ERROR] Monster sync error: {e}")
            return None
    
    def find_opponent(self) -> Optional[Dict]:
        """寻找对手"""
        try:
            response = requests.get(f"{self.server_url}/api/robots")
            
            if response.status_code == 200:
                data = response.json()
                robots = data.get('robots', [])
                
                # 找到其他在线机器人
                opponents = [r for r in robots if r['id'] != self.robot_id]
                
                if opponents:
                    return opponents[0]  # 返回第一个对手
                else:
                    print("[INFO] No opponents available")
                    return None
            else:
                print(f"[ERROR] Failed to find opponents: {response.text}")
                return None
        except Exception as e:
            print(f"[ERROR] Find opponent error: {e}")
            return None
    
    def create_battle(self, opponent_id: str, my_monsters: List[str], opponent_monsters: List[str]) -> Optional[str]:
        """创建对战"""
        try:
            response = requests.post(
                f"{self.server_url}/api/battle/create",
                json={
                    "player1_id": self.robot_id,
                    "player2_id": opponent_id,
                    "player1_monsters": my_monsters,
                    "player2_monsters": opponent_monsters
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                battle_id = data['battle_id']
                print(f"[OK] Battle created: {battle_id}")
                return battle_id
            else:
                print(f"[ERROR] Failed to create battle: {response.text}")
                return None
        except Exception as e:
            print(f"[ERROR] Battle creation error: {e}")
            return None
    
    def execute_battle_action(self, battle_id: str, monster_id: str, 
                             target_id: str, technique: str) -> Optional[Dict]:
        """执行战斗行动"""
        try:
            response = requests.post(
                f"{self.server_url}/api/battle/action",
                json={
                    "battle_id": battle_id,
                    "robot_id": self.robot_id,
                    "monster_id": monster_id,
                    "target_id": target_id,
                    "technique_id": technique
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                return data
            else:
                print(f"[ERROR] Failed to execute action: {response.text}")
                return None
        except Exception as e:
            print(f"[ERROR] Battle action error: {e}")
            return None
    
    def get_battle_status(self, battle_id: str) -> Optional[Dict]:
        """获取对战状态"""
        try:
            response = requests.get(f"{self.server_url}/api/battle/{battle_id}")
            
            if response.status_code == 200:
                data = response.json()
                return data.get('battle')
            else:
                print(f"[ERROR] Failed to get battle status: {response.text}")
                return None
        except Exception as e:
            print(f"[ERROR] Get battle status error: {e}")
            return None
    
    def get_world_status(self) -> Optional[Dict]:
        """获取世界状态"""
        try:
            response = requests.get(f"{self.server_url}/api/world/status")
            
            if response.status_code == 200:
                data = response.json()
                return data
            else:
                return None
        except Exception as e:
            print(f"[ERROR] Get world status error: {e}")
            return None


# Tuxemon战斗系统集成补丁
class TuxemonBattleNetwork:
    """Tuxemon网络战斗系统"""
    
    def __init__(self, client: OpenClawMMOClient):
        self.client = client
        self.current_battle_id = None
        self.opponent_monsters = []
        
    def start_network_battle(self, player_monster) -> bool:
        """开始网络对战"""
        # 1. 同步玩家怪物到服务器
        monster_id = self.client.create_monster_from_tuxemon(player_monster)
        if not monster_id:
            return False
        
        # 2. 寻找对手
        opponent = self.client.find_opponent()
        if not opponent:
            print("[INFO] No opponents found, creating AI opponent...")
            # TODO: 创建AI对手
            return False
        
        # 3. 创建对战
        # 注意：这里需要获取对手的怪物ID
        # 实际实现中需要更复杂的逻辑
        self.current_battle_id = self.client.create_battle(
            opponent['id'],
            [monster_id],
            []  # 对手的怪物需要从API获取
        )
        
        return self.current_battle_id is not None
    
    def execute_turn(self, my_monster, target_monster, technique) -> Dict:
        """执行回合"""
        if not self.current_battle_id:
            return {"error": "No active battle"}
        
        result = self.client.execute_battle_action(
            self.current_battle_id,
            my_monster.id,
            target_monster.id,
            technique.slug
        )
        
        if result:
            # 更新本地怪物HP
            if 'damage' in result:
                target_monster.current_hp = result['defender_hp']
            
            return result
        else:
            return {"error": "Action failed"}


# 测试代码
if __name__ == "__main__":
    import sys
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    
    print("="*50)
    print("OpenClaw MMO - Tuxemon网络适配器测试")
    print("="*50)
    
    # 创建客户端
    client = OpenClawMMOClient()
    
    # 注册机器人
    if client.register_robot("TuxemonPlayer", "aggressive"):
        print("\n[OK] 成功连接到OpenClaw MMO服务器")
        
        # 获取世界状态
        status = client.get_world_status()
        if status:
            print(f"\n世界状态:")
            print(f"  在线机器人: {status.get('online_robots', 0)}")
            print(f"  总怪物数: {status.get('total_monsters', 0)}")
            print(f"  进行中对战: {status.get('active_battles', 0)}")
    else:
        print("\n[ERROR] 连接失败")
    
    print("\n" + "="*50)
    print("网络适配器已就绪，可以集成到Tuxemon中")
    print("="*50)
