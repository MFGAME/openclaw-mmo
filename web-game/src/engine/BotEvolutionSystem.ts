/**
 * 机器人升级和进化系统
 *
 * 功能：
 * - 机器人自动升级
 * - 进化石检测和使用
 * - 进化链管理
 * - 升级奖励分配
 */

import { monsterDataLoader } from './MonsterData.js';
import { botInventoryManager } from './BotInventoryManager.js';
// BotPersonality 用于未来扩展：进化可能受机器人性格影响

/**
 * 进化条件接口
 */
export interface EvolutionCondition {
  /** 所需等级 */
  requiredLevel: number;
  /** 所需道具 ID */
  requiredItem?: string;
  /** 所需 HP 阈值 */
  requiredHpPercent?: number;
}

/**
 * 进化数据接口
 */
export interface EvolutionData {
  /** 起始怪物 ID */
  fromMonsterId: string;
  /** 进化后怪物 ID */
  toMonsterId: string;
  /** 进化条件 */
  condition: EvolutionCondition;
  /** 进化时需要使用进化石 */
  requiresEvolutionStone: boolean;
}

/**
 * 升级结果接口
 */
export interface LevelUpResult {
  /** 是否升级成功 */
  success: boolean;
  /** 新等级 */
  newLevel?: number;
  /** 获得的属性点 */
  statBoosts?: {
    hp?: number;
    attack?: number;
    defense?: number;
    speed?: number;
  };
  /** 是否学习新技能 */
  learnedTechnique?: string;
  /** 消息 */
  message: string;
}

/**
 * 进化结果接口
 */
export interface EvolutionResult {
  /** 是否进化成功 */
  success: boolean;
  /** 进化后怪物 ID */
  evolvedMonsterId?: string;
  /** 消息 */
  message: string;
}

/**
 * 机器人怪物数据接口
 */
export interface BotMonsterData {
  /** 实例 ID */
  instanceId: string;
  /** 怪物 ID */
  monsterId: string;
  /** 昵称 */
  nickname: string;
  /** 当前等级 */
  level: number;
  /** 当前 HP */
  currentHp: number;
  /** 最大 HP */
  maxHp: number;
  /** 攻击力 */
  attack: number;
  /** 防御力 */
  defense: number;
  /** 速度 */
  speed: number;
  /** 当前经验 */
  currentExp: number;
  /** 升级所需经验 */
  requiredExp: number;
  /** 技能列表 */
  techniques: string[];
  /** 是否已进化 */
  isEvolved: boolean;
}

/**
 * 机器人升级和进化系统类
 * 单例模式
 */
export class BotEvolutionSystem {
  private static instance: BotEvolutionSystem;

  /** 机器人怪物数据列表 */
  private botMonsters: Map<string, BotMonsterData> = new Map();

  /** 进化链数据 */
  private evolutionChain: Map<string, EvolutionData[]> = new Map();

  /** 已初始化的进化链 */
  private initializedEvolutionChains = false;

  /** 是否已初始化 */
  private initialized = false;

  /** 经验曲线倍率 */
  private readonly EXP_MULTIPLIER = 1.5;

  /**
   * 私有构造函数，确保单例
   */
  private constructor() {}

  /**
   * 获取机器人升级和进化系统单例实例
   */
  static getInstance(): BotEvolutionSystem {
    if (!BotEvolutionSystem.instance) {
      BotEvolutionSystem.instance = new BotEvolutionSystem();
    }
    return BotEvolutionSystem.instance;
  }

  /**
   * 初始化机器人升级和进化系统
   */
  initialize(): void {
    if (this.initialized) {
      console.warn('[BotEvolutionSystem] 已经初始化');
      return;
    }

    this.initEvolutionChains();
    this.initialized = true;
    console.log('[BotEvolutionSystem] 机器人升级和进化系统已初始化');
  }

  /**
   * 初始化进化链
   */
  private initEvolutionChains(): void {
    if (this.initializedEvolutionChains) return;

    // 基础进化链（示例）
    this.evolutionChain.set('basic', [
      {
        fromMonsterId: 'aardart',
        toMonsterId: 'aardark',
        condition: { requiredLevel: 10 },
        requiresEvolutionStone: false,
      },
      {
        fromMonsterId: 'aardark',
        toMonsterId: 'aardarc',
        condition: { requiredLevel: 25 },
        requiresEvolutionStone: true,
      },
      {
        fromMonsterId: 'slime',
        toMonsterId: 'gelslime',
        condition: { requiredLevel: 12 },
        requiresEvolutionStone: false,
      },
      {
        fromMonsterId: 'gelslime',
        toMonsterId: 'slimeboss',
        condition: { requiredLevel: 30 },
        requiresEvolutionStone: true,
      },
    ]);

    this.initializedEvolutionChains = true;
    console.log('[BotEvolutionSystem] 进化链已初始化');
  }

