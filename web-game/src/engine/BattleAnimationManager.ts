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
 * - 攻击特效（怪物闪烁、屏幕震动、顿帧、hitstop）
 */

import {
  BattleEvent,
  BattleUnit,
} from './BattleState';
import { TechniqueData } from './TechniqueData';
import { StatusEffectId } from './StatusEffectManager';
import {
  BattleSoundManager,
  SoundElement,
} from './BattleSoundManager';

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
  /** 顿帧（hitstop）- 打击感效果 */
  HITSTOP = 'hitstop',
  /** 攻击动画 - 攻击者向前冲 */
  ATTACK_LUNGE = 'attack_lunge',
  /** 受击动画 - 受击者向后退 */
  HIT_RECOIL = 'hit_recoil',
  /** 连击数显示 */
  COMBO_COUNT = 'combo_count',
  /** 暴击特效 */
  CRITICAL_HIT = 'critical_hit',
  /** 状态持续效果（中毒、灼烧等） */
  STATUS_EFFECT = 'status_effect',
  /** 属性伤害特效 */
  ELEMENTAL_DAMAGE = 'elemental_damage',
  /** 技能光波 */
  SKILL_WAVE = 'skill_wave',
  /** 防御护盾 */
  SHIELD_BREAK = 'shield_break',
  /** 必杀技动画 */
  ULTIMATE = 'ultimate',
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
  /** 吸血效果（青色） */
  DRAIN = 'drain',
  /** 反弹伤害（灰色） */
  REFLECT = 'reflect',
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
  /** 是否暴击 */
  isCritical?: boolean;
  /** 字体大小 */
  fontSize?: number;
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
  /** 状态持续时间（回合） */
  duration?: number;
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
  /** 震动方向（'both' | 'x' | 'y'） */
  direction?: 'both' | 'x' | 'y';
}

/**
 * 顿帧配置（hitstop）
 */
export interface HitstopConfig {
  /** 顿帧持续时间（毫秒） */
  duration: number;
  /** 是否完全冻结画面 */
  freezeAll?: boolean;
}

/**
 * 攻击冲刺配置
 */
export interface LungeConfig {
  /** 目标单位 ID */
  targetId: string;
  /** 源单位 ID */
  sourceId: string;
  /** 冲刺距离 */
  distance: number;
  /** 冲刺持续时间（毫秒） */
  duration: number;
}

/**
 * 受击后退配置
 */
export interface RecoilConfig {
  /** 目标单位 ID */
  targetId: string;
  /** 后退距离 */
  distance: number;
  /** 后退持续时间（毫秒） */
  duration: number;
}

/**
 * 连击数配置
 */
export interface ComboConfig {
  /** 连击数 */
  count: number;
  /** 最大连击数（用于计算颜色） */
  maxCount: number;
  /** 目标单位 ID */
  targetId: string;
  /** 位置 */
  x: number;
  y: number;
}

/**
 * 属性伤害特效配置
 */
export interface ElementalDamageConfig {
  /** 目标单位 ID */
  targetId: string;
  /** 元素类型 */
  element: string;
  /** 伤害值 */
  damage: number;
  /** 位置 */
  x: number;
  y: number;
}

/**
 * 技能光波配置
 */
export interface SkillWaveConfig {
  /** 起始位置 */
  startX: number;
  /** 起始 Y */
  startY: number;
  /** 目标 X */
  targetX: number;
  /** 目标 Y */
  targetY: number;
  /** 光波颜色 */
  color: string;
  /** 光波宽度 */
  width: number;
  /** 光波持续时间（毫秒） */
  duration: number;
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
  /** 当前进度（0-1） */
  progress: number;
}

/**
 * 屏幕偏移（用于震动效果）
 */
interface ScreenOffset {
  x: number;
  y: number;
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

  /** 音效管理器引用 */
  private soundManager: BattleSoundManager | null = null;

