/**
 * 交易市场系统
 *
 * 玩家间交易市场系统
 *
 * 功能：
 * - 挂单数据结构
 * - 挂单创建逻辑
 * - 挂单查询和筛选
 * - 购买逻辑（金币扣除、物品转移）
 * - 挂单取消逻辑
 * - 交易历史记录
 */

import { ItemData } from './ItemData';
import { MonsterInstance } from './MonsterData';

/**
 * 交易物品类型
 */
export enum TradeItemType {
  /** 道具 */
  ITEM = 'item',
  /** 怪物 */
  MONSTER = 'monster',
}

/**
 * 交易物品接口
 */
export interface TradeItem {
  /** 物品类型 */
  itemType: TradeItemType;
  /** 物品 ID（道具 ID 或怪物实例 ID） */
  itemId: string;
  /** 物品数据（用于显示） */
  itemData?: ItemData | MonsterInstance;
  /** 数量 */
  quantity: number;
}

/**
 * 市场挂单接口
 */
export interface MarketListing {
  /** 挂单 ID */
  listingId: string;
  /** 卖家玩家 ID */
  sellerId: string;
  /** 卖家玩家名称 */
  sellerName: string;
  /** 交易物品 */
  item: TradeItem;
  /** 单价（金币） */
  price: number;
  /** 数量 */
  quantity: number;
  /** 创建时间 */
  createdAt: number;
  /** 过期时间 */
  expiresAt: number;
  /** 状态 */
  status: 'active' | 'sold' | 'cancelled' | 'expired';
}

/**
 * 交易记录接口
 */
export interface TradeRecord {
  /** 交易 ID */
  tradeId: string;
  /** 卖家 ID */
  sellerId: string;
  /** 卖家名称 */
  sellerName: string;
  /** 买家 ID */
  buyerId: string;
  /** 买家名称 */
  buyerName: string;
  /** 交易物品 */
  item: TradeItem;
  /** 交易数量 */
  quantity: number;
  /** 单价 */
  price: number;
  /** 总金额 */
  totalPrice: number;
  /** 交易时间 */
  tradeTime: number;
  /** 手续费 */
  fee: number;
}

/**
 * 玩家市场数据接口
 */
export interface PlayerMarketData {
  /** 玩家 ID */
  playerId: string;
  /** 当前挂单列表 */
  activeListings: string[];
  /** 交易历史 */
  tradeHistory: TradeRecord[];
  /** 卖出总额 */
  totalSold: number;
  /** 买入总额 */
  totalBought: number;
}

/**
 * 市场筛选条件接口
 */
export interface MarketFilter {
  /** 物品类型 */
  itemType?: TradeItemType;
  /** 物品 ID 模糊搜索 */
  searchQuery?: string;
  /** 最低价格 */
  minPrice?: number;
  /** 最高价格 */
  maxPrice?: number;
  /** 卖家 ID */
  sellerId?: string;
  /** 只显示可购买的 */
  availableOnly?: boolean;
}

/**
 * 挂单创建结果
 */
export interface CreateListingResult {
  /** 是否成功 */
  success: boolean;
  /** 挂单 ID */
  listingId?: string;
  /** 错误消息 */
  error?: string;
}

/**
 * 购买结果
 */
export interface PurchaseResult {
  /** 是否成功 */
  success: boolean;
  /** 交易记录 ID */
  tradeId?: string;
  /** 错误消息 */
  error?: string;
}

/**
 * 取消挂单结果
 */
export interface CancelListingResult {
  /** 是否成功 */
  success: boolean;
  /** 错误消息 */
  error?: string;
}

/**
 * 交易市场系统类
 */
export class MarketSystem {
  private static instance: MarketSystem;

  /** 市场挂单列表 */
  private listings: Map<string, MarketListing> = new Map();

  /** 交易记录列表 */
  private tradeRecords: TradeRecord[] = [];

  /** 玩家市场数据 */
  private playerMarketData: Map<string, PlayerMarketData> = new Map();

  /** 挂单 ID 计数器 */
  private listingIdCounter: number = 0;

  /** 交易 ID 计数器 */
  private tradeIdCounter: number = 0;

  /** 挂单过期时间（毫秒，默认 7 天） */
  private readonly LISTING_EXPIRY_TIME: number = 7 * 24 * 60 * 60 * 1000;

  /** 交易手续费率（5%） */
  private readonly TRADING_FEE_RATE: number = 0.05;

