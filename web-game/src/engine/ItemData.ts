/**
 * 道具数据接口和加载器
 *
 * 基于 Tuxemon 的道具数据结构
 */

/**
 * 道具分类
 */
export enum ItemCategory {
  /** 消耗品 */
  CONSUMABLE = 'consumable',
  /** 装备 */
  EQUIPMENT = 'equipment',
  /** 关键道具 */
  KEY_ITEM = 'key_item',
  /** 草药 */
  MEDICINE = 'medicine',
  /** 球类（捕捉道具） */
  BALL = 'ball',
  /** 宝石 */
  GEM = 'gem',
  /** 材料 */
  MATERIAL = 'material',
  /** 其他 */
  OTHER = 'other',
}

/**
 * 道具效果接口
 */
export interface ItemEffect {
  /** 效果类型 */
  type: 'heal' | 'status_cure' | 'stat_boost' | 'catch' | 'revive' | 'none';
  /** 恢复数值 */
  healAmount?: number;
  /** 治疗的状态 */
  statusCure?: string[];
  /** 属性提升 */
  statBoost?: {
    stat: string;
    amount: number;
  };
  /** 捕捉率 */
  catchRate?: number;
  /** 复活比例 */
  reviveRatio?: number;
}

/**
 * 道具数据接口
 */
export interface ItemData {
  /** 道具 ID */
  slug: string;
  /** 道具名称 */
  name: string;
  /** 道具描述 */
  description: string;
  /** 道具分类 */
  category: ItemCategory;
  /** 排序类型 */
  sort: string;
  /** 精灵图路径 */
  sprite: string;
  /** 价格 */
  price: number;
  /** 效果列表 */
  effects: ItemEffect[];
  /** 是否可消耗 */
  consumable: boolean;
  /** 可用场景 */
  usableIn: ('WorldState' | 'Combat')[];
  /** 使用动画 */
  animation?: string;
  /** 使用音效 */
  sfx?: string;
}

/**
 * 道具实例接口
 */
export interface ItemInstance {
  /** 实例 ID */
  instanceId: string;
  /** 道具 ID */
  itemId: string;
  /** 数量 */
  quantity: number;
}

/**
 * 道具数据加载器
 */
export class ItemDataLoader {
  private static instance: ItemDataLoader;

  /** 道具数据缓存 */
  private itemCache: Map<string, ItemData> = new Map();

  /** 是否已加载 */
  private loaded: boolean = false;

