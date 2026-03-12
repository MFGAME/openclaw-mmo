/**
 * NPC 商店管理系统
 *
 * 基于 Tuxemon 的商店系统
 *
 * 功能：
 * - 管理商店数据结构（商品列表、价格、库存）
 * - 实现购买逻辑（金币扣除、道具添加）
 * - 实现出售逻辑（道具卖出、金币获得）
 * - 实现商店 UI 界面交互
 * - 实现商店 NPC 交互触发
 * - 支持不同类型的商店（道具店、精灵球店、药水店等）
 */

import { ItemData, ItemCategory } from './ItemData.js';
import { currencySystem, CurrencyType, CurrencyChangeType } from './CurrencySystem.js';
import { itemDataLoader } from './ItemData.js';

/**
 * 商店类型枚举
 */
export enum ShopType {
  /** 综合商店 */
  GENERAL = 'general',
  /** 道具店 */
  ITEM = 'item',
  /** 药水店 */
  POTION = 'potion',
  /** 精灵球店 */
  BALL = 'ball',
  /** 技能商店 */
  TECHNIQUE = 'technique',
  /** 特殊商店 */
  SPECIAL = 'special',
}

/**
 * 商店商品接口
 */
export interface ShopItem {
  /** 商品 ID（道具 ID） */
  itemId: string;
  /** 商品数据（缓存） */
  itemData?: ItemData;
  /** 商品价格（覆盖道具原始价格） */
  price?: number;
  /** 库存数量（-1 表示无限） */
  stock: number;
  /** 是否限购 */
  limited?: boolean;
  /** 解锁条件（可选） */
  unlockCondition?: string;
  /** 每日限购数量 */
  dailyLimit?: number;
  /** 今日已购买数量 */
  purchasedToday?: number;
}

/**
 * 商店数据接口
 */
export interface ShopData {
  /** 商店 ID */
  shopId: string;
  /** 商店名称 */
  name: string;
  /** 商店类型 */
  shopType: ShopType;
  /** NPC ID（关联的店主） */
  npcId: string;
  /** 商品列表 */
  items: ShopItem[];
  /** 商店描述 */
  description: string;
  /** 营业时间（可选，格式 "HH:MM-HH:MM"） */
  businessHours?: string;
  /** 是否启用 */
  enabled: boolean;
  /** 价格倍率（1.0 = 原价） */
  priceMultiplier: number;
  /** 收购倍率（0.5 = 收购价为售价的一半） */
  buybackMultiplier: number;
  /** 允许出售的分类 */
  sellableCategories: ItemCategory[];
}

/**
 * 购买结果接口
 */
export interface PurchaseResult {
  /** 是否成功 */
  success: boolean;
  /** 错误消息 */
  error?: string;
  /** 购买的商品 ID */
  itemId?: string;
  /** 购买数量 */
  quantity?: number;
  /** 消耗的金币 */
  spentGold?: number;
  /** 购买后的库存 */
  remainingStock?: number;
}

/**
 * 出售结果接口
 */
export interface SellResult {
  /** 是否成功 */
  success: boolean;
  /** 错误消息 */
  error?: string;
  /** 出售的商品 ID */
  itemId?: string;
  /** 出售数量 */
  quantity?: number;
  /** 获得的金币 */
  earnedGold?: number;
}

/**
 * 商店交易记录接口
 */
