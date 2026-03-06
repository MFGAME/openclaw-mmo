# OpenClaw MMO - 选项A开发计划

---

## 📋 开发目标

**核心任务**：
1. 数据库持久化（MySQL）
2. 接入Tuxemon原生游戏逻辑
3. 导入Tuxemon怪物数据
4. 实现完整的战斗系统

---

## 🎯 Phase 1: 数据库设计与实现（第1-2天）

### 1.1 数据库架构设计

#### **核心表结构**

```sql
-- 用户表
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  api_key VARCHAR(36) UNIQUE NOT NULL,
  level INT DEFAULT 1,
  exp INT DEFAULT 0,
  gold INT DEFAULT 1000,
  diamond INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 机器人表
CREATE TABLE robots (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  name VARCHAR(50) NOT NULL,
  personality ENUM('aggressive', 'supportive', 'collector') NOT NULL,
  level INT DEFAULT 1,
  exp INT DEFAULT 0,
  status ENUM('online', 'offline', 'battling') DEFAULT 'online',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 怪物模板表（从Tuxemon导入）
CREATE TABLE monster_templates (
  id VARCHAR(50) PRIMARY KEY,
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50),
  shape VARCHAR(50),
  types JSON,
  hp INT NOT NULL,
  attack INT NOT NULL,
  defense INT NOT NULL,
  speed INT NOT NULL,
  special_attack INT,
  special_defense INT,
  exp_required INT,
  catch_rate INT,
  weight FLOAT,
  height FLOAT,
  description TEXT,
  sprites JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 技能模板表（从Tuxemon导入）
CREATE TABLE skill_templates (
  id VARCHAR(50) PRIMARY KEY,
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  types JSON,
  category ENUM('physical', 'special', 'meta'),
  power INT,
  accuracy INT,
  pp INT,
  priority INT,
  target VARCHAR(20),
  effects JSON,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 玩家怪物表（实例化的怪物）
CREATE TABLE player_monsters (
  id VARCHAR(36) PRIMARY KEY,
  robot_id VARCHAR(36) NOT NULL,
  template_id VARCHAR(50) NOT NULL,
  nickname VARCHAR(50),
  level INT DEFAULT 1,
  exp INT DEFAULT 0,
  hp INT NOT NULL,
  max_hp INT NOT NULL,
  attack INT NOT NULL,
  defense INT NOT NULL,
  speed INT NOT NULL,
  special_attack INT,
  special_defense INT,
  skills JSON,
  status ENUM('normal', 'fainted', 'poisoned', 'paralyzed', 'burned', 'frozen', 'sleeping'),
  iv JSON,
  ev JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (robot_id) REFERENCES robots(id),
  FOREIGN KEY (template_id) REFERENCES monster_templates(id)
);

-- 对战记录表
CREATE TABLE battles (
  id VARCHAR(36) PRIMARY KEY,
  player1_id VARCHAR(36) NOT NULL,
  player2_id VARCHAR(36) NOT NULL,
  player1_monsters JSON NOT NULL,
  player2_monsters JSON NOT NULL,
  winner_id VARCHAR(36),
  loser_id VARCHAR(36),
  battle_type ENUM('pvp', 'pve', 'robot_vs_robot'),
  status ENUM('ongoing', 'completed', 'cancelled') DEFAULT 'ongoing',
  turns INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  FOREIGN KEY (player1_id) REFERENCES robots(id),
  FOREIGN KEY (player2_id) REFERENCES robots(id)
);

-- 对战日志表
CREATE TABLE battle_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  battle_id VARCHAR(36) NOT NULL,
  turn INT NOT NULL,
  actor_id VARCHAR(36) NOT NULL,
  action_type VARCHAR(20) NOT NULL,
  action_data JSON,
  result JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (battle_id) REFERENCES battles(id)
);

-- 物品表
CREATE TABLE items (
  id VARCHAR(36) PRIMARY KEY,
  robot_id VARCHAR(36) NOT NULL,
  template_id VARCHAR(50) NOT NULL,
  quantity INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (robot_id) REFERENCES robots(id)
);
```

