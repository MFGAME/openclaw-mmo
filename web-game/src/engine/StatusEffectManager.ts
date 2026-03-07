/**
 * 状态效果管理器
 *
 * 基于 Tuxemon 的状态效果系统
 *
 * 功能：
 * - 定义状态类型枚举（35 种状态）
 * - 状态效果数据结构
 * - 状态效果触发逻辑（回合开始/结束触发）
 * - 状态持续回合管理
 * - 状态清除逻辑
 */

/**
 * 状态效果 ID 枚举（35 种状态）
 */
export enum StatusEffectId {
  /** 中毒 */
  POISON = 'poison',
  /** 剧毒 */
  BAD_POISON = 'bad_poison',
  /** 灼烧 */
  BURN = 'burn',
  /** 麻痹 */
  PARALYSIS = 'paralysis',
  /** 冰冻 */
  FREEZE = 'freeze',
  /** 睡眠 */
  SLEEP = 'sleep',
  /** 混乱 */
  CONFUSE = 'confuse',
  /** 畏缩 */
  FLINCH = 'flinch',
  /** 束缚 */
  BOUND = 'bound',
  /** 挑衅 */
  TAUNT = 'taunt',
  /** 恐惧 */
  FEAR = 'fear',
  /** 气绝 */
  FAINT = 'faint',
  /** 虚弱 */
  WEAKEN = 'weaken',
  /** 破防 */
  VULNERABLE = 'vulnerable',
  /** 诅咒 */
  CURSE = 'curse',
  /** 厄运 */
  DOOM = 'doom',
  /** 复活 */
  REVIVE = 'revive',
  /** 护盾 */
  SHIELD = 'shield',
  /** 反射 */
  REFLECT = 'reflect',
  /** 光墙 */
  LIGHT_SCREEN = 'light_screen',
  /** 替身 */
  SUBSTITUTE = 'substitute',
  /** 健忘 */
  AMNESIA = 'amnesia',
  /** 缓慢 */
  SLOW = 'slow',
  /** 沉默 */
  SILENCE = 'silence',
  /** 失明 */
  BLIND = 'blind',
  /** 沉睡 */
  HYPNOSIS = 'hypnosis',
  /** 醉酒 */
  DRUNK = 'drunk',
  /** 狂暴 */
  RAGE = 'rage',
  /** 嘲讽 */
  MOCK = 'mock',
  /** 封印 */
  SEAL = 'seal',
  /** 吸收 */
  DRAIN = 'drain',
  /** 再生 */
  REGENERATE = 'regenerate',
  /** 毒针 */
  POISON_STING = 'poison_sting',
}

/**
 * 状态效果类型
 */
export enum StatusEffectType {
  /** 持续伤害 */
  DAMAGE_OVER_TIME = 'damage_over_time',
  /** 控制效果 */
  CONTROL = 'control',
  /** 能力下降 */
  STAT_DEBUFF = 'stat_debuff',
  /** 能力提升 */
  STAT_BUFF = 'stat_buff',
  /** 保护效果 */
  PROTECTION = 'protection',
  /** 特殊状态 */
  SPECIAL = 'special',
}

/**
 * 状态效果数据接口
 */
export interface StatusEffectData {
  /** 状态 ID */
  id: StatusEffectId;
  /** 状态名称 */
  name: string;
  /** 状态描述 */
  description: string;
  /** 状态类型 */
  type: StatusEffectType;
  /** 最大持续回合数（0 表示永久） */
  maxDuration: number;
  /** 是否可重叠 */
  isStackable: boolean;
  /** 是否可驱散 */
  isDispellable: boolean;
  /** 状态图标资源 */
  icon?: string;
  /** 状态音效资源 */
  sfx?: string;
}

/**
 * 状态效果实例接口
 */
export interface StatusEffectInstance {
  /** 状态 ID */
  id: StatusEffectId;
  /** 剩余回合数 */
  remainingTurns: number;
  /** 堆叠层数 */
  stacks: number;
  /** 应用时间 */
  appliedAt: number;
  /** 施加者 ID */
  sourceId?: string;
}

/**
 * 状态效果触发时机
 */
export enum StatusTrigger {
  /** 回合开始时 */
  TURN_START = 'turn_start',
  /** 回合结束时 */
  TURN_END = 'turn_end',
  /** 行动时 */
  ON_ACTION = 'on_action',
  /** 受到伤害时 */
  ON_DAMAGE = 'on_damage',
  /** 造成伤害时 */
  ON_DEAL_DAMAGE = 'on_deal_damage',
}