  /**
   * 私有构造函数，确保单例
   */
  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): MarketSystem {
    if (!MarketSystem.instance) {
      MarketSystem.instance = new MarketSystem();
    }
    return MarketSystem.instance;
  }

  /**
   * 创建挂单
   * @param sellerId 卖家 ID
   * @param sellerName 卖家名称
   * @param item 交易物品
   * @param price 单价
   * @param quantity 数量
   */
  createListing(
    sellerId: string,
    sellerName: string,
    item: TradeItem,
    price: number,
    quantity: number
  ): CreateListingResult {
    // 验证参数
    if (!sellerId || !sellerName) {
      return { success: false, error: '卖家信息无效' };
    }

    if (!item || !item.itemId) {
      return { success: false, error: '物品信息无效' };
    }

    if (price <= 0) {
      return { success: false, error: '价格必须大于 0' };
    }

    if (quantity <= 0) {
      return { success: false, error: '数量必须大于 0' };
    }

    // 生成挂单 ID
    const listingId = `listing_${++this.listingIdCounter}`;

    const now = Date.now();

    const listing: MarketListing = {
      listingId,
      sellerId,
      sellerName,
      item,
      price,
      quantity,
      createdAt: now,
      expiresAt: now + this.LISTING_EXPIRY_TIME,
      status: 'active',
    };

    // 添加挂单
    this.listings.set(listingId, listing);

    // 更新玩家数据
    const playerData = this.getOrCreatePlayerData(sellerId);
    playerData.activeListings.push(listingId);

    console.log(`[MarketSystem] 创建挂单: ${listingId} by ${sellerName}`);

    return { success: true, listingId };
  }

  /**
   * 查询市场挂单
   * @param filter 筛选条件
   */
  getListings(filter: MarketFilter = {}): MarketListing[] {
    let results = Array.from(this.listings.values());

    // 筛选活跃的挂单
    if (filter.availableOnly !== false) {
      results = results.filter(l => l.status === 'active');
    }

    // 按物品类型筛选
    if (filter.itemType) {
      results = results.filter(l => l.item.itemType === filter.itemType);
    }

    // 按搜索查询筛选
    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      results = results.filter(l => {
        const itemName = l.item.itemData
          ? (l.item.itemData as any).name?.toLowerCase() || ''
          : l.item.itemId.toLowerCase();
        return itemName.includes(query);
      });
    }

    // 按价格范围筛选
    if (filter.minPrice !== undefined) {
      results = results.filter(l => l.price >= filter.minPrice!);
    }
    if (filter.maxPrice !== undefined) {
      results = results.filter(l => l.price <= filter.maxPrice!);
    }

    // 按卖家筛选
    if (filter.sellerId) {
      results = results.filter(l => l.sellerId === filter.sellerId);
    }

    // 过滤已过期的挂单
    const now = Date.now();
    results = results.filter(l => l.expiresAt > now);

    // 按创建时间倒序排列（最新的在前）
    results.sort((a, b) => b.createdAt - a.createdAt);

    return results;
  }

  /**
   * 获取单个挂单详情
   * @param listingId 挂单 ID
   */
  getListing(listingId: string): MarketListing | null {
    return this.listings.get(listingId) || null;
  }

  /**
   * 购买挂单
   * @param buyerId 买家 ID
   * @param buyerName 买家名称
   * @param listingId 挂单 ID
   * @param quantity 购买数量
   * @param playerGoldGetter 获取玩家金币的回调
   * @param playerGoldSetter 设置玩家金币的回调
   * @param itemAdder 添加物品到玩家背包的回调
   * @param itemRemover 从卖家移除物品的回调
   */
  async purchaseListing(
    buyerId: string,
    buyerName: string,
    listingId: string,
    quantity: number,
    playerGoldGetter: (playerId: string) => number,
    playerGoldSetter: (playerId: string, gold: number) => void,
    itemAdder: (playerId: string, item: TradeItem, quantity: number) => boolean,
    itemRemover: (playerId: string, itemId: string, quantity: number) => boolean
  ): Promise<PurchaseResult> {
    // 验证参数
    if (!buyerId || !buyerName) {
      return { success: false, error: '买家信息无效' };
    }

    if (quantity <= 0) {
      return { success: false, error: '数量必须大于 0' };
    }

    // 获取挂单
    const listing = this.listings.get(listingId);
    if (!listing) {
      return { success: false, error: '挂单不存在' };
    }

    // 验证挂单状态
    if (listing.status !== 'active') {
      return { success: false, error: '挂单不可购买' };
    }

    // 检查挂单是否过期
    if (Date.now() > listing.expiresAt) {
      listing.status = 'expired';
      return { success: false, error: '挂单已过期' };
    }

    // 检查购买数量
    if (quantity > listing.quantity) {
      return { success: false, error: '库存不足' };
    }

    // 检查是否是自己的挂单
    if (listing.sellerId === buyerId) {
      return { success: false, error: '不能购买自己的挂单' };
    }

    // 计算总金额
    const totalPrice = listing.price * quantity;

    // 检查买家金币
    const buyerGold = playerGoldGetter(buyerId);
    if (buyerGold < totalPrice) {
      return { success: false, error: '金币不足' };
    }

    // 扣除买家金币
    playerGoldSetter(buyerId, buyerGold - totalPrice);

    // 计算手续费
    const fee = Math.floor(totalPrice * this.TRADING_FEE_RATE);
    const sellerReceive = totalPrice - fee;

    // 将金币给卖家（扣除手续费后）
    const sellerGold = playerGoldGetter(listing.sellerId);
    playerGoldSetter(listing.sellerId, sellerGold + sellerReceive);

    // 移除卖家的物品
    const removeSuccess = itemRemover(listing.sellerId, listing.item.itemId, quantity);
    if (!removeSuccess) {
      // 回滚金币
      playerGoldSetter(buyerId, buyerGold);
      playerGoldSetter(listing.sellerId, sellerGold);
      return { success: false, error: '卖家物品不足' };
    }

    // 给买家添加物品
    const addSuccess = itemAdder(buyerId, listing.item, quantity);
    if (!addSuccess) {
      // 回滚所有操作
      playerGoldSetter(buyerId, buyerGold);
      playerGoldSetter(listing.sellerId, sellerGold);
      itemRemover(listing.sellerId, listing.item.itemId, quantity); // 尝试恢复
      return { success: false, error: '添加物品失败' };
    }

    // 更新挂单数量或标记为已售完
    if (quantity === listing.quantity) {
      listing.status = 'sold';
    } else {
      listing.quantity -= quantity;
    }

    // 从卖家的活跃挂单列表中移除（如果已售完）
    const sellerData = this.playerMarketData.get(listing.sellerId);
    if (sellerData && listing.status === 'sold') {
      sellerData.activeListings = sellerData.activeListings.filter(id => id !== listingId);
    }

    // 生成交易记录
    const tradeId = `trade_${++this.tradeIdCounter}`;
    const tradeRecord: TradeRecord = {
      tradeId,
      sellerId: listing.sellerId,
      sellerName: listing.sellerName,
      buyerId,
      buyerName,
      item: listing.item,
      quantity,
      price: listing.price,
      totalPrice,
      tradeTime: Date.now(),
      fee,
    };

    // 添加交易记录
    this.tradeRecords.push(tradeRecord);

    // 更新双方玩家数据
    this.updatePlayerTradeData(listing.sellerId, tradeRecord);
    this.updatePlayerTradeData(buyerId, tradeRecord);

    console.log(`[MarketSystem] 交易完成: ${tradeId} - ${buyerName} 购买了 ${quantity} 个物品`);

    return { success: true, tradeId };
  }

  /**
   * 取消挂单
   * @param sellerId 卖家 ID
   * @param listingId 挂单 ID
   */
  cancelListing(sellerId: string, listingId: string): CancelListingResult {
    // 获取挂单
    const listing = this.listings.get(listingId);
    if (!listing) {
      return { success: false, error: '挂单不存在' };
    }

    // 验证卖家
    if (listing.sellerId !== sellerId) {
      return { success: false, error: '无权操作此挂单' };
    }

    // 验证状态
    if (listing.status !== 'active') {
      return { success: false, error: '挂单不可取消' };
    }

    // 检查是否过期
    if (Date.now() > listing.expiresAt) {
      listing.status = 'expired';
      return { success: false, error: '挂单已过期' };
    }

    // 取消挂单
    listing.status = 'cancelled';

    // 从卖家的活跃挂单列表中移除
    const playerData = this.playerMarketData.get(sellerId);
    if (playerData) {
      playerData.activeListings = playerData.activeListings.filter(id => id !== listingId);
    }

    console.log(`[MarketSystem] 取消挂单: ${listingId}`);

    return { success: true };
  }

  /**
   * 获取玩家交易历史
   * @param playerId 玩家 ID
   * @param limit 最大返回数量
   */
  getPlayerTradeHistory(playerId: string, limit: number = 50): TradeRecord[] {
    const playerData = this.playerMarketData.get(playerId);
    if (!playerData) {
      return [];
    }

    const history = playerData.tradeHistory.slice(-limit);
    // 按时间倒序排列
    return history.sort((a, b) => b.tradeTime - a.tradeTime);
  }

  /**
   * 获取玩家活跃挂单
   * @param playerId 玩家 ID
   */
  getPlayerActiveListings(playerId: string): MarketListing[] {
    const playerData = this.playerMarketData.get(playerId);
    if (!playerData) {
      return [];
    }

    const listings: MarketListing[] = [];
    for (const listingId of playerData.activeListings) {
      const listing = this.listings.get(listingId);
      if (listing && listing.status === 'active') {
        listings.push(listing);
      }
    }

    return listings;
  }

  /**
   * 获取玩家市场数据
   * @param playerId 玩家 ID
   */
  getPlayerMarketData(playerId: string): PlayerMarketData | null {
    const data = this.playerMarketData.get(playerId);
    if (!data) {
      return null;
    }

    // 返回深拷贝
    return {
      playerId: data.playerId,
      activeListings: [...data.activeListings],
      tradeHistory: [...data.tradeHistory],
      totalSold: data.totalSold,
      totalBought: data.totalBought,
    };
  }

  /**
   * 清理过期挂单
   */
  cleanupExpiredListings(): number {
    const now = Date.now();
    let count = 0;

    for (const listing of this.listings.values()) {
      if (listing.status === 'active' && now > listing.expiresAt) {
        listing.status = 'expired';

        // 从卖家的活跃挂单列表中移除
        const playerData = this.playerMarketData.get(listing.sellerId);
        if (playerData) {
          playerData.activeListings = playerData.activeListings.filter(
            id => id !== listing.listingId
          );
        }

        count++;
      }
    }

    if (count > 0) {
      console.log(`[MarketSystem] 清理了 ${count} 个过期挂单`);
    }

    return count;
  }

  /**
   * 获取市场统计信息
   */
  getMarketStats(): {
    totalListings: number;
    activeListings: number;
    totalTrades: number;
    totalVolume: number;
    totalFees: number;
  } {
    const activeListings = Array.from(this.listings.values()).filter(l => l.status === 'active');
    const totalVolume = this.tradeRecords.reduce((sum, t) => sum + t.totalPrice, 0);
    const totalFees = this.tradeRecords.reduce((sum, t) => sum + t.fee, 0);

    return {
      totalListings: this.listings.size,
      activeListings: activeListings.length,
      totalTrades: this.tradeRecords.length,
      totalVolume,
      totalFees,
    };
  }

  /**
   * 获取或创建玩家市场数据
   */
  private getOrCreatePlayerData(playerId: string): PlayerMarketData {
    let data = this.playerMarketData.get(playerId);
    if (!data) {
      data = {
        playerId,
        activeListings: [],
        tradeHistory: [],
        totalSold: 0,
        totalBought: 0,
      };
      this.playerMarketData.set(playerId, data);
    }
    return data;
  }

  /**
   * 更新玩家交易数据
   */
  private updatePlayerTradeData(playerId: string, record: TradeRecord): void {
    const data = this.getOrCreatePlayerData(playerId);
    data.tradeHistory.push(record);

    // 更新交易总额
    if (record.sellerId === playerId) {
      data.totalSold += record.totalPrice;
    } else {
      data.totalBought += record.totalPrice;
    }

    // 限制历史记录数量
    if (data.tradeHistory.length > 100) {
      data.tradeHistory = data.tradeHistory.slice(-100);
    }
  }

  /**
   * 清空市场数据（仅用于测试）
   */
  clear(): void {
    this.listings.clear();
    this.tradeRecords = [];
    this.playerMarketData.clear();
    this.listingIdCounter = 0;
    this.tradeIdCounter = 0;
    console.log('[MarketSystem] 市场数据已清空');
  }

  /**
   * 序列化市场数据（用于持久化）
   */
  serialize(): string {
    const data = {
      listings: Array.from(this.listings.entries()),
      tradeRecords: this.tradeRecords,
      playerMarketData: Array.from(this.playerMarketData.entries()),
      listingIdCounter: this.listingIdCounter,
      tradeIdCounter: this.tradeIdCounter,
    };
    return JSON.stringify(data);
  }

  /**
   * 反序列化市场数据（用于加载）
   */
  deserialize(json: string): void {
    try {
      const data = JSON.parse(json);
      this.listings = new Map(data.listings);
      this.tradeRecords = data.tradeRecords || [];
      this.playerMarketData = new Map(data.playerMarketData || []);
      this.listingIdCounter = data.listingIdCounter || 0;
      this.tradeIdCounter = data.tradeIdCounter || 0;
      console.log('[MarketSystem] 市场数据已加载');
    } catch (error) {
      console.error('[MarketSystem] 加载市场数据失败:', error);
    }
  }
}

/**
 * 导出市场系统单例
 */
export const marketSystem = MarketSystem.getInstance();
