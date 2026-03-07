/**
 * 战斗回合制流程控制器
 *
 * 基于 Tuxemon 的战斗流程控制系统
 *
 * 功能：
 * - 回合阶段枚举（选择、执行、结算、结束）
 * - 速度排序逻辑（决定行动顺序）
 * - 技能选择阶段（玩家/AI）
 * - 技能执行阶段（动画 + 伤害计算）
 * - 回合结算阶段（状态伤害、回合结束效果）
 * - 战斗结束判定（一方全倒）
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
import { BattleCalculator, DamageResult, ElementType } from './BattleCalculator';
import { StatusEffectManager } from './StatusEffectManager';
import { TechniqueData, TechniqueCategory } from './TechniqueData';

/**
 * 回合阶段枚举（更详细的阶段划分）
 */
export enum TurnPhase {
  /** 回合准备 */
  PREPARE = 'prepare',
  /** 选择行动（玩家） */
  SELECT_PLAYER = 'select_player',
  /** 选择行动（AI） */
  SELECT_AI = 'select_ai',
  /** 排序行动队列 */
  SORT_ACTIONS = 'sort_actions',
  /** 执行行动 */
  EXECUTE = 'execute',
  /** 回合结算 */
  END_TURN = 'end_turn',
  /** 检查战斗结果 */
  CHECK_RESULT = 'check_result',
  /** 战斗结束 */
  BATTLE_END = 'battle_end',
}

/**
 * 行动执行结果接口
 */
export interface ActionExecutionResult {
  /** 行动 ID */
  actionId: string;
  /** 是否成功 */
  success: boolean;
  /** 命中结果 */
  hitResult: {
    /** 是否命中 */
    isHit: boolean;
    /** 是否暴击 */
    isCritical: boolean;
    /** 命中率 */
    accuracy: number;
  };
  /** 伤害结果 */
  damageResults: DamageResult[];
  /** 状态效果结果 */
  statusResults: {
    /** 应用的状态 ID */
    statusId: string;
    /** 目标 ID */
    targetId: string;
    /** 是否成功 */
    success: boolean;
  }[];
  /** 治疗结果 */
  healResults: {
    /** 目标 ID */
    targetId: string;
    /** 治疗量 */
    amount: number;
  }[];
  /** 事件日志 */
  events: BattleEvent[];
}

/**
 * 战斗流程控制器类
 */
export class BattleFlowController {
  private static instance: BattleFlowController;

  /** 战斗计算器 */
  private calculator: BattleCalculator;

  /** 状态效果管理器 */
  private statusManager: StatusEffectManager;

  /** 当前回合阶段 */
  private currentTurnPhase: TurnPhase = TurnPhase.PREPARE;

  /** 行动队列 */
  private actionQueue: BattleAction[] = [];

  /** 当前执行的行动索引 */
  private currentActionIndex: number = 0;

  /** 剧毒伤害计数器（每个单位独立） */
  private badPoisonCounters: Map<string, number> = new Map();

  /**
   * 私有构造函数，确保单例
   */
  private constructor() {
    this.calculator = BattleCalculator.getInstance();
    this.statusManager = StatusEffectManager.getInstance();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): BattleFlowController {
    if (!BattleFlowController.instance) {
      BattleFlowController.instance = new BattleFlowController();
    }
    return BattleFlowController.instance;
  }

  /**
   * 开始新回合
   */
  startTurn(battleState: BattleState): void {
    console.log(`[BattleFlowController] Starting turn ${battleState.turn}`);

    // 重置回合阶段
    this.currentTurnPhase = TurnPhase.PREPARE;

    // 清空行动队列
    this.actionQueue = [];
    this.currentActionIndex = 0;

    // 触发回合开始状态效果
    this.triggerTurnStartStatus(battleState);
  }

  /**
   * 进入玩家选择阶段
   */
  enterPlayerSelectPhase(battleState: BattleState): void {
    this.currentTurnPhase = TurnPhase.SELECT_PLAYER;
    battleState.phase = BattlePhase.SELECT_ACTION;

    console.log('[BattleFlowController] Entered player select phase');
  }

  /**
   * 进入 AI 选择阶段
   */
  enterAISelectPhase(battleState: BattleState): void {
    this.currentTurnPhase = TurnPhase.SELECT_AI;

    // 生成敌方 AI 行动
    this.generateEnemyActions(battleState);

    console.log('[BattleFlowController] Entered AI select phase');
  }

