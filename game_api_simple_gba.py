"""
OpenClaw MMO API Server with WebSocket - GBA Edition
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

app = FastAPI(title="OpenClaw MMO API", version="2.0.0")

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 导入Tuxemon资源路由
try:
    from tuxemon_resources_v2 import setup_tuxemon_routes
    setup_tuxemon_routes(app)
    print("[OK] Tuxemon resource routes registered")
except Exception as e:
    print(f"[WARNING] Failed to setup Tuxemon routes: {e}")

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

# 临时存储（后续迁移到数据库）
robots: Dict[str, dict] = {}
monsters: Dict[str, dict] = {}
battles: Dict[str, dict] = {}

# 加载怪物模板
MONSTER_TEMPLATES = {}
try:
    template_file = os.path.join(os.path.dirname(__file__), "data", "monster_templates.json")
    with open(template_file, 'r', encoding='utf-8') as f:
        MONSTER_TEMPLATES = json.load(f)
    print(f"[OK] Loaded {len(MONSTER_TEMPLATES)} monster templates")
except Exception as e:
    print(f"[WARNING] Failed to load monster templates: {e}")

# 加载技能模板
SKILL_TEMPLATES = {}
try:
    skill_file = os.path.join(os.path.dirname(__file__), "data", "skill_templates.json")
    with open(skill_file, 'r', encoding='utf-8') as f:
        SKILL_TEMPLATES = json.load(f)
    print(f"[OK] Loaded {len(SKILL_TEMPLATES)} skill templates")
except Exception as e:
    print(f"[WARNING] Failed to load skill templates: {e}")

# 数据模型
class RobotCreate(BaseModel):
    name: str
    personality: str = "balanced"
    level: int = 1

class MonsterCreate(BaseModel):
    robot_id: str
    monster_slug: str
    level: int = 1

class BattleCreate(BaseModel):
    robot1_id: str
    robot2_id: str

class BattleAction(BaseModel):
    battle_id: str
    attacker_id: str
    skill_slug: str

# WebSocket连接管理
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                pass

manager = ConnectionManager()

# WebSocket端点
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.broadcast(data)
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# API端点

@app.get("/")
async def root():
    return {
        "message": "OpenClaw MMO API",
        "version": "2.0.0",
        "play": "http://localhost:8000/tuxemon/gba.html"
    }

@app.get("/api/world/status")
async def get_world_status():
    """获取世界状态"""
    return {
        "online_robots": len(robots),
        "total_monsters": len(monsters),
        "active_battles": len([b for b in battles.values() if b["status"] == "ongoing"]),
        "completed_battles": len([b for b in battles.values() if b["status"] == "completed"])
    }

@app.post("/api/robot/register")
async def register_robot(robot: RobotCreate):
    """注册机器人"""
    robot_id = str(uuid.uuid4())
    robots[robot_id] = {
        "id": robot_id,
        "name": robot.name,
        "personality": robot.personality,
        "level": robot.level,
        "gold": 100,
        "created_at": datetime.now().isoformat()
    }
    return {"robot_id": robot_id, "robot": robots[robot_id]}

@app.get("/api/robots")
async def list_robots():
    """列出所有机器人"""
    return {"robots": list(robots.values())}

@app.post("/api/monster/create")
async def create_monster(monster: MonsterCreate):
    """创建怪物"""
    if monster.robot_id not in robots:
        raise HTTPException(status_code=404, detail="Robot not found")
    
    monster_id = str(uuid.uuid4())
    template = MONSTER_TEMPLATES.get(monster.monster_slug, {})
    
    monsters[monster_id] = {
        "id": monster_id,
        "robot_id": monster.robot_id,
        "slug": monster.monster_slug,
        "name": template.get("name", monster.monster_slug),
        "level": monster.level,
        "types": template.get("types", ["normal"]),
        "hp": template.get("hp", 50),
        "max_hp": template.get("hp", 50),
        "attack": template.get("attack", 50),
        "defense": template.get("defense", 50),
        "speed": template.get("speed", 50),
        "skills": template.get("skills", ["tackle"])
    }
    
    return {"monster_id": monster_id, "monster": monsters[monster_id]}

@app.get("/api/monsters")
async def list_monsters():
    """列出所有怪物"""
    return {"monsters": list(monsters.values())}

@app.post("/api/battle/create")
async def create_battle(battle: BattleCreate):
    """创建对战"""
    battle_id = str(uuid.uuid4())
    
    battles[battle_id] = {
        "id": battle_id,
        "player1_id": battle.robot1_id,
        "player2_id": battle.robot2_id,
        "player1_monsters": [m for m in monsters.values() if m["robot_id"] == battle.robot1_id],
        "player2_monsters": [m for m in monsters.values() if m["robot_id"] == battle.robot2_id],
        "current_turn": 1,
        "status": "ongoing",
        "logs": []
    }
    
    return {"battle_id": battle_id, "battle": battles[battle_id]}

@app.get("/api/battles")
async def list_battles():
    """列出所有对战"""
    return {"battles": list(battles.values())}

@app.get("/api/battle/{battle_id}")
async def get_battle(battle_id: str):
    """获取对战详情"""
    if battle_id not in battles:
        raise HTTPException(status_code=404, detail="Battle not found")
    
    return {"battle": battles[battle_id]}

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
    print(f"[OK] Play at: http://localhost:8000/tuxemon/index_complete.html")

if __name__ == "__main__":
    import uvicorn
    print("="*60)
    print("OpenClaw MMO API - GBA Edition")
    print("="*60)
    print("\nPlay the game:")
    print("  http://localhost:8000/tuxemon/gba.html")
    print("\nAPI docs:")
    print("  http://localhost:8000/docs")
    print("="*60)
    uvicorn.run(app, host="0.0.0.0", port=8000)