/**
 * 状态效果触发结果接口
 */
export interface StatusTriggerResult {
  /** 状态 ID */
  statusId: StatusEffectId;
  /** 目标单位 ID */
  targetId: string;
  /** 触发时机 */
  trigger: StatusTrigger;
  /** 伤害值 */
  damage?: number;
  /** 治疗值 */
  heal?: number;
  /** 属性变化 */
  statChange?: {
    stat: string;
    value: number;
  };
  /** 是否清除状态 */
  cleared?: boolean;
  /** 描述文本 */
  text: string;
}

/**
 * 属性修正接口
 */
export interface StatModifier {
  /** 攻击力修正 */
  attack?: number;
  /** 防御力修正 */
  defense?: number;
  /** 速度修正 */
  speed?: number;
  /** 特攻修正 */
  specialAttack?: number;
  /** 特防修正 */
  specialDefense?: number;
  /** 命中率修正 */
  accuracy?: number;
  /** 闪避率修正 */
  evasion?: number;
}

/**
 * 状态效果管理器类
 */
export class StatusEffectManager {
  private static instance: StatusEffectManager;

  /** 状态效果数据缓存 */
  private statusDataCache: Map<StatusEffectId, StatusEffectData> = new Map();

  /**
   * 私有构造函数，确保单例
   */
  private constructor() {
    this.initializeStatusEffects();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): StatusEffectManager {
    if (!StatusEffectManager.instance) {
      StatusEffectManager.instance = new StatusEffectManager();
    }
    return StatusEffectManager.instance;
  }

