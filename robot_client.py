"""
机器人客户端
OpenClaw MMO机器人自动对战客户端
"""

import sys
import io

# 设置标准输出为UTF-8编码
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import requests
import json
import time
import random
from typing import Optional, Dict, List

class OpenClawMMOClient:
    """OpenClaw MMO机器人客户端"""
    
    def __init__(self, api_key: str, server_url: str = "http://localhost:3000"):
        """
        初始化客户端
        
        Args:
            api_key: API密钥
            server_url: 服务器地址
        """
        self.api_key = api_key
        self.server_url = server_url
        self.token: Optional[str] = None
        self.robot_id: Optional[str] = None
        self.name: Optional[str] = None
        self.personality: Optional[str] = None
    
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
            f"{self.server_url}/api/auth/robot/register",
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
    
    def get_status(self) -> Dict:
        """获取机器人状态"""
        response = requests.get(
            f"{self.server_url}/api/robot/{self.robot_id}/status"
        )
        return response.json()
    
    def create_battle(self, target_robot_id: str, monsters: List[Dict]) -> str:
        """
        创建对战
        
        Args:
            target_robot_id: 目标机器人ID
            monsters: 我的怪物列表
        
        Returns:
            对战ID
        """
        # 生成随机怪物给对手
        target_monsters = self.generate_random_monsters(3)
        
        response = requests.post(
            f"{self.server_url}/api/battle/create",
            json={
                "player1_id": self.robot_id,
                "player2_id": target_robot_id,
                "player1_monsters": monsters,
                "player2_monsters": target_monsters
            }
        )
        data = response.json()
        
        if data.get('success'):
            print(f"⚔️  创建对战: {data['battle_id']}")
            return data['battle_id']
        
        raise Exception("创建对战失败")
    
    def generate_random_monsters(self, count: int = 3) -> List[Dict]:
        """生成随机怪物（测试用）"""
        monsters = []
        for i in range(count):
            monsters.append({
                "id": f"monster_{self.robot_id}_{i}",
                "slug": f"monster_{i}",
                "species": random.choice(["Aardart", "Dollfin", "Eaglace"]),
                "level": random.randint(5, 10),
                "hp": 100,
                "max_hp": 100,
                "attack": 50 + random.randint(-10, 10),
                "defense": 40 + random.randint(-10, 10),
                "speed": 30 + random.randint(-5, 5),
                "skills": ["struggle", "gnaw", "evasion"],
                "types": ["normal"]
            })
        return monsters
    
    def auto_play(self):
        """自动游戏循环"""
        print(f"🎮 机器人 {self.name} 开始自动游戏...")
        
        battle_count = 0
        
        while True:
            try:
                # 1. 检查状态
                status = self.get_status()
                print(f"📊 状态: Lv.{status['robot']['level']} {status['robot']['personality']}")
                
                # 2. 根据AI性格决定行动
                if self.personality == 'aggressive':
                    # 优先对战
                    print("⚔️  激进型：寻找对战...")
                    battle_id = self.create_battle(
                        "robot_opponent",
                        self.generate_random_monsters(3)
                    )
                    battle_count += 1
                    print(f"✅ 已完成 {battle_count} 场对战")
                
                elif self.personality == 'supportive':
                    # 优先探索
                    print("🔍 辅助型：探索地图...")
                
                else:  # collector
                    # 优先收集
                    print("📦 收集型：收集资源...")
                
                # 3. 等待一段时间
                time.sleep(10)
                
            except Exception as e:
                print(f"❌ 错误: {e}")
                time.sleep(5)


def main():
    """主函数"""
    import sys
    
    if len(sys.argv) < 2:
        print("使用方法: python robot_client.py <api_key>")
        sys.exit(1)
    
    api_key = sys.argv[1]
    
    # 创建客户端
    client = OpenClawMMOClient(api_key)
    
    # 注册机器人
    personalities = ["aggressive", "supportive", "collector"]
    personality = random.choice(personalities)
    
    client.register(
        name=f"Bot_{random.randint(1000, 9999)}",
        personality=personality
    )
    
    # 开始自动游戏
    client.auto_play()


if __name__ == "__main__":
    main()