export interface ShopTransaction {
  /** 交易 ID */
  transactionId: string;
  /** 玩家 ID */
  playerId: string;
  /** 商店 ID */
  shopId: string;
  /** 交易类型 */
  type: 'buy' | 'sell';
  /** 商品 ID */
  itemId: string;
  /** 商品名称 */
  itemName: string;
  /** 数量 */
  quantity: number;
  /** 单价 */
  unitPrice: number;
  /** 总金额 */
  totalAmount: number;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 玩家商店数据接口
 */
export interface PlayerShopData {
  /** 玩家 ID */
  playerId: string;
  /** 交易记录 */
  transactions: ShopTransaction[];
  /** 每日购买记录 Map<商店ID, Map<商品ID, 数量>> */
  dailyPurchases: Map<string, Map<string, number>>;
  /** 最后更新日期（用于重置每日购买） */
  lastUpdateDate: string;
}

/**
 * 商店筛选条件接口
 */
export interface ShopFilter {
  /** 商品分类 */
  category?: ItemCategory;
  /** 是否只显示有库存的商品 */
  inStockOnly?: boolean;
  /** 最低价格 */
  minPrice?: number;
  /** 最高价格 */
  maxPrice?: number;
  /** 搜索关键词 */
  searchQuery?: string;
}

/**
 * 商店管理器类
 *
 * 单例模式，管理所有 NPC 商店
 */
export class ShopManager {
  private static instance: ShopManager;

  /** 商店数据 Map<商店ID, 商店数据> */
  private shops: Map<string, ShopData> = new Map();

  /** 玩家商店数据 Map<玩家ID, 玩家数据> */
  private playerData: Map<string, PlayerShopData> = new Map();

  /** 交易 ID 计数器 */
  private transactionIdCounter: number = 0;

  /** 当前打开的商店 */
  private currentShop: ShopData | null = null;

  /**
   * 私有构造函数，确保单例
   */
  private constructor() {}

  /**
   * 获取商店管理器单例实例
   */
  static getInstance(): ShopManager {
    if (!ShopManager.instance) {
      ShopManager.instance = new ShopManager();
    }
    return ShopManager.instance;
  }

  /**
   * 初始化商店管理器
   */
  initialize(): void {
    // 创建默认商店
    this.createDefaultShops();
    console.log('[ShopManager] 商店管理器已初始化');
  }

  /**
   * 创建默认商店
   */
  private createDefaultShops(): void {
    // 村庄道具店
    const generalShop: ShopData = {
      shopId: 'village_general_shop',
      name: '村庄道具店',
      shopType: ShopType.GENERAL,
      npcId: 'shopkeeper1',
      items: [
        { itemId: 'potion', stock: 20, price: 100, limited: true },
        { itemId: 'super_potion', stock: 10, price: 300, limited: true },
        { itemId: 'antidote_grapes', stock: 15, price: 150, limited: true },
        { itemId: 'tuxeball', stock: 30, price: 200, limited: false },
        { itemId: 'revive', stock: 5, price: 500, limited: true },
      ],
      description: '出售各种常用道具',
      enabled: true,
      priceMultiplier: 1.0,
      buybackMultiplier: 0.5,
      sellableCategories: [
        ItemCategory.CONSUMABLE,
        ItemCategory.MEDICINE,
        ItemCategory.BALL,
      ],
    };

    // 药水店
    const potionShop: ShopData = {
      shopId: 'village_potion_shop',
      name: '药水专卖店',
      shopType: ShopType.POTION,
      npcId: 'merchant2',
      items: [
        { itemId: 'potion', stock: 50, price: 100, limited: false },
        { itemId: 'super_potion', stock: 30, price: 300, limited: false },
        { itemId: 'mega_potion', stock: 10, price: 800, limited: true },
        { itemId: 'ultra_potion', stock: 5, price: 1500, limited: true },
        { itemId: 'imperial_potion', stock: 2, price: 3000, limited: true, dailyLimit: 1 },
      ],
      description: '专精各种恢复药水',
      enabled: true,
      priceMultiplier: 0.9, // 药水店价格优惠 10%
      buybackMultiplier: 0.4,
      sellableCategories: [ItemCategory.CONSUMABLE, ItemCategory.MEDICINE],
    };

    // 精灵球店
    const ballShop: ShopData = {
      shopId: 'village_ball_shop',
      name: '精灵球专卖店',
      shopType: ShopType.BALL,
      npcId: 'merchant3',
      items: [
        { itemId: 'tuxeball', stock: 100, price: 200, limited: false },
        { itemId: 'super_potion', stock: -1, price: 300, limited: false }, // 也可以买药水
        { itemId: 'revive', stock: 10, price: 500, limited: true },
      ],
      description: '提供各种捕捉怪物的精灵球',
      enabled: true,
      priceMultiplier: 1.0,
      buybackMultiplier: 0.3,
      sellableCategories: [ItemCategory.BALL],
    };

    // 注册商店
    this.registerShop(generalShop);
    this.registerShop(potionShop);
    this.registerShop(ballShop);

    console.log('[ShopManager] 默认商店已创建');
  }