### 1.2 数据库配置

```typescript
// src/config/database.ts
import { createPool } from 'mysql2/promise';

export const db = createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'openclaw_mmo',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
```

### 1.3 ORM模型（TypeORM）

```typescript
// src/models/User.ts
import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm';
import { Robot } from './Robot';

@Entity('users')
export class User {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'api_key', unique: true })
  apiKey: string;

  @Column({ default: 1 })
  level: number;

  @Column({ default: 0 })
  exp: number;

  @Column({ default: 1000 })
  gold: number;

  @Column({ default: 0 })
  diamond: number;

  @OneToMany(() => Robot, robot => robot.user)
  robots: Robot[];
}
```

---

## 🎯 Phase 2: Tuxemon资源导入（第3-4天）

### 2.1 克隆Tuxemon项目

```bash
cd workspace
git clone https://github.com/Tuxemon/Tuxemon.git
```

### 2.2 怪物数据导入脚本

```python
# scripts/import_monsters.py
import json
import mysql.connector
from pathlib import Path

def import_monsters():
    """导入Tuxemon怪物数据到MySQL"""
    
    # 连接数据库
    conn = mysql.connector.connect(
        host='localhost',
        user='root',
        password='',
        database='openclaw_mmo'
    )
    cursor = conn.cursor()
    
    # 读取Tuxemon怪物数据
    tuxemon_path = Path('../Tuxemon/mods/tuxemon/db/monster')
    
    for monster_file in tuxemon_path.glob('*.json'):
        with open(monster_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # 插入数据库
        cursor.execute("""
            INSERT INTO monster_templates 
            (id, slug, name, category, shape, types, hp, attack, defense, speed,
             special_attack, special_defense, exp_required, catch_rate, 
             weight, height, description, sprites)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            data['slug'],
            data['slug'],
            data['name'],
            data.get('category', 'unknown'),
            data.get('shape', 'unknown'),
            json.dumps(data.get('types', [])),
            data['hp'],
            data['attack'],
            data['defense'],
            data['speed'],
            data.get('special_attack', 50),
            data.get('special_defense', 50),
            data.get('exp_required', 100),
            data.get('catch_rate', 100),
            data.get('weight', 1.0),
            data.get('height', 1.0),
            data.get('description', ''),
            json.dumps(data.get('sprites', {}))
        ))
    
    conn.commit()
    cursor.close()
    conn.close()
    
    print("✅ 怪物数据导入完成！")

if __name__ == '__main__':
    import_monsters()
```

### 2.3 技能数据导入脚本

```python
# scripts/import_techniques.py
import json
import mysql.connector
from pathlib import Path

def import_techniques():
    """导入Tuxemon技能数据到MySQL"""
    
    conn = mysql.connector.connect(
        host='localhost',
        user='root',
        password='',
        database='openclaw_mmo'
    )
    cursor = conn.cursor()
    
    # 读取Tuxemon技能数据
    technique_path = Path('../Tuxemon/mods/tuxemon/db/technique')
    
    for tech_file in technique_path.glob('*.json'):
        with open(tech_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        cursor.execute("""
            INSERT INTO skill_templates
            (id, slug, name, types, category, power, accuracy, pp, 
             priority, target, effects, description)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            data['slug'],
            data['slug'],
            data['name'],
            json.dumps(data.get('types', [])),
            data.get('category', 'physical'),
            data.get('power', 0),
            data.get('accuracy', 100),
            data.get('pp', 10),
            data.get('priority', 0),
            data.get('target', 'enemy'),
            json.dumps(data.get('effects', [])),
            data.get('description', '')
        ))
    
    conn.commit()
    cursor.close()
    conn.close()
    
    print("✅ 技能数据导入完成！")

if __name__ == '__main__':
    import_techniques()
```

---

## 🎯 Phase 3: Tuxemon核心逻辑移植（第5-7天）

### 3.1 战斗系统移植