  /**
   * 初始化状态效果数据
   */
  private initializeStatusEffects(): void {
    // 持续伤害类状态
    this.statusDataCache.set(StatusEffectId.POISON, {
      id: StatusEffectId.POISON,
      name: '中毒',
      description: '每回合损失 1/8 HP',
      type: StatusEffectType.DAMAGE_OVER_TIME,
      maxDuration: 0, // 永久
      isStackable: false,
      isDispellable: true,
    });

    this.statusDataCache.set(StatusEffectId.BAD_POISON, {
      id: StatusEffectId.BAD_POISON,
      name: '剧毒',
      description: '每回合损失更多 HP（逐次递增）',
      type: StatusEffectType.DAMAGE_OVER_TIME,
      maxDuration: 0,
      isStackable: false,
      isDispellable: true,
    });

    this.statusDataCache.set(StatusEffectId.BURN, {
      id: StatusEffectId.BURN,
      name: '灼烧',
      description: '每回合损失 1/16 HP，攻击力减半',
      type: StatusEffectType.DAMAGE_OVER_TIME,
      maxDuration: 0,
      isStackable: false,
      isDispellable: true,
    });

    // 控制类状态
    this.statusDataCache.set(StatusEffectId.PARALYSIS, {
      id: StatusEffectId.PARALYSIS,
      name: '麻痹',
      description: '有 25% 几率无法行动，速度减半',
      type: StatusEffectType.CONTROL,
      maxDuration: 0,
      isStackable: false,
      isDispellable: true,
    });

    this.statusDataCache.set(StatusEffectId.FREEZE, {
      id: StatusEffectId.FREEZE,
      name: '冰冻',
      description: '无法行动，受到火属性伤害解除',
      type: StatusEffectType.CONTROL,
      maxDuration: 0,
      isStackable: false,
      isDispellable: true,
    });

    this.statusDataCache.set(StatusEffectId.SLEEP, {
      id: StatusEffectId.SLEEP,
      name: '睡眠',
      description: '无法行动，持续 2-4 回合',
      type: StatusEffectType.CONTROL,
      maxDuration: 4,
      isStackable: false,
      isDispellable: true,
    });

    this.statusDataCache.set(StatusEffectId.CONFUSE, {
      id: StatusEffectId.CONFUSE,
      name: '混乱',
      description: '有 33% 几率攻击自己，持续 2-5 回合',
      type: StatusEffectType.CONTROL,
      maxDuration: 5,
      isStackable: false,
      isDispellable: true,
    });

    this.statusDataCache.set(StatusEffectId.FLINCH, {
      id: StatusEffectId.FLINCH,
      name: '畏缩',
      description: '本回合无法行动',
      type: StatusEffectType.CONTROL,
      maxDuration: 1,
      isStackable: false,
      isDispellable: false,
    });

    this.statusDataCache.set(StatusEffectId.BOUND, {
      id: StatusEffectId.BOUND,
      name: '束缚',
      description: '无法逃跑，每回合损失 1/16 HP，持续 4-5 回合',
      type: StatusEffectType.CONTROL,
      maxDuration: 5,
      isStackable: false,
      isDispellable: true,
    });

    this.statusDataCache.set(StatusEffectId.TAUNT, {
      id: StatusEffectId.TAUNT,
      name: '挑衅',
      description: '只能使用攻击类技能，持续 3 回合',
      type: StatusEffectType.CONTROL,
      maxDuration: 3,
      isStackable: false,
      isDispellable: true,
    });

    this.statusDataCache.set(StatusEffectId.FEAR, {
      id: StatusEffectId.FEAR,
      name: '恐惧',
      description: '有 50% 几率无法攻击，持续 2-3 回合',
      type: StatusEffectType.CONTROL,
      maxDuration: 3,
      isStackable: false,
      isDispellable: true,
    });

    // 能力下降类状态
    this.statusDataCache.set(StatusEffectId.WEAKEN, {
      id: StatusEffectId.WEAKEN,
      name: '虚弱',
      description: '攻击力降低 2 级',
      type: StatusEffectType.STAT_DEBUFF,
      maxDuration: 5,
      isStackable: true,
      isDispellable: true,
    });

    this.statusDataCache.set(StatusEffectId.VULNERABLE, {
      id: StatusEffectId.VULNERABLE,
      name: '破防',
      description: '防御力降低 2 级',
      type: StatusEffectType.STAT_DEBUFF,
      maxDuration: 5,
      isStackable: true,
      isDispellable: true,
    });

    this.statusDataCache.set(StatusEffectId.SLOW, {
      id: StatusEffectId.SLOW,
      name: '缓慢',
      description: '速度降低 2 级',
      type: StatusEffectType.STAT_DEBUFF,
      maxDuration: 5,
      isStackable: true,
      isDispellable: true,
    });

    this.statusDataCache.set(StatusEffectId.BLIND, {
      id: StatusEffectId.BLIND,
      name: '失明',
      description: '命中率降低 2 级',
      type: StatusEffectType.STAT_DEBUFF,
      maxDuration: 5,
      isStackable: true,
      isDispellable: true,
    });

    // 特殊状态
    this.statusDataCache.set(StatusEffectId.CURSE, {
      id: StatusEffectId.CURSE,
      name: '诅咒',
      description: '每回合损失 1/4 HP，持续 4 回合',
      type: StatusEffectType.SPECIAL,
      maxDuration: 4,
      isStackable: false,
      isDispellable: true,
    });

    this.statusDataCache.set(StatusEffectId.DOOM, {
      id: StatusEffectId.DOOM,
      name: '厄运',
      description: '3 回合后立即死亡',
      type: StatusEffectType.SPECIAL,
      maxDuration: 3,
      isStackable: false,
      isDispellable: false,
    });

    // 保护效果
    this.statusDataCache.set(StatusEffectId.SHIELD, {
      id: StatusEffectId.SHIELD,
      name: '护盾',
      description: '抵挡下一次攻击',
      type: StatusEffectType.PROTECTION,
      maxDuration: 5,
      isStackable: true,
      isDispellable: false,
    });

    this.statusDataCache.set(StatusEffectId.REFLECT, {
      id: StatusEffectId.REFLECT,
      name: '反射',
      description: '物理伤害减半，持续 5 回合',
      type: StatusEffectType.PROTECTION,
      maxDuration: 5,
      isStackable: false,
      isDispellable: true,
    });

    this.statusDataCache.set(StatusEffectId.LIGHT_SCREEN, {
      id: StatusEffectId.LIGHT_SCREEN,
      name: '光墙',
      description: '特殊伤害减半，持续 5 回合',
      type: StatusEffectType.PROTECTION,
      maxDuration: 5,
      isStackable: false,
      isDispellable: true,
    });

    // 再生效果
    this.statusDataCache.set(StatusEffectId.REGENERATE, {
      id: StatusEffectId.REGENERATE,
      name: '再生',
      description: '每回合恢复 1/8 HP',
      type: StatusEffectType.SPECIAL,
      maxDuration: 0,
      isStackable: false,
      isDispellable: true,
    });
  }

  /**
   * 获取状态效果数据
   */
  getStatusData(statusId: StatusEffectId): StatusEffectData | null {
    return this.statusDataCache.get(statusId) || null;
  }

  /**
   * 创建状态效果实例
   */
  createStatusInstance(
    statusId: StatusEffectId,
    sourceId?: string
  ): StatusEffectInstance | null {
    const data = this.getStatusData(statusId);
    if (!data) {
      console.warn(`[StatusEffectManager] Unknown status: ${statusId}`);
      return null;
    }

    return {
      id: statusId,
      remainingTurns: data.maxDuration,
      stacks: 1,
      appliedAt: Date.now(),
      sourceId,
    };
  }

