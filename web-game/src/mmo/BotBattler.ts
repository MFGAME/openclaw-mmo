/**
 * MMO 机器人自动对战逻辑
 *
 * 基于 Tuxemon 的 AI 战斗系统实现机器人自动战斗和捕捉
 *
 * 功能：
 * - 野生怪物战斗触发
 * - 战斗中的技能选择（基于 AI 性格）
 * - 捕捉决策逻辑（判断是否值得捕捉）
 * - 战斗结果处理（经验值、道具获取）
 * - 战斗日志记录
 */

import { BotData, BotPersonality, mmoBotManager } from './BotManager';
import { BattleUnit, BattleAction, ActionType } from '../engine/BattleState';
import { MonsterInstance, monsterDataLoader } from '../engine/MonsterData';

/**
 * 战斗动作决策类型
 */
export enum BattleDecisionType {
  /** 攻击 */
  ATTACK = 'attack',
  /** 使用技能 */
  TECHNIQUE = 'technique',
  /** 捕捉 */
  CAPTURE = 'capture',
  /** 使用道具 */
  ITEM = 'item',
  /** 切换怪物 */
  SWITCH = 'switch',
  /** 逃跑 */
  ESCAPE = 'escape',
}

/**
 * 战斗决策结果接口
 */
export interface BattleDecision {
  /** 决策类型 */
  type: BattleDecisionType;
  /** 技能 ID（如果使用技能） */
  techniqueId?: string;
  /** 目标 ID */
  targetId?: string;
  /** 道具 ID（如果使用道具） */
  itemId?: string;
  /** 切换到的怪物 ID（如果切换怪物） */
  switchToId?: string;
  /** 捕捉球类型（如果捕捉） */
  ballType?: 'pokeball' | 'superball' | 'ultraball' | 'masterball';
  /** 决策优先级（数值越大越优先） */
  priority: number;
  /** 决策原因（用于日志） */
  reason?: string;
}

/**
 * 捕捉决策接口
 */
export interface CaptureDecision {
  /** 是否捕捉 */
  shouldCapture: boolean;
  /** 捕捉球类型 */
  ballType: 'pokeball' | 'superball' | 'ultraball' | 'masterball';
  /** 捕捉成功率 */
  successRate: number;
  /** 决策原因 */
  reason?: string;
}

/**
 * 战斗结果接口
 */
export interface BattleResult {
  /** 是否胜利 */
  victory: boolean;
  /** 战斗回合数 */
  rounds: number;
  /** 获得经验值 */
  expGained: number;
  /** 获得金币 */
  goldGained: number;
  /** 获得道具列表 */
  itemsGained: string[];
  /** 捕捉的怪物（如果有） */
  capturedMonster?: MonsterInstance;
  /** 战斗日志 */
  battleLog: string[];
}

/**
 * 战斗日志接口
 */
export interface BattleLog {
  /** 日志 ID */
  id: string;
  /** 机器人 ID */
  botId: string;
  /** 日志时间 */
  timestamp: number;
  /** 日志类型 */
  type: 'decision' | 'action' | 'damage' | 'capture' | 'result';
  /** 日志消息 */
  message: string;
  /** 附加数据 */
  data?: Record<string, unknown>;
}

/**
 * 战斗状态接口
 */
interface BotBattleState {
  /** 机器人 ID */
  botId: string;
  /** 当前出战的怪物 */
  activeMonster: BattleUnit | null;
  /** 怪物队伍 */
  monsterParty: BattleUnit[];
  /** 当前回合 */
  currentRound: number;
  /** 战斗历史 */
  battleHistory: BattleAction[];
  /** 战斗日志 */
  battleLogs: BattleLog[];
  /** 敌方单位 */
  enemyUnits: BattleUnit[];
  /** 战斗状态 */
  battleState: 'active' | 'victory' | 'defeat' | 'fled';
}

/**
 * 战斗配置接口
 */
export interface BattleConfig {
  /** AI 难度 */
  aiDifficulty: 'easy' | 'medium' | 'hard';
  /** 捕捉阈值（HP 百分比低于此值时考虑捕捉） */
  captureThreshold: number;
  /** 最大捕捉尝试次数 */
  maxCaptureAttempts: number;
  /** 是否启用调试日志 */
  debugLogging: boolean;
}

/**
 * 机器人战斗器类
 */
export class BotBattler {
  private static instance: BotBattler;

