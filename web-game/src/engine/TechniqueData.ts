/**
 * 技能数据接口和加载器
 * 
 * 基于 Tuxemon 的技能数据结构
 */

/**
 * 技能范围类型
 */
export enum TechniqueRange {
  /** 单体 */
  SINGLE = 'single',
  /** 多体 */
  MULTI = 'multi',
  /** 全体 */
  ALL = 'all',
  /** 自身 */
  SELF = 'self',
  /** 随机 */
  RANDOM = 'random',
}

/**
 * 技能目标类型
 */
export enum TechniqueTarget {
  /** 敌方 */
  ENEMY = 'enemy',
  /** 己方 */
  ALLY = 'ally',
  /** 双方 */
  BOTH = 'both',
}

/**
 * 技能分类
 */
export enum TechniqueCategory {
  /** 物理攻击 */
  PHYSICAL = 'physical',
  /** 特殊攻击 */
  SPECIAL = 'special',
  /** 状态变化 */
  STATUS = 'status',
}

/**
 * 技能效果接口
 */
export interface TechniqueEffect {
  /** 效果类型 */
  type: 'damage' | 'heal' | 'status_apply' | 'stat_change' | 'switch' | 'escape';
  /** 数值 */
  value?: number;
  /** 状态 ID */
  statusId?: string;
  /** 属性 ID */
  statId?: string;
  /** 属性变化值 */
  statChange?: number;
  /** 几率 */
  chance?: number;
  /** 回合数 */
  duration?: number;
}

/**
 * 技能数据接口
 */
export interface TechniqueData {
  /** 技能 ID */
  slug: string;
  /** 技能名称 */
  name: string;
  /** 技能描述 */
  description: string;
  /** 技能分类 */
  category: TechniqueCategory;
  /** 属性 */
  element: string;
  /** 威力 (0 表示无伤害) */
  power: number;
  /** 命中率 (0-100) */
  accuracy: number;
  /** PP 值 */
  pp: number;
  /** 优先级 */
  priority: number;
  /** 范围类型 */
  range: TechniqueRange;
  /** 目标类型 */
  target: TechniqueTarget;
  /** 效果列表 */
  effects: TechniqueEffect[];
  /** 学习等级 */
  tech_id: number;
  /** 动画资源 */
  animation?: string;
  /** 音效资源 */
  sfx?: string;
}

/**
 * 技能实例接口
 */
export interface TechniqueInstance {
  /** 技能 ID */
  techniqueId: string;
  /** 当前 PP */
  currentPp: number;
  /** 最大 PP */
  maxPp: number;
}

/**
 * 技能数据加载器
 */
export class TechniqueDataLoader {
  private static instance: TechniqueDataLoader;

  /** 技能数据缓存 */
  private techniqueCache: Map<string, TechniqueData> = new Map();

  /** 是否已加载 */
  private loaded: boolean = false;