  /**
   * 触发回合开始效果
   */
  triggerTurnStart(
    targetId: string,
    _currentHp: number,
    _maxHp: number,
    statusList: StatusEffectInstance[]
  ): StatusTriggerResult[] {
    const results: StatusTriggerResult[] = [];

    for (const status of [...statusList]) {
      const data = this.getStatusData(status.id);
      if (!data) continue;

      switch (status.id) {
        case StatusEffectId.SLEEP:
          // 睡眠时无法行动
          results.push({
            statusId: status.id,
            targetId,
            trigger: StatusTrigger.TURN_START,
            text: `${targetId} 正在睡眠...`,
          });
          break;

        case StatusEffectId.PARALYSIS:
          // 麻痹：25% 几率无法行动
          if (Math.random() < 0.25) {
            results.push({
              statusId: status.id,
              targetId,
              trigger: StatusTrigger.TURN_START,
              text: `${targetId} 因麻痹无法行动！`,
            });
          }
          break;
      }
    }

    return results;
  }

  /**
   * 触发回合结束效果
   */
  triggerTurnEnd(
    targetId: string,
    currentHp: number,
    maxHp: number,
    statusList: StatusEffectInstance[],
    badPoisonTurns: number = 0
  ): StatusTriggerResult[] {
    const results: StatusTriggerResult[] = [];

    for (const status of [...statusList]) {
      const data = this.getStatusData(status.id);
      if (!data) continue;

      let damage = 0;
      let cleared = false;

      switch (status.id) {
        case StatusEffectId.POISON:
          // 中毒：每回合损失 1/8 HP
          damage = Math.floor(maxHp / 8);
          results.push({
            statusId: status.id,
            targetId,
            trigger: StatusTrigger.TURN_END,
            damage,
            text: `${targetId} 受到了 ${damage} 点毒素伤害！`,
          });
          break;

        case StatusEffectId.BAD_POISON:
          // 剧毒：每回合损失更多 HP
          damage = Math.floor((maxHp * (badPoisonTurns + 1)) / 16);
          results.push({
            statusId: status.id,
            targetId,
            trigger: StatusTrigger.TURN_END,
            damage,
            text: `${targetId} 受到了 ${damage} 点剧毒伤害！`,
          });
          break;

        case StatusEffectId.BURN:
          // 灼烧：每回合损失 1/16 HP
          damage = Math.floor(maxHp / 16);
          results.push({
            statusId: status.id,
            targetId,
            trigger: StatusTrigger.TURN_END,
            damage,
            text: `${targetId} 受到了 ${damage} 点灼烧伤害！`,
          });
          break;

        case StatusEffectId.BOUND:
          // 束缚：每回合损失 1/16 HP
          damage = Math.floor(maxHp / 16);
          results.push({
            statusId: status.id,
            targetId,
            trigger: StatusTrigger.TURN_END,
            damage,
            text: `${targetId} 被束缚，受到了 ${damage} 点伤害！`,
          });
          break;

        case StatusEffectId.CURSE:
          // 诅咒：每回合损失 1/4 HP
          damage = Math.floor(maxHp / 4);
          results.push({
            statusId: status.id,
            targetId,
            trigger: StatusTrigger.TURN_END,
            damage,
            text: `${targetId} 受到了 ${damage} 点诅咒伤害！`,
          });
          break;

        case StatusEffectId.DOOM:
          // 厄运：检查是否到期
          if (status.remainingTurns === 1) {
            damage = currentHp; // 立即死亡
            cleared = true;
            results.push({
              statusId: status.id,
              targetId,
              trigger: StatusTrigger.TURN_END,
              damage,
              cleared,
              text: `${targetId} 厄运降临，倒下了！`,
            });
          } else {
            results.push({
              statusId: status.id,
              targetId,
              trigger: StatusTrigger.TURN_END,
              text: `${targetId} 的厄运还有 ${status.remainingTurns - 1} 回合`,
            });
          }
          break;

        case StatusEffectId.REGENERATE:
          // 再生：每回合恢复 1/8 HP
          const heal = Math.floor(maxHp / 8);
          results.push({
            statusId: status.id,
            targetId,
            trigger: StatusTrigger.TURN_END,
            heal,
            text: `${targetId} 恢复了 ${heal} 点生命值！`,
          });
          break;

        case StatusEffectId.SLEEP:
          // 睡眠：有 50% 几率提前醒来
          if (Math.random() < 0.5 || status.remainingTurns === 1) {
            cleared = true;
            results.push({
              statusId: status.id,
              targetId,
              trigger: StatusTrigger.TURN_END,
              cleared,
              text: `${targetId} 醒来了！`,
            });
          }
          break;

        case StatusEffectId.CONFUSE:
          // 混乱：有 50% 几率解除
          if (Math.random() < 0.5 || status.remainingTurns === 1) {
            cleared = true;
            results.push({
              statusId: status.id,
              targetId,
              trigger: StatusTrigger.TURN_END,
              cleared,
              text: `${targetId} 恢复了清醒！`,
            });
          }
          break;
      }

      // 更新剩余回合数
      if (!cleared && status.remainingTurns > 0) {
        status.remainingTurns--;
      }
    }

    return results;
  }

