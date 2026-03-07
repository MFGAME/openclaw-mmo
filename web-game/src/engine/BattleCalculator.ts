/**
 * 战斗伤害计算引擎
 *
 * 基于 Tuxemon 战斗系统的伤害计算逻辑
 *
 * 功能：
 * - 基础伤害计算公式
 * - 属性克制倍率（14 种元素的克制关系）
 * - 暴击系统（暴击率、暴击倍率）
 * - 命中率计算
 * - 浮动伤害（随机波动 ±15%）
 */

/**
 * 属性类型枚举（Tuxemon 14 种属性）
 */
export enum ElementType {
  /** 无属性 */
  NORMAL = 'normal',
  /** 火 */
  FIRE = 'fire',
  /** 水 */
  WATER = 'water',
  /** 草 */
  GRASS = 'grass',
  /** 电 */
  ELECTRIC = 'electric',
  /** 冰 */
  ICE = 'ice',
  /** 毒 */
  POISON = 'poison',
  /** 地面 */
  GROUND = 'ground',
  /** 飞行 */
  FLYING = 'flying',
  /** 虫 */
  BUG = 'bug',
  /** 岩石 */
  ROCK = 'rock',
  /** 幽灵 */
  GHOST = 'ghost',
  /** 钢 */
  STEEL = 'steel',
  /** 龙 */
  DRAGON = 'dragon',
}

/**
 * 伤害计算结果接口
 */
export interface DamageResult {
  /** 最终伤害值 */
  damage: number;
  /** 是否暴击 */
  isCritical: boolean;
  /** 是否命中 */
  isHit: boolean;
  /** 属性克制倍率 */
  typeEffectiveness: number;
  /** 伤害浮动系数 */
  randomFactor: number;
  /** 伤害详情 */
  details: {
    /** 基础伤害 */
    baseDamage: number;
    /** 攻击属性修正 */
    attackStat: number;
    /** 防御属性修正 */
    defenseStat: number;
    /** 技能威力 */
    power: number;
    /** 等级系数 */
    levelFactor: number;
    /** STAB 倍率（同属性加成） */
    stab: number;
  };
}

/**
 * 伤害计算参数接口
 */
export interface DamageCalcParams {
  /** 攻击者攻击力 */
  attack: number;
  /** 攻击者特攻 */
  specialAttack: number;
  /** 防御者防御力 */
  defense: number;
  /** 防御者特防 */
  specialDefense: number;
  /** 攻击者等级 */
  level: number;
  /** 技能威力 */
  power: number;
  /** 攻击技能属性 */
  attackElement: ElementType;
  /** 攻击者属性列表 */
  attackerElements: ElementType[];
  /** 防御者属性列表 */
  defenderElements: ElementType[];
  /** 是否为物理攻击 */
  isPhysical: boolean;
  /** 技能命中加成 */
  accuracyBonus?: number;
}

/**
 * 属性克制表
 * 格式：攻击属性 -> { 被克制的属性: 倍率, 被抵抗的属性: 倍率 }
 *
 * 基于标准的 RPG 属性克制规则
 */