  /** 机器人战斗状态映射 */
  private battleStates: Map<string, BotBattleState> = new Map();

  /** 机器人战斗配置映射 */
  private botConfigs: Map<string, BattleConfig> = new Map();

  /** 战斗日志 */
  private battleLogs: BattleLog[] = [];

  /** 最大日志数量 */
  private readonly MAX_LOGS = 1000;

  /** 默认配置 */
  private readonly defaultConfig: BattleConfig = {
    aiDifficulty: 'medium',
    captureThreshold: 0.3,
    maxCaptureAttempts: 3,
    debugLogging: false,
  };

  /** 是否已初始化 */
  private initialized = false;

  /**
   * 私有构造函数，确保单例
   */
  private constructor() {}

  /**
   * 获取机器人战斗器单例实例
   */
  static getInstance(): BotBattler {
    if (!BotBattler.instance) {
      BotBattler.instance = new BotBattler();
    }
    return BotBattler.instance;
  }

  /**
   * 初始化机器人战斗器
   */
  initialize(): void {
    if (this.initialized) {
      console.warn('[BotBattler] 已经初始化');
      return;
    }

    this.initialized = true;
    console.log('[BotBattler] MMO 机器人战斗器已初始化');
  }

  /**
   * 开始战斗
   * @param botId 机器人 ID
   * @param enemyMonsterId 敌方怪物 ID
   * @param config 战斗配置（可选）
   * @returns 是否成功开始战斗
   */
  startBattle(botId: string, enemyMonsterId: string, config?: Partial<BattleConfig>): boolean {
    const bot = mmoBotManager.getBot(botId);
    if (!bot) {
      console.error(`[BotBattler] 机器人不存在: ${botId}`);
      return false;
    }

    // 设置机器人对战状态
    mmoBotManager.setBotBattling(botId, `battle_${Date.now()}`, `enemy_${enemyMonsterId}`);

    // 设置战斗配置
    const fullConfig: BattleConfig = { ...this.defaultConfig, ...config };
    this.botConfigs.set(botId, fullConfig);

    // 创建战斗状态
    const battleState: BotBattleState = {
      botId,
      activeMonster: null,
      monsterParty: [],
      currentRound: 1,
      battleHistory: [],
      battleLogs: [],
      enemyUnits: [],
      battleState: 'active',
    };

    this.battleStates.set(botId, battleState);

    // 初始化战斗单位
    this.initializeBattleUnits(botId, enemyMonsterId, battleState);

    console.log(`[BotBattler] 战斗已开始: ${bot.name} (${botId}) vs ${enemyMonsterId}`);
    this.logDebug(botId, `战斗配置: ${JSON.stringify(fullConfig, null, 2)}`);

    const logData = { config: fullConfig };
    this.addBattleLog(botId, 'decision', `战斗开始 vs ${enemyMonsterId}`, logData);

    // 开始战斗循环
    this.startBattleLoop(botId, fullConfig);

    return true;
  }

  /**
   * 初始化战斗单位
   * @param botId 机器人 ID
   * @param enemyMonsterId 敌方怪物 ID
   * @param battleState 战斗状态
   */
  private initializeBattleUnits(botId: string, enemyMonsterId: string, battleState: BotBattleState): void {
    const bot = mmoBotManager.getBot(botId);
    if (!bot) {
      return;
    }

    // 获取机器人出战的怪物
    const activeMonster = bot.monsterParty.activeMonster;

    if (!activeMonster) {
      console.error(`[BotBattler] 机器人没有出战的怪物: ${botId}`);
      return;
    }

    // 创建战斗单位
    const botUnit = this.createBattleUnitFromMonster(activeMonster, true);
    battleState.activeMonster = botUnit;
    battleState.monsterParty.push(botUnit);

    // 创建敌方怪物战斗单位
    const enemyMonsterData = monsterDataLoader.getMonster(enemyMonsterId);
    if (enemyMonsterData) {
      // 生成敌方怪物等级（根据机器人等级调整）
      const enemyLevel = Math.max(1, bot.level + Math.floor(Math.random() * 5) - 2);
      const enemyInstance = monsterDataLoader.createMonsterInstance(enemyMonsterId, enemyLevel);

      if (enemyInstance) {
        const enemyUnit = this.createBattleUnitFromMonster(enemyInstance, false);
        battleState.enemyUnits.push(enemyUnit);
      }
    }
  }