  /**
   * 私有构造函数
   */
  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): TechniqueDataLoader {
    if (!TechniqueDataLoader.instance) {
      TechniqueDataLoader.instance = new TechniqueDataLoader();
    }
    return TechniqueDataLoader.instance;
  }

  /**
   * 加载技能数据
   */
  async loadTechniques(_dataUrl?: string): Promise<void> {
    if (this.loaded) return;

    try {
      // 尝试加载真实的技能数据
      await this.loadTuxemonTechniques();
    } catch (error) {
      console.error('[TechniqueDataLoader] Failed to load techniques:', error);
      // 加载示例数据作为备用
      this.loadExampleTechniques();
    }
  }

  /**
   * 加载 Tuxemon 技能数据
   */
  private async loadTuxemonTechniques(): Promise<void> {
    // 加载技能模板
    const response = await fetch('/assets/tuxemon/techniques/skill_templates.json');
    if (!response.ok) {
      throw new Error('Failed to load skill templates');
    }

    const skills = await response.json();

    // 解析技能数据
    for (const skill of skills) {
      this.techniqueCache.set(skill.slug, this.createTechniqueDataFromRaw(skill));
    }

    this.loaded = true;
    console.log(`[TechniqueDataLoader] Loaded ${this.techniqueCache.size} techniques from Tuxemon data`);
  }

  /**
   * 从原始技能数据创建 TechniqueData 对象
   */
  private createTechniqueDataFromRaw(skill: any): TechniqueData {
    // 解析效果
    const effects: TechniqueEffect[] = [];

    if (skill.power && skill.power > 0) {
      effects.push({ type: 'damage' });
    }

    // 解析状态效果
    if (skill.effects) {
      for (const effect of skill.effects) {
        if (typeof effect === 'string') {
          const [statusId, chanceStr] = effect.split(':');
          if (statusId && chanceStr) {
            effects.push({
              type: 'status_apply',
              statusId: statusId,
              chance: parseInt(chanceStr, 10)
            });
          }
        }
      }
    }

    // 确定分类
    let category: TechniqueCategory;
    switch (skill.category) {
      case 'physical':
        category = TechniqueCategory.PHYSICAL;
        break;
      case 'special':
        category = TechniqueCategory.SPECIAL;
        break;
      case 'status':
        category = TechniqueCategory.STATUS;
        break;
      default:
        category = TechniqueCategory.PHYSICAL;
    }

    // 确定范围和目标
    let range: TechniqueRange = TechniqueRange.SINGLE;
    let target: TechniqueTarget = TechniqueTarget.ENEMY;

    if (skill.target === 'self') {
      target = TechniqueTarget.ALLY;
      range = TechniqueRange.SELF;
    } else if (skill.target === 'all') {
      target = TechniqueTarget.BOTH;
      range = TechniqueRange.ALL;
    }

    return {
      slug: skill.slug,
      name: skill.name,
      description: skill.description || '',
      category: category,
      element: skill.types?.[0] || 'normal',
      power: skill.power || 0,
      accuracy: skill.accuracy || 100,
      pp: skill.pp || 10,
      priority: 0,
      range: range,
      target: target,
      effects: effects,
      tech_id: Math.random() * 1000, // 临时 ID
    };
  }

  /**
   * 解析技能数据
   */
  private parseTechniqueData(data: Record<string, TechniqueData>): void {
    for (const [slug, technique] of Object.entries(data)) {
      this.techniqueCache.set(slug, technique);
    }
  }

  /**
   * 加载示例技能数据
   */
  private loadExampleTechniques(): void {
    const exampleTechniques: Record<string, TechniqueData> = {
      'technique_tackle': {
        slug: 'technique_tackle',
        name: 'Tackle',
        description: 'A basic tackle attack.',
        category: TechniqueCategory.PHYSICAL,
        element: 'normal',
        power: 35,
        accuracy: 95,
        pp: 35,
        priority: 0,
        range: TechniqueRange.SINGLE,
        target: TechniqueTarget.ENEMY,
        effects: [{ type: 'damage' }],
        tech_id: 1,
      },
      'technique_peck': {
        slug: 'technique_peck',
        name: 'Peck',
        description: 'A quick peck attack.',
        category: TechniqueCategory.PHYSICAL,
        element: 'flying',
        power: 35,
        accuracy: 100,
        pp: 35,
        priority: 0,
        range: TechniqueRange.SINGLE,
        target: TechniqueTarget.ENEMY,
        effects: [{ type: 'damage' }],
        tech_id: 2,
      },
      'technique_fireball': {
        slug: 'technique_fireball',
        name: 'Fireball',
        description: 'Launches a ball of fire.',
        category: TechniqueCategory.SPECIAL,
        element: 'fire',
        power: 60,
        accuracy: 90,
        pp: 20,
        priority: 0,
        range: TechniqueRange.SINGLE,
        target: TechniqueTarget.ENEMY,
        effects: [
          { type: 'damage' },
          { type: 'status_apply', statusId: 'burn', chance: 10 },
        ],
        tech_id: 3,
        animation: 'fireball',
        sfx: 'fireball_sfx',
      },
      'technique_rock_throw': {
        slug: 'technique_rock_throw',
        name: 'Rock Throw',
        description: 'Throws a rock at the target.',
        category: TechniqueCategory.PHYSICAL,
        element: 'earth',
        power: 50,
        accuracy: 85,
        pp: 25,
        priority: 0,
        range: TechniqueRange.SINGLE,
        target: TechniqueTarget.ENEMY,
        effects: [{ type: 'damage' }],
        tech_id: 4,
      },
      'technique_water_gun': {
        slug: 'technique_water_gun',
        name: 'Water Gun',
        description: 'Shoots a stream of water.',
        category: TechniqueCategory.SPECIAL,
        element: 'water',
        power: 40,
        accuracy: 100,
        pp: 30,
        priority: 0,
        range: TechniqueRange.SINGLE,
        target: TechniqueTarget.ENEMY,
        effects: [{ type: 'damage' }],
        tech_id: 5,
      },
      'technique_bubble': {
        slug: 'technique_bubble',
        name: 'Bubble',
        description: 'Sprays bubbles at the target.',
        category: TechniqueCategory.SPECIAL,
        element: 'water',
        power: 30,
        accuracy: 100,
        pp: 30,
        priority: 0,
        range: TechniqueRange.MULTI,
        target: TechniqueTarget.ENEMY,
        effects: [
          { type: 'damage' },
          { type: 'stat_change', statId: 'speed', statChange: -1, chance: 10 },
        ],
        tech_id: 6,
      },
      'technique_gust': {
        slug: 'technique_gust',
        name: 'Gust',
        description: 'Creates a gust of wind.',
        category: TechniqueCategory.SPECIAL,
        element: 'flying',
        power: 40,
        accuracy: 100,
        pp: 35,
        priority: 0,
        range: TechniqueRange.SINGLE,
        target: TechniqueTarget.ENEMY,
        effects: [{ type: 'damage' }],
        tech_id: 7,
      },
      'technique_wind_slash': {
        slug: 'technique_wind_slash',
        name: 'Wind Slash',
        description: 'Slashes with razor-sharp wind.',
        category: TechniqueCategory.SPECIAL,
        element: 'flying',
        power: 70,
        accuracy: 85,
        pp: 15,
        priority: 0,
        range: TechniqueRange.SINGLE,
        target: TechniqueTarget.ENEMY,
        effects: [
          { type: 'damage' },
          { type: 'stat_change', statId: 'defense', statChange: -1, chance: 20 },
        ],
        tech_id: 8,
      },
      'technique_bite': {
        slug: 'technique_bite',
        name: 'Bite',
        description: 'Bites the target with sharp fangs.',
        category: TechniqueCategory.PHYSICAL,
        element: 'normal',
        power: 60,
        accuracy: 100,
        pp: 25,
        priority: 0,
        range: TechniqueRange.SINGLE,
        target: TechniqueTarget.ENEMY,
        effects: [
          { type: 'damage' },
          { type: 'status_apply', statusId: 'flinch', chance: 10 },
        ],
        tech_id: 9,
      },
      'technique_vine_whip': {
        slug: 'technique_vine_whip',
        name: 'Vine Whip',
        description: 'Strikes with flexible vines.',
        category: TechniqueCategory.PHYSICAL,
        element: 'grass',
        power: 45,
        accuracy: 100,
        pp: 25,
        priority: 0,
        range: TechniqueRange.SINGLE,
        target: TechniqueTarget.ENEMY,
        effects: [{ type: 'damage' }],
        tech_id: 10,
      },
      'technique_poison_sting': {
        slug: 'technique_poison_sting',
        name: 'Poison Sting',
        description: 'Stings the target with a toxic barb.',
        category: TechniqueCategory.PHYSICAL,
        element: 'poison',
        power: 15,
        accuracy: 100,
        pp: 35,
        priority: 0,
        range: TechniqueRange.SINGLE,
        target: TechniqueTarget.ENEMY,
        effects: [
          { type: 'damage' },
          { type: 'status_apply', statusId: 'poison', chance: 30 },
        ],
        tech_id: 11,
      },
      'technique_heal': {
        slug: 'technique_heal',
        name: 'Heal',
        description: 'Restores HP to the user.',
        category: TechniqueCategory.STATUS,
        element: 'normal',
        power: 0,
        accuracy: 100,
        pp: 20,
        priority: 0,
        range: TechniqueRange.SELF,
        target: TechniqueTarget.ALLY,
        effects: [{ type: 'heal', value: 50 }],
        tech_id: 12,
      },
    };

    this.parseTechniqueData(exampleTechniques);
  }

  /**
   * 获取技能数据
   */
  getTechnique(slug: string): TechniqueData | null {
    return this.techniqueCache.get(slug) || null;
  }

  /**
   * 获取所有技能
   */
  getAllTechniques(): TechniqueData[] {
    return Array.from(this.techniqueCache.values());
  }

  /**
   * 获取指定属性的技能
   */
  getTechniquesByElement(element: string): TechniqueData[] {
    return this.getAllTechniques().filter(t => t.element === element);
  }

  /**
   * 获取指定分类的技能
   */
  getTechniquesByCategory(category: TechniqueCategory): TechniqueData[] {
    return this.getAllTechniques().filter(t => t.category === category);
  }

  /**
   * 创建技能实例
   */
  createTechniqueInstance(slug: string): TechniqueInstance | null {
    const data = this.getTechnique(slug);
    if (!data) return null;

    return {
      techniqueId: slug,
      currentPp: data.pp,
      maxPp: data.pp,
    };
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.techniqueCache.clear();
    this.loaded = false;
  }
}

/**
 * 导出单例
 */
export const techniqueDataLoader = TechniqueDataLoader.getInstance();
