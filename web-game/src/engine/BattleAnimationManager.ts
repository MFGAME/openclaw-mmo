/**
 * 战斗动画管理器
 *
 * 基于 Tuxemon 的战斗动画系统
 *
 * 功能：
 * - 技能动画帧播放（从 Tuxemon 资源加载）
 * - 伤害数字飘字效果（上升、渐隐）
 * - 状态效果动画（状态图标闪烁）
 * - 战斗场景过渡动画（进入/退出战斗）
 * - 攻击特效（怪物闪烁、屏幕震动）
 */

import {
  BattleEvent,
  BattleUnit,
} from './BattleState';
import { TechniqueData } from './TechniqueData';
import { StatusEffectId } from './StatusEffectManager';

/**
 * 动画类型枚举
 */
export enum AnimationType {
  /** 技能动画 */
  TECHNIQUE = 'technique',
  /** 伤害飘字 */
  DAMAGE_FLOAT = 'damage_float',
  /** 治疗飘字 */
  HEAL_FLOAT = 'heal_float',
  /** 状态效果 */
  STATUS_APPLY = 'status_apply',
  /** 怪物闪烁 */
  MONSTER_FLASH = 'monster_flash',
  /** 屏幕震动 */
  SCREEN_SHAKE = 'screen_shake',
  /** 进入战斗 */
  BATTLE_ENTER = 'battle_enter',
  /** 退出战斗 */
  BATTLE_EXIT = 'battle_exit',
  /** 怪物出现 */
  MONSTER_APPEAR = 'monster_appear',
  /** 怪物消失 */
  MONSTER_DISAPPEAR = 'monster_disappear',
  /** 升级动画 */
  LEVEL_UP = 'level_up',
}

/**
 * 飘字颜色类型
 */
export enum FloatColor {
  /** 普通伤害（白色） */
  DAMAGE_NORMAL = 'damage_normal',
  /** 暴击（红色） */
  DAMAGE_CRITICAL = 'damage_critical',
  /** 效果拔群（橙色） */
  DAMAGE_SUPER = 'damage_super',
  /** 效果不佳（蓝色） */
  DAMAGE_WEAK = 'damage_weak',
  /** 治疗量（绿色） */
  HEAL = 'heal',
  /** 状态效果（紫色） */
  STATUS = 'status',
  /** 经验值（黄色） */
  EXP = 'exp',
}

/**
 * 动画配置接口
 */
export interface AnimationConfig {
  /** 动画类型 */
  type: AnimationType;
  /** 目标单位 ID */
  targetId?: string;
  /** 目标单位 ID 列表 */
  targetIds?: string[];
  /** 源单位 ID */
  sourceId?: string;
  /** 技能 ID */
  techniqueId?: string;
  /** 持续时间（毫秒） */
  duration?: number;
  /** 延迟时间（毫秒） */
  delay?: number;
  /** 额外参数 */
  params?: Record<string, any>;
}

/**
 * 伤害飘字配置
 */
export interface DamageFloatConfig {
  /** 伤害值 */
  value: number;
  /** 颜色类型 */
  color: FloatColor;
  /** 起始 X 坐标 */
  startX: number;
  /** 起始 Y 坐标 */
  startY: number;
  /** 上升距离 */
  riseDistance?: number;
  /** 持续时间（毫秒） */
  duration?: number;
}

/**
 * 状态效果动画配置
 */
export interface StatusAnimationConfig {
  /** 状态 ID */
  statusId: StatusEffectId;
  /** 状态名称 */
  statusName: string;
  /** 目标单位 ID */
  targetId: string;
  /** 状态图标路径 */
  iconPath?: string;
}

/**
 * 屏幕震动配置
 */
export interface ShakeConfig {
  /** 震动强度 */
  intensity: number;
  /** 震动次数 */
  count: number;
  /** 震动持续时间（毫秒） */
  duration?: number;
}

/**
 * 动画回调类型
 */
export type AnimationCallback = (animationId: string, completed: boolean) => void;

/**
 * 动画实例接口
 */
export interface AnimationInstance {
  /** 动画 ID */
  id: string;
  /** 动画配置 */
  config: AnimationConfig;
  /** 开始时间 */
  startTime: number;
  /** 是否完成 */
  completed: boolean;
  /** 回调函数 */
  callback?: AnimationCallback;
}

/**
 * 战斗动画管理器类
 */