  /**
   * 从怪物实例创建战斗单位
   * @param monster 怪物实例
   * @param isPlayer 是否为玩家单位
   * @returns 战斗单位
   */
  private createBattleUnitFromMonster(monster: MonsterInstance, isPlayer: boolean): BattleUnit {
    return {
      id: monster.instanceId,
      monsterId: monster.monsterId,
      name: monster.monsterId,
      level: monster.level,
      currentHp: monster.currentHp,
      maxHp: monster.maxHp,
      attack: monster.attack,
      defense: monster.defense,
      speed: monster.speed,
      specialAttack: monster.specialAttack,
      specialDefense: monster.specialDefense,
      elements: monster.types,
      techniques: monster.techniques,
      status: monster.status,
      exp: monster.exp,
      isPlayer,
      isFainted: monster.currentHp <= 0,
    };
  }

  /**
   * 开始战斗循环
   * @param botId 机器人 ID
   * @param config 战斗配置
   */
  private startBattleLoop(botId: string, config: BattleConfig): void {
    const loopInterval = setInterval(() => {
      const battleState = this.battleStates.get(botId);
      if (!battleState || battleState.battleState !== 'active') {
        clearInterval(loopInterval);
        return;
      }

      this.processBattleRound(botId, config);
    }, 1000);
  }

  /**
   * 处理战斗回合
   * @param botId 机器人 ID
   * @param config 战斗配置
   */
  private processBattleRound(botId: string, config: BattleConfig): void {
    const battleState = this.battleStates.get(botId);
    if (!battleState || battleState.battleState !== 'active') {
      return;
    }

    // 检查战斗是否结束
    if (this.checkBattleEnd(botId, battleState)) {
      return;
    }

    // 生成机器人战斗决策
    const decision = this.generateBattleDecision(botId, battleState, config);

    // 执行战斗决策
    this.executeBattleDecision(botId, battleState, decision, config);

    // 处理敌方行动（简化处理）
    this.processEnemyAction(botId, battleState);

    // 增加回合数
    battleState.currentRound++;

    this.logDebug(botId, `战斗回合 ${battleState.currentRound} 完成`);
  }

  /**
   * 检查战斗是否结束
   * @param botId 机器人 ID
   * @param battleState 战斗状态
   * @returns 是否结束
   */
  private checkBattleEnd(botId: string, battleState: BotBattleState): boolean {
    const botUnit = battleState.activeMonster;
    const enemyUnit = battleState.enemyUnits[0];

    if (!botUnit || !enemyUnit) {
      return false;
    }

    if (botUnit.isFainted || enemyUnit.isFainted) {
      // 战斗结束
      const victory = enemyUnit.isFainted;
      battleState.battleState = victory ? 'victory' : 'defeat';

      // 处理战斗结果
      this.handleBattleResult(botId, battleState, victory);

      return true;
    }

    return false;
  }

  /**
   * 生成战斗决策
   * @param botId 机器人 ID
   * @param battleState 战斗状态
   * @param config 战斗配置
   * @returns 战斗决策
   */
  private generateBattleDecision(botId: string, battleState: BotBattleState, config: BattleConfig): BattleDecision {
    const bot = mmoBotManager.getBot(botId);
    if (!bot) {
      return this.createDefaultDecision();
    }

    // 根据机器人性格选择决策策略
    switch (bot.personality) {
      case BotPersonality.AGGRESSIVE:
        return this.generateAggressiveDecision(botId, battleState, config);

      case BotPersonality.COLLECTOR:
        return this.generateCollectorDecision(botId, battleState, config);

      case BotPersonality.SUPPORTIVE:
        return this.generateSupportiveDecision(botId, battleState, config);

      case BotPersonality.BALANCED:
        return this.generateBalancedDecision(botId, battleState, config);

      default:
        return this.generateBalancedDecision(botId, battleState, config);
    }
  }

  /**
   * 生成激进型战斗决策
   */
  private generateAggressiveDecision(botId: string, battleState: BotBattleState, _config: BattleConfig): BattleDecision {
    const botUnit = battleState.activeMonster;
    const enemyUnit = battleState.enemyUnits[0];

    if (!botUnit || !enemyUnit) {
      return this.createDefaultDecision();
    }

    // 激进型机器人优先攻击，不考虑捕捉
    const techniqueId = this.selectBestDamageTechnique(botUnit, enemyUnit);

    if (techniqueId) {
      this.addBattleLog(botId, 'decision', `选择技能: ${techniqueId}`, {
        reason: 'aggressive_attack',
      });

      return {
        type: BattleDecisionType.TECHNIQUE,
        techniqueId,
        targetId: enemyUnit.id,
        priority: 90,
        reason: 'aggressive_attack',
      };
    }

    return this.createAttackDecision(enemyUnit.id);
  }

