/**
 * 经验值和升级系统
 *
 * 基于 Tuxemon 的经验值系统
 *
 * 功能：
 * - 经验值获取计算
 * - 等级提升逻辑（经验曲线公式）
 * - 属性成长计算（HP、攻击、防御、速度）
 * - 升级动画和提示（闪光、等级+1）
 * - 技能学习逻辑（升级时检查是否解锁新技能）
 */

import { BattleUnit, BattleEvent } from './BattleState';
import { MonsterData } from './MonsterData';

/**
 * 经验曲线类型
 */
export enum ExperienceCurve {
  /** 缓慢上升（标准） */
  MEDIUM_FAST = 'medium_fast',
  /** 快速上升 */
  FAST = 'fast',
  /** 缓慢上升 */
  MEDIUM_SLOW = 'medium_slow',
  /** 非常慢上升 */
  SLOW = 'slow',
  /** 非常快上升 */
  VERY_FAST = 'very_fast',
  /** 波动型上升 */
  ERRATIC = 'erratic',
  /** 反向波动型上升 */
  FLUCTUATING = 'fluctuating',
}

/**
 * 属性成长类型
 */
export enum GrowthRate {
  /** 高成长 */
  HIGH = 'high',
  /** 中等成长 */
  MEDIUM = 'medium',
  /** 低成长 */
  LOW = 'low',
  /** 非常低成长 */
  VERY_LOW = 'very_low',
}

/**
 * 经验值获取结果
 */
export interface ExperienceGainResult {
  /** 获得的 EXP */
  expGained: number;
  /** 当前经验值 */
  currentExp: number;
  /** 升级到下一级所需 EXP */
  expToNextLevel: number;
  /** 是否升级 */
  levelUp: boolean;
  /** 新等级 */
  newLevel?: number;
  /** 学会的技能列表 */
  learnedTechniques: TechniqueLearnInfo[];
}

/**
 * 技能学习信息
 */
export interface TechniqueLearnInfo {
  /** 技能 ID */
  techniqueId: string;
  /** 技能名称 */
  techniqueName: string;
  /** 学习等级 */
  learnLevel: number;
}

/**
 * 属性成长结果
 */
export interface StatGrowthResult {
  /** 怪物 ID */
  monsterId: string;
  /** 旧等级 */
  oldLevel: number;
  /** 新等级 */
  newLevel: number;
  /** 属性变化 */
  statChanges: {
    /** HP 变化 */
    hp: { old: number; new: number; gain: number };
    /** 攻击力变化 */
    attack: { old: number; new: number; gain: number };
    /** 防御力变化 */
    defense: { old: number; new: number; gain: number };
    /** 速度变化 */
    speed: { old: number; new: number; gain: number };
    /** 特攻变化 */
    specialAttack: { old: number; new: number; gain: number };
    /** 特防变化 */
    specialDefense: { old: number; new: number; gain: number };
  };
}

/**
 * 经验值系统回调
 */
export type ExperienceCallback = (event: ExperienceEvent) => void;

/**
 * 经验值事件接口
 */
export interface ExperienceEvent extends BattleEvent {
  /** 获得的经验值 */
  expGained?: number;
  /** 新等级 */
  newLevel?: number;
  /** 学会的技能 */
  learnedTechniques?: TechniqueLearnInfo[];
  /** 属性成长 */
  statGrowth?: StatGrowthResult;
}

/**
 * 经验值系统类
 */
export class ExperienceSystem {
  private static instance: ExperienceSystem;

  /** 经验值回调列表 */
  private callbacks: ExperienceCallback[] = [];

