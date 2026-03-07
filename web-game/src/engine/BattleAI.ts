/**
 * 战斗 AI 对手控制器
 *
 * 基于 Tuxemon 的 AI 决策逻辑
 *
 * 功能：
 * - AI 难度等级（简单/中等/困难）
 * - 技能选择 AI（基于伤害计算、属性克制）
 * - 道具使用 AI（何时使用恢复药等）
 * - 怪物切换 AI（血量低时切换）
 * - 逃跑决策 AI
 */

import {
  BattleUnit,
  BattleAction,
  BattleState,
  ActionType,
} from './BattleState';
import { TechniqueData, TechniqueCategory } from './TechniqueData';
import { BattleCalculator, ElementType } from './BattleCalculator';
import { techniqueDataLoader } from './TechniqueData';

/**
 * AI 难度等级
 */
export enum AIDifficulty {
  /** 简单：随机行动，基本策略 */
  EASY = 'easy',
  /** 中等：有一定策略，考虑属性克制 */
  MEDIUM = 'medium',
  /** 困难：智能决策，计算最优行动 */
  HARD = 'hard',
}

/**
 * 技能评估结果
 */
interface TechniqueEvaluation {
  /** 技能 ID */
  techniqueId: string;
  /** 技能数据 */
  technique: TechniqueData;
  /** 优先级分数（越高越优先） */
  score: number;
  /** 预期伤害 */
  expectedDamage: number;
  /** 目标 ID */
  targetId: string;
}

/**
 * 道具决策结果
 */
interface ItemDecision {
  /** 是否使用道具 */
  shouldUse: boolean;
  /** 道具 ID */
  itemId?: string;
  /** 目标 ID */
  targetId?: string;
}

/**
 * 逃跑决策结果
 */
interface EscapeDecision {
  /** 是否应该逃跑 */
  shouldEscape: boolean;
  /** 逃跑成功率 */
  escapeChance: number;
}

/**
 * 切换决策结果
 */
interface SwitchDecision {
  /** 是否应该切换 */
  shouldSwitch: boolean;
  /** 切换到的怪物 ID */
  switchToId?: string;
  /** 切换原因 */
  reason?: string;
}

/**
 * 战斗 AI 控制器类
 */
export class BattleAI {
  private static instance: BattleAI;

  /** 当前 AI 难度 */
  private currentDifficulty: AIDifficulty = AIDifficulty.MEDIUM;

  /** 战斗计算器 */
  private calculator: BattleCalculator;

  /** 记忆系统 - 记录每个玩家的弱点 */
  private playerWeaknesses: Map<string, ElementType[]> = new Map();

  /** 记录系统 - 记录上次使用的技能 */
  private lastUsedTechniques: Map<string, string> = new Map();

  /**
   * 私有构造函数，确保单例
   */
  private constructor() {
    this.calculator = BattleCalculator.getInstance();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): BattleAI {
    if (!BattleAI.instance) {
      BattleAI.instance = new BattleAI();
    }
    return BattleAI.instance;
  }

  /**
   * 设置 AI 难度
   */
  setDifficulty(difficulty: AIDifficulty): void {
    this.currentDifficulty = difficulty;
    console.log(`[BattleAI] Difficulty set to: ${difficulty}`);
  }

  /**
   * 获取当前 AI 难度
   */
  getDifficulty(): AIDifficulty {
    return this.currentDifficulty;
  }

  /**
   * 为敌方单位生成 AI 行动
   */
  generateAction(
    unit: BattleUnit,
    battleState: BattleState
  ): BattleAction | null {
    if (unit.isFainted) {
      return null;
    }

    // 1. 检查是否应该逃跑
    const escapeDecision = this.decideEscape(unit, battleState);
    if (escapeDecision.shouldEscape) {
      return this.createEscapeAction(unit);
    }

    // 2. 检查是否应该切换怪物
    const switchDecision = this.decideSwitch(unit, battleState);
    if (switchDecision.shouldSwitch && switchDecision.switchToId) {
      return this.createSwitchAction(unit, switchDecision.switchToId);
    }

    // 3. 检查是否应该使用道具
    const itemDecision = this.decideItemUsage(unit, battleState);
    if (itemDecision.shouldUse && itemDecision.itemId && itemDecision.targetId) {
      return this.createItemAction(unit, itemDecision.itemId, itemDecision.targetId);
    }

    // 4. 选择技能
    const techniqueAction = this.selectTechnique(unit, battleState);
    if (techniqueAction) {
      return techniqueAction;
    }

    // 5. 默认使用普通攻击
    const targetId = this.selectTarget(unit, battleState);
    return this.createAttackAction(unit, targetId);
  }