const TYPE_CHART: Record<ElementType, Partial<Record<ElementType, number>>> = {
  [ElementType.NORMAL]: {
    [ElementType.ROCK]: 0.5,
    [ElementType.GHOST]: 0,
    [ElementType.STEEL]: 0.5,
  },
  [ElementType.FIRE]: {
    [ElementType.GRASS]: 2.0,
    [ElementType.ICE]: 2.0,
    [ElementType.BUG]: 2.0,
    [ElementType.STEEL]: 2.0,
    [ElementType.FIRE]: 0.5,
    [ElementType.WATER]: 0.5,
    [ElementType.ROCK]: 0.5,
    [ElementType.DRAGON]: 0.5,
  },
  [ElementType.WATER]: {
    [ElementType.FIRE]: 2.0,
    [ElementType.GROUND]: 2.0,
    [ElementType.ROCK]: 2.0,
    [ElementType.WATER]: 0.5,
    [ElementType.GRASS]: 0.5,
    [ElementType.DRAGON]: 0.5,
  },
  [ElementType.GRASS]: {
    [ElementType.WATER]: 2.0,
    [ElementType.GROUND]: 2.0,
    [ElementType.ROCK]: 2.0,
    [ElementType.GRASS]: 0.5,
    [ElementType.FIRE]: 0.5,
    [ElementType.FLYING]: 0.5,
    [ElementType.BUG]: 0.5,
    [ElementType.POISON]: 0.5,
    [ElementType.STEEL]: 0.5,
    [ElementType.DRAGON]: 0.5,
  },
  [ElementType.ELECTRIC]: {
    [ElementType.WATER]: 2.0,
    [ElementType.FLYING]: 2.0,
    [ElementType.ELECTRIC]: 0.5,
    [ElementType.GRASS]: 0.5,
    [ElementType.DRAGON]: 0.5,
    [ElementType.GROUND]: 0,
  },
  [ElementType.ICE]: {
    [ElementType.GRASS]: 2.0,
    [ElementType.GROUND]: 2.0,
    [ElementType.FLYING]: 2.0,
    [ElementType.DRAGON]: 2.0,
    [ElementType.ICE]: 0.5,
    [ElementType.FIRE]: 0.5,
    [ElementType.WATER]: 0.5,
    [ElementType.STEEL]: 0.5,
  },
  [ElementType.POISON]: {
    [ElementType.GRASS]: 2.0,
    [ElementType.POISON]: 0.5,
    [ElementType.GROUND]: 0.5,
    [ElementType.ROCK]: 0.5,
    [ElementType.GHOST]: 0.5,
    [ElementType.STEEL]: 0,
  },
  [ElementType.GROUND]: {
    [ElementType.FIRE]: 2.0,
    [ElementType.ELECTRIC]: 2.0,
    [ElementType.POISON]: 2.0,
    [ElementType.ROCK]: 2.0,
    [ElementType.STEEL]: 2.0,
    [ElementType.GRASS]: 0.5,
    [ElementType.BUG]: 0.5,
    [ElementType.FLYING]: 0,
  },
  [ElementType.FLYING]: {
    [ElementType.GRASS]: 2.0,
    [ElementType.BUG]: 2.0,
    [ElementType.ELECTRIC]: 0.5,
    [ElementType.ROCK]: 0.5,
    [ElementType.STEEL]: 0.5,
  },
  [ElementType.BUG]: {
    [ElementType.GRASS]: 2.0,
    [ElementType.FIRE]: 0.5,
    [ElementType.POISON]: 0.5,
    [ElementType.FLYING]: 0.5,
    [ElementType.GHOST]: 0.5,
    [ElementType.STEEL]: 0.5,
    [ElementType.ROCK]: 0.5,
  },
  [ElementType.ROCK]: {
    [ElementType.FIRE]: 2.0,
    [ElementType.ICE]: 2.0,
    [ElementType.FLYING]: 2.0,
    [ElementType.BUG]: 2.0,
    [ElementType.GROUND]: 0.5,
    [ElementType.STEEL]: 0.5,
  },
  [ElementType.GHOST]: {
    [ElementType.GHOST]: 2.0,
    [ElementType.NORMAL]: 0,
  },
  [ElementType.STEEL]: {
    [ElementType.ICE]: 2.0,
    [ElementType.ROCK]: 2.0,
    [ElementType.FIRE]: 0.5,
    [ElementType.WATER]: 0.5,
    [ElementType.ELECTRIC]: 0.5,
    [ElementType.STEEL]: 0.5,
  },
  [ElementType.DRAGON]: {
    [ElementType.DRAGON]: 2.0,
    [ElementType.STEEL]: 0.5,
  },
};

/**
 * 战斗伤害计算器类
 */
export class BattleCalculator {
  private static instance: BattleCalculator;

  /** 暴击率基数 */
  private readonly CRITICAL_HIT_BASE_RATE = 0.0625; // 6.25%

  /** 暴击倍率 */
  private readonly CRITICAL_HIT_MULTIPLIER = 1.5;

  /** 最小伤害浮动系数 */
  private readonly MIN_RANDOM_FACTOR = 0.85;

  /** 最大伤害浮动系数 */
  private readonly MAX_RANDOM_FACTOR = 1.0;

  /** STAB（Same Type Attack Bonus）倍率 */
  private readonly STAB_MULTIPLIER = 1.5;