  /**
   * 生成收集型战斗决策
   */
  private generateCollectorDecision(botId: string, battleState: BotBattleState, config: BattleConfig): BattleDecision {
    const bot = mmoBotManager.getBot(botId);
    if (!bot) {
      return this.createDefaultDecision();
    }

    const botUnit = battleState.activeMonster;
    const enemyUnit = battleState.enemyUnits[0];

    if (!botUnit || !enemyUnit) {
      return this.createDefaultDecision();
    }

    // 收集型机器人优先考虑捕捉
    const captureDecision = this.shouldCaptureMonster(botId, battleState, config);

    if (captureDecision.shouldCapture) {
      const ballType = this.selectCaptureBall(bot, captureDecision.successRate);

      this.addBattleLog(botId, 'decision', `决定使用 ${ballType} 捕捉`, {
        successRate: captureDecision.successRate,
        reason: captureDecision.reason,
      });

      return {
        type: BattleDecisionType.CAPTURE,
        ballType,
        targetId: enemyUnit.id,
        priority: 95,
        reason: captureDecision.reason,
      };
    }

    // 否则使用技能
    const techniqueId = this.selectBestDamageTechnique(botUnit, enemyUnit);

    if (techniqueId) {
      return {
        type: BattleDecisionType.TECHNIQUE,
        techniqueId,
        targetId: enemyUnit.id,
        priority: 80,
        reason: 'collector_attack',
      };
    }

    return this.createAttackDecision(enemyUnit.id);
  }

  /**
   * 生成辅助型战斗决策
   */
  private generateSupportiveDecision(botId: string, battleState: BotBattleState, _config: BattleConfig): BattleDecision {
    const botUnit = battleState.activeMonster;
    const enemyUnit = battleState.enemyUnits[0];

    if (!botUnit || !enemyUnit) {
      return this.createDefaultDecision();
    }

    // 辅助型机器人优先考虑自身状态
    if (botUnit.currentHp / botUnit.maxHp < 0.5) {
      // 检查是否有治疗技能
      const healingTechnique = this.findHealingTechnique(botUnit);

      if (healingTechnique) {
        this.addBattleLog(botId, 'decision', `使用治疗技能: ${healingTechnique}`, {
          reason: 'low_hp',
        });

        return {
          type: BattleDecisionType.TECHNIQUE,
          techniqueId: healingTechnique,
          targetId: botUnit.id,
          priority: 85,
          reason: 'heal_self',
        };
      }
    }

    // 否则使用技能攻击
    const techniqueId = this.selectBestDamageTechnique(botUnit, enemyUnit);

    if (techniqueId) {
      return {
        type: BattleDecisionType.TECHNIQUE,
        techniqueId,
        targetId: enemyUnit.id,
        priority: 70,
        reason: 'supportive_attack',
      };
    }

    return this.createAttackDecision(enemyUnit.id);
  }

  /**
   * 生成平衡型战斗决策
   */
  private generateBalancedDecision(botId: string, battleState: BotBattleState, config: BattleConfig): BattleDecision {
    const bot = mmoBotManager.getBot(botId);
    if (!bot) {
      return this.createDefaultDecision();
    }

    const botUnit = battleState.activeMonster;
    const enemyUnit = battleState.enemyUnits[0];

    if (!botUnit || !enemyUnit) {
      return this.createDefaultDecision();
    }

    // 平衡型机器人综合考虑多种因素
    const decisions: BattleDecision[] = [];

    // 1. 检查是否应该捕捉
    const captureDecision = this.shouldCaptureMonster(botId, battleState, config);
    if (captureDecision.shouldCapture) {
      const ballType = this.selectCaptureBall(bot, captureDecision.successRate);
      decisions.push({
        type: BattleDecisionType.CAPTURE,
        ballType,
        targetId: enemyUnit.id,
        priority: 85,
        reason: captureDecision.reason,
      });
    }

    // 2. 检查是否应该使用治疗技能
    if (botUnit.currentHp / botUnit.maxHp < 0.4) {
      const healingTechnique = this.findHealingTechnique(botUnit);
      if (healingTechnique) {
        decisions.push({
          type: BattleDecisionType.TECHNIQUE,
          techniqueId: healingTechnique,
          targetId: botUnit.id,
          priority: 80,
          reason: 'heal_self',
        });
      }
    }

    // 3. 选择最佳攻击技能
    const techniqueId = this.selectBestDamageTechnique(botUnit, enemyUnit);
    if (techniqueId) {
      decisions.push({
        type: BattleDecisionType.TECHNIQUE,
        techniqueId,
        targetId: enemyUnit.id,
        priority: 75,
        reason: 'best_damage',
      });
    }

    // 4. 普通攻击
    decisions.push({
      type: BattleDecisionType.ATTACK,
      targetId: enemyUnit.id,
      priority: 50,
      reason: 'default_attack',
    });

    // 选择优先级最高的决策
    decisions.sort((a, b) => b.priority - a.priority);
    const selected = decisions[0];

    if (selected.reason) {
      this.addBattleLog(botId, 'decision', `选择: ${selected.type}`, {
        reason: selected.reason,
        priority: selected.priority,
      });
    }

    return selected;
  }