**需要移植的核心模块**：
- `tuxemon/core/battle.py` - 战斗管理器
- `tuxemon/core/monster.py` - 怪物类
- `tuxemon/core/technique.py` - 技能类
- `tuxemon/core/combat.py` - 战斗逻辑

### 3.2 TypeScript版战斗系统

```typescript
// src/battle/TuxemonBattleEngine.ts
import { Monster } from '../models/Monster';
import { Technique } from '../models/Technique';

export class TuxemonBattleEngine {
  /**
   * 基于Tuxemon的战斗引擎
   */
  
  calculateDamage(attacker: Monster, defender: Monster, technique: Technique): number {
    /**
     * 伤害计算公式（基于Tuxemon）
     * Damage = ((2 * Level / 5 + 2) * Power * Attack / Defense) / 50 + 2
     */
    
    const level = attacker.level;
    const power = technique.power;
    
    let attack: number;
    let defense: number;
    
    if (technique.category === 'physical') {
      attack = attacker.attack;
      defense = defender.defense;
    } else {
      attack = attacker.specialAttack;
      defense = defender.specialDefense;
    }
    
    const baseDamage = ((2 * level / 5 + 2) * power * attack / defense) / 50 + 2;
    
    // 属性克制
    const typeMultiplier = this.calculateTypeMultiplier(technique.types, defender.types);
    
    // 随机波动 (0.85 ~ 1.0)
    const randomMultiplier = 0.85 + Math.random() * 0.15;
    
    // 暴击
    const critMultiplier = Math.random() < 0.0625 ? 1.5 : 1.0;
    
    const finalDamage = Math.floor(baseDamage * typeMultiplier * randomMultiplier * critMultiplier);
    
    return Math.max(1, finalDamage);
  }
  
  calculateTypeMultiplier(attackTypes: string[], defenderTypes: string[]): number {
    /**
     * 属性克制计算
     */
    
    const typeChart = {
      'fire': { 'grass': 2, 'water': 0.5, 'fire': 0.5, 'ice': 2 },
      'water': { 'fire': 2, 'grass': 0.5, 'water': 0.5, 'ground': 2 },
      'grass': { 'water': 2, 'fire': 0.5, 'grass': 0.5, 'ground': 2, 'rock': 2 },
      'electric': { 'water': 2, 'grass': 0.5, 'electric': 0.5, 'ground': 0 },
      'ice': { 'grass': 2, 'ground': 2, 'dragon': 2, 'fire': 0.5, 'water': 0.5 },
      'fighting': { 'normal': 2, 'ice': 2, 'rock': 2, 'ghost': 0 },
      'poison': { 'grass': 2, 'poison': 0.5, 'ground': 0.5, 'rock': 0.5 },
      'ground': { 'fire': 2, 'electric': 2, 'poison': 2, 'rock': 2, 'grass': 0.5, 'flying': 0 },
      'flying': { 'grass': 2, 'fighting': 2, 'bug': 2, 'electric': 0.5, 'rock': 0.5 },
      'psychic': { 'fighting': 2, 'poison': 2, 'psychic': 0.5, 'dark': 0 },
      'bug': { 'grass': 2, 'psychic': 2, 'fire': 0.5, 'fighting': 0.5 },
      'rock': { 'fire': 2, 'ice': 2, 'flying': 2, 'bug': 2, 'fighting': 0.5, 'ground': 0.5 },
      'ghost': { 'psychic': 2, 'ghost': 2, 'normal': 0, 'dark': 0.5 },
      'dragon': { 'dragon': 2 },
      'dark': { 'psychic': 2, 'ghost': 2, 'fighting': 0.5, 'dark': 0.5 },
      'steel': { 'ice': 2, 'rock': 2, 'fire': 0.5, 'water': 0.5, 'electric': 0.5 },
      'fairy': { 'dragon': 2, 'fighting': 2, 'dark': 2, 'fire': 0.5, 'poison': 0.5, 'steel': 0.5 }
    };
    
    let multiplier = 1.0;
    
    for (const attackType of attackTypes) {
      for (const defenderType of defenderTypes) {
        if (typeChart[attackType] && typeChart[attackType][defenderType]) {
          multiplier *= typeChart[attackType][defenderType];
        }
      }
    }
    
    return multiplier;
  }
  
  checkHit(attacker: Monster, defender: Monster, technique: Technique): boolean {
    /**
     * 命中判定
     */
    
    const accuracy = technique.accuracy;
    const random = Math.random() * 100;
    
    return random <= accuracy;
  }
  
  checkCriticalHit(): boolean {
    /**
     * 暴击判定 (6.25% 概率)
     */
    return Math.random() < 0.0625;
  }
  
  applyStatusEffect(monster: Monster, effect: string): void {
    /**
     * 应用状态效果
     */
    
    monster.status = effect;
    
    // 状态效果持续伤害/影响
    switch (effect) {
      case 'poisoned':
        // 每回合损失1/8 HP
        monster.hp = Math.max(0, monster.hp - Math.floor(monster.maxHp / 8));
        break;
      case 'burned':
        // 每回合损失1/16 HP + 物理攻击减半
        monster.hp = Math.max(0, monster.hp - Math.floor(monster.maxHp / 16));
        monster.attack = Math.floor(monster.attack / 2);
        break;
      case 'paralyzed':
        // 25%概率无法行动
        if (Math.random() < 0.25) {
          // 无法行动
        }
        break;
      case 'frozen':
        // 无法行动，10%概率解冻
        if (Math.random() < 0.1) {
          monster.status = 'normal';
        }
        break;
      case 'sleeping':
        // 无法行动，持续1-3回合
        // 需要在回合管理中处理
        break;
    }
  }
}
```