  /**
   * 获取属性修正
   */
  getStatModifiers(statusList: StatusEffectInstance[]): StatModifier {
    const modifiers: StatModifier = {};

    for (const status of statusList) {
      switch (status.id) {
        case StatusEffectId.WEAKEN:
          modifiers.attack = (modifiers.attack || 0) - 2 * status.stacks;
          break;

        case StatusEffectId.VULNERABLE:
          modifiers.defense = (modifiers.defense || 0) - 2 * status.stacks;
          break;

        case StatusEffectId.SLOW:
          modifiers.speed = (modifiers.speed || 0) - 2 * status.stacks;
          break;

        case StatusEffectId.BLIND:
          modifiers.accuracy = (modifiers.accuracy || 0) - 2 * status.stacks;
          break;

        case StatusEffectId.BURN:
          modifiers.attack = (modifiers.attack || 0) - 2;
          break;

        case StatusEffectId.PARALYSIS:
          modifiers.speed = (modifiers.speed || 0) - 2;
          break;
      }
    }

    return modifiers;
  }

  /**
   * 检查是否可以行动
   */
  canAct(statusList: StatusEffectInstance[]): boolean {
    for (const status of statusList) {
      switch (status.id) {
        case StatusEffectId.SLEEP:
          return false;

        case StatusEffectId.FREEZE:
          return false;

        case StatusEffectId.PARALYSIS:
          if (Math.random() < 0.25) {
            return false;
          }
          break;

        case StatusEffectId.FEAR:
          if (Math.random() < 0.5) {
            return false;
          }
          break;
      }
    }
    return true;
  }

  /**
   * 检查是否可以逃跑
   */
  canEscape(statusList: StatusEffectInstance[]): boolean {
    for (const status of statusList) {
      if (status.id === StatusEffectId.BOUND) {
        return false;
      }
    }
    return true;
  }

  /**
   * 检查是否可以切换
   */
  canSwitch(statusList: StatusEffectInstance[]): boolean {
    for (const status of statusList) {
      if (status.id === StatusEffectId.TAUNT) {
        return false;
      }
    }
    return true;
  }

  /**
   * 解除状态效果
   */
  removeStatus(
    statusList: StatusEffectInstance[],
    statusId: StatusEffectId,
    removeAll: boolean = false
  ): StatusEffectInstance[] {
    if (removeAll) {
      return statusList.filter(s => s.id !== statusId);
    }

    // 只移除一层
    const index = statusList.findIndex(s => s.id === statusId);
    if (index !== -1) {
      statusList.splice(index, 1);
    }

    return statusList;
  }

  /**
   * 检查状态冲突
   */
  checkStatusConflict(
    statusList: StatusEffectInstance[],
    newStatusId: StatusEffectId
  ): boolean {
    // 睡眠和麻痹不能同时存在
    if (newStatusId === StatusEffectId.SLEEP) {
      return statusList.some(s =>
        s.id === StatusEffectId.PARALYSIS ||
        s.id === StatusEffectId.FREEZE
      );
    }

    // 麻痹和睡眠不能同时存在
    if (newStatusId === StatusEffectId.PARALYSIS) {
      return statusList.some(s =>
        s.id === StatusEffectId.SLEEP ||
        s.id === StatusEffectId.FREEZE
      );
    }

    // 冰冻和睡眠、麻痹不能同时存在
    if (newStatusId === StatusEffectId.FREEZE) {
      return statusList.some(s =>
        s.id === StatusEffectId.SLEEP ||
        s.id === StatusEffectId.PARALYSIS
      );
    }

    return false;
  }
}

/**
 * 导出状态效果管理器单例
 */
export const statusEffectManager = StatusEffectManager.getInstance();
