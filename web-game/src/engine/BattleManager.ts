/**
 * 战斗管理器 - 管理回合制战斗系统
 * 
 * 功能：
 * - 管理战斗流程（初始化、进行、结束）
 * - 处理行动队列和优先级
 * - 计算伤害和效果
 * - 管理战斗事件和日志
 */

import {
  BattlePhase,
  BattleResult,
  ActionType,
  BattleUnit,
  BattleAction,
  BattleEvent,
  BattleState,
} from './BattleState';
import { monsterDataLoader as _monsterDataLoader } from './MonsterData';
import { techniqueDataLoader as _techniqueDataLoader } from './TechniqueData';
import { experienceSystem } from './ExperienceSystem';

/**
 * 战斗配置接口
 */
export interface BattleConfig {
  /** 可逃跑 */
  canEscape?: boolean;
  /** 战斗背景 */
  background?: string;
  /** 战斗音乐 */
  bgm?: string;
  /** AI 难度 (0-1) */
  aiDifficulty?: number;
}

/**
 * 战斗回调
 */
export type BattleCallback = (event: BattleEvent, state: BattleState) => void;

/**
 * 战斗管理器类
 */
export class BattleManager {
  private static instance: BattleManager;

  /** 当前战斗状态 */
  private battleState: BattleState | null = null;

  /** 战斗回调列表 */
  private callbacks: BattleCallback[] = [];

  /** 战斗 ID 计数器 */
  private battleIdCounter: number = 0;