  /**
   * 注册商店
   * @param shop 商店数据
   */
  registerShop(shop: ShopData): void {
    // 加载商品数据
    for (const shopItem of shop.items) {
      const itemData = itemDataLoader.getItem(shopItem.itemId);
      if (itemData) {
        shopItem.itemData = itemData;
        // 如果没有指定价格，使用道具原价
        if (shopItem.price === undefined) {
          shopItem.price = itemData.price;
        }
      } else {
        console.warn(`[ShopManager] 商品 ${shopItem.itemId} 不存在`);
      }
    }

    this.shops.set(shop.shopId, shop);
    console.log(`[ShopManager] 商店已注册: ${shop.name} (${shop.shopId})`);
  }

  /**
   * 获取商店数据
   * @param shopId 商店 ID
   * @returns 商店数据，如果不存在返回 null
   */
  getShop(shopId: string): ShopData | null {
    const shop = this.shops.get(shopId);
    if (!shop) {
      console.warn(`[ShopManager] 商店 ${shopId} 不存在`);
      return null;
    }
    return shop;
  }

  /**
   * 获取所有商店
   */
  getAllShops(): ShopData[] {
    return Array.from(this.shops.values()).filter(shop => shop.enabled);
  }

  /**
   * 根据类型获取商店
   * @param shopType 商店类型
   */
  getShopsByType(shopType: ShopType): ShopData[] {
    return this.getAllShops().filter(shop => shop.shopType === shopType);
  }

  /**
   * 获取商店商品列表
   * @param shopId 商店 ID
   * @param filter 筛选条件（可选）
   */
  getShopItems(shopId: string, filter: ShopFilter = {}): ShopItem[] {
    const shop = this.getShop(shopId);
    if (!shop) return [];

    let items = [...shop.items];

    // 只显示有库存的商品
    if (filter.inStockOnly !== false) {
      items = items.filter(item => item.stock === -1 || item.stock > 0);
    }

    // 按分类筛选
    if (filter.category) {
      items = items.filter(item =>
        item.itemData?.category === filter.category
      );
    }

    // 按价格范围筛选
    if (filter.minPrice !== undefined) {
      items = items.filter(item => (item.price ?? 0) >= filter.minPrice!);
    }
    if (filter.maxPrice !== undefined) {
      items = items.filter(item => (item.price ?? 0) <= filter.maxPrice!);
    }

    // 按关键词搜索
    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      items = items.filter(item =>
        item.itemData?.name.toLowerCase().includes(query) ||
        item.itemData?.description.toLowerCase().includes(query)
      );
    }

    return items;
  }

  /**
   * 打开商店
   * @param shopId 商店 ID
   * @returns 是否成功打开
   */
  openShop(shopId: string): boolean {
    const shop = this.getShop(shopId);
    if (!shop) {
      console.warn(`[ShopManager] 无法打开商店 ${shopId}：商店不存在`);
      return false;
    }

    if (!shop.enabled) {
      console.warn(`[ShopManager] 商店 ${shopId} 未启用`);
      return false;
    }

    // 检查营业时间（如果设置了）
    if (shop.businessHours) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTime = currentHour * 60 + currentMinute;

      const [open, close] = shop.businessHours.split('-');
      const [openHour, openMinute] = open.split(':').map(Number);
      const [closeHour, closeMinute] = close.split(':').map(Number);
      const openTime = openHour * 60 + openMinute;
      const closeTime = closeHour * 60 + closeMinute;

      if (currentTime < openTime || currentTime >= closeTime) {
        console.warn(`[ShopManager] 商店 ${shop.name} 当前不在营业时间`);
        return false;
      }
    }