  /**
   * 判断是否应该捕捉怪物
   * @param botId 机器人 ID
   * @param battleState 战斗状态
   * @param config 战斗配置
   * @returns 捕捉决策
   */
  private shouldCaptureMonster(botId: string, battleState: BotBattleState, config: BattleConfig): CaptureDecision {
    const bot = mmoBotManager.getBot(botId);
    if (!bot) {
      return { shouldCapture: false, ballType: 'pokeball', successRate: 0 };
    }

    const enemyUnit = battleState.enemyUnits[0];
    if (!enemyUnit) {
      return { shouldCapture: false, ballType: 'pokeball', successRate: 0 };
    }

    // 只有收集型机器人会主动捕捉
    if (bot.personality !== BotPersonality.COLLECTOR) {
      return { shouldCapture: false, ballType: 'pokeball', successRate: 0 };
    }

    // 检查是否有捕捉球
    if (bot.resources.pokeballs <= 0 && bot.resources.superballs <= 0 && bot.resources.ultraballs <= 0) {
      return { shouldCapture: false, ballType: 'pokeball', successRate: 0, reason: 'no_balls' };
    }

    // 检查怪物血量是否足够低
    const hpRatio = enemyUnit.currentHp / enemyUnit.maxHp;
    if (hpRatio > config.captureThreshold) {
      return { shouldCapture: false, ballType: 'pokeball', successRate: 0, reason: 'hp_too_high' };
    }

    // 检查怪物队伍是否已满
    if (bot.monsterParty.reserveMonsters.length >= bot.monsterParty.maxSize - 1) {
      return { shouldCapture: false, ballType: 'pokeball', successRate: 0, reason: 'party_full' };
    }

    // 计算捕捉成功率
    const successRate = 1 - hpRatio;

    return {
      shouldCapture: true,
      ballType: 'pokeball',
      successRate,
      reason: 'low_hp_and_collectible',
    };
  }

  /**
   * 选择捕捉球类型
   * @param bot 机器人数据
   * @param successRate 期望成功率
   * @returns 捕捉球类型
   */
  private selectCaptureBall(bot: BotData, successRate: number): 'pokeball' | 'superball' | 'ultraball' | 'masterball' {
    // 如果有大师球，优先使用
    if (bot.resources.masterballs > 0) {
      return 'masterball';
    }

    // 如果期望成功率较低，使用更高级的球
    if (successRate < 0.5) {
      if (bot.resources.ultraballs > 0) {
        return 'ultraball';
      }
      if (bot.resources.superballs > 0) {
        return 'superball';
      }
    } else if (successRate < 0.8) {
      if (bot.resources.superballs > 0) {
        return 'superball';
      }
    }

    // 默认使用普通球
    if (bot.resources.pokeballs > 0) {
      return 'pokeball';
    }

    // 如果没有普通球，使用其他可用的球
    if (bot.resources.superballs > 0) {
      return 'superball';
    }
    if (bot.resources.ultraballs > 0) {
      return 'ultraball';
    }

    return 'pokeball';
  }

