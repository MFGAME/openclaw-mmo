/**
 * 道具数据加载器
 *
 * 负责从 assets/tuxemon/items/ 加载 Tuxemon 原版道具资源
 * 包括道具 JSON 数据和 PNG 图标
 */

import { ItemData, ItemCategory, ItemEffect } from './ItemData';

/**
 * 道具加载器配置
 */
export interface ItemDataLoaderConfig {
  /** 道具 JSON 数据基础路径 */
  itemsJsonPath: string;
  /** 道具图标图片基础路径 */
  itemsSpritePath: string;
  /** 是否启用缓存 */
  enableCache: boolean;
}

/**
 * 道具加载结果接口
 */
export interface ItemLoadResult {
  /** 加载的道具数量 */
  count: number;
  /** 加载的道具图标数量 */
  spriteCount: number;
  /** 加载耗时（毫秒） */
  loadTime: number;
}

/**
 * 道具数据加载器类
 */
export class ItemDataLoader {
  private static instance: ItemDataLoader;

  /** 道具数据缓存 */
  private itemCache: Map<string, ItemData> = new Map();

  /** 道具图标图片缓存 */
  private spriteCache: Map<string, HTMLImageElement> = new Map();

  /** 是否已加载 */
  private loaded: boolean = false;

  /** 配置 */
  private config: ItemDataLoaderConfig;

  /**
   * 私有构造函数
   */
  private constructor(config?: Partial<ItemDataLoaderConfig>) {
    this.config = {
      itemsJsonPath: '/assets/tuxemon/items/',
      itemsSpritePath: '/assets/tuxemon/gfx/items/',
      enableCache: true,
      ...config,
    };
  }

  /**
   * 获取单例实例
   */
  static getInstance(config?: Partial<ItemDataLoaderConfig>): ItemDataLoader {
    if (!ItemDataLoader.instance) {
      ItemDataLoader.instance = new ItemDataLoader(config);
    }
    return ItemDataLoader.instance;
  }

  /**
   * 初始化加载器
   */
  async initialize(): Promise<void> {
    if (this.loaded) return;

    console.log('[ItemDataLoader] 初始化道具数据加载器...');
    await this.loadAllItems();
  }