  /**
   * 私有构造函数，确保单例
   */
  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): ExperienceSystem {
    if (!ExperienceSystem.instance) {
      ExperienceSystem.instance = new ExperienceSystem();
    }
    return ExperienceSystem.instance;
  }

  /**
   * 计算升级所需经验值
   *
   * @param level 等级
   * @param curve 经验曲线类型
   * @returns 升级到下一级所需经验值
   */
  calculateExpForLevel(level: number, curve: ExperienceCurve = ExperienceCurve.MEDIUM_FAST): number {
    switch (curve) {
      case ExperienceCurve.MEDIUM_FAST:
        // 标准：1.25 * level^3
        return Math.floor(1.25 * Math.pow(level, 3));

      case ExperienceCurve.FAST:
        // 快速：0.8 * level^3
        return Math.floor(0.8 * Math.pow(level, 3));

      case ExperienceCurve.MEDIUM_SLOW:
        // 缓慢：level^3 + 15 * level^2 + 100 * level - 140
        return Math.floor(
          Math.pow(level, 3) +
          15 * Math.pow(level, 2) +
          100 * level - 140
        );

      case ExperienceCurve.SLOW:
        // 非常慢：1.25 * level^3
        return Math.floor(1.25 * Math.pow(level, 3));

      case ExperienceCurve.VERY_FAST:
        // 非常快：0.5 * level^3
        return Math.floor(0.5 * Math.pow(level, 3));

      case ExperienceCurve.ERRATIC:
        // 波动型（复杂公式）
        if (level <= 50) {
          return Math.floor(
            (Math.pow(level, 3) * (100 - level)) / 50
          );
        } else if (level <= 68) {
          return Math.floor(
            (Math.pow(level, 3) * (150 - level)) / 100
          );
        } else if (level <= 98) {
          return Math.floor(
            (Math.pow(level, 3) * ((1911 - 10 * level) / 3)) / 500
          );
        } else {
          return Math.floor(
            (Math.pow(level, 3) * (160 - level)) / 100
          );
        }

      case ExperienceCurve.FLUCTUATING:
        // 反向波动型（复杂公式）
        if (level <= 15) {
          return Math.floor(
            Math.pow(level, 3) * (((level + 1) / 3 + 24) / 50)
          );
        } else if (level <= 36) {
          return Math.floor(
            Math.pow(level, 3) * ((level + 14) / 50)
          );
        } else {
          return Math.floor(
            Math.pow(level, 3) * (((level / 2) + 32) / 50)
          );
        }

      default:
        return Math.floor(1.25 * Math.pow(level, 3));
    }
  }

  /**
   * 计算获得的经验值
   *
   * 公式：exp_gained = base_exp * level_difference_modifier * party_size_modifier
   *
   * @param defeatedEnemy 被击败的敌人
   * @param winnerLevel 胜利者等级
   * @param partySize 队伍大小
   * @returns 获得的经验值
   */
  calculateExpGained(
    defeatedEnemy: BattleUnit,
    winnerLevel: number,
    partySize: number = 1
  ): number {
    // 基础经验值（基于敌人等级）
    const baseExp = defeatedEnemy.level * 50;

    // 等级差异修正
    const levelDiff = defeatedEnemy.level - winnerLevel;
    const levelModifier = this.getLevelDifferenceModifier(levelDiff);

    // 队伍大小修正（平分经验）
    const partyModifier = 1 / partySize;

    // 计算最终经验值
    const expGained = Math.floor(baseExp * levelModifier * partyModifier);

    // 确保至少获得 1 点经验
    return Math.max(1, expGained);
  }

  /**
   * 获取等级差异修正系数
   *
   * @param levelDiff 等级差异（敌人等级 - 胜利者等级）
   * @returns 修正系数
   */
  private getLevelDifferenceModifier(levelDiff: number): number {
    // 等级差异对经验值的影响
    // 击败高等级怪物获得更多经验，击败低等级怪物获得更少

    if (levelDiff <= -5) {
      // 敌人低 5 级以上：经验值大幅减少
      return 0.2;
    } else if (levelDiff <= -3) {
      // 敌人低 3-5 级：经验值减少
      return 0.4;
    } else if (levelDiff <= -1) {
      // 敌人低 1-2 级：经验值略减
      return 0.7;
    } else if (levelDiff <= 1) {
      // 等级相近：正常经验
      return 1.0;
    } else if (levelDiff <= 3) {
      // 敌人高 1-3 级：经验值增加
      return 1.2;
    } else if (levelDiff <= 5) {
      // 敌人高 3-5 级：经验值大幅增加
      return 1.5;
    } else {
      // 敌人高 5 级以上：经验值大幅增加
      return 2.0;
    }
  }

  /**
   * 处理经验值获取
   *
   * @param unit 战斗单位
   * @param expGained 获得的经验值
   * @param monsterData 怪物基础数据（可选）
   * @returns 经验值获取结果
   */
  processExperienceGain(
    unit: BattleUnit,
    expGained: number,
    monsterData?: MonsterData
  ): ExperienceGainResult {
    const oldLevel = unit.level;
    const newExp = unit.exp + expGained;

    let currentLevel = oldLevel;
    let totalLevelsGained = 0;
    const learnedTechniques: TechniqueLearnInfo[] = [];

    // 检查是否升级
    while (true) {
      const expForNextLevel = this.calculateExpForLevel(currentLevel);

      if (newExp >= expForNextLevel) {
        // 升级
        currentLevel++;
        totalLevelsGained++;

        // 检查是否学会新技能
        if (monsterData) {
          const newSkills = this.checkLearnableTechniques(
            monsterData,
            currentLevel,
            unit.techniques
          );
          learnedTechniques.push(...newSkills);

          // 将新技能添加到单位的技能列表
          for (const skill of newSkills) {
            if (!unit.techniques.includes(skill.techniqueId)) {
              unit.techniques.push(skill.techniqueId);
            }
          }
        }
      } else {
        break;
      }
    }

    // 更新单位属性
    unit.exp = newExp;
    unit.level = currentLevel;

    // 计算下一级所需经验
    const expToNextLevel = this.calculateExpForLevel(currentLevel);

    // 触发经验事件
    this.emitEvent({
      type: 'exp_gain',
      targetId: unit.id,
      value: expGained,
      text: `${unit.name} 获得了 ${expGained} 点经验值！`,
      expGained,
      newLevel: currentLevel > oldLevel ? currentLevel : undefined,
      learnedTechniques: learnedTechniques.length > 0 ? learnedTechniques : undefined,
    });

    // 如果升级了，触发升级事件
    if (totalLevelsGained > 0) {
      this.emitEvent({
        type: 'level_up',
        targetId: unit.id,
        text: `${unit.name} 升到了 ${currentLevel} 级！`,
        expGained: totalLevelsGained,
      });

      // 计算属性成长
      const statGrowth = this.calculateStatGrowth(unit, oldLevel, currentLevel, monsterData);

      // 应用属性成长
      unit.maxHp = statGrowth.statChanges.hp.new;
      unit.currentHp = unit.maxHp; // 升级时补满 HP
      unit.attack = statGrowth.statChanges.attack.new;
      unit.defense = statGrowth.statChanges.defense.new;
      unit.speed = statGrowth.statChanges.speed.new;
      unit.specialAttack = statGrowth.statChanges.specialAttack.new;
      unit.specialDefense = statGrowth.statChanges.specialDefense.new;

      console.log(`[ExperienceSystem] ${unit.name} leveled up from ${oldLevel} to ${currentLevel}`);
      console.log(`[ExperienceSystem] Stat growth:`, statGrowth);
    }

    return {
      expGained,
      currentExp: newExp,
      expToNextLevel,
      levelUp: currentLevel > oldLevel,
      newLevel: currentLevel > oldLevel ? currentLevel : undefined,
      learnedTechniques,
    };
  }

  /**
   * 检查可学习的技能
   *
   * @param monsterData 怪物基础数据
   * @param level 当前等级
   * @param knownTechniques 已学会的技能列表
   * @returns 可学习的新技能列表
   */
  private checkLearnableTechniques(
    monsterData: MonsterData,
    level: number,
    knownTechniques: string[]
  ): TechniqueLearnInfo[] {
    const learned: TechniqueLearnInfo[] = [];

    // 从怪物数据中获取技能列表和对应的学习等级
    // Tuxemon 数据格式：monsterData.techniques 包含初始技能
    // 实际项目中应该从技能学习表中获取特定等级可学习的技能
    if (monsterData.techniques && monsterData.techniques.length > 0) {
      // 简化实现：假设技能在特定等级学习
      // 实际项目中应该从怪物数据或技能数据中读取 learn_at 字段
      const learnLevels: Record<string, number> = {
        'tackle': 1,
        'scratch': 1,
        'peck': 1,
        'ember': 5,
        'water_gun': 5,
        'vine_whip': 5,
        'thunder_shock': 5,
        'quick_attack': 8,
        'bite': 12,
        'flamethrower': 15,
        'water_pulse': 15,
        'razor_leaf': 15,
        'thunderbolt': 15,
        'fire_blast': 25,
        'hydro_pump': 25,
        'solar_beam': 25,
        'thunder': 25,
      };

      // 检查怪物已知技能是否应该在学习等级
      for (const techId of monsterData.techniques) {
        if (learnLevels[techId] && learnLevels[techId] === level) {
          if (!knownTechniques.includes(techId)) {
            learned.push({
              techniqueId: techId,
              techniqueName: this.getTechniqueName(techId),
              learnLevel: level,
            });
          }
        }
      }
    }

    // 检查怪物可能拥有的其他技能
    // 这里可以扩展为从怪物数据中读取技能学习表
    // 简化实现：根据等级添加一些基础技能
    const levelUpSkills = this.getLevelUpSkills(level);
    for (const skill of levelUpSkills) {
      if (!knownTechniques.includes(skill)) {
        learned.push({
          techniqueId: skill,
          techniqueName: this.getTechniqueName(skill),
          learnLevel: level,
        });
      }
    }

    return learned;
  }

  /**
   * 根据等级获取可学习的技能列表
   *
   * @param level 等级
   * @returns 技能 ID 列表
   */
  private getLevelUpSkills(level: number): string[] {
    // 简化的技能学习表
    const skillTable: Record<number, string[]> = {
      1: ['tackle'],
      3: ['scratch'],
      5: ['quick_attack'],
      8: ['peck'],
      10: ['bite'],
      12: ['ember', 'water_gun', 'vine_whip', 'thunder_shock'],
      15: ['flamethrower', 'water_pulse', 'razor_leaf', 'thunderbolt'],
      18: ['headbutt'],
      20: ['leer'],
      22: ['rock_throw'],
      25: ['fire_blast', 'hydro_pump', 'solar_beam', 'thunder'],
      28: ['earthquake'],
      30: ['slam'],
      35: ['hyper_beam'],
    };

    return skillTable[level] || [];
  }

  /**
   * 获取技能名称
   *
   * @param techniqueId 技能 ID
   * @returns 技能名称
   */
  private getTechniqueName(techniqueId: string): string {
    // 技能名称映射表
    const nameMap: Record<string, string> = {
      'tackle': '撞击',
      'scratch': '抓',
      'ember': '火花',
      'water_gun': '水枪',
      'vine_whip': '藤鞭',
      'thunder_shock': '电击',
      'quick_attack': '电光一闪',
      'peck': '啄',
      'bite': '咬住',
      'flamethrower': '喷射火焰',
      'water_pulse': '水流波动',
      'razor_leaf': '飞叶快刀',
      'thunderbolt': '十万伏特',
      'fire_blast': '大字爆炎',
      'hydro_pump': '水炮',
      'solar_beam': '太阳光线',
      'thunder': '打雷',
      'headbutt': '头槌',
      'leer': '瞪眼',
      'rock_throw': '岩石封',
      'earthquake': '地震',
      'slam': '猛撞',
      'hyper_beam': '破坏光线',
    };

    return nameMap[techniqueId] || techniqueId;
  }

  /**
   * 计算属性成长
   *
   * @param unit 战斗单位
   * @param oldLevel 旧等级
   * @param newLevel 新等级
   * @param monsterData 怪物基础数据（可选）
   * @returns 属性成长结果
   */
  calculateStatGrowth(
    unit: BattleUnit,
    oldLevel: number,
    newLevel: number,
    monsterData?: MonsterData
  ): StatGrowthResult {
    // 使用基础属性或当前属性作为起点
    const baseStats = monsterData ? {
      hp: monsterData.hp,
      attack: monsterData.attack,
      defense: monsterData.defense,
      speed: monsterData.speed,
      specialAttack: monsterData.special_attack,
      specialDefense: monsterData.special_defense,
    } : {
      hp: unit.maxHp,
      attack: unit.attack,
      defense: unit.defense,
      speed: unit.speed,
      specialAttack: unit.specialAttack,
      specialDefense: unit.specialDefense,
    };

    // 计算新属性
    const newStats = this.calculateStatsAtLevel(baseStats, newLevel);

    // 计算属性变化
    const statChanges = {
      hp: {
        old: unit.maxHp,
        new: newStats.maxHp,
        gain: newStats.maxHp - unit.maxHp,
      },
      attack: {
        old: unit.attack,
        new: newStats.attack,
        gain: newStats.attack - unit.attack,
      },
      defense: {
        old: unit.defense,
        new: newStats.defense,
        gain: newStats.defense - unit.defense,
      },
      speed: {
        old: unit.speed,
        new: newStats.speed,
        gain: newStats.speed - unit.speed,
      },
      specialAttack: {
        old: unit.specialAttack,
        new: newStats.specialAttack,
        gain: newStats.specialAttack - unit.specialAttack,
      },
      specialDefense: {
        old: unit.specialDefense,
        new: newStats.specialDefense,
        gain: newStats.specialDefense - unit.specialDefense,
      },
    };

    return {
      monsterId: unit.monsterId,
      oldLevel,
      newLevel,
      statChanges,
    };
  }

  /**
   * 计算指定等级的属性值
   *
   * @param baseStats 基础属性
   * @param level 等级
   * @returns 等级属性值
   */
  private calculateStatsAtLevel(
    baseStats: {
      hp: number;
      attack: number;
      defense: number;
      speed: number;
      specialAttack: number;
      specialDefense: number;
    },
    level: number
  ): {
    maxHp: number;
    attack: number;
    defense: number;
    speed: number;
    specialAttack: number;
    specialDefense: number;
  } {
    // 等级系数公式
    // HP: base * level / 50 + level + 10
    // 其他属性: base * level / 50 + 5

    const levelFactor = level / 50;

    return {
      maxHp: Math.floor(baseStats.hp * levelFactor + level + 10),
      attack: Math.floor(baseStats.attack * levelFactor + 5),
      defense: Math.floor(baseStats.defense * levelFactor + 5),
      speed: Math.floor(baseStats.speed * levelFactor + 5),
      specialAttack: Math.floor(baseStats.specialAttack * levelFactor + 5),
      specialDefense: Math.floor(baseStats.specialDefense * levelFactor + 5),
    };
  }

  /**
   * 计算怪物实例的初始属性
   *
   * @param monsterData 怪物基础数据
   * @param level 初始等级
   * @returns 怪物实例属性
   */
  createInstanceStats(
    monsterData: MonsterData,
    level: number
  ): {
    maxHp: number;
    attack: number;
    defense: number;
    speed: number;
    specialAttack: number;
    specialDefense: number;
  } {
    const baseStats = {
      hp: monsterData.hp,
      attack: monsterData.attack,
      defense: monsterData.defense,
      speed: monsterData.speed,
      specialAttack: monsterData.special_attack,
      specialDefense: monsterData.special_defense,
    };

    return this.calculateStatsAtLevel(baseStats, level);
  }

  /**
   * 获取当前等级的经验值范围
   *
   * @param level 等级
   * @param curve 经验曲线类型
   * @returns 经验值范围（最小值，最大值）
   */
  getExpRangeForLevel(
    level: number,
    curve: ExperienceCurve = ExperienceCurve.MEDIUM_FAST
  ): { min: number; max: number } {
    const minExp = this.calculateExpForLevel(level, curve);
    const maxExp = this.calculateExpForLevel(level + 1, curve) - 1;

    return { min: minExp, max: maxExp };
  }

  /**
   * 根据经验值计算等级
   *
   * @param exp 经验值
   * @param curve 经验曲线类型
   * @returns 等级
   */
  getLevelFromExp(
    exp: number,
    curve: ExperienceCurve = ExperienceCurve.MEDIUM_FAST
  ): number {
    let level = 1;

    while (true) {
      const expForNext = this.calculateExpForLevel(level + 1, curve);
      if (exp < expForNext) {
        break;
      }
      level++;
    }

    return level;
  }

  /**
   * 发送经验值事件
   *
   * @param event 经验值事件
   */
  private emitEvent(event: ExperienceEvent): void {
    for (const callback of this.callbacks) {
      callback(event);
    }
  }

  /**
   * 注册经验值回调
   *
   * @param callback 经验值回调
   */
  onExperienceEvent(callback: ExperienceCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * 移除经验值回调
   *
   * @param callback 经验值回调
   */
  offExperienceEvent(callback: ExperienceCallback): void {
    const index = this.callbacks.indexOf(callback);
    if (index !== -1) {
      this.callbacks.splice(index, 1);
    }
  }
}

/**
 * 导出经验值系统单例
 */
export const experienceSystem = ExperienceSystem.getInstance();
