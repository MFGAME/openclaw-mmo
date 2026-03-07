/**
 * 怪物数据接口和加载器
 * 
 * 基于 Tuxemon 的怪物数据结构
 */

/**
 * 怪物数据接口
 */
export interface MonsterData {
  /** 怪物 ID */
  slug: string;
  /** 怪物名称 */
  name: string;
  /** 分类 */
  category: string;
  /** 描述 */
  description: string;
  /** 基础 HP */
  hp: number;
  /** 基础攻击 */
  attack: number;
  /** 基础防御 */
  defense: number;
  /** 基础速度 */
  speed: number;
  /** 基础特攻 */
  special_attack: number;
  /** 基础特防 */
  special_defense: number;
  /** 属性列表 */
  types: string[];
  /** 身高 (米) */
  height: number;
  /** 体重 (公斤) */
  weight: number;
  /** 捕捉率 */
  catch_rate: number;
  /** 基础经验值 */
  exp_give: number;
  /** 初始技能 */
  techniques: string[];
  /** 进化等级 */
  evolve_level?: number;
  /** 进化目标 */
  evolve_to?: string;
  /** 精灵图路径 */
  sprites: {
    front: string;
    back: string;
    menu: string;
  };
}

/**
 * 怪物实例接口
 */
export interface MonsterInstance {
  /** 实例 ID */
  instanceId: string;
  /** 怪物 ID */
  monsterId: string;
  /** 昵称 */
  nickname?: string;
  /** 当前等级 */
  level: number;
  /** 当前经验值 */
  exp: number;
  /** 当前 HP */
  currentHp: number;
  /** 最大 HP */
  maxHp: number;
  /** 攻击力 */
  attack: number;
  /** 防御力 */
  defense: number;
  /** 速度 */
  speed: number;
  /** 特攻 */
  specialAttack: number;
  /** 特防 */
  specialDefense: number;
  /** 属性 */
  types: string[];
  /** 已学会的技能 */
  techniques: string[];
  /** 当前状态效果 */
  status: string[];
  /** 训练师 ID */
  trainerId?: string;
  /** 捕捉时间 */
  caughtAt?: number;
}

/**
 * 怪物数据加载器
 */
export class MonsterDataLoader {
  private static instance: MonsterDataLoader;

  /** 怪物数据缓存 */
  private monsterCache: Map<string, MonsterData> = new Map();

  /** 是否已加载 */
  private loaded: boolean = false;