  /**
   * 选择技能（基于难度等级）
   */
  private selectTechnique(unit: BattleUnit, battleState: BattleState): BattleAction | null {
    // 获取可用技能
    const availableTechniques = unit.techniques.filter(id => {
      const tech = techniqueDataLoader.getTechnique(id);
      return tech && tech.power > 0; // 只考虑有伤害的技能
    });

    if (availableTechniques.length === 0) {
      return null;
    }

    // 根据难度选择策略
    switch (this.currentDifficulty) {
      case AIDifficulty.EASY:
        return this.selectTechniqueEasy(unit, battleState, availableTechniques);
      case AIDifficulty.MEDIUM:
        return this.selectTechniqueMedium(unit, battleState, availableTechniques);
      case AIDifficulty.HARD:
        return this.selectTechniqueHard(unit, battleState, availableTechniques);
      default:
        return this.selectTechniqueMedium(unit, battleState, availableTechniques);
    }
  }

  /**
   * 简单难度技能选择 - 随机选择
   */
  private selectTechniqueEasy(
    unit: BattleUnit,
    battleState: BattleState,
    availableTechniques: string[]
  ): BattleAction | null {
    // 简单难度：70% 概率随机选择技能，30% 概率使用普通攻击
    if (Math.random() > 0.7) {
      return null; // 返回 null 让主逻辑使用普通攻击
    }

    const randomTechnique = availableTechniques[Math.floor(Math.random() * availableTechniques.length)];
    const targetId = this.selectTarget(unit, battleState);

    return this.createTechniqueAction(unit, randomTechnique, targetId);
  }

  /**
   * 中等难度技能选择 - 考虑属性克制
   */
  private selectTechniqueMedium(
    unit: BattleUnit,
    battleState: BattleState,
    availableTechniques: string[]
  ): BattleAction | null {
    const targetId = this.selectTarget(unit, battleState);
    const target = this.findUnit(targetId, battleState);
    if (!target) {
      return null;
    }

    // 评估每个技能
    const evaluations: TechniqueEvaluation[] = [];

    for (const techniqueId of availableTechniques) {
      const technique = techniqueDataLoader.getTechnique(techniqueId);
      if (!technique) continue;

      const evaluation = this.evaluateTechnique(unit, technique, target, battleState);
      evaluations.push(evaluation);
    }

    // 按分数排序并选择最高分的技能
    evaluations.sort((a, b) => b.score - a.score);

    // 中等难度：80% 概率选择最优技能，20% 概率随机
    if (evaluations.length > 0) {
      const selected = Math.random() < 0.8
        ? evaluations[0]
        : evaluations[Math.floor(Math.random() * evaluations.length)];

      return this.createTechniqueAction(unit, selected.techniqueId, selected.targetId);
    }

    return null;
  }