  /** 屏幕偏移（用于震动） */
  private screenOffset: ScreenOffset = { x: 0, y: 0 };

  /** 顿帧状态 */
  private hitstopActive: boolean = false;
  private hitstopEndTime: number = 0;

  /** 当前连击数 */
  private currentCombo: number = 0;
  private comboTimer: number | null = null;

  /** 状态效果映射（用于持续状态动画） */
  private statusEffects: Map<string, { statusId: StatusEffectId; startTime: number }[]> = new Map();

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

    // 获取音效管理器实例
    this.soundManager = BattleSoundManager.getInstance();

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
          const color = this.getDamageColor(event, event.value);

          this.playDamageFloat(
            event.targetId,
            event.value,
            color,
            event.isCritical
          );
          this.playMonsterFlash(event.targetId);
          this.playHitRecoil(event.targetId);

          // 暴击时播放额外特效
          if (event.isCritical) {
            this.playCriticalHit(event.targetId);
            this.playHitstop(80); // 暴击顿帧时间更长
          } else {
            this.playHitstop(40); // 普通攻击顿帧
          }

          // 增加连击数
          this.incrementCombo();

          // 播放伤害音效
          if (this.soundManager) {
            this.soundManager.playDamageSound(event.value, event.isCritical || false);
          }
        }
        break;

      case 'heal':
        if (event.value !== undefined && event.targetId) {
          this.playHealFloat(event.targetId, event.value);

          // 播放治疗音效
          if (this.soundManager) {
            this.soundManager.playHealSound(event.value);
          }
        }
        break;

      case 'status_apply':
        if (event.statusId && event.targetId) {
          this.playStatusApply(event.statusId as StatusEffectId, event.targetId);
          this.playStatusEffect(event.statusId as StatusEffectId, event.targetId);

          // 播放状态音效
          if (this.soundManager) {
            this.soundManager.playStatusSound(event.statusId as string);
          }
        }
        break;

      case 'faint':
        if (event.targetId) {
          this.playMonsterDisappear(event.targetId);
          this.resetCombo(); // 怪物倒下时重置连击

          // 播放怪物倒下音效
          if (this.soundManager) {
            this.soundManager.playMonsterFaintSound();
          }
        }
        break;

      case 'level_up':
        if (event.targetId) {
          this.playLevelUp(event.targetId);

          // 播放升级音效
          if (this.soundManager) {
            this.soundManager.playLevelUpSound();
          }
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
   * 获取伤害颜色类型
   */
  private getDamageColor(event: BattleEvent, _value: number): FloatColor {
    if (event.isCritical) {
      return FloatColor.DAMAGE_CRITICAL;
    }
    if (event.effective !== undefined && event.effective > 1.5) {
      return FloatColor.DAMAGE_SUPER;
    }
    if (event.effective !== undefined && event.effective < 0.7) {
      return FloatColor.DAMAGE_WEAK;
    }
    return FloatColor.DAMAGE_NORMAL;
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

    // 根据技能威力决定动画类型
    const isUltimate = technique.power >= 90;
    const duration = isUltimate ? 1500 : 800;

    const config: AnimationConfig = {
      type: isUltimate ? AnimationType.ULTIMATE : AnimationType.TECHNIQUE,
      sourceId,
      targetIds: targetIds as any,
      techniqueId: technique.slug,
      duration,
      params: {
        element: technique.element,
        power: technique.power,
        animation: technique.animation,
        isUltimate,
      },
    };

    const instance: AnimationInstance = {
      id: animationId,
      config,
      startTime: Date.now(),
      completed: false,
      progress: 0,
    };

    this.animationQueue.push(instance);

    // 播放攻击冲刺动画
    if (targetIds.length > 0) {
      this.playAttackLunge(sourceId, targetIds[0]);
    }

    // 必杀技时播放屏幕震动
    if (isUltimate) {
      this.playScreenShake(8, 4);
    }

    // 播放技能音效
    if (this.soundManager) {
      const element = this.mapElementToSoundElement(technique.element);
      this.soundManager.playTechniqueSound(technique.slug, element, technique.power);
    }

    // 播放技能光波
    if (targetIds.length > 0) {
      const sourcePos = this.unitPositions.get(sourceId);
      const targetPos = this.unitPositions.get(targetIds[0]);
      if (sourcePos && targetPos) {
        this.playSkillWave(
          sourcePos.x + 48, sourcePos.y + 48,
          targetPos.x + 48, targetPos.y + 48,
          this.getElementColor(technique.element)
        );
      }
    }

    console.log(`[BattleAnimationManager] Queued technique animation: ${technique.name}`);
    return animationId;
  }

  /**
   * 获取元素对应的颜色
   */
  private getElementColor(element?: string): string {
    const colorMap: Record<string, string> = {
      fire: '#FF4444',
      water: '#4444FF',
      grass: '#44FF44',
      electric: '#FFFF44',
      ice: '#88FFFF',
      poison: '#AA44FF',
      ground: '#AA7744',
      flying: '#88AAFF',
      psychic: '#FF88FF',
      ghost: '#6644AA',
      dragon: '#4444AA',
      dark: '#444466',
      steel: '#AAAAAA',
      fairy: '#FFAAFF',
    };
    return element ? (colorMap[element.toLowerCase()] || '#FFFFFF') : '#FFFFFF';
  }

  /**
   * 播放伤害飘字
   *
   * @param targetId 目标单位 ID
   * @param value 伤害值
   * @param color 颜色类型
   * @param isCritical 是否暴击
   */
  playDamageFloat(targetId: string, value: number, color: FloatColor = FloatColor.DAMAGE_NORMAL, isCritical?: boolean): string {
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
      riseDistance: 80,
      duration: 1000,
      isCritical,
      fontSize: isCritical ? 32 : 24,
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
      progress: 0,
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
          riseDistance: 50,
          fontSize: 24,
        },
      },
      startTime: Date.now(),
      completed: false,
      progress: 0,
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
        duration: 1200,
        params: {
          value,
          color: FloatColor.EXP,
          startX: position.x,
          startY: position.y + 80,
          riseDistance: 60,
          fontSize: 20,
        },
      },
      startTime: Date.now(),
      completed: false,
      progress: 0,
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
      progress: 0,
    };

    this.animationQueue.push(instance);
    return animationId;
  }

  /**
   * 播放状态持续效果动画
   *
   * @param statusId 状态 ID
   * @param targetId 目标单位 ID
   */
  playStatusEffect(statusId: StatusEffectId, targetId: string): string {
    // 添加到状态效果映射
    if (!this.statusEffects.has(targetId)) {
      this.statusEffects.set(targetId, []);
    }
    this.statusEffects.get(targetId)!.push({
      statusId,
      startTime: Date.now(),
    });

    // 启动持续状态动画
    const animationId = this.generateAnimationId();

    const instance: AnimationInstance = {
      id: animationId,
      config: {
        type: AnimationType.STATUS_EFFECT,
        targetId,
        duration: 5000, // 5秒持续效果
        params: {
          statusId,
          statusName: this.getStatusName(statusId),
        },
      },
      startTime: Date.now(),
      completed: false,
      progress: 0,
    };

    this.animationQueue.push(instance);
    return animationId;
  }

  /**
   * 移除单位的状态效果
   *
   * @param targetId 目标单位 ID
   * @param statusId 状态 ID（可选，不指定则移除所有）
   */
  removeStatusEffect(targetId: string, statusId?: StatusEffectId): void {
    if (!this.statusEffects.has(targetId)) return;

    if (statusId) {
      const effects = this.statusEffects.get(targetId)!;
      const index = effects.findIndex(e => e.statusId === statusId);
      if (index !== -1) {
        effects.splice(index, 1);
      }
    } else {
      this.statusEffects.delete(targetId);
    }
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
      progress: 0,
    };

    this.animationQueue.push(instance);
    return animationId;
  }

  /**
   * 播放屏幕震动效果
   *
   * @param intensity 震动强度
   * @param count 震动次数
   * @param direction 震动方向
   */
  playScreenShake(intensity: number = 5, count: number = 3, direction: 'both' | 'x' | 'y' = 'both'): string {
    const animationId = this.generateAnimationId();

    const instance: AnimationInstance = {
      id: animationId,
      config: {
        type: AnimationType.SCREEN_SHAKE,
        duration: count * 80,
        params: { intensity, count, duration: 80, direction },
      },
      startTime: Date.now(),
      completed: false,
      progress: 0,
    };

    this.animationQueue.push(instance);
    return animationId;
  }

  /**
   * 播放顿帧效果（hitstop）
   *
   * @param duration 顿帧持续时间（毫秒）
   * @param freezeAll 是否完全冻结画面
   */
  playHitstop(duration: number, freezeAll: boolean = false): string {
    const animationId = this.generateAnimationId();

    this.hitstopActive = true;
    this.hitstopEndTime = Date.now() + duration;

    const instance: AnimationInstance = {
      id: animationId,
      config: {
        type: AnimationType.HITSTOP,
        duration,
        params: { freezeAll },
      },
      startTime: Date.now(),
      completed: false,
      progress: 0,
    };

    this.animationQueue.push(instance);
    return animationId;
  }

  /**
   * 播放攻击冲刺动画
   *
   * @param sourceId 攻击者 ID
   * @param targetId 目标 ID
   */
  playAttackLunge(sourceId: string, targetId: string): string {
    const animationId = this.generateAnimationId();

    const sourcePos = this.unitPositions.get(sourceId);
    const targetPos = this.unitPositions.get(targetId);

    if (!sourcePos || !targetPos) {
      console.warn('[BattleAnimationManager] Cannot play lunge: missing position data');
      return '';
    }

    const distance = Math.abs(targetPos.x - sourcePos.x) * 0.5;

    const instance: AnimationInstance = {
      id: animationId,
      config: {
        type: AnimationType.ATTACK_LUNGE,
        sourceId,
        targetId,
        duration: 150,
        params: {
          distance,
          direction: sourcePos.x < targetPos.x ? 1 : -1,
        },
      },
      startTime: Date.now(),
      completed: false,
      progress: 0,
    };

    this.animationQueue.push(instance);
    return animationId;
  }

  /**
   * 播放受击后退动画
   *
   * @param targetId 目标 ID
   */
  playHitRecoil(targetId: string, distance: number = 10): string {
    const animationId = this.generateAnimationId();

    const instance: AnimationInstance = {
      id: animationId,
      config: {
        type: AnimationType.HIT_RECOIL,
        targetId,
        duration: 200,
        params: { distance },
      },
      startTime: Date.now(),
      completed: false,
      progress: 0,
    };

    this.animationQueue.push(instance);
    return animationId;
  }

  /**
   * 播放暴击特效
   *
   * @param targetId 目标 ID
   */
  playCriticalHit(targetId: string): string {
    const animationId = this.generateAnimationId();

    const position = this.unitPositions.get(targetId);
    if (!position) return '';

    const instance: AnimationInstance = {
      id: animationId,
      config: {
        type: AnimationType.CRITICAL_HIT,
        targetId,
        duration: 400,
        params: { x: position.x + 48, y: position.y + 48 },
      },
      startTime: Date.now(),
      completed: false,
      progress: 0,
    };

    this.animationQueue.push(instance);
    return animationId;
  }

  /**
   * 播放连击数显示
   */
  private showCombo(): void {
    if (this.currentCombo < 2) return;

    const animationId = this.generateAnimationId();

    const instance: AnimationInstance = {
      id: animationId,
      config: {
        type: AnimationType.COMBO_COUNT,
        duration: 500,
        params: {
          count: this.currentCombo,
          x: this.canvasSize.width / 2,
          y: 100,
        },
      },
      startTime: Date.now(),
      completed: false,
      progress: 0,
    };

    this.animationQueue.push(instance);
  }

  /**
   * 增加连击数
   */
  private incrementCombo(): void {
    this.currentCombo++;
    void this.currentCombo; // 避免未使用警告
    this.showCombo();

    // 重置连击计时器
    if (this.comboTimer) {
      clearTimeout(this.comboTimer);
    }
    this.comboTimer = window.setTimeout(() => {
      this.resetCombo();
    }, 2000); // 2秒后重置连击
  }

  /**
   * 重置连击数
   */
  private resetCombo(): void {
    this.currentCombo = 0;
    if (this.comboTimer) {
      clearTimeout(this.comboTimer);
      this.comboTimer = null;
    }
  }

  /**
   * 播放技能光波
   *
   * @param startX 起始 X
   * @param startY 起始 Y
   * @param targetX 目标 X
   * @param targetY 目标 Y
   * @param color 光波颜色
   */
  playSkillWave(startX: number, startY: number, targetX: number, targetY: number, color: string): string {
    const animationId = this.generateAnimationId();

    const instance: AnimationInstance = {
      id: animationId,
      config: {
        type: AnimationType.SKILL_WAVE,
        duration: 400,
        params: {
          startX, startY, targetX, targetY, color,
          width: 20,
        },
      },
      startTime: Date.now(),
      completed: false,
      progress: 0,
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
        duration: 1200,
        params: {
          playerUnits,
          enemyUnits,
        },
      },
      startTime: Date.now(),
      completed: false,
      progress: 0,
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
        duration: 1000,
      },
      startTime: Date.now(),
      completed: false,
      progress: 0,
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
        duration: 600,
      },
      startTime: Date.now(),
      completed: false,
      progress: 0,
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
      progress: 0,
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
        duration: 1800,
        params: { newLevel },
      },
      startTime: Date.now(),
      completed: false,
      progress: 0,
    };

    this.animationQueue.push(instance);
    return animationId;
  }

  /**
   * 获取当前的屏幕偏移（用于震动效果）
   */
  getScreenOffset(): { x: number; y: number } {
    return { ...this.screenOffset };
  }

  /**
   * 检查是否处于顿帧状态
   */
  isHitstopActive(): boolean {
    return this.hitstopActive;
  }

  /**
   * 更新动画（每帧调用）
   */
  update(): void {
    // const now = Date.now();

    // 检查顿帧状态
    if (this.hitstopActive && Date.now() > this.hitstopEndTime) {
      this.hitstopActive = false;
    }

    // 处于顿帧状态时不更新动画
    if (this.hitstopActive) {
      return;
    }

    // 处理队列中的动画
    for (let i = this.animationQueue.length - 1; i >= 0; i--) {
      const animation = this.animationQueue[i];
      if (animation.config.delay && Date.now() - animation.startTime < animation.config.delay) {
        continue;
      }

      // 开始播放动画
      this.animationQueue.splice(i, 1);
      this.activeAnimations.set(animation.id, animation);
    }

    // 更新正在播放的动画
    const completedIds: string[] = [];
    for (const [_id, animation] of this.activeAnimations) {
      const elapsed = Date.now() - animation.startTime;
      const duration = animation.config.duration || 500;
      animation.progress = Math.min(elapsed / duration, 1);

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

    // const now = Date.now();

    // 重置屏幕偏移
    this.screenOffset = { x: 0, y: 0 };

    for (const [_id, animation] of this.activeAnimations) {
      const progress = animation.progress;

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

        case AnimationType.CRITICAL_HIT:
          this.renderCriticalHit(animation, progress);
          break;

        case AnimationType.COMBO_COUNT:
          this.renderComboCount(animation, progress);
          break;

        case AnimationType.STATUS_EFFECT:
          this.renderStatusEffect(animation, progress);
          break;

        case AnimationType.SKILL_WAVE:
          this.renderSkillWave(animation, progress);
          break;

        case AnimationType.SCREEN_SHAKE:
          this.applyScreenShake(animation, progress);
          break;

        case AnimationType.BATTLE_ENTER:
          this.renderBattleEnter(animation, progress);
          break;

        case AnimationType.BATTLE_EXIT:
          this.renderBattleExit(animation, progress);
          break;

        case AnimationType.ULTIMATE:
          this.renderUltimate(animation, progress);
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
    this.ctx.font = `bold ${params.fontSize || 24}px Arial`;
    this.ctx.textAlign = 'center';

    // 根据类型设置颜色
    const color = this.getFloatColor(params.color);
    this.ctx.fillStyle = color;

    // 绘制阴影
    this.ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    this.ctx.lineWidth = 3;
    const text = params.color === FloatColor.HEAL ? `+${params.value}` : `-${params.value}`;
    this.ctx.strokeText(text, params.startX, currentY);
    this.ctx.fillText(text, params.startX, currentY);

    // 暴击时添加额外效果
    if (params.isCritical) {
      this.ctx.font = 'italic 16px Arial';
      this.ctx.fillStyle = '#FFD700';
      this.ctx.strokeText('暴击!', params.startX, currentY - 30);
      this.ctx.fillText('暴击!', params.startX, currentY - 30);
    }

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
    this.ctx.strokeText(params.statusName, 0, 0);
    this.ctx.fillText(params.statusName, 0, 0);

    this.ctx.restore();
  }

  /**
   * 渲染状态持续效果
   */
  private renderStatusEffect(animation: AnimationInstance, progress: number): void {
    if (!this.ctx || !animation.config.targetId) return;

    const position = this.unitPositions.get(animation.config.targetId);
    if (!position) return;

    const params = animation.config.params as { statusId: StatusEffectId; statusName: string };
    const statusColor = this.getStatusColor(params.statusId);

    this.ctx.save();

    // 状态特效：粒子效果
    const particleCount = 5;
    for (let i = 0; i < particleCount; i++) {
      const angle = (progress * Math.PI * 2) + (i * (Math.PI * 2 / particleCount));
      const radius = 20 + Math.sin(progress * Math.PI * 4) * 10;
      const x = position.x + 48 + Math.cos(angle) * radius;
      const y = position.y + 48 + Math.sin(angle) * radius;

      this.ctx.beginPath();
      this.ctx.arc(x, y, 3, 0, Math.PI * 2);
      this.ctx.fillStyle = statusColor;
      this.ctx.globalAlpha = 1 - progress;
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  /**
   * 获取状态对应的颜色
   */
  private getStatusColor(statusId: StatusEffectId): string {
    const colorMap: Partial<Record<StatusEffectId, string>> = {
      [StatusEffectId.POISON]: '#AA44FF',
      [StatusEffectId.BAD_POISON]: '#6622AA',
      [StatusEffectId.BURN]: '#FF4444',
      [StatusEffectId.PARALYSIS]: '#FFFF44',
      [StatusEffectId.FREEZE]: '#88FFFF',
      [StatusEffectId.SLEEP]: '#4444FF',
    };
    return colorMap[statusId] || '#FFFFFF';
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
   * 渲染暴击特效
   */
  private renderCriticalHit(animation: AnimationInstance, progress: number): void {
    if (!this.ctx) return;

    const params = animation.config.params as { x: number; y: number };

    this.ctx.save();

    // 暴击文字
    const scale = 1 + progress * 0.5;
    const alpha = 1 - progress;

    this.ctx.translate(params.x, params.y);
    this.ctx.scale(scale, scale);
    this.ctx.globalAlpha = alpha;

    this.ctx.font = 'bold 48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = '#FF0000';
    this.ctx.strokeStyle = '#FFFF00';
    this.ctx.lineWidth = 4;

    this.ctx.strokeText('CRITICAL!', 0, 0);
    this.ctx.fillText('CRITICAL!', 0, 0);

    // 星星效果
    const starCount = 5;
    for (let i = 0; i < starCount; i++) {
      const angle = (i / starCount) * Math.PI * 2 + progress * Math.PI;
      const radius = 60 + progress * 30;
      const starX = Math.cos(angle) * radius;
      const starY = Math.sin(angle) * radius;

      this.ctx.font = '24px Arial';
      this.ctx.fillText('★', starX, starY);
    }

    this.ctx.restore();
  }

  /**
   * 渲染连击数
   */
  private renderComboCount(animation: AnimationInstance, progress: number): void {
    if (!this.ctx) return;

    const params = animation.config.params as { count: number; x: number; y: number };

    this.ctx.save();

    const scale = 1 + Math.sin(progress * Math.PI) * 0.2;
    const alpha = progress < 0.2 ? progress * 5 : (1 - progress) * 1.25;

    this.ctx.translate(params.x, params.y);
    this.ctx.scale(scale, scale);
    this.ctx.globalAlpha = alpha;

    this.ctx.font = 'bold 36px Arial';
    this.ctx.textAlign = 'center';

    // 连击数颜色随数量变化
    let color = '#FFFFFF';
    if (params.count >= 10) color = '#FF0000';
    else if (params.count >= 5) color = '#FF8800';
    else if (params.count >= 3) color = '#FFFF00';

    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 4;

    this.ctx.strokeText(`${params.count} HIT`, 0, 0);
    this.ctx.fillText(`${params.count} HIT`, 0, 0);

    this.ctx.restore();
  }

  /**
   * 渲染技能光波
   */
  private renderSkillWave(animation: AnimationInstance, progress: number): void {
    if (!this.ctx) return;

    const params = animation.config.params as SkillWaveConfig;

    this.ctx.save();

    // 计算当前位置
    const currentX = params.startX + (params.targetX - params.startX) * progress;
    const currentY = params.startY + (params.targetY - params.startY) * progress;

    // 绘制光波
    const gradient = this.ctx.createRadialGradient(currentX, currentY, 0, currentX, currentY, params.width);
    gradient.addColorStop(0, params.color);
    gradient.addColorStop(1, 'rgba(255,255,255,0)');

    this.ctx.globalAlpha = 1 - progress;
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(currentX, currentY, params.width * (1 + progress), 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  /**
   * 应用屏幕震动
   */
  private applyScreenShake(animation: AnimationInstance, progress: number): void {
    const params = animation.config.params as ShakeConfig;
    const direction = params.direction || 'both';

    // 计算当前震动偏移
    const phase = progress * Math.PI * 2 * params.count;
    const offsetX = direction === 'y' ? 0 : Math.sin(phase) * params.intensity;
    const offsetY = direction === 'x' ? 0 : Math.cos(phase) * params.intensity;

    this.screenOffset.x = offsetX;
    this.screenOffset.y = offsetY;
  }

  /**
   * 渲染战斗进入动画
   */
  private renderBattleEnter(_animation: AnimationInstance, progress: number): void {
    if (!this.ctx) return;

    // 黑色渐变效果
    if (progress < 0.5) {
      const alpha = 1 - (progress * 2);
      this.ctx.fillStyle = `rgba(0,0,0,${alpha})`;
      this.ctx.fillRect(0, 0, this.canvasSize.width, this.canvasSize.height);
    } else {
      const alpha = (progress - 0.5) * 2;
      this.ctx.fillStyle = `rgba(0,0,0,${alpha})`;
      this.ctx.fillRect(0, 0, this.canvasSize.width, this.canvasSize.height);
    }

    // 战斗开始文字
    if (progress > 0.3 && progress < 0.7) {
      const textAlpha = progress > 0.5 ? (0.7 - progress) * 5 : (progress - 0.3) * 5;
      this.ctx.save();
      this.ctx.globalAlpha = textAlpha;
      this.ctx.font = 'bold 48px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = 6;
      this.ctx.strokeText('BATTLE START!', this.canvasSize.width / 2, this.canvasSize.height / 2);
      this.ctx.fillText('BATTLE START!', this.canvasSize.width / 2, this.canvasSize.height / 2);
      this.ctx.restore();
    }
  }

  /**
   * 渲染战斗退出动画
   */
  private renderBattleExit(_animation: AnimationInstance, progress: number): void {
    if (!this.ctx) return;

    // 黑色渐变效果
    const alpha = progress;
    this.ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    this.ctx.fillRect(0, 0, this.canvasSize.width, this.canvasSize.height);

    // 战斗结束文字
    if (progress > 0.2) {
      const textAlpha = Math.min((progress - 0.2) * 1.25, 1);
      this.ctx.save();
      this.ctx.globalAlpha = textAlpha;
      this.ctx.font = 'bold 48px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillStyle = '#FFD700';
      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = 6;
      this.ctx.strokeText('VICTORY!', this.canvasSize.width / 2, this.canvasSize.height / 2);
      this.ctx.fillText('VICTORY!', this.canvasSize.width / 2, this.canvasSize.height / 2);
      this.ctx.restore();
    }
  }

  /**
   * 渲染必杀技动画
   */
  private renderUltimate(_animation: AnimationInstance, progress: number): void {
    if (!this.ctx) return;

    // 能量汇聚效果
    if (progress < 0.3) {
      const alpha = progress / 0.3;
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = 'rgba(255,215,0,0.3)';
      this.ctx.fillRect(0, 0, this.canvasSize.width, this.canvasSize.height);
      this.ctx.restore();
    }

    // 必杀技文字
    if (progress > 0.2 && progress < 0.8) {
      const textAlpha = progress > 0.5 ? (0.8 - progress) * 3.33 : (progress - 0.2) * 3.33;
      this.ctx.save();
      this.ctx.globalAlpha = textAlpha;
      this.ctx.font = 'bold 56px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillStyle = '#FFD700';
      this.ctx.strokeStyle = '#FF0000';
      this.ctx.lineWidth = 8;
      this.ctx.strokeText('ULTIMATE!', this.canvasSize.width / 2, this.canvasSize.height / 2);
      this.ctx.fillText('ULTIMATE!', this.canvasSize.width / 2, this.canvasSize.height / 2);
      this.ctx.restore();
    }
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
    // 实际绘制会使用 progress 参数进行缩放和淡入效果
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
   * 将技能属性映射到音效元素
   *
   * @param element 技能属性名称
   */
  private mapElementToSoundElement(element?: string): SoundElement | undefined {
    if (!element) return undefined;

    const elementMap: Record<string, SoundElement> = {
      fire: SoundElement.FIRE,
      water: SoundElement.WATER,
      grass: SoundElement.GRASS,
      electric: SoundElement.ELECTRIC,
      ice: SoundElement.ICE,
      flying: SoundElement.FLYING,
      fighting: SoundElement.FIGHTING,
      poison: SoundElement.POISON,
      ground: SoundElement.GROUND,
      rock: SoundElement.ROCK,
      bug: SoundElement.BUG,
      ghost: SoundElement.GHOST,
      steel: SoundElement.STEEL,
      dragon: SoundElement.DRAGON,
      dark: SoundElement.DARK,
      fairy: SoundElement.FAIRY,
      normal: SoundElement.NORMAL,
    };

    return elementMap[element.toLowerCase()];
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
      case FloatColor.DRAIN:
        return '#00CCCC';
      case FloatColor.REFLECT:
        return '#888888';
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
    this.statusEffects.clear();
    this.resetCombo();
    this.hitstopActive = false;
    this.screenOffset = { x: 0, y: 0 };
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