  /**
   * 生成敌方 AI 行动
   */
  private generateEnemyActions(battleState: BattleState): void {
    for (const enemy of battleState.enemyParty) {
      if (enemy.isFainted) continue;

      // 简单 AI：随机选择攻击或技能
      const action: BattleAction = {
        type: Math.random() > 0.3 ? ActionType.ATTACK : ActionType.TECHNIQUE,
        actorId: enemy.id,
        targetIds: [this.getRandomPlayerTarget(battleState)],
        priority: enemy.speed,
      };

      // 如果使用技能，随机选择一个技能
      if (action.type === ActionType.TECHNIQUE && enemy.techniques.length > 0) {
        action.techniqueId = enemy.techniques[Math.floor(Math.random() * enemy.techniques.length)];
      }

      this.actionQueue.push(action);
    }
  }

  /**
   * 获取随机玩家目标
   */
  private getRandomPlayerTarget(battleState: BattleState): string {
    const alivePlayers = battleState.playerParty.filter(u => !u.isFainted);
    if (alivePlayers.length === 0) return '';

    const target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
    return target.id;
  }

  /**
   * 提交玩家行动
   */
  submitPlayerAction(action: BattleAction, battleState: BattleState): boolean {
    // 验证行动是否有效
    if (!this.validateAction(action, battleState)) {
      console.warn('[BattleFlowController] Invalid action submitted');
      return false;
    }

    // 添加到行动队列
    this.actionQueue.push(action);

    console.log(`[BattleFlowController] Action submitted: ${action.type} by ${action.actorId}`);

    // 检查是否所有玩家单位都已选择行动
    const alivePlayers = battleState.playerParty.filter(u => !u.isFainted);
    const playerActions = this.actionQueue.filter(a => {
      const actor = this.findUnit(a.actorId, battleState);
      return actor && actor.isPlayer;
    });

    if (playerActions.length >= alivePlayers.length) {
      // 进入 AI 选择阶段
      this.enterAISelectPhase(battleState);
    }

    return true;
  }

  /**
   * 验证行动是否有效
   */
  private validateAction(action: BattleAction, battleState: BattleState): boolean {
    const actor = this.findUnit(action.actorId, battleState);
    if (!actor || actor.isFainted) {
      return false;
    }

    // 检查状态效果是否允许行动
    const statusData = actor.status.map(s => ({
      id: s as any,
      remainingTurns: 0,
      stacks: 1,
      appliedAt: 0,
    }));

    if (!this.statusManager.canAct(statusData)) {
      console.warn('[BattleFlowController] Cannot act due to status effects');
      return false;
    }

    // 检查技能是否有效
    if (action.type === ActionType.TECHNIQUE && action.techniqueId) {
      if (!actor.techniques.includes(action.techniqueId)) {
        console.warn('[BattleFlowController] Unit does not have this technique');
        return false;
      }
    }

    return true;
  }

  /**
   * 排序行动队列
   */
  sortActions(battleState: BattleState): void {
    this.currentTurnPhase = TurnPhase.SORT_ACTIONS;

    // 按优先级排序（速度 + 技能优先级）
    this.actionQueue.sort((a, b) => {
      const actorA = this.findUnit(a.actorId, battleState);
      const actorB = this.findUnit(b.actorId, battleState);

      if (!actorA || !actorB) return 0;

      // 获取技能优先级
      let priorityA = a.priority;
      let priorityB = b.priority;

      if (a.type === ActionType.TECHNIQUE && a.techniqueId) {
        // TODO: 从技能数据获取优先级
      }

      if (b.type === ActionType.TECHNIQUE && b.techniqueId) {
        // TODO: 从技能数据获取优先级
      }

      return priorityB - priorityA;
    });

    console.log('[BattleFlowController] Actions sorted by priority');
  }

  /**
   * 执行行动队列
   */
  async executeActions(
    battleState: BattleState,
    onEvent: (event: BattleEvent) => void
  ): Promise<void> {
    this.currentTurnPhase = TurnPhase.EXECUTE;
    battleState.phase = BattlePhase.EXECUTE_ACTION;

    // 排序行动
    this.sortActions(battleState);

    // 执行每个行动
    for (const action of this.actionQueue) {
      const result = await this.executeAction(action, battleState, onEvent);

      // 发送执行结果事件
      for (const event of result.events) {
        onEvent(event);
      }

      this.currentActionIndex++;

      // 检查战斗是否提前结束
      if (this.checkBattleResult(battleState) !== BattleResult.ONGOING) {
        break;
      }
    }

    // 回合结束处理
    this.endTurn(battleState, onEvent);
  }