  /**
   * 选择最佳伤害技能
   * @param attacker 攻击方战斗单位
   * @param defender 防御方战斗单位
   * @returns 最佳技能 ID
   */
  private selectBestDamageTechnique(attacker: BattleUnit, _defender: BattleUnit): string | null {
    let bestTechniqueId: string | null = null;
    let bestScore = 0;

    for (const techniqueId of attacker.techniques) {
      // 这里简化处理，实际应该从 TechniqueDataLoader 获取技能数据
      const score = Math.random() * 100;

      if (score > bestScore) {
        bestScore = score;
        bestTechniqueId = techniqueId;
      }
    }

    return bestTechniqueId;
  }

  /**
   * 查找治疗技能
   * @param unit 战斗单位
   * @returns 治疗技能 ID
   */
  private findHealingTechnique(unit: BattleUnit): string | null {
    // 简化处理，实际应该检查技能效果
    for (const techniqueId of unit.techniques) {
      // 假设以 "heal" 开头的技能是治疗技能
      if (techniqueId.toLowerCase().includes('heal') || techniqueId.toLowerCase().includes('recover')) {
        return techniqueId;
      }
    }

    return null;
  }

  /**
   * 创建攻击决策
   * @param targetId 目标 ID
   * @returns 攻击决策
   */
  private createAttackDecision(targetId: string): BattleDecision {
    return {
      type: BattleDecisionType.ATTACK,
      targetId,
      priority: 50,
      reason: 'default_attack',
    };
  }

  /**
   * 创建默认决策
   * @returns 默认决策
   */
  private createDefaultDecision(): BattleDecision {
    return {
      type: BattleDecisionType.ATTACK,
      targetId: 'unknown',
      priority: 10,
      reason: 'fallback',
    };
  }

  /**
   * 执行战斗决策
   * @param botId 机器人 ID
   * @param battleState 战斗状态
   * @param decision 战斗决策
   * @param config 战斗配置
   */
  private executeBattleDecision(botId: string, battleState: BotBattleState, decision: BattleDecision, _config: BattleConfig): void {
    const botUnit = battleState.activeMonster;
    const enemyUnit = battleState.enemyUnits[0];

    if (!botUnit || !enemyUnit) {
      return;
    }

    switch (decision.type) {
      case BattleDecisionType.ATTACK:
        this.executeAttack(botId, battleState, botUnit, enemyUnit);
        break;

      case BattleDecisionType.TECHNIQUE:
        if (decision.techniqueId) {
          this.executeTechnique(botId, battleState, botUnit, enemyUnit, decision.techniqueId);
        }
        break;

      case BattleDecisionType.CAPTURE:
        this.executeCapture(botId, battleState, botUnit, enemyUnit, decision.ballType || 'pokeball');
        break;

      case BattleDecisionType.ITEM:
        // 暂未实现
        break;

      case BattleDecisionType.SWITCH:
        // 暂未实现
        break;

      case BattleDecisionType.ESCAPE:
        // 暂未实现
        break;
    }

    // 记录决策到历史
    const action: BattleAction = {
      type: decision.type as unknown as ActionType,
      actorId: botUnit.id,
      targetIds: [enemyUnit.id],
      priority: decision.priority,
    };

    battleState.battleHistory.push(action);
  }

  /**
   * 执行攻击
   */
  private executeAttack(botId: string, _battleState: BotBattleState, attacker: BattleUnit, defender: BattleUnit): void {
    // 简化伤害计算
    const damage = Math.floor((attacker.attack / defender.defense) * 20);

    defender.currentHp = Math.max(0, defender.currentHp - damage);

    if (defender.currentHp <= 0) {
      defender.isFainted = true;
    }

    this.addBattleLog(botId, 'damage', `${attacker.name} 攻击了 ${defender.name}，造成 ${damage} 点伤害`, {
      attackerId: attacker.id,
      defenderId: defender.id,
      damage,
      remainingHp: defender.currentHp,
    });
  }

  /**
   * 执行技能
   */
  private executeTechnique(botId: string, _battleState: BotBattleState, attacker: BattleUnit, defender: BattleUnit, techniqueId: string): void {
    // 简化技能处理
    const damage = Math.floor((attacker.attack / defender.defense) * 30);

    defender.currentHp = Math.max(0, defender.currentHp - damage);

    if (defender.currentHp <= 0) {
      defender.isFainted = true;
    }

    this.addBattleLog(botId, 'damage', `${attacker.name} 使用 ${techniqueId} 攻击了 ${defender.name}，造成 ${damage} 点伤害`, {
      attackerId: attacker.id,
      defenderId: defender.id,
      techniqueId,
      damage,
      remainingHp: defender.currentHp,
    });
  }