  /**
   * 私有构造函数，确保单例
   */
  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): BattleCalculator {
    if (!BattleCalculator.instance) {
      BattleCalculator.instance = new BattleCalculator();
    }
    return BattleCalculator.instance;
  }

  /**
   * 计算伤害
   *
   * @param params 伤害计算参数
   * @returns 伤害计算结果
   */
  calculateDamage(params: DamageCalcParams): DamageResult {
    // 1. 计算基础伤害
    const details = this.calculateBaseDamage(params);

    // 2. 计算属性克制倍率
    const typeEffectiveness = this.getTypeEffectiveness(
      params.attackElement,
      params.defenderElements
    );

    // 3. 计算 STAB（同属性加成）
    const stab = this.getStab(params.attackElement, params.attackerElements);

    // 4. 计算随机浮动
    const randomFactor = this.getRandomFactor();

    // 5. 计算暴击
    const isCritical = this.rollCriticalHit();
    const criticalMultiplier = isCritical ? this.CRITICAL_HIT_MULTIPLIER : 1.0;

    // 6. 计算最终伤害
    let damage = Math.floor(
      details.baseDamage *
      typeEffectiveness *
      stab *
      randomFactor *
      criticalMultiplier
    );

    // 确保最小伤害为 1
    damage = Math.max(1, damage);

    return {
      damage,
      isCritical,
      isHit: this.rollHit(params.accuracyBonus || 100),
      typeEffectiveness,
      randomFactor,
      details: {
        ...details,
        stab,
      },
    };
  }

  /**
   * 计算基础伤害
   *
   * 使用 Tuxemon/宝可梦风格的伤害公式：
   * Damage = ((2 * Level / 5 + 2) * Power * Attack / Defense) / 50 + 2
   */
  private calculateBaseDamage(params: DamageCalcParams): DamageResult['details'] {
    // 选择攻击和防御属性
    const attackStat = params.isPhysical ? params.attack : params.specialAttack;
    const defenseStat = params.isPhysical ? params.defense : params.specialDefense;

    // 计算等级系数
    const levelFactor = (2 * params.level) / 5 + 2;

    // 计算基础伤害
    const baseDamage = ((levelFactor * params.power * attackStat) / defenseStat) / 50 + 2;

    return {
      baseDamage: Math.floor(baseDamage * 50), // 返回乘以 50 的值以便后续计算
      attackStat,
      defenseStat,
      power: params.power,
      levelFactor,
      stab: 1.0, // STAB 将在主函数中计算
    };
  }

  /**
   * 计算属性克制倍率
   *
   * @param attackElement 攻击技能属性
   * @param defenderElements 防御者属性列表（可能有双属性）
   * @returns 属性克制倍率
   */
  getTypeEffectiveness(
    attackElement: ElementType,
    defenderElements: ElementType[]
  ): number {
    const chart = TYPE_CHART[attackElement];

    if (!chart) {
      return 1.0;
    }

    // 双属性时需要分别计算克制关系并相乘
    let effectiveness = 1.0;

    for (const defElement of defenderElements) {
      const multiplier = chart[defElement] ?? 1.0;
      effectiveness *= multiplier;
    }

    return effectiveness;
  }

  /**
   * 计算 STAB（Same Type Attack Bonus）
   * 如果攻击技能的属性与攻击者的属性相同，造成 1.5 倍伤害
   *
   * @param attackElement 攻击技能属性
   * @param attackerElements 攻击者属性列表
   * @returns STAB 倍率
   */
  getStab(attackElement: ElementType, attackerElements: ElementType[]): number {
    if (attackerElements.includes(attackElement)) {
      return this.STAB_MULTIPLIER;
    }
    return 1.0;
  }

  /**
   * 计算随机浮动系数（0.85 - 1.0）
   */
  getRandomFactor(): number {
    return this.MIN_RANDOM_FACTOR + Math.random() * (this.MAX_RANDOM_FACTOR - this.MIN_RANDOM_FACTOR);
  }

  /**
   * 判定暴击
   *
   * @param criticalRate 暴击率（0-1）
   * @returns 是否暴击
   */
  rollCriticalHit(criticalRate: number = this.CRITICAL_HIT_BASE_RATE): boolean {
    return Math.random() < criticalRate;
  }

  /**
   * 判定命中
   *
   * @param accuracy 命中率（0-100）
   * @returns 是否命中
   */
  rollHit(accuracy: number): boolean {
    // 确保命中率在 0-100 范围内
    const clampedAccuracy = Math.max(0, Math.min(100, accuracy));
    return Math.random() * 100 < clampedAccuracy;
  }

  /**
   * 计算命中率
   *
   * 考虑以下因素：
   * - 技能基础命中率
   * - 攻击者命中率修正
   * - 防御者闪避率修正
   *
   * @param baseAccuracy 技能基础命中率
   * @param accuracyMod 攻击者命中率修正（0-100，正数提高，负数降低）
   * @param evasionMod 防御者闪避率修正（0-100，正数降低命中率，负数提高）
   * @returns 最终命中率（0-100）
   */
  calculateAccuracy(
    baseAccuracy: number,
    accuracyMod: number = 0,
    evasionMod: number = 0
  ): number {
    // 计算最终命中率
    let finalAccuracy = baseAccuracy + accuracyMod - evasionMod;

    // 确保命中率在 0-100 范围内
    finalAccuracy = Math.max(0, Math.min(100, finalAccuracy));

    return finalAccuracy;
  }

  /**
   * 计算治疗量
   *
   * @param maxHp 最大 HP
   * @param healPercent 治疗百分比（0-1）
   * @returns 治疗量
   */
  calculateHeal(maxHp: number, healPercent: number): number {
    return Math.floor(maxHp * healPercent);
  }

  /**
   * 获取属性克制描述
   *
   * @param effectiveness 属性克制倍率
   * @returns 属性克制描述文本
   */
  getTypeEffectivenessText(effectiveness: number): string {
    if (effectiveness >= 4.0) return '超级克制！';
    if (effectiveness >= 2.0) return '效果拔群！';
    if (effectiveness === 0) return '无效攻击！';
    if (effectiveness <= 0.25) return '几乎无效...';
    if (effectiveness <= 0.5) return '效果不佳...';
    return '';
  }

  /**
   * 判断是否免疫攻击
   *
   * @param attackElement 攻击技能属性
   * @param defenderElements 防御者属性列表
   * @returns 是否免疫
   */
  isImmune(attackElement: ElementType, defenderElements: ElementType[]): boolean {
    return this.getTypeEffectiveness(attackElement, defenderElements) === 0;
  }
}

/**
 * 导出伤害计算器单例
 */
export const battleCalculator = BattleCalculator.getInstance();