  /**
   * 执行单个行动
   */
  private async executeAction(
    action: BattleAction,
    battleState: BattleState,
    _onEvent: (event: BattleEvent) => void
  ): Promise<ActionExecutionResult> {
    const result: ActionExecutionResult = {
      actionId: action.actorId,
      success: false,
      hitResult: {
        isHit: false,
        isCritical: false,
        accuracy: 100,
      },
      damageResults: [],
      statusResults: [],
      healResults: [],
      events: [],
    };

    const actor = this.findUnit(action.actorId, battleState);
    if (!actor || actor.isFainted) {
      return result;
    }

    result.success = true;

    switch (action.type) {
      case ActionType.ATTACK:
        result.events.push(
          await this.executeAttack(actor, action.targetIds, battleState)
        );
        break;

      case ActionType.TECHNIQUE:
        if (action.techniqueId) {
          result.events.push(
            await this.executeTechnique(actor, action.techniqueId, action.targetIds, battleState)
          );
        }
        break;

      case ActionType.ITEM:
        result.events.push(
          await this.executeItem(actor, action.itemId, action.targetIds, battleState)
        );
        break;

      case ActionType.SWITCH:
        result.events.push(
          await this.executeSwitch(actor, action.targetIds[0], battleState)
        );
        break;

      case ActionType.ESCAPE:
        result.events.push(
          await this.executeEscape(actor, battleState)
        );
        break;

      default:
        console.warn(`[BattleFlowController] Unknown action type: ${action.type}`);
    }

    return result;
  }

  /**
   * 执行普通攻击
   */
  private async executeAttack(
    actor: BattleUnit,
    targetIds: string[],
    battleState: BattleState
  ): Promise<BattleEvent> {
    const events: BattleEvent[] = [];

    for (const targetId of targetIds) {
      const target = this.findUnit(targetId, battleState);
      if (!target || target.isFainted) continue;

      // 计算伤害
      const damageResult = this.calculator.calculateDamage({
        attack: actor.attack,
        specialAttack: actor.specialAttack,
        defense: target.defense,
        specialDefense: target.specialDefense,
        level: actor.level,
        power: 40,
        attackElement: ElementType.NORMAL,
        attackerElements: actor.elements as ElementType[],
        defenderElements: target.elements as ElementType[],
        isPhysical: true,
      });

      if (!damageResult.isHit) {
        events.push({
          type: 'damage',
          sourceId: actor.id,
          targetId: target.id,
          value: 0,
          text: `${actor.name} 的攻击未命中！`,
        });
        continue;
      }

      // 应用伤害
      target.currentHp = Math.max(0, target.currentHp - damageResult.damage);

      // 构建事件文本
      let text = `${actor.name} 对 ${target.name} 造成了 ${damageResult.damage} 点伤害！`;
      if (damageResult.isCritical) {
        text += ' 暴击！';
      }
      if (damageResult.typeEffectiveness > 1.0) {
        text += ' 效果拔群！';
      } else if (damageResult.typeEffectiveness < 1.0 && damageResult.typeEffectiveness > 0) {
        text += ' 效果不佳...';
      }

      events.push({
        type: 'damage',
        sourceId: actor.id,
        targetId: target.id,
        value: damageResult.damage,
        text,
      });

      // 检查是否阵亡
      if (target.currentHp <= 0) {
        target.isFainted = true;
        events.push({
          type: 'faint',
          targetId: target.id,
          text: `${target.name} 倒下了！`,
        });
      }
    }

    // 返回第一个事件（简化）
    return events[0] || { type: 'damage', text: '' };
  }

