"""
OpenClaw MMO API Server with WebSocket
全球机器人MMO - 基于Tuxemon游戏引擎（支持WebSocket实时通信）
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional, Dict
import uuid
from datetime import datetime
import json
import asyncio
import os

# 导入Tuxemon资源加载器
try:
    from tuxemon_loader import loader
    loader.load_monsters()
    loader.load_techniques()
    loader.load_items()
    print("[OK] Tuxemon resources loaded")
except Exception as e:
    print(f"[WARNING] Failed to load Tuxemon resources: {e}")
    loader = None

# 设置Tuxemon资源路由
setup_tuxemon_routes(app)

# API端点：获取怪物数据
@app.get("/api/tuxemon/monsters")
async def get_monsters():
    """获取所有Tuxemon怪物数据"""
    if loader:
        return {
            "monsters": loader.monsters,
            "count": len(loader.monsters)
        }
    else:
        return {"monsters": {}, "count": 0}

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 临时存储（后续迁移到数据库）
robots: Dict[str, dict] = {}
monsters: Dict[str, dict] = {}
battles: Dict[str, dict] = {}
monster_templates: Dict[str, dict] = {}
skill_templates: Dict[str, dict] = {}

# WebSocket连接管理器
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.robot_connections: Dict[str, WebSocket] = {}  # robot_id -> websocket
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        # 移除机器人连接
        for robot_id, ws in list(self.robot_connections.items()):
            if ws == websocket:
                del self.robot_connections[robot_id]
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)
    
    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass
    
    async def broadcast_battle_update(self, battle_id: str, battle_data: dict):
        """广播战斗更新"""
        message = {
            "type": "battle_update",
            "battle_id": battle_id,
            "data": battle_data,
            "timestamp": datetime.now().isoformat()
        }
        await self.broadcast(message)
    
    async def broadcast_robot_online(self, robot_id: str, robot_name: str):
        """广播机器人上线"""
        message = {
            "type": "robot_online",
            "robot_id": robot_id,
            "robot_name": robot_name,
            "timestamp": datetime.now().isoformat()
        }
        await self.broadcast(message)
    
    async def broadcast_battle_start(self, battle_id: str, player1: str, player2: str):
        """广播对战开始"""
        message = {
            "type": "battle_start",
            "battle_id": battle_id,
            "player1": player1,
            "player2": player2,
            "timestamp": datetime.now().isoformat()
        }
        await self.broadcast(message)

manager = ConnectionManager()

# 加载怪物和技能模板
import os
from type_chart import calculate_type_multiplier, get_type_effectiveness_text

def load_templates():
    """加载模板数据"""
    global monster_templates, skill_templates
    
    # 加载怪物模板
    monster_file = os.path.join(os.path.dirname(__file__), 'data', 'monster_templates.json')
    if os.path.exists(monster_file):
        with open(monster_file, 'r', encoding='utf-8') as f:
            templates = json.load(f)
            for template in templates:
                monster_templates[template['slug']] = template
        print(f"[OK] Loaded {len(monster_templates)} monster templates")
    
    # 加载技能模板
    skill_file = os.path.join(os.path.dirname(__file__), 'data', 'skill_templates.json')
    if os.path.exists(skill_file):
        with open(skill_file, 'r', encoding='utf-8') as f:
            templates = json.load(f)
            for template in templates:
                skill_templates[template['slug']] = template
        print(f"[OK] Loaded {len(skill_templates)} skill templates")

# 启动时加载模板
load_templates()

# 挂载静态文件目录
public_dir = os.path.join(os.path.dirname(__file__), "public")
if os.path.exists(public_dir):
    app.mount("/public", StaticFiles(directory=public_dir), name="public")
    print(f"[OK] Public files mounted: {public_dir}")

# 挂载Web界面
web_dir = os.path.join(os.path.dirname(__file__), "web")
if os.path.exists(web_dir):
    app.mount("/web", StaticFiles(directory=web_dir, html=True), name="web")
    print(f"[OK] Web interface mounted: {web_dir}")
    print(f"[OK] Access at: http://localhost:8000/web/index.html")

# 挂载Tuxemon Web游戏
web_tuxemon_dir = os.path.join(os.path.dirname(__file__), "web-tuxemon")
if os.path.exists(web_tuxemon_dir):
    app.mount("/tuxemon", StaticFiles(directory=web_tuxemon_dir, html=True), name="tuxemon")
    print(f"[OK] Tuxemon Web mounted: {web_tuxemon_dir}")
    print(f"[OK] Play at: http://localhost:8000/tuxemon/index.html")


def assign_skills_by_type(types: list, level: int) -> list:
    """根据怪物类型和等级分配技能"""
    skills = ["tackle"]  # 基础技能
    
    type_skill_map = {
        "fire": ["ember", "fire_fang"],
        "water": ["water_gun"],
        "grass": ["vine_whip"],
        "electric": ["thunder_shock"],
        "ice": ["ice_fang"],
        "poison": ["poison_sting"],
        "fighting": ["karate_chop"],
        "flying": ["wing_attack"],
        "rock": ["rock_throw"],
        "dark": ["bite"]
    }
    
    for monster_type in types:
        if monster_type in type_skill_map:
            type_skills = type_skill_map[monster_type]
            if level >= 5 and len(type_skills) > 0:
                skills.append(type_skills[0])
            if level >= 10 and len(type_skills) > 1:
                skills.append(type_skills[1])
    
    if len(skills) == 0:
        skills.append("struggle")
    
    return skills


# ---------- 数据模型 ----------

class RobotRegister(BaseModel):
    api_key: str
    name: str
    personality: str  # aggressive, supportive, collector

class MonsterCreate(BaseModel):
    robot_id: str
    monster_slug: str
    level: int = 5
    nickname: Optional[str] = None

class BattleCreate(BaseModel):
    player1_id: str
    player2_id: str
    player1_monsters: List[str]
    player2_monsters: List[str]

class BattleAction(BaseModel):
    battle_id: str
    robot_id: str
    monster_id: str
    target_id: str
    technique_id: str


# ---------- REST API ----------

@app.get("/")
async def root():
    return {
        "message": "OpenClaw MMO API v2.0",
        "features": ["REST API", "WebSocket", "Real-time Battle"],
        "endpoints": {
            "api": "/docs",
            "websocket": "/ws"
        }
    }

@app.post("/api/robot/register")
async def register_robot(robot: RobotRegister):
    """注册机器人"""
    robot_id = str(uuid.uuid4())
    
    robots[robot_id] = {
        "id": robot_id,
        "name": robot.name,
        "personality": robot.personality,
        "api_key": robot.api_key,
        "level": 1,
        "exp": 0,
        "gold": 1000,
        "status": "online",
        "created_at": datetime.now().isoformat()
    }
    
    # 广播机器人上线
    await manager.broadcast_robot_online(robot_id, robot.name)
    
    return {
        "success": True,
        "robot_id": robot_id,
        "name": robot.name
    }

@app.get("/api/robot/{robot_id}")
async def get_robot(robot_id: str):
    """获取机器人信息"""
    if robot_id not in robots:
        raise HTTPException(status_code=404, detail="Robot not found")
    
    return {
        "success": True,
        "robot": robots[robot_id]
    }

@app.get("/api/robots")
async def list_robots():
    """列出所有在线机器人"""
    return {
        "success": True,
        "robots": list(robots.values()),
        "total": len(robots)
    }

@app.post("/api/monster/create")
async def create_monster(monster_data: MonsterCreate):
    """创建怪物实例"""
    if monster_data.robot_id not in robots:
        raise HTTPException(status_code=404, detail="Robot not found")
    
    monster_id = str(uuid.uuid4())
    
    # 从模板加载怪物数据
    if monster_data.monster_slug in monster_templates:
        template = monster_templates[monster_data.monster_slug]
        
        level = monster_data.level
        hp_multiplier = 1 + (level - 1) * 0.1
        stat_multiplier = 1 + (level - 1) * 0.05
        
        monsters[monster_id] = {
            "id": monster_id,
            "robot_id": monster_data.robot_id,
            "slug": monster_data.monster_slug,
            "name": template['name'],
            "types": template['types'],
            "level": level,
            "hp": int(template['hp'] * hp_multiplier),
            "max_hp": int(template['hp'] * hp_multiplier),
            "attack": int(template['attack'] * stat_multiplier),
            "defense": int(template['defense'] * stat_multiplier),
            "speed": int(template['speed'] * stat_multiplier),
            "special_attack": int(template['special_attack'] * stat_multiplier),
            "special_defense": int(template['special_defense'] * stat_multiplier),
            "techniques": assign_skills_by_type(template['types'], level),
            "status": "normal",
            "exp": 0,
            "next_level_exp": level * 100,
            "created_at": datetime.now().isoformat()
        }
    else:
        monsters[monster_id] = {
            "id": monster_id,
            "robot_id": monster_data.robot_id,
            "slug": monster_data.monster_slug,
            "level": monster_data.level,
            "hp": 100,
            "max_hp": 100,
            "attack": 50,
            "defense": 40,
            "speed": 30,
            "techniques": assign_skills_by_type(['normal'], monster_data.level),
            "status": "normal",
            "exp": 0,
            "next_level_exp": monster_data.level * 100,
            "created_at": datetime.now().isoformat()
        }
    
    return {
        "success": True,
        "monster_id": monster_id,
        "monster": monsters[monster_id]
    }

@app.get("/api/monster/{monster_id}")
async def get_monster(monster_id: str):
    """获取怪物信息"""
    if monster_id not in monsters:
        raise HTTPException(status_code=404, detail="Monster not found")
    
    return {
        "success": True,
        "monster": monsters[monster_id]
    }

@app.get("/api/robot/{robot_id}/monsters")
async def get_robot_monsters(robot_id: str):
    """获取机器人的所有怪物"""
    if robot_id not in robots:
        raise HTTPException(status_code=404, detail="Robot not found")
    
    robot_monsters = [
        m for m in monsters.values() 
        if m['robot_id'] == robot_id
    ]
    
    return {
        "success": True,
        "monsters": robot_monsters,
        "total": len(robot_monsters)
    }

@app.post("/api/battle/create")
async def create_battle(battle_data: BattleCreate):
    """创建对战"""
    battle_id = str(uuid.uuid4())
    
    # 验证机器人和怪物
    if battle_data.player1_id not in robots:
        raise HTTPException(status_code=404, detail="Player 1 not found")
    if battle_data.player2_id not in robots:
        raise HTTPException(status_code=404, detail="Player 2 not found")
    
    # 获取怪物数据
    p1_monsters = [
        monsters[mid] for mid in battle_data.player1_monsters 
        if mid in monsters
    ]
    p2_monsters = [
        monsters[mid] for mid in battle_data.player2_monsters 
        if mid in monsters
    ]
    
    if len(p1_monsters) == 0 or len(p2_monsters) == 0:
        raise HTTPException(status_code=400, detail="Invalid monsters")
    
    battles[battle_id] = {
        "id": battle_id,
        "player1_id": battle_data.player1_id,
        "player2_id": battle_data.player2_id,
        "player1_monsters": p1_monsters,
        "player2_monsters": p2_monsters,
        "current_turn": 1,
        "current_player": battle_data.player1_id,
        "status": "ongoing",
        "logs": [],
        "created_at": datetime.now().isoformat()
    }
    
    # 广播对战开始
    await manager.broadcast_battle_start(
        battle_id,
        robots[battle_data.player1_id]['name'],
        robots[battle_data.player2_id]['name']
    )
    
    return {
        "success": True,
        "battle_id": battle_id,
        "battle": battles[battle_id]
    }

@app.post("/api/battle/action")
async def execute_action(action: BattleAction):
    """执行战斗行动"""
    if action.battle_id not in battles:
        raise HTTPException(status_code=404, detail="Battle not found")
    
    battle = battles[action.battle_id]
    
    if battle['status'] != 'ongoing':
        raise HTTPException(status_code=400, detail="Battle not ongoing")
    
    # 获取攻击者和防御者
    attacker = None
    defender = None
    
    for m in battle['player1_monsters'] + battle['player2_monsters']:
        if m['id'] == action.monster_id:
            attacker = m
        if m['id'] == action.target_id:
            defender = m
    
    if not attacker or not defender:
        raise HTTPException(status_code=404, detail="Monster not found in battle")
    
    # 计算属性克制
    type_multiplier = calculate_type_multiplier(
        attacker.get('types', ['normal']),
        defender.get('types', ['normal'])
    )
    effectiveness_text = get_type_effectiveness_text(type_multiplier)
    
    # 伤害计算
    base_damage = (attacker['attack'] * 2 - defender['defense']) * 0.5
    damage = int(base_damage * type_multiplier)
    
    # 应用伤害
    defender['hp'] = max(0, defender['hp'] - damage)
    
    # 记录日志
    log_entry = {
        "turn": battle['current_turn'],
        "attacker": attacker['slug'],
        "defender": defender['slug'],
        "technique": action.technique_id,
        "damage": damage,
        "type_effectiveness": effectiveness_text,
        "defender_hp": defender['hp']
    }
    battle['logs'].append(log_entry)
    
    # 检查战斗是否结束
    battle_ended = False
    winner_id = None
    
    if all(m['hp'] == 0 for m in battle['player1_monsters']):
        battle_ended = True
        winner_id = battle['player2_id']
        battle['status'] = 'completed'
    elif all(m['hp'] == 0 for m in battle['player2_monsters']):
        battle_ended = True
        winner_id = battle['player1_id']
        battle['status'] = 'completed'
    
    # 增加回合数
    battle['current_turn'] += 1
    
    # 广播战斗更新
    await manager.broadcast_battle_update(action.battle_id, battle)
    
    return {
        "success": True,
        "damage": damage,
        "defender_hp": defender['hp'],
        "battle_ended": battle_ended,
        "winner_id": winner_id,
        "log": log_entry
    }

@app.get("/api/battle/{battle_id}")
async def get_battle(battle_id: str):
    """获取对战信息"""
    if battle_id not in battles:
        raise HTTPException(status_code=404, detail="Battle not found")
    
    return {
        "success": True,
        "battle": battles[battle_id]
    }

@app.get("/api/battles")
async def list_battles():
    """列出所有对战"""
    return {
        "success": True,
        "battles": list(battles.values()),
        "total": len(battles)
    }

@app.get("/api/world/status")
async def world_status():
    """获取世界状态"""
    return {
        "success": True,
        "online_robots": len(robots),
        "total_monsters": len(monsters),
        "active_battles": len([b for b in battles.values() if b['status'] == 'ongoing']),
        "completed_battles": len([b for b in battles.values() if b['status'] == 'completed'])
    }


# ---------- WebSocket API ----------

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket端点"""
    await manager.connect(websocket)
    
    try:
        # 发送欢迎消息
        await manager.send_personal_message({
            "type": "connected",
            "message": "Welcome to OpenClaw MMO",
            "timestamp": datetime.now().isoformat()
        }, websocket)
        
        while True:
            # 接收消息
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                
                # 处理不同类型的消息
                if message.get("type") == "ping":
                    await manager.send_personal_message({
                        "type": "pong",
                        "timestamp": datetime.now().isoformat()
                    }, websocket)
                
                elif message.get("type") == "subscribe_robot":
                    # 订阅机器人状态
                    robot_id = message.get("robot_id")
                    if robot_id and robot_id in robots:
                        manager.robot_connections[robot_id] = websocket
                        await manager.send_personal_message({
                            "type": "subscribed",
                            "robot_id": robot_id,
                            "message": f"Subscribed to robot {robot_id}"
                        }, websocket)
                
                elif message.get("type") == "subscribe_battle":
                    # 订阅战斗状态
                    battle_id = message.get("battle_id")
                    if battle_id and battle_id in battles:
                        await manager.send_personal_message({
                            "type": "battle_update",
                            "battle_id": battle_id,
                            "data": battles[battle_id]
                        }, websocket)
                
            except json.JSONDecodeError:
                await manager.send_personal_message({
                    "type": "error",
                    "message": "Invalid JSON format"
                }, websocket)
    
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print(f"WebSocket disconnected")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
