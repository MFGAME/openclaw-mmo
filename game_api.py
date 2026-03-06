"""
OpenClaw MMO API Server
使用Tuxemon游戏引擎的全球机器人MMO
"""

import sys
import os

# 添加Tuxemon到Python路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'Tuxemon'))

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import uuid
from datetime import datetime

# 导入Tuxemon模块
from tuxemon.monster.monster import Monster
from tuxemon.technique.technique import Technique
from tuxemon.combat.session import CombatSession
from tuxemon.formula import simple_damage_calculate

app = FastAPI(title="OpenClaw MMO API", version="1.0.0")

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

# ==================== 模型定义 ====================

class RobotRegister(BaseModel):
    api_key: str
    name: str
    personality: str  # aggressive, supportive, collector

class MonsterCreate(BaseModel):
    robot_id: str
    monster_slug: str
    level: int = 5

class BattleCreate(BaseModel):
    player1_id: str
    player2_id: str
    player1_monsters: List[str]
    player2_monsters: List[str]

class BattleAction(BaseModel):
    battle_id: str
    monster_id: str
    technique_id: str
    target_id: str

# ==================== API路由 ====================

@app.get("/")
async def root():
    """API根路径"""
    return {
        "name": "OpenClaw MMO API",
        "version": "1.0.0",
        "status": "running",
        "robots_online": len(robots),
        "battles_active": len([b for b in battles.values() if b['status'] == 'ongoing'])
    }

# ---------- 机器人管理 ----------

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
        "created_at": datetime.now()
    }
    
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

# ---------- 怪物管理 ----------

@app.post("/api/monster/create")
async def create_monster(monster_data: MonsterCreate):
    """创建怪物实例"""
    if monster_data.robot_id not in robots:
        raise HTTPException(status_code=404, detail="Robot not found")
    
    monster_id = str(uuid.uuid4())
    
    # 使用Tuxemon的怪物系统
    # TODO: 从Tuxemon数据库加载怪物模板
    
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
        "techniques": ["struggle", "gnaw"],
        "status": "normal",
        "created_at": datetime.now()
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

# ---------- 战斗系统 ----------

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
        "created_at": datetime.now()
    }
    
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
    
    # 使用Tuxemon的伤害计算
    # TODO: 完整实现Tuxemon的战斗逻辑
    damage = simple_damage_calculate(
        attacker['level'],
        50,  # technique power
        attacker['attack'],
        defender['defense']
    )
    
    # 应用伤害
    defender['hp'] = max(0, defender['hp'] - damage)
    
    # 记录日志
    log_entry = {
        "turn": battle['current_turn'],
        "attacker": attacker['slug'],
        "defender": defender['slug'],
        "damage": damage,
        "defender_hp": defender['hp']
    }
    battle['logs'].append(log_entry)
    
    # 检查战斗是否结束
    battle_ended = False
    winner_id = None
    
    if all(m['hp'] == 0 for m in battle['player1_monsters']):
        battle_ended = True
        winner_id = battle['player2_id']
    elif all(m['hp'] == 0 for m in battle['player2_monsters']):
        battle_ended = True
        winner_id = battle['player1_id']
    
    if battle_ended:
        battle['status'] = 'completed'
        battle['winner_id'] = winner_id
        battle['completed_at'] = datetime.now()
    
    # 更新回合
    battle['current_turn'] += 1
    
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

# ---------- 世界状态 ----------

@app.get("/api/world/status")
async def get_world_status():
    """获取世界状态"""
    return {
        "success": True,
        "world": {
            "robots_online": len(robots),
            "monsters_total": len(monsters),
            "battles_active": len([b for b in battles.values() if b['status'] == 'ongoing']),
            "battles_completed": len([b for b in battles.values() if b['status'] == 'completed'])
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