  /**
   * 加载所有道具数据和图标
   */
  async loadAllItems(): Promise<ItemLoadResult> {
    if (this.loaded) {
      return {
        count: this.itemCache.size,
        spriteCount: this.spriteCache.size,
        loadTime: 0,
      };
    }

    const startTime = Date.now();
    console.log('[ItemDataLoader] 开始加载道具资源...');

    // 获取道具文件列表
    const itemFiles = await this.getItemFileList();

    // 并行加载所有道具 JSON 数据
    const loadPromises = itemFiles.map(slug => this.loadItemData(slug));
    const results = await Promise.allSettled(loadPromises);

    // 统计成功加载的道具数量
    let successCount = 0;
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        successCount++;
      }
    }

    // 预加载道具图标
    const spritePromises = Array.from(this.itemCache.keys()).map(slug =>
      this.loadItemSprite(slug).catch(() => undefined)
    );
    await Promise.all(spritePromises);

    const loadTime = Date.now() - startTime;
    this.loaded = true;

    console.log(`[ItemDataLoader] 道具加载完成: ${successCount}/${itemFiles.length} 个道具，${this.spriteCache.size} 个图标，耗时 ${loadTime}ms`);

    return {
      count: successCount,
      spriteCount: this.spriteCache.size,
      loadTime,
    };
  }

  /**
   * 加载单个道具数据
   * @param slug 道具 ID
   */
  async loadItemData(slug: string): Promise<ItemData | null> {
    // 检查缓存
    if (this.config.enableCache && this.itemCache.has(slug)) {
      return this.itemCache.get(slug)!;
    }

    try {
      const response = await fetch(`${this.config.itemsJsonPath}${slug}.json`);
      if (!response.ok) {
        console.warn(`[ItemDataLoader] 道具 ${slug} 加载失败: HTTP ${response.status}`);
        return null;
      }

      const raw = await response.json();
      const itemData = this.createItemDataFromRaw(slug, raw);

      if (this.config.enableCache) {
        this.itemCache.set(slug, itemData);
      }

      return itemData;
    } catch (error) {
      console.warn(`[ItemDataLoader] 道具 ${slug} 加载异常:`, error);
      return null;
    }
  }

  /**
   * 加载道具图标
   * @param slug 道具 ID
   */
  async loadItemSprite(slug: string): Promise<HTMLImageElement | null> {
    // 检查缓存
    if (this.config.enableCache && this.spriteCache.has(slug)) {
      return this.spriteCache.get(slug)!;
    }

    try {
      const spritePath = `${this.config.itemsSpritePath}${slug}.png`;
      const image = await this.loadImage(spritePath);

      if (image && this.config.enableCache) {
        this.spriteCache.set(slug, image);
      }

      return image;
    } catch (error) {
      console.warn(`[ItemDataLoader] 道具图标 ${slug} 加载失败:`, error);
      return null;
    }
  }

  /**
   * 从原始数据创建 ItemData 对象
   */
  private createItemDataFromRaw(slug: string, raw: any): ItemData {
    // 解析效果
    const effects: ItemEffect[] = [];
    const itemEffect: ItemEffect = { type: 'none' };

    // 根据 sort 分类确定道具类型和效果
    switch (raw.sort) {
      case 'potion':
      case 'cure':
        itemEffect.type = 'heal';
        // 从 modifiers 中获取恢复数值
        if (raw.modifiers && raw.modifiers.length > 0) {
          const modifier = raw.modifiers[0];
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
    switch (raw.sort) {
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
    if (raw.usable_in) {
      for (const location of raw.usable_in) {
        if (location === 'WorldState' || location === 'Combat') {
          usableIn.push(location);
        }
      }
    }

    return {
      slug: slug,
      name: this.formatName(slug),
      description: raw.description || '',
      category: category,
      sort: raw.sort || 'other',
      sprite: raw.sprite || `${this.config.itemsSpritePath}${slug}.png`,
      price: raw.price || 100,
      effects: effects,
      consumable: raw.behaviors?.consumable ?? true,
      usableIn: usableIn,
      animation: raw.visuals?.animation,
      sfx: raw.sound?.sfx,
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
   * 加载图片
   */
  private loadImage(path: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const image = new Image();

      image.onload = () => {
        resolve(image);
      };

      image.onerror = () => {
        console.warn(`[ItemDataLoader] 图片加载失败: ${path}`);
        resolve(null);
      };

      image.src = path;
    });
  }

  /**
   * 获取道具文件列表
   */
  private async getItemFileList(): Promise<string[]> {
    // Tuxemon 原版道具列表（221 个道具）
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
   * 根据道具 ID 获取道具数据
   * @param slug 道具 ID
   */
  getById(slug: string): ItemData | null {
    return this.itemCache.get(slug) || null;
  }

  /**
   * 根据分类获取道具列表
   * @param category 道具分类
   */
  getByType(category: ItemCategory): ItemData[] {
    return Array.from(this.itemCache.values()).filter(item => item.category === category);
  }

  /**
   * 获取所有道具
   */
  getAllItems(): ItemData[] {
    return Array.from(this.itemCache.values());
  }

  /**
   * 获取道具图标
   * @param slug 道具 ID
   */
  getItemSprite(slug: string): HTMLImageElement | null {
    return this.spriteCache.get(slug) || null;
  }

  /**
   * 搜索道具
   * @param keyword 搜索关键词
   */
  searchItems(keyword: string): ItemData[] {
    const lowerKeyword = keyword.toLowerCase();
    return Array.from(this.itemCache.values()).filter(
      item =>
        item.name.toLowerCase().includes(lowerKeyword) ||
        item.slug.toLowerCase().includes(lowerKeyword) ||
        item.description.toLowerCase().includes(lowerKeyword)
    );
  }

  /**
   * 预加载指定道具
   * @param slugs 道具 ID 列表
   */
  async preloadItems(slugs: string[]): Promise<void> {
    const promises = slugs.map(slug => this.loadItemData(slug));
    await Promise.allSettled(promises);
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.itemCache.clear();
    this.spriteCache.clear();
    this.loaded = false;
    console.log('[ItemDataLoader] 缓存已清除');
  }

  /**
   * 获取加载状态
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { itemCount: number; spriteCount: number } {
    return {
      itemCount: this.itemCache.size,
      spriteCount: this.spriteCache.size,
    };
  }
}

/**
 * 导出单例
 */
export const itemDataLoader = ItemDataLoader.getInstance();
