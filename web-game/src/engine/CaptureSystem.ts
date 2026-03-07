/**
 * 捕捉系统
 *
 * 基于 Tuxemon 的捕捉系统
 *
 * 功能：
 * - 捕捉道具使用逻辑（捕捉球道具）
 * - 捕捉成功率计算公式
 * - 捕捉动画（投掷、摇晃、成功/失败）
 * - 捕捉成功后怪物加入队伍
 * - 捕捉失败后怪物逃脱
 */

import { BattleUnit, BattleEvent } from './BattleState';
import { ItemData } from './ItemData';
import { MonsterInstance } from './MonsterData';
import { StatusEffectId, StatusEffectInstance } from './StatusEffectManager';

/**
 * 捕捉状态枚举
 */
export enum CapturePhase {
  /** 投掷球 */
  THROW = 'throw',
  /** 摇晃（第一次） */
  SHAKE_1 = 'shake_1',
  /** 摇晃（第二次） */
  SHAKE_2 = 'shake_2',
  /** 摇晃（第三次） */
  SHAKE_3 = 'shake_3',
  /** 捕捉成功 */
  SUCCESS = 'success',
  /** 捕捉失败（逃脱） */
  FAILED = 'failed',
}

/**
 * 捕捉结果类型
 */
export enum CaptureResult {
  /** 捕捉成功 */
  SUCCESS = 'success',
  /** 捕捉失败（逃脱） */
  ESCAPED = 'escaped',
  /** 目标无效（已阵亡或不可捕捉） */
  INVALID_TARGET = 'invalid_target',
  /** 无捕捉道具 */
  NO_ITEM = 'no_item',
}

/**
 * 捕捉计算参数
 */
export interface CaptureCalcParams {
  /** 捕捉道具 */
  item: ItemData;
  /** 目标怪物 */
  target: BattleUnit;
  /** 投掷者等级 */
  throwerLevel: number;
  /** 目标状态效果 */
  statusEffects: StatusEffectInstance[];
}

/**
 * 捕捉事件接口
 */
export interface CaptureEvent extends BattleEvent {
  /** 捕捉阶段 */
  capturePhase?: CapturePhase;
  /** 捕捉结果 */
  captureResult?: CaptureResult;
  /** 摇晃次数 */
  shakeCount?: number;
}

/**
 * 捕捉回调类型
 */
export type CaptureCallback = (event: CaptureEvent) => void;

/**
 * 捕捉系统类
 */
export class CaptureSystem {
  private static instance: CaptureSystem;

  /** 捕捉回调列表 */
  private callbacks: CaptureCallback[] = [];

  /** 当前捕捉动画状态 */
  private currentCapture: {
    targetId: string;
    itemId: string;
    phase: CapturePhase;
    shakeCount: number;
  } | null = null;

  /** 捕捉成功加入队伍的回调 */
  private onCaptureSuccessCallback: ((monster: MonsterInstance) => void) | null = null;