    this.currentShop = shop;
    console.log(`[ShopManager] 打开商店: ${shop.name}`);
    return true;
  }

  /**
   * 关闭商店
   */
  closeShop(): void {
    this.currentShop = null;
    console.log('[ShopManager] 商店已关闭');
  }

  /**
   * 获取当前打开的商店
   */
  getCurrentShop(): ShopData | null {
    return this.currentShop;
  }

  /**
   * 购买商品
   * @param playerId 玩家 ID
   * @param itemId 商品 ID
   * @param quantity 购买数量
   * @param itemAdder 添加道具到玩家背包的回调
   */
  buyItem(
    playerId: string,
    itemId: string,
    quantity: number,
    itemAdder: (playerId: string, itemId: string, quantity: number) => boolean
  ): PurchaseResult {
    // 验证参数
    if (!this.currentShop) {
      return { success: false, error: '当前没有打开的商店' };
    }

    if (quantity <= 0) {
      return { success: false, error: '购买数量必须大于 0' };
    }

    // 查找商品
    const shopItem = this.currentShop.items.find(item => item.itemId === itemId);
    if (!shopItem) {
      return { success: false, error: '商品不存在' };
    }

    // 检查库存
    if (shopItem.stock !== -1 && shopItem.stock < quantity) {
      return { success: false, error: '库存不足' };
    }

    // 检查每日限购
    if (shopItem.dailyLimit !== undefined) {
      const playerShopData = this.getOrCreatePlayerData(playerId);
      const dailyPurchases = playerShopData.dailyPurchases.get(this.currentShop.shopId) || new Map();
      const purchasedToday = dailyPurchases.get(itemId) || 0;

      if (purchasedToday + quantity > shopItem.dailyLimit) {
        return { success: false, error: `该商品每日限购 ${shopItem.dailyLimit} 个` };
      }
    }

    // 计算价格（应用商店倍率）
    const basePrice = shopItem.price ?? (shopItem.itemData?.price ?? 0);
    const actualPrice = Math.floor(basePrice * this.currentShop.priceMultiplier);
    const totalPrice = actualPrice * quantity;

    // 检查玩家金币
    if (!currencySystem.hasEnoughBalance(playerId, CurrencyType.GOLD, totalPrice)) {
      return { success: false, error: '金币不足' };
    }

    // 扣除金币
    const deductResult = currencySystem.subtractCurrency(
      playerId,
      CurrencyType.GOLD,
      totalPrice,
      CurrencyChangeType.SHOP_PURCHASE,
      `在 ${this.currentShop.name} 购买 ${quantity} 个 ${shopItem.itemData?.name || itemId}`
    );

    if (!deductResult.success) {
      return { success: false, error: deductResult.error };
    }

    // 添加道具到玩家背包
    const addSuccess = itemAdder(playerId, itemId, quantity);
    if (!addSuccess) {
      // 回滚金币
      currencySystem.addCurrency(
        playerId,
        CurrencyType.GOLD,
        totalPrice,
        CurrencyChangeType.SHOP_PURCHASE,
        '购买失败退款'
      );
      return { success: false, error: '添加道具失败' };
    }

    // 更新库存
    if (shopItem.stock !== -1) {
      shopItem.stock -= quantity;
    }

    // 更新每日购买记录
    if (shopItem.dailyLimit !== undefined) {
      const playerShopData = this.getOrCreatePlayerData(playerId);
      let dailyPurchases = playerShopData.dailyPurchases.get(this.currentShop.shopId);
      if (!dailyPurchases) {
        dailyPurchases = new Map();
        playerShopData.dailyPurchases.set(this.currentShop.shopId, dailyPurchases);
      }
      const currentPurchased = dailyPurchases.get(itemId) || 0;
      dailyPurchases.set(itemId, currentPurchased + quantity);
    }

    // 记录交易
    this.recordTransaction(
      playerId,
      this.currentShop.shopId,
      'buy',
      itemId,
      shopItem.itemData?.name || itemId,
      quantity,
      actualPrice,
      totalPrice
    );

    console.log(
      `[ShopManager] ${playerId} 购买 ${quantity} 个 ${itemId}，花费 ${totalPrice} 金币`
    );

    return {
      success: true,
      itemId,
      quantity,
      spentGold: totalPrice,
      remainingStock: shopItem.stock,
    };
  }

  /**
   * 出售道具给商店
   * @param playerId 玩家 ID
   * @param itemId 道具 ID
   * @param quantity 出售数量
   * @param itemRemover 从玩家背包移除道具的回调
   */
  sellItem(
    playerId: string,
    itemId: string,
    quantity: number,
    itemRemover: (playerId: string, itemId: string, quantity: number) => boolean
  ): SellResult {
    // 验证参数
    if (!this.currentShop) {
      return { success: false, error: '当前没有打开的商店' };
    }

    if (quantity <= 0) {
      return { success: false, error: '出售数量必须大于 0' };
    }

    // 检查是否允许出售此道具
    const itemData = itemDataLoader.getItem(itemId);
    if (!itemData) {
      return { success: false, error: '道具不存在' };
    }

    if (!this.currentShop.sellableCategories.includes(itemData.category)) {
      return { success: false, error: '此商店不收购此类道具' };
    }

    // 计算收购价格（应用收购倍率）
    const basePrice = itemData.price;
    const buybackPrice = Math.floor(basePrice * this.currentShop.buybackMultiplier);
    const totalEarnings = buybackPrice * quantity;

    // 从玩家背包移除道具
    const removeSuccess = itemRemover(playerId, itemId, quantity);
    if (!removeSuccess) {
      return { success: false, error: '道具数量不足' };
    }

    // 增加玩家金币
    currencySystem.addCurrency(
      playerId,
      CurrencyType.GOLD,
      totalEarnings,
      CurrencyChangeType.SHOP_PURCHASE,
      `向 ${this.currentShop.name} 出售 ${quantity} 个 ${itemData.name}`
    );

    // 记录交易
    this.recordTransaction(
      playerId,
      this.currentShop.shopId,
      'sell',
      itemId,
      itemData.name,
      quantity,
      buybackPrice,
      totalEarnings
    );

    console.log(
      `[ShopManager] ${playerId} 出售 ${quantity} 个 ${itemId}，获得 ${totalEarnings} 金币`
    );

    return {
      success: true,
      itemId,
      quantity,
      earnedGold: totalEarnings,
    };
  }

  /**
   * 记录交易
   */
  private recordTransaction(
    playerId: string,
    shopId: string,
    type: 'buy' | 'sell',
    itemId: string,
    itemName: string,
    quantity: number,
    unitPrice: number,
    totalAmount: number
  ): void {
    const playerShopData = this.getOrCreatePlayerData(playerId);

    const transaction: ShopTransaction = {
      transactionId: `shop_txn_${++this.transactionIdCounter}`,
      playerId,
      shopId,
      type,
      itemId,
      itemName,
      quantity,
      unitPrice,
      totalAmount,
      timestamp: Date.now(),
    };

    playerShopData.transactions.push(transaction);

    // 限制交易记录数量
    if (playerShopData.transactions.length > 100) {
      playerShopData.transactions = playerShopData.transactions.slice(-100);
    }
  }

  /**
   * 获取玩家交易记录
   * @param playerId 玩家 ID
   * @param shopId 商店 ID（可选）
   * @param limit 最大返回数量
   */
  getPlayerTransactions(
    playerId: string,
    shopId?: string,
    limit: number = 50
  ): ShopTransaction[] {
    const playerShopData = this.playerData.get(playerId);
    if (!playerShopData) {
      return [];
    }

    let transactions = [...playerShopData.transactions];

    // 按商店筛选
    if (shopId) {
      transactions = transactions.filter(t => t.shopId === shopId);
    }

    // 按时间倒序排列
    transactions.sort((a, b) => b.timestamp - a.timestamp);

    // 限制数量
    return transactions.slice(0, limit);
  }

  /**
   * 获取玩家数据
   */
  private getOrCreatePlayerData(playerId: string): PlayerShopData {
    let data = this.playerData.get(playerId);

    if (!data) {
      data = {
        playerId,
        transactions: [],
        dailyPurchases: new Map(),
        lastUpdateDate: this.getTodayDateString(),
      };
      this.playerData.set(playerId, data);
    }

    // 检查是否需要重置每日购买
    const today = this.getTodayDateString();
    if (data.lastUpdateDate !== today) {
      data.dailyPurchases.clear();
      data.lastUpdateDate = today;
    }

    return data;
  }

  /**
   * 获取今日日期字符串
   */
  private getTodayDateString(): string {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  }

  /**
   * 更新商店商品
   * @param shopId 商店 ID
   * @param itemId 商品 ID
   * @param updates 更新的字段
   */
  updateShopItem(
    shopId: string,
    itemId: string,
    updates: Partial<ShopItem>
  ): boolean {
    const shop = this.shops.get(shopId);
    if (!shop) {
      return false;
    }

    const shopItem = shop.items.find(item => item.itemId === itemId);
    if (!shopItem) {
      return false;
    }

    // 更新字段
    Object.assign(shopItem, updates);

    console.log(`[ShopManager] 更新商品: ${shopId}/${itemId}`);
    return true;
  }

  /**
   * 补充商店库存
   * @param shopId 商店 ID
   * @param itemId 商品 ID（可选，不指定则补充所有）
   * @param amount 补充数量
   */
  restockShop(shopId: string, itemId?: string, amount: number = 10): void {
    const shop = this.shops.get(shopId);
    if (!shop) {
      return;
    }

    if (itemId) {
      // 补充指定商品
      const shopItem = shop.items.find(item => item.itemId === itemId);
      if (shopItem && shopItem.stock !== -1) {
        shopItem.stock += amount;
      }
    } else {
      // 补充所有商品
      for (const shopItem of shop.items) {
        if (shopItem.stock !== -1) {
          shopItem.stock += amount;
        }
      }
    }

    console.log(`[ShopManager] 商店 ${shopId} 库存已补充`);
  }

  /**
   * 启用/禁用商店
   * @param shopId 商店 ID
   * @param enabled 是否启用
   */
  setShopEnabled(shopId: string, enabled: boolean): void {
    const shop = this.shops.get(shopId);
    if (shop) {
      shop.enabled = enabled;
      console.log(`[ShopManager] 商店 ${shopId} ${enabled ? '已启用' : '已禁用'}`);
    }
  }

  /**
   * 删除商店
   * @param shopId 商店 ID
   */
  removeShop(shopId: string): boolean {
    const deleted = this.shops.delete(shopId);
    if (deleted) {
      console.log(`[ShopManager] 商店 ${shopId} 已删除`);
    }
    return deleted;
  }

  /**
   * 清除所有数据
   */
  clear(): void {
    this.shops.clear();
    this.playerData.clear();
    this.transactionIdCounter = 0;
    this.currentShop = null;
    console.log('[ShopManager] 所有数据已清除');
  }
}

/**
 * 导出商店管理器单例
 */
export const shopManager = ShopManager.getInstance();