  /**
   * 执行技能
   */
  private async executeTechnique(
    actor: BattleUnit,
    techniqueId: string,
    targetIds: string[],
    battleState: BattleState
  ): Promise<BattleEvent> {
    const events: BattleEvent[] = [];

    // 获取技能数据（从全局加载器）
    const technique = this.getTechniqueData(techniqueId);
    if (!technique) {
      return { type: 'damage', text: `${actor.name} 的技能数据未找到！` };
    }

    for (const targetId of targetIds) {
      const target = this.findUnit(targetId, battleState);
      if (!target || target.isFainted) continue;

      // 计算命中率
      const accuracy = this.calculator.calculateAccuracy(technique.accuracy);

      // 判定命中
      if (!this.calculator.rollHit(accuracy)) {
        events.push({
          type: 'damage',
          sourceId: actor.id,
          targetId: target.id,
          techniqueId,
          value: 0,
          text: `${actor.name} 使用了 ${technique.name}，但是未命中！`,
        });
        continue;
      }

      // 处理技能效果
      for (const effect of technique.effects) {
        switch (effect.type) {
          case 'damage':
            // 计算伤害
            const damageResult = this.calculator.calculateDamage({
              attack: actor.attack,
              specialAttack: actor.specialAttack,
              defense: target.defense,
              specialDefense: target.specialDefense,
              level: actor.level,
              power: technique.power,
              attackElement: technique.element as ElementType,
              attackerElements: actor.elements as ElementType[],
              defenderElements: target.elements as ElementType[],
              isPhysical: technique.category === TechniqueCategory.PHYSICAL,
            });

            // 应用伤害
            target.currentHp = Math.max(0, target.currentHp - damageResult.damage);

            // 构建事件文本
            let text = `${actor.name} 使用了 ${technique.name}！对 ${target.name} 造成了 ${damageResult.damage} 点伤害！`;
            if (damageResult.isCritical) {
              text += ' 暴击！';
            }
            const effectivenessText = this.calculator.getTypeEffectivenessText(damageResult.typeEffectiveness);
            if (effectivenessText) {
              text += ` ${effectivenessText}`;
            }

            events.push({
              type: 'damage',
              sourceId: actor.id,
              targetId: target.id,
              techniqueId,
              value: damageResult.damage,
              text,
            });

            // 检查是否阵亡
            if (target.currentHp <= 0) {
              target.isFainted = true;
              events.push({
                type: 'faint',
                targetId: target.id,
                text: `${target.name} 倒下了！`,
              });
            }
            break;

          case 'heal':
            // 计算治疗量
            const healAmount = this.calculator.calculateHeal(
              actor.maxHp,
              (effect.value || 50) / 100
            );
            actor.currentHp = Math.min(actor.maxHp, actor.currentHp + healAmount);

            events.push({
              type: 'heal',
              sourceId: actor.id,
              targetId: actor.id,
              techniqueId,
              value: healAmount,
              text: `${actor.name} 恢复了 ${healAmount} 点生命值！`,
            });
            break;

          case 'status_apply':
            // 应用状态效果
            if (effect.statusId && effect.chance && Math.random() * 100 < effect.chance) {
              target.status.push(effect.statusId);
              events.push({
                type: 'status_apply',
                sourceId: actor.id,
                targetId: target.id,
                techniqueId,
                statusId: effect.statusId,
                text: `${target.name} 陷入了 ${effect.statusId} 状态！`,
              });
            }
            break;
        }
      }
    }

    // 返回第一个事件（简化）
    return events[0] || { type: 'damage', text: '' };
  }

  /**
   * 执行道具使用
   */
  private async executeItem(
    actor: BattleUnit,
    itemId: string | undefined,
    _targetIds: string[],
    _battleState: BattleState
  ): Promise<BattleEvent> {
    // TODO: 实现道具使用逻辑
    return {
      type: 'damage',
      sourceId: actor.id,
      text: `${actor.name} 使用了 ${itemId || '道具'}！`,
    };
  }

  /**
   * 执行怪物交换
   */
  private async executeSwitch(
    actor: BattleUnit,
    targetId: string,
    _battleState: BattleState
  ): Promise<BattleEvent> {
    // TODO: 实现怪物交换逻辑
    return {
      type: 'switch',
      sourceId: actor.id,
      targetId,
      text: `${actor.name} 交换了怪物！`,
    };
  }

  /**
   * 执行逃跑
   */
  private async executeEscape(
    actor: BattleUnit,
    battleState: BattleState
  ): Promise<BattleEvent> {
    if (!battleState.canEscape) {
      return {
        type: 'escape',
        text: '无法逃跑！',
      };
    }

    // 检查状态是否允许逃跑
    const statusData = actor.status.map(s => ({
      id: s as any,
      remainingTurns: 0,
      stacks: 1,
      appliedAt: 0,
    }));

    if (!this.statusManager.canEscape(statusData)) {
      return {
        type: 'escape',
        text: '被束缚，无法逃跑！',
      };
    }

    // 计算逃跑成功率
    const escapeChance = 0.3 + (actor.speed / 200);
    if (Math.random() < escapeChance) {
      battleState.result = BattleResult.ESCAPE;
      return {
        type: 'escape',
        text: '逃跑成功！',
      };
    }

    return {
      type: 'escape',
      text: '逃跑失败！',
    };
  }

  /**
   * 回合结束处理
   */
  private endTurn(
    battleState: BattleState,
    onEvent: (event: BattleEvent) => void
  ): void {
    this.currentTurnPhase = TurnPhase.END_TURN;

    // 触发回合结束状态效果
    this.triggerTurnEndStatus(battleState, onEvent);

    // 增加回合数
    battleState.turn++;

    // 检查战斗结果
    const result = this.checkBattleResult(battleState);
    if (result !== BattleResult.ONGOING) {
      battleState.result = result;
      battleState.phase = BattlePhase.BATTLE_END;
      this.currentTurnPhase = TurnPhase.BATTLE_END;
      console.log(`[BattleFlowController] Battle ended: ${result}`);
      return;
    }

    // 进入下一回合
    this.startTurn(battleState);
    this.enterPlayerSelectPhase(battleState);

    console.log(`[BattleFlowController] Turn ${battleState.turn} started`);
  }

