"""
数据库模型
"""
from sqlalchemy import Column, String, Integer, JSON, DateTime, Boolean, Enum, Float, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
import enum


class RobotPersonality(enum.Enum):
    """机器人性格"""
    AGGRESSIVE = "aggressive"
    SUPPORTIVE = "supportive"
    COLLECTOR = "collector"


class MonsterStatus(enum.Enum):
    """怪物状态"""
    NORMAL = "normal"
    FAINTED = "fainted"
    POISONED = "poisoned"
    PARALYZED = "paralyzed"
    BURNED = "burned"
    FROZEN = "frozen"
    SLEEPING = "sleeping"


class BattleStatus(enum.Enum):
    """对战状态"""
    WAITING = "waiting"
    ONGOING = "ongoing"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class BattleType(enum.Enum):
    """对战类型"""
    PVP = "pvp"
    PVE = "pve"
    ROBOT_VS_ROBOT = "robot_vs_robot"


# ==================== 用户相关 ====================

class User(Base):
    """用户表"""
    __tablename__ = "users"

    id = Column(String(36), primary_key=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    api_key = Column(String(36), unique=True, nullable=False, index=True)
    level = Column(Integer, default=1)
    exp = Column(Integer, default=0)
    gold = Column(Integer, default=1000)
    diamond = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    # 关系
    robots = relationship("Robot", back_populates="user")

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "level": self.level,
            "exp": self.exp,
            "gold": self.gold,
            "diamond": self.diamond,
            "created_at": self.created_at.isoformat()
        }


class Robot(Base):
    """机器人表"""
    __tablename__ = "robots"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(50), nullable=False)
    personality = Column(Enum(RobotPersonality), nullable=False)
    level = Column(Integer, default=1)
    exp = Column(Integer, default=0)
    status = Column(String(20), default="online")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    # 关系
    user = relationship("User", back_populates="robots")
    monsters = relationship("PlayerMonster", back_populates="robot")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "personality": self.personality.value,
            "level": self.level,
            "exp": self.exp,
            "status": self.status,
            "created_at": self.created_at.isoformat()
        }


# ==================== 怪物相关 ====================

class MonsterTemplate(Base):
    """怪物模板表"""
    __tablename__ = "monster_templates"

    id = Column(String(50), primary_key=True)
    slug = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    types = Column(JSON)
    category = Column(String(50))
    shape = Column(String(50))
    hp = Column(Integer, nullable=False)
    attack = Column(Integer, nullable=False)
    defense = Column(Integer, nullable=False)
    speed = Column(Integer, nullable=False)
    special_attack = Column(Integer, default=50)
    special_defense = Column(Integer, default=50)
    exp_yield = Column(Integer, default=100)
    catch_rate = Column(Integer, default=100)
    weight = Column(Float, default=1.0)
    height = Column(Float, default=1.0)
    description = Column(Text)
    sprites = Column(JSON)
    created_at = Column(DateTime, default=datetime.now)

    def to_dict(self):
        return {
            "id": self.id,
            "slug": self.slug,
            "name": self.name,
            "types": self.types,
            "hp": self.hp,
            "attack": self.attack,
            "defense": self.defense,
            "speed": self.speed,
            "special_attack": self.special_attack,
            "special_defense": self.special_defense
        }


class SkillTemplate(Base):
    """技能模板表"""
    __tablename__ = "skill_templates"

    id = Column(String(50), primary_key=True)
    slug = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    types = Column(JSON)
    category = Column(String(20), default="physical")
    power = Column(Integer, default=0)
    accuracy = Column(Integer, default=100)
    pp = Column(Integer, default=10)
    priority = Column(Integer, default=0)
    target = Column(String(20), default="enemy")
    effects = Column(JSON)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.now)


class PlayerMonster(Base):
    """玩家怪物表（实例化的怪物）"""
    __tablename__ = "player_monsters"

    id = Column(String(36), primary_key=True)
    robot_id = Column(String(36), ForeignKey("robots.id"), nullable=False, index=True)
    template_id = Column(String(50), ForeignKey("monster_templates.id"), nullable=False)
    nickname = Column(String(50))
    level = Column(Integer, default=1)
    exp = Column(Integer, default=0)
    hp = Column(Integer, nullable=False)
    max_hp = Column(Integer, nullable=False)
    attack = Column(Integer, nullable=False)
    defense = Column(Integer, nullable=False)
    speed = Column(Integer, nullable=False)
    special_attack = Column(Integer)
    special_defense = Column(Integer)
    skills = Column(JSON)
    status = Column(Enum(MonsterStatus), default=MonsterStatus.NORMAL)
    iv = Column(JSON)
    ev = Column(JSON)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    # 关系
    robot = relationship("Robot", back_populates="monsters")
    template = relationship("MonsterTemplate")

    def to_dict(self):
        return {
            "id": self.id,
            "robot_id": self.robot_id,
            "template_id": self.template_id,
            "nickname": self.nickname,
            "level": self.level,
            "hp": self.hp,
            "max_hp": self.max_hp,
            "attack": self.attack,
            "defense": self.defense,
            "speed": self.speed,
            "status": self.status.value,
            "created_at": self.created_at.isoformat()
        }


# ==================== 战斗相关 ====================

class Battle(Base):
    """对战记录表"""
    __tablename__ = "battles"

    id = Column(String(36), primary_key=True)
    player1_id = Column(String(36), ForeignKey("robots.id"), nullable=False, index=True)
    player2_id = Column(String(36), ForeignKey("robots.id"), nullable=False, index=True)
    player1_monsters = Column(JSON, nullable=False)
    player2_monsters = Column(JSON, nullable=False)
    winner_id = Column(String(36), ForeignKey("robots.id"))
    loser_id = Column(String(36), ForeignKey("robots.id"))
    battle_type = Column(Enum(BattleType), default=BattleType.ROBOT_VS_ROBOT)
    status = Column(Enum(BattleStatus), default=BattleStatus.ONGOING)
    turns = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.now)
    completed_at = Column(DateTime)

    # 关系
    logs = relationship("BattleLog", back_populates="battle")

    def to_dict(self):
        return {
            "id": self.id,
            "player1_id": self.player1_id,
            "player2_id": self.player2_id,
            "status": self.status.value,
            "turns": self.turns,
            "created_at": self.created_at.isoformat()
        }


class BattleLog(Base):
    """战斗日志表"""
    __tablename__ = "battle_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    battle_id = Column(String(36), ForeignKey("battles.id"), nullable=False, index=True)
    turn = Column(Integer, nullable=False)
    actor_id = Column(String(36), nullable=False)
    action_type = Column(String(20), nullable=False)
    action_data = Column(JSON)
    result = Column(JSON)
    created_at = Column(DateTime, default=datetime.now)

    # 关系
    battle = relationship("Battle", back_populates="logs")


class Item(Base):
    """物品表"""
    __tablename__ = "items"

    id = Column(String(36), primary_key=True)
    robot_id = Column(String(36), ForeignKey("robots.id"), nullable=False, index=True)
    template_id = Column(String(50), nullable=False)
    quantity = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