  /**
   * 私有构造函数
   */
  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): ItemDataLoader {
    if (!ItemDataLoader.instance) {
      ItemDataLoader.instance = new ItemDataLoader();
    }
    return ItemDataLoader.instance;
  }

  /**
   * 加载道具数据
   */
  async loadItems(_dataUrl?: string): Promise<void> {
    if (this.loaded) return;

    try {
      // 尝试加载真实的 Tuxemon 道具数据
      await this.loadTuxemonItems();
    } catch (error) {
      console.error('[ItemDataLoader] Failed to load items:', error);
      // 加载示例数据作为备用
      this.loadExampleItems();
    }
  }

  /**
   * 加载 Tuxemon 道具数据
   */
  private async loadTuxemonItems(): Promise<void> {
    // 获取道具文件列表
    let itemFiles: string[] = await this.getItemFileList();

    // 加载每个道具的数据
    for (const slug of itemFiles) {
      try {
        const response = await fetch(`/assets/tuxemon/items/${slug}.json`);
        if (response.ok) {
          const data = await response.json();
          this.itemCache.set(slug, this.createItemDataFromRaw(slug, data));
        }
      } catch (e) {
        console.warn(`[ItemDataLoader] Failed to load ${slug}:`, e);
      }
    }

    this.loaded = true;
    console.log(`[ItemDataLoader] Loaded ${this.itemCache.size} items from Tuxemon data`);
  }

  /**
   * 从原始数据创建 ItemData 对象
   */
  private createItemDataFromRaw(slug: string, data: any): ItemData {
    // 解析效果
    const effects: ItemEffect[] = [];
    const itemEffect: ItemEffect = { type: 'none' };

    // 根据 sort 分类确定道具类型和效果
    switch (data.sort) {
      case 'potion':
      case 'cure':
        itemEffect.type = 'heal';
        // 从 modifiers 中获取恢复数值
        if (data.modifiers && data.modifiers.length > 0) {
          const modifier = data.modifiers[0];
          if (modifier.kind === 'current_hp') {
            itemEffect.healAmount = modifier.amount || 50;
          }
        }
        break;

      case 'berry':
        itemEffect.type = 'heal';
        itemEffect.healAmount = 30;
        break;

      case 'ball':
        itemEffect.type = 'catch';
        itemEffect.catchRate = 1.0;
        break;

      case 'revive':
        itemEffect.type = 'revive';
        itemEffect.reviveRatio = 0.5;
        break;

      case 'status':
        itemEffect.type = 'status_cure';
        itemEffect.statusCure = ['poison', 'burn', 'paralyze'];
        break;
    }

    if (itemEffect.type !== 'none') {
      effects.push(itemEffect);
    }

    // 确定分类
    let category: ItemCategory;
    switch (data.sort) {
      case 'potion':
      case 'cure':
      case 'berry':
      case 'food':
      case 'drink':
        category = ItemCategory.CONSUMABLE;
        break;
      case 'ball':
        category = ItemCategory.BALL;
        break;
      case 'revive':
        category = ItemCategory.MEDICINE;
        break;
      case 'key':
        category = ItemCategory.KEY_ITEM;
        break;
      case 'gem':
        category = ItemCategory.GEM;
        break;
      case 'material':
        category = ItemCategory.MATERIAL;
        break;
      default:
        category = ItemCategory.OTHER;
    }

    // 确定可用场景
    const usableIn: ('WorldState' | 'Combat')[] = [];
    if (data.usable_in) {
      for (const location of data.usable_in) {
        if (location === 'WorldState' || location === 'Combat') {
          usableIn.push(location);
        }
      }
    }

    return {
      slug: slug,
      name: this.formatName(slug),
      description: data.description || '',
      category: category,
      sort: data.sort || 'other',
      sprite: data.sprite || `/assets/tuxemon/gfx/items/${slug}.png`,
      price: data.price || 100,
      effects: effects,
      consumable: data.behaviors?.consumable ?? true,
      usableIn: usableIn,
      animation: data.visuals?.animation,
      sfx: data.sound?.sfx,
    };
  }

  /**
   * 格式化道具名称（将 snake_case 转换为 Title Case）
   */
  private formatName(slug: string): string {
    return slug
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * 获取道具文件列表
   */
  private async getItemFileList(): Promise<string[]> {
    // 从实际的道具文件中获取列表
    const itemList = [
      'aardant', 'allies_address', 'alpha_seep', 'ancient_egg', 'ancient_tea',
      'antidote_grapes', 'app_banking', 'app_contacts', 'app_map', 'app_radio',
      'app_renaming', 'app_tuxepedia', 'bite_of_despair', 'bivouac', 'book_wishes',
      'boost_armour', 'boost_dodge', 'boost_melee', 'boost_ranged', 'booster_tech',
      'boost_speed', 'cosmic_berry', 'cure_festering', 'cureall', 'die',
      'dojo_pass', 'dread_omelette', 'drone', 'earth_berry', 'earth_booster',
      'earthmover_key', 'escape_key', 'feather', 'fire_berry', 'fire_booster',
      'fishing_rod', 'flintstone', 'flute', 'food_beastmoss', 'food_cheesecake',
      'food_crackle_salt', 'food_cream_puffs', 'food_crepes', 'food_croissants',
      'food_field_greens', 'food_flamehorn_shank', 'food_glowfat', 'food_hash',
      'food_honey_cake', 'food_mashed_potatoes', 'food_meal_dust', 'food_meatballs',
      'food_mille_feuille', 'food_mistflour_eggs', 'food_moo_bloom', 'food_pancakes',
      'food_pastry', 'food_phyllo', 'food_pie', 'food_pita', 'food_potato_casserole',
      'food_potato_fries', 'food_pretzels', 'food_pudding', 'food_root_beast_bark',
      'food_rub_chicken', 'food_rub_pork_chops', 'food_rub_ribs', 'food_rub_steak',
      'food_shell_tacos', 'food_sky_feather', 'food_souffle', 'food_spice_dust',
      'food_starpapper', 'food_stonefruit_bulbs', 'food_suncrust_butter', 'food_sweetroot',
      'food_wings', 'food_zestroot_wraps', 'food_zestsap', 'friendship_scroll',
      'frost_berry', 'gold_pass', 'greenwash_badge', 'hatchet', 'heroic_berry',
      'horseshoe', 'imperial_potion', 'imperial_tea', 'inferno_custard', 'lightning_berry',
      'lima_pie', 'lucky_bamboo', 'marble', 'mega_potion', 'metal_berry',
      'metal_booster', 'miaow_milk', 'mm_earth', 'mm_fire', 'mm_fire_mega',
      'mm_fire_ultra', 'mm_grass', 'mm_grass_mega', 'mm_grass_ultra', 'mm_water',
      'mm_water_mega', 'mm_water_ultra', 'monster_burger', 'nap_cap', 'nu_tech',
      'old_key', 'pep_pill', 'pepper', 'performance_tea', 'pill', 'potion',
      'revive', 'revive_tech', 'sapphire_berry', 'scroll_fire', 'scroll_water',
      'sky_booster', 'smoke_bomb', 'soda', 'soft_drink', 'soda_bubble',
      'soda_fruit', 'soda_ginger', 'soda_ice', 'spark_berry', 'spear_key',
      'stardust', 'stone_berry', 'strawberry', 'sugar', 'super_potion',
      'sweet_berry', 'tangerine', 'tea', 'tea_bag', 'ticket', 'tinned_sardines',
      'tuxeball', 'ultimate_berry', 'ultra_potion', 'video_game', 'vial',
      'water_berry', 'water_booster', 'weapon', 'whetstone', 'x_potion',
      'yellow_berry',
    ];
    return itemList;
  }

  /**
   * 解析道具数据
   */
  private parseItemData(data: Record<string, ItemData>): void {
    for (const [slug, item] of Object.entries(data)) {
      this.itemCache.set(slug, item);
    }
  }

  /**
   * 加载示例道具数据
   */
  private loadExampleItems(): void {
    const exampleItems: Record<string, ItemData> = {
      'potion': {
        slug: 'potion',
        name: 'Potion',
        description: 'Restores 50 HP to a monster.',
        category: ItemCategory.CONSUMABLE,
        sort: 'potion',
        sprite: '/assets/tuxemon/gfx/items/potion.png',
        price: 100,
        effects: [{ type: 'heal', healAmount: 50 }],
        consumable: true,
        usableIn: ['WorldState', 'Combat'],
      },
      'super_potion': {
        slug: 'super_potion',
        name: 'Super Potion',
        description: 'Restores 100 HP to a monster.',
        category: ItemCategory.CONSUMABLE,
        sort: 'potion',
        sprite: '/assets/tuxemon/gfx/items/super_potion.png',
        price: 300,
        effects: [{ type: 'heal', healAmount: 100 }],
        consumable: true,
        usableIn: ['WorldState', 'Combat'],
      },
      'antidote': {
        slug: 'antidote',
        name: 'Antidote',
        description: 'Cures poison status.',
        category: ItemCategory.MEDICINE,
        sort: 'cure',
        sprite: '/assets/tuxemon/gfx/items/antidote.png',
        price: 150,
        effects: [{ type: 'status_cure', statusCure: ['poison'] }],
        consumable: true,
        usableIn: ['WorldState', 'Combat'],
      },
      'tuxeball': {
        slug: 'tuxeball',
        name: 'Tuxeball',
        description: 'A device for catching wild monsters.',
        category: ItemCategory.BALL,
        sort: 'ball',
        sprite: '/assets/tuxemon/gfx/items/tuxeball.png',
        price: 200,
        effects: [{ type: 'catch', catchRate: 1.0 }],
        consumable: true,
        usableIn: ['Combat'],
      },
      'revive': {
        slug: 'revive',
        name: 'Revive',
        description: 'Revives a fainted monster with half HP.',
        category: ItemCategory.MEDICINE,
        sort: 'revive',
        sprite: '/assets/tuxemon/gfx/items/revive.png',
        price: 500,
        effects: [{ type: 'revive', reviveRatio: 0.5 }],
        consumable: true,
        usableIn: ['WorldState'],
      },
    };

    this.parseItemData(exampleItems);
  }

  /**
   * 获取道具数据
   */
  getItem(slug: string): ItemData | null {
    return this.itemCache.get(slug) || null;
  }

  /**
   * 获取所有道具
   */
  getAllItems(): ItemData[] {
    return Array.from(this.itemCache.values());
  }

  /**
   * 按分类获取道具
   */
  getItemsByCategory(category: ItemCategory): ItemData[] {
    return this.getAllItems().filter(item => item.category === category);
  }

  /**
   * 按可用场景获取道具
   */
  getItemsByUsableIn(location: 'WorldState' | 'Combat'): ItemData[] {
    return this.getAllItems().filter(item => item.usableIn.includes(location));
  }

  /**
   * 创建道具实例
   */
  createItemInstance(slug: string, quantity: number = 1): ItemInstance | null {
    const data = this.getItem(slug);
    if (!data) return null;

    return {
      instanceId: `${slug}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      itemId: slug,
      quantity: quantity,
    };
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.itemCache.clear();
    this.loaded = false;
  }
}

/**
 * 导出单例
 */
export const itemDataLoader = ItemDataLoader.getInstance();