  /**
   * 私有构造函数
   */
  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): MonsterDataLoader {
    if (!MonsterDataLoader.instance) {
      MonsterDataLoader.instance = new MonsterDataLoader();
    }
    return MonsterDataLoader.instance;
  }

  /**
   * 加载怪物数据
   */
  async loadMonsters(dataUrl?: string): Promise<void> {
    if (this.loaded) return;

    try {
      // 如果提供了 URL，从 URL 加载
      if (dataUrl) {
        const response = await fetch(dataUrl);
        const data = await response.json();
        this.parseMonsterData(data);
      } else {
        // 使用内置示例数据
        this.loadExampleMonsters();
      }

      this.loaded = true;
      console.log(`[MonsterDataLoader] Loaded ${this.monsterCache.size} monsters`);
    } catch (error) {
      console.error('[MonsterDataLoader] Failed to load monsters:', error);
      // 加载示例数据作为备用
      this.loadExampleMonsters();
    }
  }

  /**
   * 解析怪物数据
   */
  private parseMonsterData(data: Record<string, MonsterData>): void {
    for (const [slug, monster] of Object.entries(data)) {
      this.monsterCache.set(slug, monster);
    }
  }

  /**
   * 加载示例怪物数据
   */
  private loadExampleMonsters(): void {
    const exampleMonsters: Record<string, MonsterData> = {
      'txmn_cardiling': {
        slug: 'txmn_cardiling',
        name: 'Cardiling',
        category: 'Cardinal',
        description: 'A small bird monster with vibrant red feathers.',
        hp: 45,
        attack: 50,
        defense: 40,
        speed: 60,
        special_attack: 45,
        special_defense: 40,
        types: ['fire', 'flying'],
        height: 0.3,
        weight: 2.5,
        catch_rate: 200,
        exp_give: 64,
        techniques: ['technique_peck', 'technique_fireball'],
        sprites: {
          front: 'assets/monsters/cardiling_front.png',
          back: 'assets/monsters/cardiling_back.png',
          menu: 'assets/monsters/cardiling_menu.png',
        },
      },
      'txmn_rockitten': {
        slug: 'txmn_rockitten',
        name: 'Rockitten',
        category: 'Rock Cat',
        description: 'A playful kitten made of living stone.',
        hp: 55,
        attack: 60,
        defense: 70,
        speed: 35,
        special_attack: 40,
        special_defense: 55,
        types: ['earth'],
        height: 0.4,
        weight: 15.0,
        catch_rate: 180,
        exp_give: 72,
        techniques: ['technique_tackle', 'technique_rock_throw'],
        sprites: {
          front: 'assets/monsters/rockitten_front.png',
          back: 'assets/monsters/rockitten_back.png',
          menu: 'assets/monsters/rockitten_menu.png',
        },
      },
      'txmn_nudiflot': {
        slug: 'txmn_nudiflot',
        name: 'Nudiflot',
        category: 'Sea Slug',
        description: 'A colorful sea creature that floats gracefully.',
        hp: 50,
        attack: 35,
        defense: 45,
        speed: 50,
        special_attack: 70,
        special_defense: 65,
        types: ['water'],
        height: 0.2,
        weight: 0.5,
        catch_rate: 190,
        exp_give: 68,
        techniques: ['technique_water_gun', 'technique_bubble'],
        sprites: {
          front: 'assets/monsters/nudiflot_front.png',
          back: 'assets/monsters/nudiflot_back.png',
          menu: 'assets/monsters/nudiflot_menu.png',
        },
      },
      'txmn_djinnos': {
        slug: 'txmn_djinnos',
        name: 'Djinnos',
        category: 'Wind Spirit',
        description: 'An ethereal being made of swirling winds.',
        hp: 40,
        attack: 45,
        defense: 35,
        speed: 90,
        special_attack: 75,
        special_defense: 50,
        types: ['flying'],
        height: 0.6,
        weight: 0.1,
        catch_rate: 120,
        exp_give: 85,
        techniques: ['technique_gust', 'technique_wind_slash'],
        sprites: {
          front: 'assets/monsters/djinnos_front.png',
          back: 'assets/monsters/djinnos_back.png',
          menu: 'assets/monsters/djinnos_menu.png',
        },
      },
      'txmn_leafygator': {
        slug: 'txmn_leafygator',
        name: 'Leafygator',
        category: 'Alligator',
        description: 'A swamp-dwelling alligator covered in moss.',
        hp: 65,
        attack: 75,
        defense: 60,
        speed: 40,
        special_attack: 55,
        special_defense: 60,
        types: ['grass', 'water'],
        height: 1.2,
        weight: 35.0,
        catch_rate: 100,
        exp_give: 95,
        techniques: ['technique_bite', 'technique_vine_whip', 'technique_water_gun'],
        sprites: {
          front: 'assets/monsters/leafygator_front.png',
          back: 'assets/monsters/leafygator_back.png',
          menu: 'assets/monsters/leafygator_menu.png',
        },
      },
    };

    this.parseMonsterData(exampleMonsters);
  }

  /**
   * 获取怪物数据
   */
  getMonster(slug: string): MonsterData | null {
    return this.monsterCache.get(slug) || null;
  }

  /**
   * 获取所有怪物
   */
  getAllMonsters(): MonsterData[] {
    return Array.from(this.monsterCache.values());
  }

  /**
   * 创建怪物实例
   */
  createMonsterInstance(slug: string, level: number): MonsterInstance | null {
    const data = this.getMonster(slug);
    if (!data) return null;

    // 根据等级计算属性
    const levelMultiplier = 1 + (level - 1) * 0.05;

    return {
      instanceId: `${slug}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      monsterId: slug,
      level: level,
      exp: this.calculateExpForLevel(level),
      currentHp: Math.floor(data.hp * levelMultiplier * 2),
      maxHp: Math.floor(data.hp * levelMultiplier * 2),
      attack: Math.floor(data.attack * levelMultiplier),
      defense: Math.floor(data.defense * levelMultiplier),
      speed: Math.floor(data.speed * levelMultiplier),
      specialAttack: Math.floor(data.special_attack * levelMultiplier),
      specialDefense: Math.floor(data.special_defense * levelMultiplier),
      types: [...data.types],
      techniques: [...data.techniques],
      status: [],
      caughtAt: Date.now(),
    };
  }

  /**
   * 计算升级所需经验值
   */
  calculateExpForLevel(level: number): number {
    // 简化的经验公式：level^3
    return Math.floor(Math.pow(level, 3));
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.monsterCache.clear();
    this.loaded = false;
  }
}

/**
 * 导出单例
 */
export const monsterDataLoader = MonsterDataLoader.getInstance();