### 3.3 怪物管理系统

```typescript
// src/monsters/MonsterManager.ts
import { Monster } from '../models/Monster';
import { db } from '../config/database';

export class MonsterManager {
  /**
   * 怪物管理器
   */
  
  async generateWildMonster(level: number): Promise<Monster> {
    /**
     * 生成野生怪物
     */
    
    // 随机选择怪物模板
    const [rows] = await db.execute(`
      SELECT * FROM monster_templates 
      ORDER BY RAND() 
      LIMIT 1
    `);
    
    const template = rows[0];
    
    // 创建怪物实例
    const monster: Monster = {
      id: this.generateId(),
      templateId: template.id,
      level: level,
      exp: 0,
      hp: this.calculateStat(template.hp, level),
      maxHp: this.calculateStat(template.hp, level),
      attack: this.calculateStat(template.attack, level),
      defense: this.calculateStat(template.defense, level),
      speed: this.calculateStat(template.speed, level),
      specialAttack: this.calculateStat(template.special_attack, level),
      specialDefense: this.calculateStat(template.special_defense, level),
      types: JSON.parse(template.types),
      skills: await this.selectRandomSkills(template.id, level),
      status: 'normal',
      iv: this.generateIVs(),
      ev: this.generateEmptyEVs()
    };
    
    return monster;
  }
  
  calculateStat(baseStat: number, level: number): number {
    /**
     * 计算属性值
     * 公式: ((Base + IV) * 2 + EV / 4) * Level / 100 + Level + 10
     */
    
    const iv = Math.floor(Math.random() * 32);
    const ev = 0;
    
    const stat = ((baseStat + iv) * 2 + ev / 4) * level / 100 + level + 10;
    
    return Math.floor(stat);
  }
  
  generateIVs(): any {
    /**
     * 生成个体值 (0-31)
     */
    return {
      hp: Math.floor(Math.random() * 32),
      attack: Math.floor(Math.random() * 32),
      defense: Math.floor(Math.random() * 32),
      specialAttack: Math.floor(Math.random() * 32),
      specialDefense: Math.floor(Math.random() * 32),
      speed: Math.floor(Math.random() * 32)
    };
  }
  
  generateEmptyEVs(): any {
    /**
     * 生成空努力值
     */
    return {
      hp: 0,
      attack: 0,
      defense: 0,
      specialAttack: 0,
      specialDefense: 0,
      speed: 0
    };
  }
  
  async selectRandomSkills(templateId: string, level: number): Promise<string[]> {
    /**
     * 选择随机技能（根据等级）
     */
    
    const [rows] = await db.execute(`
      SELECT technique_id 
      FROM monster_techniques 
      WHERE monster_id = ? AND level_learned <= ?
      ORDER BY RAND()
      LIMIT 4
    `, [templateId, level]);
    
    return rows.map((row: any) => row.technique_id);
  }
  
  private generateId(): string {
    return 'mon_' + Math.random().toString(36).substr(2, 9);
  }
}
```