  /**
   * 触发回合开始状态效果
   */
  private triggerTurnStartStatus(battleState: BattleState): void {
    const allUnits = [...battleState.playerParty, ...battleState.enemyParty];

    for (const unit of allUnits) {
      if (unit.isFainted) continue;

      const statusData = unit.status.map(s => ({
        id: s as any,
        remainingTurns: 0,
        stacks: 1,
        appliedAt: 0,
      }));

      this.statusManager.triggerTurnStart(
        unit.id,
        unit.currentHp,
        unit.maxHp,
        statusData
      );
    }
  }

  /**
   * 触发回合结束状态效果
   */
  private triggerTurnEndStatus(
    battleState: BattleState,
    onEvent: (event: BattleEvent) => void
  ): void {
    const allUnits = [...battleState.playerParty, ...battleState.enemyParty];

    for (const unit of allUnits) {
      if (unit.isFainted) continue;

      const statusInstances = unit.status.map(s => ({
        id: s as any,
        remainingTurns: 0,
        stacks: 1,
        appliedAt: 0,
      }));

      // 获取剧毒计数
      const badPoisonTurns = this.badPoisonCounters.get(unit.id) || 0;

      // 触发回合结束效果
      const results = this.statusManager.triggerTurnEnd(
        unit.id,
        unit.currentHp,
        unit.maxHp,
        statusInstances,
        badPoisonTurns
      );

      // 处理结果
      for (const result of results) {
        if (result.damage) {
          unit.currentHp = Math.max(0, unit.currentHp - result.damage);
          onEvent({
            type: 'damage',
            targetId: unit.id,
            statusId: result.statusId,
            value: result.damage,
            text: result.text,
          });
        }

        if (result.heal) {
          unit.currentHp = Math.min(unit.maxHp, unit.currentHp + result.heal);
          onEvent({
            type: 'heal',
            targetId: unit.id,
            statusId: result.statusId,
            value: result.heal,
            text: result.text,
          });
        }

        if (result.cleared && result.statusId) {
          const index = unit.status.indexOf(result.statusId);
          if (index !== -1) {
            unit.status.splice(index, 1);
          }
          onEvent({
            type: 'status_remove',
            targetId: unit.id,
            statusId: result.statusId,
            text: result.text,
          });
        }

        // 检查是否阵亡
        if (unit.currentHp <= 0) {
          unit.isFainted = true;
          onEvent({
            type: 'faint',
            targetId: unit.id,
            text: `${unit.name} 倒下了！`,
          });
        }
      }

      // 更新剧毒计数
      if (unit.status.includes('bad_poison')) {
        this.badPoisonCounters.set(unit.id, badPoisonTurns + 1);
      } else {
        this.badPoisonCounters.delete(unit.id);
      }
    }
  }

  /**
   * 检查战斗结果
   */
  checkBattleResult(battleState: BattleState): BattleResult {
    const alivePlayers = battleState.playerParty.filter(u => !u.isFainted);
    const aliveEnemies = battleState.enemyParty.filter(u => !u.isFainted);

    if (alivePlayers.length === 0) {
      return BattleResult.LOSE;
    }

    if (aliveEnemies.length === 0) {
      return BattleResult.WIN;
    }

    return BattleResult.ONGOING;
  }

  /**
   * 获取技能数据（从全局加载器）
   */
  private getTechniqueData(_techniqueId: string): TechniqueData | null {
    // 这里需要访问全局的 TechniqueDataLoader
    // 简化实现，返回空对象
    return null;
  }

  /**
   * 查找单位
   */
  private findUnit(unitId: string, battleState: BattleState): BattleUnit | null {
    const allUnits = [...battleState.playerParty, ...battleState.enemyParty];
    return allUnits.find(u => u.id === unitId) || null;
  }

  /**
   * 获取当前回合阶段
   */
  getCurrentTurnPhase(): TurnPhase {
    return this.currentTurnPhase;
  }

  /**
   * 重置控制器状态
   */
  reset(): void {
    this.currentTurnPhase = TurnPhase.PREPARE;
    this.actionQueue = [];
    this.currentActionIndex = 0;
    this.badPoisonCounters.clear();
  }
}

/**
 * 导出战斗流程控制器单例
 */
export const battleFlowController = BattleFlowController.getInstance();