  /**
   * 困难难度技能选择 - 智能计算最优行动
   */
  private selectTechniqueHard(
    unit: BattleUnit,
    battleState: BattleState,
    availableTechniques: string[]
  ): BattleAction | null {
    // 获取所有可能的敌人目标
    const alivePlayers = battleState.playerParty.filter(u => !u.isFainted);
    if (alivePlayers.length === 0) {
      return null;
    }

    // 评估每个技能对每个目标的预期效果
    let bestEvaluation: TechniqueEvaluation | null = null;

    for (const techniqueId of availableTechniques) {
      const technique = techniqueDataLoader.getTechnique(techniqueId);
      if (!technique) continue;

      for (const target of alivePlayers) {
        const evaluation = this.evaluateTechnique(unit, technique, target, battleState);

        // 困难难度考虑避免连续使用同一技能
        const lastUsed = this.lastUsedTechniques.get(unit.id);
        if (lastUsed === techniqueId) {
          evaluation.score *= 0.7; // 降低分数
        }

        // 困难难度考虑速度优先级
        evaluation.score += (technique.priority || 0) * 10;

        if (!bestEvaluation || evaluation.score > bestEvaluation.score) {
          bestEvaluation = evaluation;
        }
      }
    }

    if (bestEvaluation) {
      // 记录使用的技能
      this.lastUsedTechniques.set(unit.id, bestEvaluation.techniqueId);

      // 更新玩家弱点记忆
      const target = this.findUnit(bestEvaluation.targetId, battleState);
      if (target) {
        this.updateWeaknessMemory(target.id, bestEvaluation.technique.element);
      }

      return this.createTechniqueAction(unit, bestEvaluation.techniqueId, bestEvaluation.targetId);
    }

    return null;
  }

  /**
   * 评估技能的优先级分数
   */
  private evaluateTechnique(
    attacker: BattleUnit,
    technique: TechniqueData,
    target: BattleUnit,
    _battleState: BattleState
  ): TechniqueEvaluation {
    let score = 0;
    let expectedDamage = 0;

    // 计算预期伤害
    if (technique.power > 0 && technique.category !== TechniqueCategory.STATUS) {
      const isPhysical = technique.category === TechniqueCategory.PHYSICAL;

      const damageResult = this.calculator.calculateDamage({
        attack: attacker.attack,
        specialAttack: attacker.specialAttack,
        defense: target.defense,
        specialDefense: target.specialDefense,
        level: attacker.level,
        power: technique.power,
        attackElement: technique.element as ElementType,
        attackerElements: attacker.elements as ElementType[],
        defenderElements: target.elements as ElementType[],
        isPhysical: isPhysical,
        accuracyBonus: technique.accuracy,
      });

      expectedDamage = damageResult.damage;
      score += expectedDamage;

      // 属性克制加成
      if (damageResult.typeEffectiveness >= 2.0) {
        score += 50; // 克制时大幅提高分数
      } else if (damageResult.typeEffectiveness <= 0.5 && damageResult.typeEffectiveness > 0) {
        score -= 30; // 被抵抗时降低分数
      }
    }

    // 考虑技能效果
    for (const effect of technique.effects) {
      if (effect.type === 'status_apply') {
        // 状态技能的优先级取决于目标当前状态
        if (!target.status.includes(effect.statusId || '')) {
          score += effect.chance || 30;
        }
      } else if (effect.type === 'heal') {
        // 治疗技能在血量低时优先级更高
        const hpPercent = attacker.currentHp / attacker.maxHp;
        score += (1 - hpPercent) * 40;
      }
    }

    // 命中率加成
    score *= (technique.accuracy / 100);

    // PP 考虑（PP 越少，优先级越低）
    score *= (technique.pp / 35);

    // 技能优先级修正
    score += (technique.priority || 0) * 5;

    return {
      techniqueId: technique.slug,
      technique,
      score,
      expectedDamage,
      targetId: target.id,
    };
  }

  /**
   * 选择攻击目标
   */
  private selectTarget(_unit: BattleUnit, battleState: BattleState): string {
    const alivePlayers = battleState.playerParty.filter(u => !u.isFainted);
    if (alivePlayers.length === 0) {
      return '';
    }

    // 根据难度选择目标
    switch (this.currentDifficulty) {
      case AIDifficulty.EASY:
        // 简单：随机选择
        return alivePlayers[Math.floor(Math.random() * alivePlayers.length)].id;

      case AIDifficulty.MEDIUM:
      case AIDifficulty.HARD:
        // 中等/困难：优先选择血量最低的或属性被克制的
        // 首先检查是否有被克制的目标
        const weaknesses = this.playerWeaknesses.get(alivePlayers[0]?.id || '') || [];

        if (weaknesses.length > 0) {
          for (const player of alivePlayers) {
            if (player.elements.some(e => weaknesses.includes(e as ElementType))) {
              return player.id;
            }
          }
        }

        // 否则选择血量最低的
        const weakest = alivePlayers.reduce((min, p) =>
          p.currentHp / p.maxHp < min.currentHp / min.maxHp ? p : min
        );
        return weakest.id;

      default:
        return alivePlayers[Math.floor(Math.random() * alivePlayers.length)].id;
    }
  }

