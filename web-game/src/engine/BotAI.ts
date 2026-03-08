/**
 * 机器人 AI 战斗系统
 *
 * 基于 Tuxemon 的 AI 决策逻辑，增强机器人战斗智能
 *
 * 功能：
 * - 4 种 AI 性格策略（激进型、保守型、平衡型、收集型）
 * - 战斗策略决策树（基于 HP、属性克制、技能 PP 判断）
 * - 自动队伍搭配（根据怪物属性互补）
 * - 学习型 AI（记录玩家常用策略并调整）
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
import { monsterDataLoader } from './MonsterData';

export enum BotPersonalityType {
  AGGRESSIVE = 'aggressive',
  CONSERVATIVE = 'conservative',
  BALANCED = 'balanced',
  COLLECTOR = 'collector',
}

interface TechniqueEvaluation {
  techniqueId: string;
  technique: TechniqueData;
  score: number;
  expectedDamage: number;
  targetId: string;
  typeEffectiveness: number;
}

interface BattleDecision {
  type: 'attack' | 'technique' | 'item' | 'switch' | 'escape' | 'catch';
  targetId?: string;
  techniqueId?: string;
  itemId?: string;
  switchToId?: string;
  reason: string;
  priority: number;
}

interface PlayerStrategyRecord {
  playerId: string;
  techniqueUsage: Map<string, number>;
  preferredTargets: ElementType[];
  itemUsage: Map<string, number>;
  switchFrequency: number;
  totalBattles: number;
}

interface TeamComposition {
  monsterIds: string[];
  totalScore: number;
  typeDistribution: Map<ElementType, number>;
}

export interface BotAIConfig {
  personality: BotPersonalityType;
  enableLearning: boolean;
  learningDecay: number;
  randomness: number;
  maxCompositionIterations: number;
  useAdvancedDecisionTree: boolean;
}

export class BotAI {
  private static instance: BotAI;
  private botConfigs: Map<string, BotAIConfig> = new Map();
  private playerStrategies: Map<string, PlayerStrategyRecord> = new Map();
  private calculator: BattleCalculator;

  private constructor() {
    this.calculator = BattleCalculator.getInstance();
  }

  static getInstance(): BotAI {
    if (!BotAI.instance) {
      BotAI.instance = new BotAI();
    }
    return BotAI.instance;
  }

  initBot(botId: string, config: Partial<BotAIConfig> = {}): void {
    const fullConfig: BotAIConfig = {
      personality: config.personality ?? BotPersonalityType.BALANCED,
      enableLearning: config.enableLearning ?? true,
      learningDecay: config.learningDecay ?? 0.9,
      randomness: config.randomness ?? 0.2,
      maxCompositionIterations: config.maxCompositionIterations ?? 100,
      useAdvancedDecisionTree: config.useAdvancedDecisionTree ?? true,
    };
    this.botConfigs.set(botId, fullConfig);
  }

  generateAction(botId: string, unit: BattleUnit, battleState: BattleState): BattleAction | null {
    if (unit.isFainted) return null;

    const aiConfig = this.botConfigs.get(botId);
    if (!aiConfig) return null;

    let decision: BattleDecision;
    if (aiConfig.useAdvancedDecisionTree) {
      decision = this.advancedDecisionTree(botId, unit, battleState, aiConfig);
    } else {
      decision = this.simpleDecisionTree(unit, battleState, aiConfig);
    }

    if (Math.random() < aiConfig.randomness) {
      decision = this.randomDecision(unit, battleState);
    }

    return this.createActionFromDecision(unit, decision);
  }

  private advancedDecisionTree(
    _botId: string,
    unit: BattleUnit,
    battleState: BattleState,
    config: BotAIConfig
  ): BattleDecision {
    const playerParty = battleState.playerParty.filter(u => !u.isFainted);
    const enemyParty = battleState.enemyParty.filter(u => !u.isFainted && u.id !== unit.id);
    const hpPercent = unit.currentHp / unit.maxHp;
    const avgPlayerHp = this.calculateAverageHp(playerParty);
    const avgEnemyHp = this.calculateAverageHp([...enemyParty, unit]);
    const target = this.findMostDangerousOpponent(playerParty, unit);

    switch (config.personality) {
      case BotPersonalityType.AGGRESSIVE:
        return this.aggressiveDecision(unit, battleState, target, hpPercent, enemyParty);
      case BotPersonalityType.CONSERVATIVE:
        return this.conservativeDecision(unit, battleState, target, hpPercent, enemyParty);
      case BotPersonalityType.COLLECTOR:
        return this.collectorDecision(unit, battleState, target, hpPercent);
      default:
        return this.balancedDecision(unit, battleState, target, hpPercent, enemyParty, avgPlayerHp, avgEnemyHp);
    }
  }

  private aggressiveDecision(
    unit: BattleUnit,
    battleState: BattleState,
    target: BattleUnit | null,
    hpPercent: number,
    enemyParty: BattleUnit[]
  ): BattleDecision {
    if (hpPercent < 0.1 && enemyParty.length > 0) {
      const bestSwitch = this.findBestSwitchTarget(enemyParty, unit, battleState);
      return { type: 'switch', switchToId: bestSwitch.id, reason: 'HP 极低切换', priority: 50 };
    }

    const evaluations = this.evaluateAllTechniques(unit, battleState);
    if (evaluations.length === 0) {
      return { type: 'attack', targetId: target?.id || '', reason: '普通攻击', priority: 30 };
    }

    evaluations.sort((a, b) => b.expectedDamage - a.expectedDamage);
    const idx = Math.random() < 0.8 ? 0 : 1;
    return {
      type: 'technique',
      techniqueId: evaluations[idx].techniqueId,
      targetId: evaluations[idx].targetId,
      reason: '最高伤害技能',
      priority: 100,
    };
  }

  private conservativeDecision(
    unit: BattleUnit,
    battleState: BattleState,
    target: BattleUnit | null,
    hpPercent: number,
    enemyParty: BattleUnit[]
  ): BattleDecision {
    const healingTechniques = unit.techniques.filter(id => {
      const tech = techniqueDataLoader.getTechnique(id);
      return tech && tech.effects.some(e => e.type === 'heal');
    });

    if (hpPercent < 0.7 && healingTechniques.length > 0) {
      return { type: 'technique', techniqueId: healingTechniques[0], targetId: unit.id, reason: '回复 HP', priority: 90 };
    }

    if (hpPercent < 0.5) {
      if (enemyParty.length > 0) {
        const bestSwitch = this.findBestSwitchTarget(enemyParty, unit, battleState);
        if (bestSwitch.currentHp / bestSwitch.maxHp > 0.6) {
          return { type: 'switch', switchToId: bestSwitch.id, reason: '切换怪物', priority: 85 };
        }
      }
      if (battleState.canEscape) {
        return { type: 'escape', reason: '尝试撤退', priority: 80 };
      }
    }

    const evaluations = this.evaluateAllTechniques(unit, battleState);
    if (evaluations.length > 0) {
      evaluations.sort((a, b) => b.technique.accuracy - a.technique.accuracy);
      return {
        type: 'technique',
        techniqueId: evaluations[0].techniqueId,
        targetId: evaluations[0].targetId,
        reason: '高命中技能',
        priority: 60,
      };
    }

    return { type: 'attack', targetId: target?.id || '', reason: '普通攻击', priority: 50 };
  }

  private balancedDecision(
    unit: BattleUnit,
    battleState: BattleState,
    target: BattleUnit | null,
    hpPercent: number,
    enemyParty: BattleUnit[],
    avgPlayerHp: number,
    avgEnemyHp: number
  ): BattleDecision {
    const advantage = avgEnemyHp - avgPlayerHp;

    if (advantage > 0.3) {
      const evaluations = this.evaluateAllTechniques(unit, battleState);
      if (evaluations.length > 0) {
        evaluations.sort((a, b) => b.typeEffectiveness - a.typeEffectiveness);
        return {
          type: 'technique',
          techniqueId: evaluations[0].techniqueId,
          targetId: evaluations[0].targetId,
          reason: '克制技能',
          priority: 80,
        };
      }
    }

    if (advantage < -0.3 && hpPercent < 0.4 && enemyParty.length > 0) {
      const bestSwitch = this.findBestSwitchTarget(enemyParty, unit, battleState);
      return { type: 'switch', switchToId: bestSwitch.id, reason: '切换怪物', priority: 75 };
    }

    const evaluations = this.evaluateAllTechniques(unit, battleState);
    if (evaluations.length > 0) {
      evaluations.sort((a, b) => {
        const scoreA = a.expectedDamage * a.typeEffectiveness * (a.technique.accuracy / 100);
        const scoreB = b.expectedDamage * b.typeEffectiveness * (b.technique.accuracy / 100);
        return scoreB - scoreA;
      });
      return {
        type: 'technique',
        techniqueId: evaluations[0].techniqueId,
        targetId: evaluations[0].targetId,
        reason: '综合最优',
        priority: 65,
      };
    }

    return { type: 'attack', targetId: target?.id || '', reason: '普通攻击', priority: 50 };
  }

  private collectorDecision(
    unit: BattleUnit,
    battleState: BattleState,
    target: BattleUnit | null,
    hpPercent: number
  ): BattleDecision {
    if (target && hpPercent > 0.3) {
      const evaluations = this.evaluateAllTechniques(unit, battleState);
      const safe = evaluations.filter(e => target.currentHp > e.expectedDamage * 1.5);
      if (safe.length > 0) {
        safe.sort((a, b) => b.expectedDamage - a.expectedDamage);
        return {
          type: 'technique',
          techniqueId: safe[0].techniqueId,
          targetId: target.id,
          reason: '削弱目标',
          priority: 85,
        };
      }
    }

    if (target && hpPercent <= 0.3 && target.currentHp <= target.maxHp * 0.3) {
      return { type: 'catch', targetId: target.id, reason: '捕捉怪物', priority: 90 };
    }

    const evaluations = this.evaluateAllTechniques(unit, battleState);
    if (evaluations.length > 0) {
      return {
        type: 'technique',
        techniqueId: evaluations[0].techniqueId,
        targetId: evaluations[0].targetId,
        reason: '最优技能',
        priority: 60,
      };
    }

    return { type: 'attack', targetId: target?.id || '', reason: '普通攻击', priority: 50 };
  }

  private simpleDecisionTree(unit: BattleUnit, _battleState: BattleState, _config: BotAIConfig): BattleDecision {
    const hpPercent = unit.currentHp / unit.maxHp;
    const target = this.selectTarget(unit, _battleState);

    if (hpPercent < 0.3) {
      return { type: 'item', itemId: 'potion', targetId: unit.id, reason: '使用道具', priority: 80 };
    }

    const evaluations = this.evaluateAllTechniques(unit, _battleState);
    if (evaluations.length > 0) {
      return {
        type: 'technique',
        techniqueId: evaluations[0].techniqueId,
        targetId: evaluations[0].targetId,
        reason: '最优技能',
        priority: 70,
      };
    }

    return { type: 'attack', targetId: target.id, reason: '普通攻击', priority: 50 };
  }

  private randomDecision(unit: BattleUnit, _battleState: BattleState): BattleDecision {
    const available = unit.techniques.filter(id => techniqueDataLoader.getTechnique(id) !== null);

    if (available.length > 0 && Math.random() < 0.7) {
      const rand = available[Math.floor(Math.random() * available.length)];
      const target = this.selectTarget(unit, _battleState);
      return { type: 'technique', techniqueId: rand, targetId: target.id, reason: '随机决策', priority: 50 };
    }

    return { type: 'attack', reason: '随机攻击', priority: 40 };
  }

  private evaluateAllTechniques(unit: BattleUnit, _battleState: BattleState): TechniqueEvaluation[] {
    const evaluations: TechniqueEvaluation[] = [];

    for (const techniqueId of unit.techniques) {
      const technique = techniqueDataLoader.getTechnique(techniqueId);
      if (!technique) continue;

      for (const target of _battleState.playerParty) {
        if (target.isFainted) continue;
        evaluations.push(this.evaluateTechnique(unit, technique, target, _battleState));
      }
    }

    evaluations.sort((a, b) => b.score - a.score);
    return evaluations;
  }

  private evaluateTechnique(
    attacker: BattleUnit,
    technique: TechniqueData,
    target: BattleUnit,
    _battleState: BattleState
  ): TechniqueEvaluation {
    let score = 0;
    let expectedDamage = 0;
    let typeEffectiveness = 1.0;

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
        isPhysical,
        accuracyBonus: technique.accuracy,
      });

      expectedDamage = damageResult.damage;
      typeEffectiveness = damageResult.typeEffectiveness;
      score += expectedDamage;

      if (typeEffectiveness >= 2.0) {
        score += 50;
      } else if (typeEffectiveness <= 0.5 && typeEffectiveness > 0) {
        score -= 30;
      }
    }

    for (const effect of technique.effects) {
      if (effect.type === 'status_apply') {
        if (!target.status.includes(effect.statusId || '')) {
          score += effect.chance || 30;
        }
      } else if (effect.type === 'heal') {
        const hpPercent = attacker.currentHp / attacker.maxHp;
        score += (1 - hpPercent) * 40;
      }
    }

    score *= (technique.accuracy / 100);
    score *= Math.max(0.1, technique.pp / 35);
    score += (technique.priority || 0) * 5;

    return {
      techniqueId: technique.slug,
      technique,
      score,
      expectedDamage,
      targetId: target.id,
      typeEffectiveness,
    };
  }

  private selectTarget(_unit: BattleUnit, _battleState: BattleState): BattleUnit {
    const alive = _battleState.playerParty.filter(u => !u.isFainted);
    if (alive.length === 0) return alive[0];
    return alive.reduce((min, p) => p.currentHp / p.maxHp < min.currentHp / min.maxHp ? p : min);
  }

  private findMostDangerousOpponent(opponents: BattleUnit[], self: BattleUnit): BattleUnit | null {
    if (opponents.length === 0) return null;

    const myElement = self.elements[0] as ElementType;
    let mostDangerous: BattleUnit | null = null;
    let highestScore = -Infinity;

    for (const opponent of opponents) {
      const opponentElement = opponent.elements[0] as ElementType;
      const effectiveness = this.calculator.getTypeEffectiveness(opponentElement, [myElement]);
      const threatScore = effectiveness * opponent.attack * (opponent.level / 100);

      if (threatScore > highestScore) {
        highestScore = threatScore;
        mostDangerous = opponent;
      }
    }

    return mostDangerous || opponents[0];
  }

  private findBestSwitchTarget(candidates: BattleUnit[], current: BattleUnit, _battleState: BattleState): BattleUnit {
    if (candidates.length === 0) return current;

    const playerParty = _battleState.playerParty.filter(u => !u.isFainted);
    if (playerParty.length > 0) {
      const playerElement = playerParty[0].elements[0] as ElementType;
      let bestCandidate: BattleUnit | null = null;
      let highestAdvantage = -Infinity;

      for (const candidate of candidates) {
        const candidateElement = candidate.elements[0] as ElementType;
        const effectiveness = this.calculator.getTypeEffectiveness(candidateElement, [playerElement]);
        const hpFactor = candidate.currentHp / candidate.maxHp;
        const totalScore = effectiveness * 100 + hpFactor * 50;

        if (totalScore > highestAdvantage) {
          highestAdvantage = totalScore;
          bestCandidate = candidate;
        }
      }

      if (bestCandidate) return bestCandidate;
    }

    return candidates.reduce((best, u) => u.currentHp / u.maxHp > best.currentHp / best.maxHp ? u : best);
  }

  private calculateAverageHp(units: BattleUnit[]): number {
    if (units.length === 0) return 0;
    const total = units.reduce((sum, u) => sum + (u.currentHp / u.maxHp), 0);
    return total / units.length;
  }

  private createActionFromDecision(unit: BattleUnit, decision: BattleDecision): BattleAction | null {
    const targetId = decision.targetId || this.selectTarget(unit, {} as BattleState).id;

    switch (decision.type) {
      case 'attack':
        return { type: ActionType.ATTACK, actorId: unit.id, targetIds: [targetId], priority: unit.speed };

      case 'technique':
        const tech = techniqueDataLoader.getTechnique(decision.techniqueId!);
        return {
          type: ActionType.TECHNIQUE,
          actorId: unit.id,
          targetIds: [targetId],
          techniqueId: decision.techniqueId,
          priority: unit.speed + (tech?.priority || 0),
        };

      case 'item':
        return {
          type: ActionType.ITEM,
          actorId: unit.id,
          targetIds: [decision.targetId || unit.id],
          itemId: decision.itemId,
          priority: unit.speed + 5,
        };

      case 'switch':
        return {
          type: ActionType.SWITCH,
          actorId: unit.id,
          targetIds: [decision.switchToId!],
          priority: unit.speed + 10,
        };

      case 'escape':
        return { type: ActionType.ESCAPE, actorId: unit.id, targetIds: [], priority: unit.speed + 15 };

      case 'catch':
        return {
          type: ActionType.ITEM,
          actorId: unit.id,
          targetIds: [decision.targetId!],
          itemId: 'pokeball',
          priority: unit.speed + 8,
        };

      default:
        return null;
    }
  }

  recordPlayerStrategy(playerId: string, techniqueId: string, targetElement: ElementType): void {
    let strategy = this.playerStrategies.get(playerId);
    if (!strategy) {
      strategy = {
        playerId,
        techniqueUsage: new Map(),
        preferredTargets: [],
        itemUsage: new Map(),
        switchFrequency: 0,
        totalBattles: 0,
      };
      this.playerStrategies.set(playerId, strategy);
    }

    const usage = strategy.techniqueUsage.get(techniqueId) || 0;
    strategy.techniqueUsage.set(techniqueId, usage + 1);

    if (!strategy.preferredTargets.includes(targetElement)) {
      strategy.preferredTargets.push(targetElement);
    }

    strategy.totalBattles++;
  }

  optimizeTeamComposition(availableMonsters: string[], teamSize = 6): TeamComposition | null {
    if (availableMonsters.length < teamSize) return null;

    let bestComposition: TeamComposition | null = null;
    let bestScore = -Infinity;

    for (let i = 0; i < 100; i++) {
      const shuffled = [...availableMonsters].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, teamSize);
      const score = this.evaluateTeamComposition(selected);

      if (score > bestScore) {
        bestScore = score;
        bestComposition = {
          monsterIds: selected,
          totalScore: score,
          typeDistribution: this.calculateTypeDistribution(selected),
        };
      }
    }

    return bestComposition;
  }

  private evaluateTeamComposition(monsterIds: string[]): number {
    const typeDistribution = this.calculateTypeDistribution(monsterIds);
    const diversityScore = typeDistribution.size * 20;
    const synergyScore = this.calculateTypeSynergy(typeDistribution);
    const abilityScore = this.calculateTeamAbility(monsterIds);
    return diversityScore + synergyScore + abilityScore;
  }

  private calculateTypeDistribution(monsterIds: string[]): Map<ElementType, number> {
    const distribution = new Map<ElementType, number>();

    for (const monsterId of monsterIds) {
      const monster = monsterDataLoader.getMonster(monsterId);
      if (monster && monster.types.length > 0) {
        const type = monster.types[0] as ElementType;
        const count = distribution.get(type) || 0;
        distribution.set(type, count + 1);
      }
    }

    return distribution;
  }

  private calculateTypeSynergy(typeDistribution: Map<ElementType, number>): number {
    const types = Array.from(typeDistribution.keys());
    let synergyScore = 0;

    for (let i = 0; i < types.length; i++) {
      for (let j = i + 1; j < types.length; j++) {
        const effectiveness = this.calculator.getTypeEffectiveness(types[i], [types[j]]);
        const reverseEffectiveness = this.calculator.getTypeEffectiveness(types[j], [types[i]]);

        if (effectiveness >= 2.0 && reverseEffectiveness <= 0.5) {
          synergyScore += 15;
        }
      }
    }

    return synergyScore;
  }

  private calculateTeamAbility(monsterIds: string[]): number {
    let totalAbility = 0;

    for (const monsterId of monsterIds) {
      const monster = monsterDataLoader.getMonster(monsterId);
      if (monster) {
        totalAbility += (monster.hp + monster.attack + monster.defense + monster.speed) / 100;
      }
    }

    return totalAbility;
  }

  getBotConfig(botId: string): BotAIConfig | undefined {
    return this.botConfigs.get(botId);
  }

  setBotConfig(botId: string, config: Partial<BotAIConfig>): void {
    const currentConfig = this.botConfigs.get(botId);
    if (currentConfig) {
      this.botConfigs.set(botId, { ...currentConfig, ...config });
    }
  }

  removeBot(botId: string): void {
    this.botConfigs.delete(botId);
  }

  clearMemories(): void {
    this.playerStrategies.clear();
  }

  reset(): void {
    this.botConfigs.clear();
    this.playerStrategies.clear();
  }
}

export const botAI = BotAI.getInstance();