---

## 🎯 Phase 4: 完整API实现（第8-10天）

### 4.1 战斗API增强

```typescript
// src/routes/battle.ts
import { Router } from 'express';
import { TuxemonBattleEngine } from '../battle/TuxemonBattleEngine';
import { MonsterManager } from '../monsters/MonsterManager';
import { db } from '../config/database';

const router = Router();
const battleEngine = new TuxemonBattleEngine();
const monsterManager = new MonsterManager();

/**
 * 创建对战（PVE）
 */
router.post('/create/pve', async (req, res) => {
  try {
    const { robot_id, level_range } = req.body;
    
    // 获取玩家怪物
    const [playerMonsters] = await db.execute(`
      SELECT * FROM player_monsters WHERE robot_id = ?
    `, [robot_id]);
    
    // 生成野生怪物
    const level = level_range.min + Math.floor(Math.random() * (level_range.max - level_range.min));
    const wildMonsters = await Promise.all([
      monsterManager.generateWildMonster(level),
      monsterManager.generateWildMonster(level),
      monsterManager.generateWildMonster(level)
    ]);
    
    // 创建对战记录
    const battleId = generateBattleId();
    await db.execute(`
      INSERT INTO battles 
      (id, player1_id, player2_id, player1_monsters, player2_monsters, battle_type, status)
      VALUES (?, ?, 'wild', ?, ?, 'pve', 'ongoing')
    `, [
      battleId,
      robot_id,
      JSON.stringify(playerMonsters),
      JSON.stringify(wildMonsters)
    ]);
    
    res.json({
      success: true,
      battle_id: battleId,
      player_monsters: playerMonsters,
      enemy_monsters: wildMonsters
    });
    
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 执行战斗行动
 */
router.post('/:battleId/action', async (req, res) => {
  try {
    const { battleId } = req.params;
    const { monster_id, technique_id, target_id } = req.body;
    
    // 获取对战信息
    const [battles] = await db.execute(`
      SELECT * FROM battles WHERE id = ?
    `, [battleId]);
    
    const battle = battles[0];
    
    // 获取怪物和技能数据
    const attacker = await getMonsterById(monster_id);
    const defender = await getMonsterById(target_id);
    const technique = await getTechniqueById(technique_id);
    
    // 执行战斗行动
    const result = await battleEngine.executeAction(
      battle,
      attacker,
      defender,
      technique
    );
    
    // 更新对战日志
    await db.execute(`
      INSERT INTO battle_logs 
      (battle_id, turn, actor_id, action_type, action_data, result)
      VALUES (?, ?, ?, 'attack', ?, ?)
    `, [
      battleId,
      battle.turns + 1,
      monster_id,
      JSON.stringify({ technique_id, target_id }),
      JSON.stringify(result)
    ]);
    
    // 更新对战回合数
    await db.execute(`
      UPDATE battles SET turns = turns + 1 WHERE id = ?
    `, [battleId]);
    
    // 检查战斗是否结束
    if (result.battleEnded) {
      await db.execute(`
        UPDATE battles 
        SET status = 'completed', 
            winner_id = ?, 
            loser_id = ?,
            completed_at = NOW()
        WHERE id = ?
      `, [result.winnerId, result.loserId, battleId]);
      
      // 发放奖励
      await distributeRewards(result.winnerId, result.loserId);
    }
    
    res.json({
      success: true,
      result
    });
    
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

---

## 🎯 Phase 5: 测试与优化（第11-14天）

### 5.1 单元测试

```typescript
// tests/battle.test.ts
import { TuxemonBattleEngine } from '../src/battle/TuxemonBattleEngine';
import { Monster } from '../src/models/Monster';