  /**
   * 决定是否使用道具
   */
  private decideItemUsage(unit: BattleUnit, _battleState: BattleState): ItemDecision {
    const hpPercent = unit.currentHp / unit.maxHp;

    // 根据难度决定道具使用阈值
    let healThreshold = 0.3; // 默认 30% 以下使用

    switch (this.currentDifficulty) {
      case AIDifficulty.EASY:
        healThreshold = 0.2; // 简单：20% 以下
        break;
      case AIDifficulty.MEDIUM:
        healThreshold = 0.3; // 中等：30% 以下
        break;
      case AIDifficulty.HARD:
        healThreshold = 0.5; // 困难：50% 以下
        break;
    }

    // 血量低于阈值且没有负面状态时考虑使用恢复道具
    if (hpPercent < healThreshold && !unit.status.includes('poison') && !unit.status.includes('burn')) {
      // 假设 AI 有恢复道具（实际应该从背包检查）
      // 这里简化处理，返回道具决策
      return {
        shouldUse: true,
        itemId: 'potion', // 示例道具 ID
        targetId: unit.id,
      };
    }

    return { shouldUse: false };
  }

  /**
   * 决定是否切换怪物
   */
  private decideSwitch(unit: BattleUnit, battleState: BattleState): SwitchDecision {
    // 获取敌方队伍中其他可用的怪物
    const availableEnemies = battleState.enemyParty.filter(u => !u.isFainted && u.id !== unit.id);
    if (availableEnemies.length === 0) {
      return { shouldSwitch: false };
    }

    const hpPercent = unit.currentHp / unit.maxHp;

    // 根据难度决定切换阈值
    let switchThreshold = 0.2; // 默认 20% 以下

    switch (this.currentDifficulty) {
      case AIDifficulty.EASY:
        switchThreshold = 0.15; // 简单：15% 以下才切换
        break;
      case AIDifficulty.MEDIUM:
        switchThreshold = 0.25; // 中等：25% 以下
        break;
      case AIDifficulty.HARD:
        switchThreshold = 0.35; // 困难：35% 以下
        break;
    }

    // 血量低于阈值且负面状态时考虑切换
    const hasNegativeStatus = unit.status.some(s =>
      ['poison', 'burn', 'paralyze', 'freeze', 'sleep'].includes(s)
    );

    if (hpPercent < switchThreshold || (hasNegativeStatus && hpPercent < 0.5)) {
      // 选择血量最高的替补
      const bestReplacement = availableEnemies.reduce((best, u) =>
        u.currentHp / u.maxHp > best.currentHp / best.maxHp ? u : best
      );

      // 困难难度额外考虑属性克制
      if (this.currentDifficulty === AIDifficulty.HARD) {
        const alivePlayers = battleState.playerParty.filter(u => !u.isFainted);
        if (alivePlayers.length > 0) {
          const playerElement = alivePlayers[0].elements[0] as ElementType;
          const currentHasAdvantage = this.hasTypeAdvantage(unit.elements[0] as ElementType, playerElement);
          const replacementHasAdvantage = this.hasTypeAdvantage(bestReplacement.elements[0] as ElementType, playerElement);

          // 如果替补有属性优势，优先切换
          if (!currentHasAdvantage && replacementHasAdvantage) {
            return {
              shouldSwitch: true,
              switchToId: bestReplacement.id,
              reason: 'type_advantage',
            };
          }
        }
      }

      return {
        shouldSwitch: true,
        switchToId: bestReplacement.id,
        reason: hpPercent < switchThreshold ? 'low_hp' : 'status',
      };
    }

    return { shouldSwitch: false };
  }

  /**
   * 判断是否有属性优势
   */
  private hasTypeAdvantage(attackerType: ElementType, defenderType: ElementType): boolean {
    const effectiveness = this.calculator.getTypeEffectiveness(
      attackerType,
      [defenderType]
    );
    return effectiveness >= 2.0;
  }