  /**
   * 私有构造函数，确保单例
   */
  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): BattleManager {
    if (!BattleManager.instance) {
      BattleManager.instance = new BattleManager();
    }
    return BattleManager.instance;
  }

  /**
   * 开始战斗
   */
  startBattle(
    playerParty: BattleUnit[],
    enemyParty: BattleUnit[],
    config: BattleConfig = {}
  ): BattleState {
    this.battleIdCounter++;
    
    this.battleState = {
      battleId: `battle_${this.battleIdCounter}`,
      phase: BattlePhase.PREPARE,
      result: BattleResult.ONGOING,
      turn: 0,
      playerParty: [...playerParty],
      enemyParty: [...enemyParty],
      currentPlayerIndex: 0,
      currentEnemyIndex: 0,
      actionQueue: [],
      eventLog: [],
      canEscape: config.canEscape ?? true,
      background: config.background || 'grassland',
      bgm: config.bgm || 'battle_normal',
    };

    // 触发战斗开始事件
    this.emitEvent({
      type: 'damage',
      text: '战斗开始！',
    });

    // 进入选择行动阶段
    this.battleState.phase = BattlePhase.SELECT_ACTION;
    
    console.log(`[BattleManager] Battle started: ${this.battleState.battleId}`);
    return this.battleState;
  }

  /**
   * 获取当前战斗状态
   */
  getBattleState(): BattleState | null {
    return this.battleState;
  }

  /**
   * 是否在战斗中
   */
  isInBattle(): boolean {
    return this.battleState !== null && this.battleState.result === BattleResult.ONGOING;
  }

  /**
   * 提交玩家行动
   */
  submitAction(action: BattleAction): boolean {
    if (!this.battleState || this.battleState.phase !== BattlePhase.SELECT_ACTION) {
      console.warn('[BattleManager] Cannot submit action: invalid phase');
      return false;
    }

    // 添加到行动队列
    this.battleState.actionQueue.push(action);
    console.log(`[BattleManager] Action submitted: ${action.type} by ${action.actorId}`);

    // 检查是否所有单位都已选择行动
    const alivePlayers = this.battleState.playerParty.filter(u => !u.isFainted);
    if (this.battleState.actionQueue.length >= alivePlayers.length) {
      // 生成敌方 AI 行动
      this.generateEnemyActions();
      
      // 执行行动队列
      this.executeActionQueue();
    }

    return true;
  }

  /**
   * 生成敌方 AI 行动
   */
  private generateEnemyActions(): void {
    if (!this.battleState) return;

    for (const enemy of this.battleState.enemyParty) {
      if (enemy.isFainted) continue;

      // 简单 AI：随机选择攻击或技能
      const action: BattleAction = {
        type: Math.random() > 0.3 ? ActionType.ATTACK : ActionType.TECHNIQUE,
        actorId: enemy.id,
        targetIds: [this.getRandomPlayerTarget()],
        priority: enemy.speed,
      };

      // 如果使用技能，随机选择一个技能
      if (action.type === ActionType.TECHNIQUE && enemy.techniques.length > 0) {
        action.techniqueId = enemy.techniques[Math.floor(Math.random() * enemy.techniques.length)];
      }

      this.battleState.actionQueue.push(action);
    }
  }

  /**
   * 获取随机玩家目标
   */
  private getRandomPlayerTarget(): string {
    if (!this.battleState) return '';
    
    const alivePlayers = this.battleState.playerParty.filter(u => !u.isFainted);
    if (alivePlayers.length === 0) return '';
    
    const target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
    return target.id;
  }

  /**
   * 执行行动队列
   */
  private executeActionQueue(): void {
    if (!this.battleState) return;

    // 按优先级排序（速度快的先行动）
    this.battleState.actionQueue.sort((a, b) => b.priority - a.priority);

    this.battleState.phase = BattlePhase.EXECUTE_ACTION;
    
    // 执行每个行动
    for (const action of this.battleState.actionQueue) {
      this.executeAction(action);
    }

    // 清空行动队列
    this.battleState.actionQueue = [];

    // 回合结束处理
    this.endTurn();
  }

  /**
   * 执行单个行动
   */
  private executeAction(action: BattleAction): void {
    if (!this.battleState) return;

    const actor = this.findUnit(action.actorId);
    if (!actor || actor.isFainted) return;

    switch (action.type) {
      case ActionType.ATTACK:
        this.executeAttack(actor, action.targetIds);
        break;

      case ActionType.TECHNIQUE:
        if (action.techniqueId) {
          this.executeTechnique(actor, action.techniqueId, action.targetIds);
        }
        break;

      case ActionType.ITEM:
        // TODO: 实现道具使用
        break;

      case ActionType.SWITCH:
        // TODO: 实现怪物交换
        break;

      case ActionType.ESCAPE:
        this.tryEscape(actor);
        break;
    }
  }

  /**
   * 执行普通攻击
   */
  private executeAttack(actor: BattleUnit, targetIds: string[]): void {
    if (!this.battleState) return;

    for (const targetId of targetIds) {
      const target = this.findUnit(targetId);
      if (!target || target.isFainted) continue;

      // 计算伤害
      const damage = this.calculateDamage(actor, target, 40, 'normal');
      target.currentHp = Math.max(0, target.currentHp - damage);

      // 触发伤害事件
      this.emitEvent({
        type: 'damage',
        sourceId: actor.id,
        targetId: target.id,
        value: damage,
        text: `${actor.name} 对 ${target.name} 造成了 ${damage} 点伤害！`,
      });

      // 检查是否阵亡
      if (target.currentHp <= 0) {
        target.isFainted = true;
        this.emitEvent({
          type: 'faint',
          targetId: target.id,
          text: `${target.name} 倒下了！`,
        });
      }
    }
  }

  /**
   * 执行技能
   */
  private executeTechnique(actor: BattleUnit, techniqueId: string, targetIds: string[]): void {
    if (!this.battleState) return;

    // 从 TechniqueDataLoader 加载技能数据
    const technique = _techniqueDataLoader.getTechnique(techniqueId);
    if (!technique) {
      console.warn(`[BattleManager] Technique not found: ${techniqueId}`);
      return;
    }

    for (const targetId of targetIds) {
      const target = this.findUnit(targetId);
      if (!target || target.isFainted) continue;

      // 计算技能伤害
      const damage = this.calculateDamage(
        actor,
        target,
        technique.power || 50,
        technique.element || 'normal'
      );
      target.currentHp = Math.max(0, target.currentHp - damage);

      // 触发技能事件
      this.emitEvent({
        type: 'damage',
        sourceId: actor.id,
        targetId: target.id,
        techniqueId: techniqueId,
        value: damage,
        text: `${actor.name} 使用了 ${technique.name}！造成 ${damage} 点伤害！`,
      });

      // 检查是否阵亡
      if (target.currentHp <= 0) {
        target.isFainted = true;
        this.emitEvent({
          type: 'faint',
          targetId: target.id,
          text: `${target.name} 倒下了！`,
        });
      }
    }
  }

  /**
   * 计算伤害
   */
  private calculateDamage(
    attacker: BattleUnit,
    defender: BattleUnit,
    power: number,
    element: string
  ): number {
    // 简化的伤害公式
    // 伤害 = (攻击力 * 技能威力 * 等级系数) / (防御力 * 2)
    const levelFactor = (2 * attacker.level / 5 + 2);
    const baseDamage = (attacker.attack * power * levelFactor) / (defender.defense * 2);
    
    // 添加随机波动 (85% - 100%)
    const randomFactor = 0.85 + Math.random() * 0.15;
    
    // 属性克制（简化实现）
    const elementFactor = this.getElementFactor(element, defender.elements);
    
    const finalDamage = Math.floor(baseDamage * randomFactor * elementFactor);
    return Math.max(1, finalDamage);
  }

  /**
   * 获取属性克制系数
   */
  private getElementFactor(attackElement: string, defenseElements: string[]): number {
    // TODO: 实现完整的属性克制表
    // 简化实现：火克草、水克火、草克水
    const counterTable: Record<string, string[]> = {
      'fire': ['grass'],
      'water': ['fire'],
      'grass': ['water'],
      'earth': ['electric'],
      'electric': ['water'],
    };

    const countered = counterTable[attackElement] || [];
    for (const defElement of defenseElements) {
      if (countered.includes(defElement)) {
        return 2.0; // 克制，双倍伤害
      }
    }

    return 1.0; // 正常伤害
  }

  /**
   * 尝试逃跑
   */
  private tryEscape(actor: BattleUnit): void {
    if (!this.battleState || !this.battleState.canEscape) {
      this.emitEvent({
        type: 'escape',
        text: '无法逃跑！',
      });
      return;
    }

    // 逃跑成功率基于速度
    const escapeChance = 0.3 + (actor.speed / 200);
    if (Math.random() < escapeChance) {
      this.battleState.result = BattleResult.ESCAPE;
      this.emitEvent({
        type: 'escape',
        text: '逃跑成功！',
      });
      this.endBattle();
    } else {
      this.emitEvent({
        type: 'escape',
        text: '逃跑失败！',
      });
    }
  }

  /**
   * 回合结束处理
   */
  private endTurn(): void {
    if (!this.battleState) return;

    this.battleState.turn++;
    
    // 检查战斗结果
    const result = this.checkBattleResult();
    if (result !== BattleResult.ONGOING) {
      this.battleState.result = result;
      this.battleState.phase = BattlePhase.BATTLE_END;
      this.endBattle();
      return;
    }

    // 处理状态效果（中毒、灼烧等）
    this.processStatusEffects();

    // 进入下一回合的选择行动阶段
    this.battleState.phase = BattlePhase.SELECT_ACTION;
    
    console.log(`[BattleManager] Turn ${this.battleState.turn} ended`);
  }

  /**
   * 处理状态效果
   */
  private processStatusEffects(): void {
    if (!this.battleState) return;

    const allUnits = [...this.battleState.playerParty, ...this.battleState.enemyParty];
    
    for (const unit of allUnits) {
      if (unit.isFainted) continue;

      for (const status of unit.status) {
        switch (status) {
          case 'poison':
            // 中毒：每回合损失 1/8 HP
            const poisonDamage = Math.floor(unit.maxHp / 8);
            unit.currentHp = Math.max(0, unit.currentHp - poisonDamage);
            this.emitEvent({
              type: 'damage',
              targetId: unit.id,
              statusId: 'poison',
              value: poisonDamage,
              text: `${unit.name} 受到了 ${poisonDamage} 点毒素伤害！`,
            });
            break;

          case 'burn':
            // 灼烧：每回合损失 1/16 HP
            const burnDamage = Math.floor(unit.maxHp / 16);
            unit.currentHp = Math.max(0, unit.currentHp - burnDamage);
            this.emitEvent({
              type: 'damage',
              targetId: unit.id,
              statusId: 'burn',
              value: burnDamage,
              text: `${unit.name} 受到了 ${burnDamage} 点灼烧伤害！`,
            });
            break;
        }

        // 检查是否阵亡
        if (unit.currentHp <= 0) {
          unit.isFainted = true;
          this.emitEvent({
            type: 'faint',
            targetId: unit.id,
            text: `${unit.name} 倒下了！`,
          });
        }
      }
    }
  }

  /**
   * 检查战斗结果
   */
  private checkBattleResult(): BattleResult {
    if (!this.battleState) return BattleResult.ONGOING;

    const alivePlayers = this.battleState.playerParty.filter(u => !u.isFainted);
    const aliveEnemies = this.battleState.enemyParty.filter(u => !u.isFainted);

    if (alivePlayers.length === 0) {
      return BattleResult.LOSE;
    }

    if (aliveEnemies.length === 0) {
      return BattleResult.WIN;
    }

    return BattleResult.ONGOING;
  }

  /**
   * 结束战斗
   */
  private endBattle(): void {
    if (!this.battleState) return;

    console.log(`[BattleManager] Battle ended: ${this.battleState.result}`);
    
    // 如果胜利，给予经验值
    if (this.battleState.result === BattleResult.WIN) {
      this.grantExperience();
    }
  }

  /**
   * 给予经验值
   */
  private grantExperience(): void {
    if (!this.battleState) return;

    // 使用 ExperienceSystem 处理经验值获取
    const alivePlayers = this.battleState.playerParty.filter(u => !u.isFainted);

    for (const unit of alivePlayers) {
      // 计算从每个敌人获得的 experience
      for (const enemy of this.battleState.enemyParty) {
        if (enemy.isFainted) {
          // 击败敌人获得经验值
          const expGained = experienceSystem.calculateExpGained(
            enemy,
            unit.level,
            alivePlayers.length
          );

          // 获取怪物基础数据（用于属性成长）
          const monsterData = _monsterDataLoader.getMonster(unit.monsterId) || undefined;

          // 处理经验值获取（包含升级检查）
          const result = experienceSystem.processExperienceGain(
            unit,
            expGained,
            monsterData
          );

          // 发送经验事件
          this.emitEvent({
            type: 'exp_gain',
            targetId: unit.id,
            value: expGained,
            text: `${unit.name} 获得了 ${expGained} 点经验值！`,
          });

          // 如果学习了新技能，发送技能学习事件
          for (const learned of result.learnedTechniques) {
            this.emitEvent({
              type: 'damage',
              targetId: unit.id,
              text: `${unit.name} 学会了 ${learned.techniqueName}！`,
            });
          }
        }
      }
    }
  }

  /**
   * 查找单位
   */
  private findUnit(unitId: string): BattleUnit | null {
    if (!this.battleState) return null;

    const allUnits = [...this.battleState.playerParty, ...this.battleState.enemyParty];
    return allUnits.find(u => u.id === unitId) || null;
  }

  /**
   * 发送事件
   */
  private emitEvent(event: BattleEvent): void {
    if (!this.battleState) return;

    this.battleState.eventLog.push(event);
    
    // 触发所有回调
    for (const callback of this.callbacks) {
      callback(event, this.battleState);
    }
  }

  /**
   * 注册战斗回调
   */
  onBattleEvent(callback: BattleCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * 移除战斗回调
   */
  offBattleEvent(callback: BattleCallback): void {
    const index = this.callbacks.indexOf(callback);
    if (index !== -1) {
      this.callbacks.splice(index, 1);
    }
  }

  /**
   * 清除战斗状态
   */
  clearBattle(): void {
    this.battleState = null;
    console.log('[BattleManager] Battle cleared');
  }
}

/**
 * 导出战斗管理器单例
 */
export const battleManager = BattleManager.getInstance();