export class BattleAnimationManager {
  private static instance: BattleAnimationManager;

  /** 动画队列 */
  private animationQueue: AnimationInstance[] = [];

  /** 正在播放的动画 */
  private activeAnimations: Map<string, AnimationInstance> = new Map();

  /** 动画 ID 计数器 */
  private animationIdCounter: number = 0;

  /** Canvas 渲染上下文 */
  private ctx: CanvasRenderingContext2D | null = null;

  /** Canvas 尺寸 */
  private canvasSize = { width: 0, height: 0 };

  /** 单位位置映射 */
  private unitPositions: Map<string, { x: number; y: number }> = new Map();

  /**
   * 私有构造函数，确保单例
   */
  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): BattleAnimationManager {
    if (!BattleAnimationManager.instance) {
      BattleAnimationManager.instance = new BattleAnimationManager();
    }
    return BattleAnimationManager.instance;
  }

  /**
   * 初始化动画管理器
   *
   * @param canvas Canvas 元素
   */
  initialize(canvas: HTMLCanvasElement): void {
    const context = canvas.getContext('2d');
    if (!context) {
      console.error('[BattleAnimationManager] Failed to get 2D context');
      return;
    }
    this.ctx = context;
    this.canvasSize = {
      width: canvas.width,
      height: canvas.height,
    };
    console.log('[BattleAnimationManager] Initialized');
  }

  /**
   * 更新单位位置
   *
   * @param unitId 单位 ID
   * @param x X 坐标
   * @param y Y 坐标
   */
  updateUnitPosition(unitId: string, x: number, y: number): void {
    this.unitPositions.set(unitId, { x, y });
  }

  /**
   * 清除单位位置
   *
   * @param unitId 单位 ID
   */
  clearUnitPosition(unitId: string): void {
    this.unitPositions.delete(unitId);
  }

  /**
   * 播放战斗事件动画
   *
   * @param event 战斗事件
   * @param _battleUnits 战斗单位列表（未使用，保留用于未来扩展）
   */
  playBattleEvent(event: BattleEvent, _battleUnits?: BattleUnit[]): void {
    switch (event.type) {
      case 'damage':
        if (event.value !== undefined && event.targetId) {
          this.playDamageFloat(
            event.targetId,
            event.value,
            event.sourceId !== undefined ? FloatColor.DAMAGE_NORMAL : FloatColor.DAMAGE_SUPER
          );
          this.playMonsterFlash(event.targetId);
        }
        break;

      case 'heal':
        if (event.value !== undefined && event.targetId) {
          this.playHealFloat(event.targetId, event.value);
        }
        break;

      case 'status_apply':
        if (event.statusId && event.targetId) {
          this.playStatusApply(event.statusId as StatusEffectId, event.targetId);
        }
        break;

      case 'faint':
        if (event.targetId) {
          this.playMonsterDisappear(event.targetId);
        }
        break;

      case 'level_up':
        if (event.targetId) {
          this.playLevelUp(event.targetId);
        }
        break;

      case 'exp_gain':
        if (event.value !== undefined && event.targetId) {
          this.playExpFloat(event.targetId, event.value);
        }
        break;
    }
  }

  /**
   * 播放技能动画
   *
   * @param technique 技能数据
   * @param sourceId 源单位 ID
   * @param targetIds 目标单位 ID 列表
   */
  playTechniqueAnimation(
    technique: TechniqueData,
    sourceId: string,
    targetIds: string[]
  ): string {
    const animationId = this.generateAnimationId();

    const config: AnimationConfig = {
      type: AnimationType.TECHNIQUE,
      sourceId,
      targetIds: targetIds as any,
      techniqueId: technique.slug,
      duration: 500,
      params: {
        element: technique.element,
        power: technique.power,
        animation: technique.animation,
      },
    };

    const instance: AnimationInstance = {
      id: animationId,
      config,
      startTime: Date.now(),
      completed: false,
    };

    this.animationQueue.push(instance);
    console.log(`[BattleAnimationManager] Queued technique animation: ${technique.name}`);

    return animationId;
  }

  /**
   * 播放伤害飘字
   *
   * @param targetId 目标单位 ID
   * @param value 伤害值
   * @param color 颜色类型
   */
  playDamageFloat(targetId: string, value: number, color: FloatColor = FloatColor.DAMAGE_NORMAL): string {
    const position = this.unitPositions.get(targetId);
    if (!position) {
      console.warn(`[BattleAnimationManager] No position found for unit: ${targetId}`);
      return '';
    }

    const animationId = this.generateAnimationId();
    const config: DamageFloatConfig = {
      value,
      color,
      startX: position.x + 50,
      startY: position.y - 20,
      riseDistance: 60,
      duration: 800,
    };

    const instance: AnimationInstance = {
      id: animationId,
      config: {
        type: AnimationType.DAMAGE_FLOAT,
        targetId,
        duration: config.duration,
        params: config,
      },
      startTime: Date.now(),
      completed: false,
    };

    this.animationQueue.push(instance);
    return animationId;
  }

  /**
   * 播放治疗飘字
   *
   * @param targetId 目标单位 ID
   * @param value 治疗量
   */
  playHealFloat(targetId: string, value: number): string {
    const position = this.unitPositions.get(targetId);
    if (!position) return '';

    const animationId = this.generateAnimationId();

    const instance: AnimationInstance = {
      id: animationId,
      config: {
        type: AnimationType.HEAL_FLOAT,
        targetId,
        duration: 800,
        params: {
          value,
          color: FloatColor.HEAL,
          startX: position.x + 50,
          startY: position.y - 20,
          riseDistance: 40,
        },
      },
      startTime: Date.now(),
      completed: false,
    };

    this.animationQueue.push(instance);
    return animationId;
  }

  /**
   * 播放经验值飘字
   *
   * @param targetId 目标单位 ID
   * @param value 经验值
   */
  playExpFloat(targetId: string, value: number): string {
    const position = this.unitPositions.get(targetId);
    if (!position) return '';

    const animationId = this.generateAnimationId();

    const instance: AnimationInstance = {
      id: animationId,
      config: {
        type: AnimationType.HEAL_FLOAT,
        targetId,
        duration: 1000,
        params: {
          value,
          color: FloatColor.EXP,
          startX: position.x,
          startY: position.y + 80,
          riseDistance: 50,
        },
      },
      startTime: Date.now(),
      completed: false,
    };

    this.animationQueue.push(instance);
    return animationId;
  }

  /**
   * 播放状态效果动画
   *
   * @param statusId 状态 ID
   * @param targetId 目标单位 ID
   */
  playStatusApply(statusId: StatusEffectId, targetId: string): string {
    const animationId = this.generateAnimationId();

    const config: StatusAnimationConfig = {
      statusId,
      statusName: this.getStatusName(statusId),
      targetId,
      iconPath: `/assets/tuxemon/gfx/status/${statusId}.png`,
    };

    const instance: AnimationInstance = {
      id: animationId,
      config: {
        type: AnimationType.STATUS_APPLY,
        targetId,
        duration: 600,
        params: config,
      },
      startTime: Date.now(),
      completed: false,
    };

    this.animationQueue.push(instance);
    return animationId;
  }

  /**
   * 播放怪物闪烁效果
   *
   * @param unitId 单位 ID
   * @param flashColor 闪烁颜色（白色表示受伤）
   */
  playMonsterFlash(unitId: string, flashColor: string = 'rgba(255,255,255,0.8)'): string {
    const animationId = this.generateAnimationId();

    const instance: AnimationInstance = {
      id: animationId,
      config: {
        type: AnimationType.MONSTER_FLASH,
        targetId: unitId,
        duration: 200,
        params: { flashColor },
      },
      startTime: Date.now(),
      completed: false,
    };

    this.animationQueue.push(instance);
    return animationId;
  }

  /**
   * 播放屏幕震动效果
   *
   * @param intensity 震动强度
   * @param count 震动次数
   */
  playScreenShake(intensity: number = 5, count: number = 3): string {
    const animationId = this.generateAnimationId();

    const instance: AnimationInstance = {
      id: animationId,
      config: {
        type: AnimationType.SCREEN_SHAKE,
        duration: count * 100,
        params: { intensity, count, duration: 100 },
      },
      startTime: Date.now(),
      completed: false,
    };

    this.animationQueue.push(instance);
    return animationId;
  }

  /**
   * 播放战斗进入动画
   *
   * @param playerUnits 玩家单位列表
   * @param enemyUnits 敌方单位列表
   */
  playBattleEnter(playerUnits: BattleUnit[], enemyUnits: BattleUnit[]): string {
    const animationId = this.generateAnimationId();

    const instance: AnimationInstance = {
      id: animationId,
      config: {
        type: AnimationType.BATTLE_ENTER,
        duration: 1000,
        params: {
          playerUnits,
          enemyUnits,
        },
      },
      startTime: Date.now(),
      completed: false,
    };

    this.animationQueue.push(instance);
    return animationId;
  }

  /**
   * 播放战斗退出动画
   */
  playBattleExit(): string {
    const animationId = this.generateAnimationId();

    const instance: AnimationInstance = {
      id: animationId,
      config: {
        type: AnimationType.BATTLE_EXIT,
        duration: 800,
      },
      startTime: Date.now(),
      completed: false,
    };

    this.animationQueue.push(instance);
    return animationId;
  }

  /**
   * 播放怪物出现动画
   *
   * @param unitId 单位 ID
   */
  playMonsterAppear(unitId: string): string {
    const animationId = this.generateAnimationId();

    const instance: AnimationInstance = {
      id: animationId,
      config: {
        type: AnimationType.MONSTER_APPEAR,
        targetId: unitId,
        duration: 500,
      },
      startTime: Date.now(),
      completed: false,
    };

    this.animationQueue.push(instance);
    return animationId;
  }

  /**
   * 播放怪物消失动画（倒下）
   *
   * @param unitId 单位 ID
   */
  playMonsterDisappear(unitId: string): string {
    const animationId = this.generateAnimationId();

    const instance: AnimationInstance = {
      id: animationId,
      config: {
        type: AnimationType.MONSTER_DISAPPEAR,
        targetId: unitId,
        duration: 800,
      },
      startTime: Date.now(),
      completed: false,
    };

    this.animationQueue.push(instance);
    return animationId;
  }

  /**
   * 播放升级动画
   *
   * @param unitId 单位 ID
   * @param newLevel 新等级
   */
  playLevelUp(unitId: string, newLevel?: number): string {
    const animationId = this.generateAnimationId();

    const instance: AnimationInstance = {
      id: animationId,
      config: {
        type: AnimationType.LEVEL_UP,
        targetId: unitId,
        duration: 1500,
        params: { newLevel },
      },
      startTime: Date.now(),
      completed: false,
    };

    this.animationQueue.push(instance);
    return animationId;
  }

  /**
   * 更新动画（每帧调用）
   */
  update(): void {
    const now = Date.now();

    // 处理队列中的动画
    for (let i = this.animationQueue.length - 1; i >= 0; i--) {
      const animation = this.animationQueue[i];
      if (animation.config.delay && now - animation.startTime < animation.config.delay) {
        continue;
      }

      // 开始播放动画
      this.animationQueue.splice(i, 1);
      this.activeAnimations.set(animation.id, animation);
    }

    // 更新正在播放的动画
    const completedIds: string[] = [];
    for (const [_id, animation] of this.activeAnimations) {
      const elapsed = now - animation.startTime;
      const duration = animation.config.duration || 500;

      if (elapsed >= duration) {
        animation.completed = true;
        completedIds.push(animation.id);

        // 触发回调
        if (animation.callback) {
          animation.callback(animation.id, true);
        }
      }
    }

    // 清除完成的动画
    for (const completedId of completedIds) {
      this.activeAnimations.delete(completedId);
    }
  }

  /**
   * 渲染动画（每帧调用）
   */
  render(): void {
    if (!this.ctx) return;

    const now = Date.now();

    for (const [_id, animation] of this.activeAnimations) {
      const elapsed = now - animation.startTime;
      const duration = animation.config.duration || 500;
      const progress = Math.min(elapsed / duration, 1);

      switch (animation.config.type) {
        case AnimationType.DAMAGE_FLOAT:
        case AnimationType.HEAL_FLOAT:
          this.renderFloatText(animation, progress);
          break;

        case AnimationType.STATUS_APPLY:
          this.renderStatusIcon(animation, progress);
          break;

        case AnimationType.MONSTER_FLASH:
          this.renderMonsterFlash(animation, progress);
          break;

        case AnimationType.LEVEL_UP:
          this.renderLevelUp(animation, progress);
          break;

        case AnimationType.MONSTER_APPEAR:
          this.renderMonsterAppear(animation, progress);
          break;

        case AnimationType.MONSTER_DISAPPEAR:
          this.renderMonsterDisappear(animation, progress);
          break;
      }
    }
  }

  /**
   * 渲染飘字效果
   */
  private renderFloatText(animation: AnimationInstance, progress: number): void {
    if (!this.ctx || !animation.config.params) return;

    const params = animation.config.params as DamageFloatConfig;
    const riseDistance = params.riseDistance || 50;
    const currentY = params.startY - (riseDistance * progress);
    const alpha = 1 - progress;

    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.font = 'bold 24px Arial';
    this.ctx.textAlign = 'center';

    // 根据类型设置颜色
    const color = this.getFloatColor(params.color);
    this.ctx.fillStyle = color;

    // 绘制阴影
    this.ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    this.ctx.lineWidth = 3;
    this.ctx.strokeText(`-${params.value}`, params.startX, currentY);
    this.ctx.fillText(`-${params.value}`, params.startX, currentY);

    this.ctx.restore();
  }

  /**
   * 渲染状态图标
   */
  private renderStatusIcon(animation: AnimationInstance, progress: number): void {
    if (!this.ctx || !animation.config.targetId) return;

    const position = this.unitPositions.get(animation.config.targetId);
    if (!position) return;

    const params = animation.config.params as StatusAnimationConfig;

    this.ctx.save();

    // 图标闪烁效果
    const scale = 1 + Math.sin(progress * Math.PI) * 0.3;
    const alpha = progress < 0.5 ? progress * 2 : (1 - progress) * 2;

    this.ctx.globalAlpha = alpha;
    this.ctx.translate(position.x + 80, position.y + 10);
    this.ctx.scale(scale, scale);

    // 绘制状态图标背景
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 16, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(128, 0, 128, 0.7)';
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // 绘制状态名称
    this.ctx.scale(1 / scale, 1 / scale);
    this.ctx.translate(20, 4);
    this.ctx.font = 'bold 14px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = '#FFD700';
    this.ctx.fillText(params.statusName, 0, 0);

    this.ctx.restore();
  }

  /**
   * 渲染怪物闪烁效果
   */
  private renderMonsterFlash(animation: AnimationInstance, progress: number): void {
    if (!this.ctx || !animation.config.targetId) return;

    const position = this.unitPositions.get(animation.config.targetId);
    if (!position) return;

    const params = animation.config.params as { flashColor: string };

    this.ctx.save();

    // 白色闪烁渐隐
    const alpha = 1 - progress;
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = params.flashColor || 'rgba(255,255,255,0.8)';

    // 假设怪物精灵图尺寸为 96x96
    this.ctx.fillRect(position.x, position.y, 96, 96);

    this.ctx.restore();
  }

  /**
   * 渲染升级动画
   */
  private renderLevelUp(animation: AnimationInstance, progress: number): void {
    if (!this.ctx || !animation.config.targetId) return;

    const position = this.unitPositions.get(animation.config.targetId);
    if (!position) return;

    const params = animation.config.params as { newLevel?: number };

    this.ctx.save();

    // 闪光效果
    if (progress < 0.3) {
      const flashAlpha = 1 - (progress / 0.3);
      this.ctx.globalAlpha = flashAlpha;
      this.ctx.fillStyle = '#FFFF00';
      this.ctx.fillRect(0, 0, this.canvasSize.width, this.canvasSize.height);
    }

    // 升级文字
    const textAlpha = progress > 0.3 ? Math.min((progress - 0.3) / 0.2, 1) : 0;
    this.ctx.globalAlpha = textAlpha;
    this.ctx.font = 'bold 36px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = '#FFD700';
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 4;

    const text = `LEVEL UP!`;
    const x = position.x + 48;
    const y = position.y + 40;

    this.ctx.strokeText(text, x, y);
    this.ctx.fillText(text, x, y);

    // 新等级数字
    if (params.newLevel !== undefined) {
      this.ctx.font = 'bold 24px Arial';
      this.ctx.fillStyle = '#FFFFFF';
      const levelText = `Lv.${params.newLevel}`;
      this.ctx.strokeText(levelText, x, y + 35);
      this.ctx.fillText(levelText, x, y + 35);
    }

    this.ctx.restore();
  }

  /**
   * 渲染怪物出现动画
   */
  private renderMonsterAppear(_animation: AnimationInstance, _progress: number): void {
    // 简化实现：由外部渲染器处理
    // 这里只记录动画进度供外部使用
  }

  /**
   * 渲染怪物消失动画（倒下）
   */
  private renderMonsterDisappear(animation: AnimationInstance, progress: number): void {
    if (!this.ctx || !animation.config.targetId) return;

    const position = this.unitPositions.get(animation.config.targetId);
    if (!position) return;

    this.ctx.save();

    // 怪物倒下效果（垂直压缩）
    const scaleY = 1 - progress * 0.5;
    const alpha = 1 - progress * 0.5;

    this.ctx.globalAlpha = alpha;
    this.ctx.translate(position.x, position.y + 96);
    this.ctx.scale(1, scaleY);
    this.ctx.translate(-position.x, -(position.y + 96));

    // 简化：绘制阴影
    this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
    this.ctx.ellipse(position.x + 48, position.y + 100, 40 * (1 - progress), 10, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  /**
   * 获取飘字颜色
   */
  private getFloatColor(color: FloatColor): string {
    switch (color) {
      case FloatColor.DAMAGE_NORMAL:
        return '#FFFFFF';
      case FloatColor.DAMAGE_CRITICAL:
        return '#FF4444';
      case FloatColor.DAMAGE_SUPER:
        return '#FF8800';
      case FloatColor.DAMAGE_WEAK:
        return '#4488FF';
      case FloatColor.HEAL:
        return '#44FF44';
      case FloatColor.STATUS:
        return '#AA44FF';
      case FloatColor.EXP:
        return '#FFDD00';
      default:
        return '#FFFFFF';
    }
  }

  /**
   * 获取状态名称
   */
  private getStatusName(statusId: StatusEffectId): string {
    const names: Record<StatusEffectId, string> = {
      [StatusEffectId.POISON]: '中毒',
      [StatusEffectId.BAD_POISON]: '剧毒',
      [StatusEffectId.BURN]: '灼烧',
      [StatusEffectId.PARALYSIS]: '麻痹',
      [StatusEffectId.FREEZE]: '冰冻',
      [StatusEffectId.SLEEP]: '睡眠',
      [StatusEffectId.CONFUSE]: '混乱',
      [StatusEffectId.FLINCH]: '畏缩',
      [StatusEffectId.BOUND]: '束缚',
      [StatusEffectId.TAUNT]: '挑衅',
      [StatusEffectId.FEAR]: '恐惧',
      [StatusEffectId.FAINT]: '气绝',
      [StatusEffectId.WEAKEN]: '虚弱',
      [StatusEffectId.VULNERABLE]: '破防',
      [StatusEffectId.CURSE]: '诅咒',
      [StatusEffectId.DOOM]: '厄运',
      [StatusEffectId.REVIVE]: '复活',
      [StatusEffectId.SHIELD]: '护盾',
      [StatusEffectId.REFLECT]: '反射',
      [StatusEffectId.LIGHT_SCREEN]: '光墙',
      [StatusEffectId.SUBSTITUTE]: '替身',
      [StatusEffectId.AMNESIA]: '健忘',
      [StatusEffectId.SLOW]: '缓慢',
      [StatusEffectId.SILENCE]: '沉默',
      [StatusEffectId.BLIND]: '失明',
      [StatusEffectId.HYPNOSIS]: '沉睡',
      [StatusEffectId.DRUNK]: '醉酒',
      [StatusEffectId.RAGE]: '狂暴',
      [StatusEffectId.MOCK]: '嘲讽',
      [StatusEffectId.SEAL]: '封印',
      [StatusEffectId.DRAIN]: '吸收',
      [StatusEffectId.REGENERATE]: '再生',
      [StatusEffectId.POISON_STING]: '毒针',
    };
    return names[statusId] || statusId;
  }

  /**
   * 生成动画 ID
   */
  private generateAnimationId(): string {
    return `anim_${this.animationIdCounter++}_${Date.now()}`;
  }

  /**
   * 清除所有动画
   */
  clear(): void {
    this.animationQueue = [];
    this.activeAnimations.clear();
    console.log('[BattleAnimationManager] All animations cleared');
  }

  /**
   * 获取动画队列状态
   */
  getQueueStatus(): { queued: number; active: number } {
    return {
      queued: this.animationQueue.length,
      active: this.activeAnimations.size,
    };
  }
}

/**
 * 导出战斗动画管理器单例
 */
export const battleAnimationManager = BattleAnimationManager.getInstance();