  /**
   * 决定是否逃跑
   */
  private decideEscape(unit: BattleUnit, battleState: BattleState): EscapeDecision {
    // 如果战斗不允许逃跑，直接返回
    if (!battleState.canEscape) {
      return { shouldEscape: false, escapeChance: 0 };
    }

    const hpPercent = unit.currentHp / unit.maxHp;

    // 计算基础逃跑成功率
    const escapeChance = 0.3 + (unit.speed / 200);
    const clampedEscapeChance = Math.min(0.9, escapeChance);

    // 根据难度和血量决定逃跑概率
    let shouldEscape = false;

    switch (this.currentDifficulty) {
      case AIDifficulty.EASY:
        // 简单：血量低时逃跑
        if (hpPercent < 0.15) {
          shouldEscape = Math.random() < 0.5;
        }
        break;

      case AIDifficulty.MEDIUM:
        // 中等：血量低且没有优势时逃跑
        if (hpPercent < 0.2) {
          shouldEscape = Math.random() < 0.7;
        }
        break;

      case AIDifficulty.HARD:
        // 困难：计算逃跑收益
        if (hpPercent < 0.3) {
          // 检查是否有替补
          const hasReplacement = battleState.enemyParty.some(u =>
            !u.isFainted && u.id !== unit.id && u.currentHp / u.maxHp > 0.5
          );

          // 没有替补且血量低时逃跑
          if (!hasReplacement) {
            shouldEscape = Math.random() < 0.8;
          }
        }
        break;
    }

    return {
      shouldEscape,
      escapeChance: clampedEscapeChance,
    };
  }

  /**
   * 创建攻击行动
   */
  private createAttackAction(unit: BattleUnit, targetId: string): BattleAction {
    return {
      type: ActionType.ATTACK,
      actorId: unit.id,
      targetIds: [targetId],
      priority: unit.speed,
    };
  }

  /**
   * 创建技能行动
   */
  private createTechniqueAction(unit: BattleUnit, techniqueId: string, targetId: string): BattleAction {
    const technique = techniqueDataLoader.getTechnique(techniqueId);
    return {
      type: ActionType.TECHNIQUE,
      actorId: unit.id,
      targetIds: [targetId],
      techniqueId,
      priority: unit.speed + (technique?.priority || 0),
    };
  }

  /**
   * 创建道具行动
   */
  private createItemAction(unit: BattleUnit, itemId: string, targetId: string): BattleAction {
    return {
      type: ActionType.ITEM,
      actorId: unit.id,
      targetIds: [targetId],
      itemId,
      priority: unit.speed + 5, // 道具优先级较高
    };
  }

  /**
   * 创建切换行动
   */
  private createSwitchAction(unit: BattleUnit, switchToId: string): BattleAction {
    return {
      type: ActionType.SWITCH,
      actorId: unit.id,
      targetIds: [switchToId],
      priority: unit.speed + 10, // 切换优先级最高
    };
  }

  /**
   * 创建逃跑行动
   */
  private createEscapeAction(unit: BattleUnit): BattleAction {
    return {
      type: ActionType.ESCAPE,
      actorId: unit.id,
      targetIds: [],
      priority: unit.speed + 15, // 逃跑优先级最高
    };
  }

  /**
   * 更新玩家弱点记忆
   */
  private updateWeaknessMemory(playerId: string, element: string): void {
    const currentWeaknesses = this.playerWeaknesses.get(playerId) || [];
    if (!currentWeaknesses.includes(element as ElementType)) {
      currentWeaknesses.push(element as ElementType);
      this.playerWeaknesses.set(playerId, currentWeaknesses);
    }
  }

  /**
   * 清除记忆（战斗结束时调用）
   */
  clearMemory(): void {
    this.playerWeaknesses.clear();
    this.lastUsedTechniques.clear();
  }

  /**
   * 查找单位
   */
  private findUnit(unitId: string, battleState: BattleState): BattleUnit | null {
    const allUnits = [...battleState.playerParty, ...battleState.enemyParty];
    return allUnits.find(u => u.id === unitId) || null;
  }
}

/**
 * 导出战斗 AI 单例
 */
export const battleAI = BattleAI.getInstance();