  /**
   * 执行捕捉
   */
  private executeCapture(botId: string, battleState: BotBattleState, _attacker: BattleUnit, defender: BattleUnit, ballType: string): void {
    const bot = mmoBotManager.getBot(botId);
    if (!bot) {
      return;
    }

    // 计算捕捉率
    const hpRatio = defender.currentHp / defender.maxHp;
    const successRate = (1 - hpRatio) * 0.5; // 简化计算

    this.addBattleLog(botId, 'capture', `使用 ${ballType} 尝试捕捉 ${defender.name}`, {
      ballType,
      successRate,
      enemyHpRatio: hpRatio,
    });

    // 判断是否捕捉成功
    if (Math.random() < successRate) {
      // 捕捉成功
      this.addBattleLog(botId, 'capture', `成功捕捉了 ${defender.name}！`, {
        success: true,
      });

      // 结束战斗
      battleState.battleState = 'victory';

      // 处理捕捉成功
      this.handleCaptureSuccess(botId, battleState, defender);
    } else {
      // 捕捉失败
      this.addBattleLog(botId, 'capture', `${defender.name} 挣脱了捕捉球！`, {
        success: false,
      });

      // 扣除捕捉球
      this.deductCaptureBall(bot, ballType);
    }
  }

  /**
   * 处理捕捉成功
   */
  private handleCaptureSuccess(botId: string, _battleState: BotBattleState, enemyUnit: BattleUnit): void {
    const bot = mmoBotManager.getBot(botId);
    if (!bot) {
      return;
    }

    // 创建怪物实例
    const monsterData = monsterDataLoader.getMonster(enemyUnit.monsterId);
    if (!monsterData) {
      return;
    }

    const monsterInstance: MonsterInstance = {
      instanceId: `${enemyUnit.monsterId}_captured_${Date.now()}`,
      monsterId: enemyUnit.monsterId,
      nickname: undefined,
      level: enemyUnit.level,
      exp: 0,
      currentHp: enemyUnit.maxHp,
      maxHp: enemyUnit.maxHp,
      attack: enemyUnit.attack,
      defense: enemyUnit.defense,
      speed: enemyUnit.speed,
      specialAttack: enemyUnit.specialAttack,
      specialDefense: enemyUnit.specialDefense,
      types: [...enemyUnit.elements],
      techniques: [...enemyUnit.techniques],
      status: [],
      caughtAt: Date.now(),
    };

    // 添加到机器人怪物队伍
    const updatedParty = {
      ...bot.monsterParty,
      reserveMonsters: [...bot.monsterParty.reserveMonsters, monsterInstance],
    };

    mmoBotManager.updateBotMonsterParty(botId, updatedParty);

    console.log(`[BotBattler] 机器人 ${bot.name} 成功捕捉了 ${enemyUnit.name}`);
  }

  /**
   * 扣除捕捉球
   */
  private deductCaptureBall(bot: BotData, ballType: string): void {
    switch (ballType) {
      case 'pokeball':
        if (bot.resources.pokeballs > 0) {
          mmoBotManager.updateBotResources(bot.id, { pokeballs: bot.resources.pokeballs - 1 });
        }
        break;
      case 'superball':
        if (bot.resources.superballs > 0) {
          mmoBotManager.updateBotResources(bot.id, { superballs: bot.resources.superballs - 1 });
        }
        break;
      case 'ultraball':
        if (bot.resources.ultraballs > 0) {
          mmoBotManager.updateBotResources(bot.id, { ultraballs: bot.resources.ultraballs - 1 });
        }
        break;
      case 'masterball':
        if (bot.resources.masterballs > 0) {
          mmoBotManager.updateBotResources(bot.id, { masterballs: bot.resources.masterballs - 1 });
        }
        break;
    }
  }

  /**
   * 处理敌方行动
   */
  private processEnemyAction(botId: string, battleState: BotBattleState): void {
    const botUnit = battleState.activeMonster;
    const enemyUnit = battleState.enemyUnits[0];

    if (!botUnit || !enemyUnit || enemyUnit.isFainted) {
      return;
    }

    // 简化敌方行动：随机攻击
    const damage = Math.floor((enemyUnit.attack / botUnit.defense) * 15);

    botUnit.currentHp = Math.max(0, botUnit.currentHp - damage);

    if (botUnit.currentHp <= 0) {
      botUnit.isFainted = true;
    }

    this.addBattleLog(botId, 'damage', `${enemyUnit.name} 攻击了 ${botUnit.name}，造成 ${damage} 点伤害`, {
      attackerId: enemyUnit.id,
      defenderId: botUnit.id,
      damage,
      remainingHp: botUnit.currentHp,
    });
  }