describe('TuxemonBattleEngine', () => {
  let engine: TuxemonBattleEngine;
  
  beforeEach(() => {
    engine = new TuxemonBattleEngine();
  });
  
  test('伤害计算应该正确', () => {
    const attacker: Monster = {
      level: 50,
      attack: 100,
      specialAttack: 80
    };
    
    const defender: Monster = {
      level: 50,
      defense: 80,
      specialDefense: 80
    };
    
    const technique = {
      power: 80,
      category: 'physical',
      types: ['fire']
    };
    
    const damage = engine.calculateDamage(attacker, defender, technique);
    
    expect(damage).toBeGreaterThan(0);
    expect(damage).toBeLessThan(200);
  });
  
  test('属性克制应该生效', () => {
    const multiplier = engine.calculateTypeMultiplier(['fire'], ['grass']);
    expect(multiplier).toBe(2.0);
    
    const multiplier2 = engine.calculateTypeMultiplier(['water'], ['fire']);
    expect(multiplier2).toBe(2.0);
    
    const multiplier3 = engine.calculateTypeMultiplier(['fire'], ['water']);
    expect(multiplier3).toBe(0.5);
  });
});
```

### 5.2 性能优化

```typescript
// src/cache/CacheManager.ts
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379')
});

export class CacheManager {
  /**
   * 缓存怪物模板数据
   */
  static async getMonsterTemplate(templateId: string) {
    const cached = await redis.get(`monster:${templateId}`);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    const [rows] = await db.execute(`
      SELECT * FROM monster_templates WHERE id = ?
    `, [templateId]);
    
    const template = rows[0];
    
    // 缓存1小时
    await redis.setex(`monster:${templateId}`, 3600, JSON.stringify(template));
    
    return template;
  }
  
  /**
   * 缓存排行榜
   */
  static async getLeaderboard() {
    const cached = await redis.get('leaderboard');
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    const [rows] = await db.execute(`
      SELECT r.id, r.name, r.level, COUNT(b.id) as wins
      FROM robots r
      LEFT JOIN battles b ON r.id = b.winner_id
      GROUP BY r.id
      ORDER BY wins DESC
      LIMIT 100
    `);
    
    // 缓存5分钟
    await redis.setex('leaderboard', 300, JSON.stringify(rows));
    
    return rows;
  }
}
```

---

## 📅 时间表

| 阶段 | 任务 | 时间 | 状态 |
|------|------|------|------|
| Phase 1 | 数据库设计与实现 | 2天 | ⏳ 待开始 |
| Phase 2 | Tuxemon资源导入 | 2天 | ⏳ 待开始 |
| Phase 3 | 核心逻辑移植 | 3天 | ⏳ 待开始 |
| Phase 4 | API实现 | 3天 | ⏳ 待开始 |
| Phase 5 | 测试与优化 | 4天 | ⏳ 待开始 |
| **总计** | | **14天** | |

---

## 🎯 里程碑

### M1: 数据库上线（第2天）
- ✅ MySQL安装配置
- ✅ 表结构创建
- ✅ TypeORM集成

### M2: 怪物数据导入（第4天）
- ✅ Tuxemon项目克隆
- ✅ 怪物数据导入（183+个）
- ✅ 技能数据导入（100+个）

### M3: 战斗系统完成（第7天）
- ✅ 战斗引擎移植
- ✅ 属性克制系统
- ✅ 状态效果系统

### M4: 完整功能上线（第14天）
- ✅ 所有API完成
- ✅ 单元测试通过
- ✅ 性能优化完成

---

**创建日期**: 2026-03-06
**创建人**: 有想法
**状态**: 🚀 准备开始