  /**
   * 私有构造函数，确保单例
   */
  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): CaptureSystem {
    if (!CaptureSystem.instance) {
      CaptureSystem.instance = new CaptureSystem();
    }
    return CaptureSystem.instance;
  }

  /**
   * 计算捕捉成功率
   *
   * 公式：catch_rate = (1 - current_hp / max_hp) * base_catch_rate * status_modifier * item_modifier
   *
   * @param params 捕捉计算参数
   * @returns 捕捉成功率（0-1）
   */
  calculateCatchRate(params: CaptureCalcParams): number {
    const { item, target, statusEffects } = params;

    // 1. 基础捕捉率（从道具数据中获取）
    let baseCatchRate = 1.0;

    // 从道具效果中获取捕捉率
    for (const effect of item.effects) {
      if (effect.type === 'catch' && effect.catchRate) {
        baseCatchRate = effect.catchRate;
        break;
      }
    }

    // 2. HP 比例修正（HP 越低，捕捉率越高）
    const hpRatio = target.currentHp / target.maxHp;
    const hpModifier = 1 - hpRatio;

    // 3. 状态效果修正
    const statusModifier = this.getStatusModifier(statusEffects);

    // 4. 道具修正（不同等级的球有不同的修正）
    const itemModifier = this.getItemModifier(item);

    // 计算最终捕捉率
    const catchRate = hpModifier * baseCatchRate * statusModifier * itemModifier;

    // 确保捕捉率在 0-1 范围内
    return Math.max(0, Math.min(1, catchRate));
  }

  /**
   * 获取状态效果修正系数
   *
   * @param statusEffects 状态效果列表
   * @returns 状态效果修正系数
   */
  private getStatusModifier(statusEffects: StatusEffectInstance[]): number {
    let modifier = 1.0;

    for (const status of statusEffects) {
      switch (status.id) {
        case StatusEffectId.SLEEP:
          // 睡眠：捕捉率 x2
          modifier *= 2.0;
          break;

        case StatusEffectId.FREEZE:
          // 冰冻：捕捉率 x2
          modifier *= 2.0;
          break;

        case StatusEffectId.PARALYSIS:
          // 麻痹：捕捉率 x1.5
          modifier *= 1.5;
          break;

        case StatusEffectId.POISON:
          // 中毒：捕捉率 x1.5
          modifier *= 1.5;
          break;

        case StatusEffectId.BURN:
          // 灼烧：捕捉率 x1.5
          modifier *= 1.5;
          break;

        case StatusEffectId.BOUND:
          // 束缚：捕捉率 x1.2
          modifier *= 1.2;
          break;
      }
    }

    return modifier;
  }

  /**
   * 获取道具修正系数
   *
   * @param item 捕捉道具
   * @returns 道具修正系数
   */
  private getItemModifier(item: ItemData): number {
    // 根据道具 slug 确定修正系数
    switch (item.slug) {
      case 'tuxeball':
      case 'safari_ball':
        return 1.0;

      case 'super_pokeball':
      case 'great_ball':
        return 1.5;

      case 'ultra_ball':
      case 'ultra_pokeball':
        return 2.0;

      case 'master_ball':
      case 'master_tuxeball':
        return 999.0; // 必定成功

      case 'pokeball':
      default:
        return 1.0;
    }
  }

  /**
   * 尝试捕捉怪物
   *
   * @param params 捕捉计算参数
   * @param onCaptureSuccess 捕捉成功回调
   * @returns 捕捉结果
   */
  attemptCapture(
    params: CaptureCalcParams,
    onCaptureSuccess?: (monster: MonsterInstance) => void
  ): CaptureResult {
    const { target } = params;

    // 检查目标是否可捕捉
    if (target.isFainted) {
      this.emitEvent({
        type: 'damage',
        targetId: target.id,
        itemId: params.item.slug,
        text: '无法捕捉已经倒下的怪物！',
        captureResult: CaptureResult.INVALID_TARGET,
      });
      return CaptureResult.INVALID_TARGET;
    }

    // 设置成功回调
    this.onCaptureSuccessCallback = onCaptureSuccess || null;

    // 计算捕捉率
    const catchRate = this.calculateCatchRate(params);

    // 开始捕捉动画
    this.startCaptureAnimation(target.id, params.item.slug, catchRate);

    return CaptureResult.SUCCESS;
  }

  /**
   * 开始捕捉动画
   *
   * @param targetId 目标 ID
   * @param itemId 道具 ID
   * @param catchRate 捕捉率
   */
  private startCaptureAnimation(targetId: string, itemId: string, catchRate: number): Promise<void> {
    return new Promise((resolve) => {
      // 初始化捕捉状态
      this.currentCapture = {
        targetId,
        itemId,
        phase: CapturePhase.THROW,
        shakeCount: 0,
      };

      // 发送投掷事件
      this.emitEvent({
        type: 'damage',
        targetId,
        itemId,
        capturePhase: CapturePhase.THROW,
        text: `投出了 ${itemId}！`,
      });

      // 开始摇晃动画序列
      this.runShakeSequence(catchRate, resolve);
    });
  }

  /**
   * 运行摇晃动画序列
   *
   * @param catchRate 捕捉率
   * @param resolve 完成 Promise
   */
  private runShakeSequence(catchRate: number, resolve: (value: void) => void): void {
    if (!this.currentCapture) {
      resolve();
      return;
    }

    const { targetId: _targetId, itemId: _itemId } = this.currentCapture;

    // 计算每次摇晃的成功率（总成功率分摊到 3 次摇晃）
    const shakeSuccessRate = Math.pow(catchRate, 1 / 3);

    // 执行摇晃
    this.performShake(1, shakeSuccessRate, resolve);
  }

  /**
   * 执行单次摇晃
   *
   * @param shakeNum 摇晃次数
   * @param successRate 成功率
   * @param resolve 完成 Promise
   */
  private performShake(
    shakeNum: number,
    successRate: number,
    resolve: (value: void) => void
  ): void {
    if (!this.currentCapture) {
      resolve();
      return;
    }

    const { targetId, itemId, shakeCount } = this.currentCapture;

    // 更新摇晃次数
    this.currentCapture.shakeCount = shakeCount;

    // 更新阶段
    let phase: CapturePhase;
    if (shakeNum === 1) phase = CapturePhase.SHAKE_1;
    else if (shakeNum === 2) phase = CapturePhase.SHAKE_2;
    else phase = CapturePhase.SHAKE_3;

    this.currentCapture.phase = phase;

    // 发送摇晃事件
    const shakeText = shakeNum === 1 ? '摇晃了一次...' :
                      shakeNum === 2 ? '摇晃了两次...' : '摇晃了三次...';
    this.emitEvent({
      type: 'damage',
      targetId,
      itemId,
      capturePhase: phase,
      shakeCount: shakeNum,
      text: shakeText,
    });

    // 判定是否成功
    const roll = Math.random();
    const succeeded = roll < successRate;

    if (!succeeded) {
      // 摇晃失败，怪物逃脱
      setTimeout(() => {
        if (!this.currentCapture) {
          resolve();
          return;
        }

        this.currentCapture.phase = CapturePhase.FAILED;
        this.emitEvent({
          type: 'damage',
          targetId,
          itemId,
          capturePhase: CapturePhase.FAILED,
          captureResult: CaptureResult.ESCAPED,
          shakeCount: shakeNum,
          text: '怪物逃脱了！',
        });

        this.currentCapture = null;
        resolve();
      }, 500);
      return;
    }

    // 如果摇晃成功且已完成 3 次，则捕捉成功
    if (shakeNum >= 3) {
      setTimeout(() => {
        if (!this.currentCapture) {
          resolve();
          return;
        }

        this.currentCapture.phase = CapturePhase.SUCCESS;
        this.emitEvent({
          type: 'damage',
          targetId,
          itemId,
          capturePhase: CapturePhase.SUCCESS,
          captureResult: CaptureResult.SUCCESS,
          shakeCount: 3,
          text: '成功捕捉！',
        });

        this.currentCapture = null;
        resolve();
      }, 500);
      return;
    }

    // 继续下一次摇晃
    setTimeout(() => {
      this.performShake(shakeNum + 1, successRate, resolve);
    }, 800);
  }

  /**
   * 创建捕捉成功的怪物实例
   *
   * @param target 战斗单位
   * @param currentLevel 当前等级（战斗中的等级）
   * @returns 怪物实例
   */
  createCapturedMonster(target: BattleUnit, currentLevel: number): MonsterInstance {
    // 简化：创建怪物实例
    // 实际应从 MonsterDataLoader 获取基础数据
    return {
      instanceId: `${target.monsterId}_captured_${Date.now()}`,
      monsterId: target.monsterId,
      nickname: undefined,
      level: currentLevel,
      exp: 0,
      currentHp: target.maxHp,
      maxHp: target.maxHp,
      attack: target.attack,
      defense: target.defense,
      speed: target.speed,
      specialAttack: target.specialAttack,
      specialDefense: target.specialDefense,
      types: [...target.elements],
      techniques: [...target.techniques],
      status: [],
      caughtAt: Date.now(),
    };
  }

  /**
   * 处理捕捉成功
   *
   * @param target 战斗单位
   * @param itemId 捕捉道具 ID
   */
  handleCaptureSuccess(target: BattleUnit, itemId: string): void {
    // 创建怪物实例
    const monster = this.createCapturedMonster(target, target.level);

    // 触发回调
    if (this.onCaptureSuccessCallback) {
      this.onCaptureSuccessCallback(monster);
    }

    console.log(`[CaptureSystem] Successfully captured ${target.name} using ${itemId}`);
  }

  /**
   * 发送捕捉事件
   *
   * @param event 捕捉事件
   */
  private emitEvent(event: CaptureEvent): void {
    for (const callback of this.callbacks) {
      callback(event);
    }
  }

  /**
   * 注册捕捉回调
   *
   * @param callback 捕捉回调
   */
  onCaptureEvent(callback: CaptureCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * 移除捕捉回调
   *
   * @param callback 捕捉回调
   */
  offCaptureEvent(callback: CaptureCallback): void {
    const index = this.callbacks.indexOf(callback);
    if (index !== -1) {
      this.callbacks.splice(index, 1);
    }
  }

  /**
   * 获取当前捕捉状态
   */
  getCurrentCapture(): typeof CaptureSystem.prototype.currentCapture {
    return this.currentCapture;
  }

  /**
   * 重置捕捉系统
   */
  reset(): void {
    this.currentCapture = null;
    this.onCaptureSuccessCallback = null;
    console.log('[CaptureSystem] Reset');
  }
}

/**
 * 导出捕捉系统单例
 */
export const captureSystem = CaptureSystem.getInstance();