  /**
   * 处理战斗结果
   */
  private handleBattleResult(botId: string, battleState: BotBattleState, victory: boolean): void {
    const bot = mmoBotManager.getBot(botId);
    if (!bot) {
      return;
    }

    // 计算奖励
    const expGained = victory ? Math.floor(Math.random() * 100) + 50 : Math.floor(Math.random() * 20) + 10;
    const goldGained = victory ? Math.floor(Math.random() * 50) + 20 : 0;

    // 更新机器人资源
    if (victory) {
      mmoBotManager.updateBotResources(botId, {
        gold: bot.resources.gold + goldGained,
      });
    }

    // 记录战斗结果日志
    this.addBattleLog(botId, 'result', `战斗${victory ? '胜利' : '失败'}！获得 ${expGained} 经验值，${goldGained} 金币`, {
      victory,
      rounds: battleState.currentRound,
      expGained,
      goldGained,
    });

    console.log(`[BotBattler] 战斗结束: ${bot.name} ${victory ? '胜利' : '失败'}`);

    // 更新机器人状态
    mmoBotManager.setBotOnline(botId);

    // 清除战斗状态
    this.battleStates.delete(botId);
  }

  /**
   * 添加战斗日志
   */
  private addBattleLog(botId: string, type: BattleLog['type'], message: string, data?: Record<string, unknown>): void {
    const log: BattleLog = {
      id: `battle_log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      botId,
      timestamp: Date.now(),
      type,
      message,
      data,
    };

    // 添加到全局日志
    this.battleLogs.push(log);

    // 添加到战斗状态
    const battleState = this.battleStates.get(botId);
    if (battleState) {
      battleState.battleLogs.push(log);
    }

    // 限制日志数量
    if (this.battleLogs.length > this.MAX_LOGS) {
      this.battleLogs.shift();
    }

    this.logDebug(botId, `[${type}] ${message}`);
  }

  /**
   * 获取战斗日志
   * @param botId 机器人 ID（可选）
   * @param limit 最大日志数量（可选）
   * @returns 战斗日志
   */
  getBattleLogs(botId?: string, limit?: number): BattleLog[] {
    let logs = this.battleLogs;

    if (botId) {
      logs = logs.filter(log => log.botId === botId);
    }

    logs = logs.sort((a, b) => b.timestamp - a.timestamp);

    if (limit) {
      logs = logs.slice(0, limit);
    }

    return logs;
  }

  /**
   * 获取机器人战斗状态
   * @param botId 机器人 ID
   * @returns 战斗状态
   */
  getBattleState(botId: string): BotBattleState | null {
    return this.battleStates.get(botId) || null;
  }

  /**
   * 获取机器人战斗配置
   * @param botId 机器人 ID
   * @returns 战斗配置
   */
  getBattleConfig(botId: string): BattleConfig | undefined {
    return this.botConfigs.get(botId);
  }

  /**
   * 设置机器人战斗配置
   * @param botId 机器人 ID
   * @param config 战斗配置
   */
  setBattleConfig(botId: string, config: Partial<BattleConfig>): void {
    const currentConfig = this.botConfigs.get(botId);
    if (currentConfig) {
      const newConfig: BattleConfig = { ...currentConfig, ...config };
      this.botConfigs.set(botId, newConfig);
      this.logDebug(botId, `战斗配置已更新`);
    }
  }

  /**
   * 调试日志
   * @param botId 机器人 ID
   * @param message 日志消息
   */
  private logDebug(botId: string, message: string): void {
    const config = this.botConfigs.get(botId);
    if (config && config.debugLogging) {
      console.log(`[BotBattler] [${botId}] ${message}`);
    }
  }

  /**
   * 重置机器人战斗器
   */
  reset(): void {
    this.battleStates.clear();
    this.botConfigs.clear();
    this.battleLogs = [];
    console.log('[BotBattler] MMO 机器人战斗器已重置');
  }
}

/**
 * 导出机器人战斗器单例
 */
export const mmoBotBattler = BotBattler.getInstance();