  /**
   * 注册机器人怪物
   * @param botId 机器人 ID
   * @param monsterData 怪物数据
   */
  registerBotMonster(botId: string, monsterData: BotMonsterData): void {
    this.botMonsters.set(botId, monsterData);
    console.log(`[BotEvolutionSystem] 注册怪物: ${botId} - ${monsterData.nickname}`);
  }

  /**
   * 计算升级所需经验
   * @param level 当前等级
   * @returns 所需经验
   */
  calculateRequiredExp(level: number): number {
    return Math.floor(Math.pow(level, 3) * this.EXP_MULTIPLIER);
  }

  /**
   * 获得经验值
   * @param botId 机器人 ID
   * @param exp 获得的经验
   * @returns 升级结果
   */
  gainExp(botId: string, exp: number): LevelUpResult {
    const monster = this.botMonsters.get(botId);
    if (!monster) {
      return { success: false, message: '怪物不存在' };
    }

    monster.currentExp += exp;

    // 检查是否可以升级
    let levelUps = 0;
    let totalStatBoosts = {
      hp: 0,
      attack: 0,
      defense: 0,
      speed: 0,
    };
    let learnedTechniques: string[] = [];

    while (monster.currentExp >= monster.requiredExp) {
      monster.currentExp -= monster.requiredExp;
      levelUps++;

      // 升级
      monster.level++;
      monster.requiredExp = this.calculateRequiredExp(monster.level);

      // 计算属性提升
      const statBoost = this.calculateStatBoosts(monster.level);
      totalStatBoosts.hp += statBoost.hp;
      totalStatBoosts.attack += statBoost.attack;
      totalStatBoosts.defense += statBoost.defense;
      totalStatBoosts.speed += statBoost.speed;

      // 应用属性提升
      monster.maxHp += statBoost.hp;
      monster.currentHp += statBoost.hp;
      monster.attack += statBoost.attack;
      monster.defense += statBoost.defense;
      monster.speed += statBoost.speed;

      // 检查是否学习新技能
      const newTechnique = this.checkLearnNewTechnique(monster);
      if (newTechnique) {
        learnedTechniques.push(newTechnique);
        monster.techniques.push(newTechnique);
      }
    }

    if (levelUps > 0) {
      console.log(`[BotEvolutionSystem] 升级: ${botId} Lv.${monster.level - levelUps} -> Lv.${monster.level}`);

      return {
        success: true,
        newLevel: monster.level,
        statBoosts: totalStatBoosts,
        learnedTechnique: learnedTechniques[learnedTechniques.length - 1],
        message: `${monster.nickname} 升级到 Lv.${monster.level}!`,
      };
    }

    return { success: false, message: '经验不足' };
  }

  /**
   * 计算属性提升
   */
  private calculateStatBoosts(level: number): {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
  } {
    const baseBoost = Math.floor(level * 0.5);
    return {
      hp: baseBoost * 10 + Math.floor(Math.random() * 10),
      attack: baseBoost + Math.floor(Math.random() * 3),
      defense: baseBoost + Math.floor(Math.random() * 3),
      speed: baseBoost + Math.floor(Math.random() * 2),
    };
  }

  /**
   * 检查是否学习新技能
   */
  private checkLearnNewTechnique(monster: BotMonsterData): string | null {
    const monsterData = monsterDataLoader.getMonster(monster.monsterId);
    if (!monsterData) return null;

    // 检查是否有在当前等级可以学习的技能
    for (const techniqueId of monsterData.techniques) {
      // 获取技能数据
      // 这里假设技能数据包含学习等级信息
      // 简化实现：每隔 5 级随机学习一个技能
      if (monster.level % 5 === 0 && !monster.techniques.includes(techniqueId)) {
        return techniqueId;
      }
    }

    return null;
  }

  /**
   * 检查是否可以进化
   * @param botId 机器人 ID
   * @returns 进化结果
   */
  checkEvolution(botId: string): EvolutionResult {
    const monster = this.botMonsters.get(botId);
    if (!monster) {
      return { success: false, message: '怪物不存在' };
    }

    if (monster.isEvolved) {
      return { success: false, message: '已经进化过' };
    }

    // 查找可用的进化
    const evolutions = this.findAvailableEvolutions(monster.monsterId, monster.level);
    if (evolutions.length === 0) {
      return { success: false, message: '无法进化' };
    }

    // 选择第一个可用的进化
    const evolution = evolutions[0];

    // 检查是否需要进化石
    if (evolution.requiresEvolutionStone) {
      const hasStone = botInventoryManager.canEvolveMonster(botId, monster.monsterId);
      if (!hasStone) {
        return { success: false, message: '缺少进化石' };
      }
    }

    // 检查等级条件
    if (evolution.condition.requiredLevel > monster.level) {
      return {
        success: false,
        message: `需要达到 Lv.${evolution.condition.requiredLevel}`,
      };
    }

    return {
      success: true,
      evolvedMonsterId: evolution.toMonsterId,
      message: `可以进化为 ${evolution.toMonsterId}`,
    };
  }

  /**
   * 执行进化
   * @param botId 机器人 ID
   * @param evolutionId 进化 ID
   * @returns 进化结果
   */
  evolveMonster(botId: string, evolutionId?: string): EvolutionResult {
    const monster = this.botMonsters.get(botId);
    if (!monster) {
      return { success: false, message: '怪物不存在' };
    }

    // 获取进化数据
    let evolution: EvolutionData | undefined;
    const evolutions = this.findAvailableEvolutions(monster.monsterId, monster.level);

    if (evolutionId) {
      evolution = evolutions.find(e => e.toMonsterId === evolutionId);
    } else if (evolutions.length > 0) {
      evolution = evolutions[0];
    }

    if (!evolution) {
      return { success: false, message: '进化条件不满足' };
    }

    // 检查并消耗进化石
    if (evolution.requiresEvolutionStone) {
      // 移除进化石（简化：移除任意一个进化石）
      const removed = botInventoryManager.removeItem(botId, evolution.condition.requiredItem || 'evolution_stone', 1);
      if (!removed) {
        return { success: false, message: '缺少进化石' };
      }
    }

    // 执行进化
    const oldMonsterId = monster.monsterId;
    monster.monsterId = evolution.toMonsterId;
    monster.isEvolved = true;

    // 获取新怪物的数据并更新属性
    const newMonsterData = monsterDataLoader.getMonster(evolution.toMonsterId);
    if (newMonsterData) {
      monster.maxHp = newMonsterData.hp;
      monster.currentHp = monster.maxHp;
      monster.attack = newMonsterData.attack;
      monster.defense = newMonsterData.defense;
      monster.speed = newMonsterData.speed;
    }

    console.log(`[BotEvolutionSystem] 进化: ${botId} ${oldMonsterId} -> ${evolution.toMonsterId}`);

    return {
      success: true,
      evolvedMonsterId: evolution.toMonsterId,
      message: `${monster.nickname} 进化为 ${evolution.toMonsterId}!`,
    };
  }

  /**
   * 查找可用的进化
   */
  private findAvailableEvolutions(monsterId: string, level: number): EvolutionData[] {
    const available: EvolutionData[] = [];

    // 遍历所有进化链
    for (const evolutionList of this.evolutionChain.values()) {
      for (const evolution of evolutionList) {
        if (evolution.fromMonsterId === monsterId) {
          // 检查条件是否满足
          if (evolution.condition.requiredLevel <= level) {
            available.push(evolution);
          }
        }
      }
    }

    return available;
  }

  /**
   * 获取怪物数据
   * @param botId 机器人 ID
   * @returns 怪物数据
   */
  getMonster(botId: string): BotMonsterData | null {
    return this.botMonsters.get(botId) || null;
  }

  /**
   * 获取所有怪物数据
   */
  getAllMonsters(): BotMonsterData[] {
    return Array.from(this.botMonsters.values());
  }

  /**
   * 设置怪物 HP
   * @param botId 机器人 ID
   * @param currentHp 当前 HP
   */
  setMonsterHp(botId: string, currentHp: number): void {
    const monster = this.botMonsters.get(botId);
    if (monster) {
      monster.currentHp = Math.max(0, Math.min(currentHp, monster.maxHp));
    }
  }

  /**
   * 恢复怪物 HP
   * @param botId 机器人 ID
   * @param amount 恢复量
   */
  healMonster(botId: string, amount: number): void {
    const monster = this.botMonsters.get(botId);
    if (monster) {
      monster.currentHp = Math.min(monster.currentHp + amount, monster.maxHp);
    }
  }

  /**
   * 添加进化链
   * @param chainId 进化链 ID
   * @param evolutionData 进化数据
   */
  addEvolutionChain(chainId: string, evolutionData: EvolutionData[]): void {
    this.evolutionChain.set(chainId, evolutionData);
    console.log(`[BotEvolutionSystem] 添加进化链: ${chainId}`);
  }

  /**
   * 重置系统
   */
  reset(): void {
    this.botMonsters.clear();
    this.evolutionChain.clear();
    this.initialized = false;
    this.initializedEvolutionChains = false;
    console.log('[BotEvolutionSystem] 系统已重置');
  }
}

/**
 * 导出机器人升级和进化系统单例
 */
export const botEvolutionSystem = BotEvolutionSystem.getInstance();
