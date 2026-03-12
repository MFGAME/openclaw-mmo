/**
 * 机器人背包管理系统
 *
 * 功能：
 * - 机器人背包管理（道具存储）
 * - 自动使用恢复道具（HP 低时）
 * - 自动使用进化石（满足条件时）
 * - 道具使用策略（基于性格）
 */

import { itemDataLoader } from './ItemData.js';
import { BotPersonality } from '../bot/BotManager.js';

/**
 * 道具使用策略枚举
 */
export enum ItemUsageStrategy {
  /** 保守 - 只在必要时使用 */
  CONSERVATIVE = 'conservative',
  /** 积极 - 主动使用提升战斗能力 */
  AGGRESSIVE = 'aggressive',
  /** 平衡 - 根据情况决定 */
  BALANCED = 'balanced',
  /** 收集 - 优先保留稀有道具 */
  COLLECTOR = 'collector',
}

/**
 * 道具分类
 */
export enum ItemCategory {
  /** 恢复类 - 恢复 HP */
  HEALING = 'healing',
  /** 状态类 - 恢复状态 */
  STATUS = 'status',
  /** 精灵球类 - 捕捉怪物 */
  BALL = 'ball',
  /** 进化石类 - 进化道具 */
  EVOLUTION = 'evolution',
  /** 能量类 - 恢复技能 PP */
  ENERGY = 'energy',
  /** 特殊类 - 其他道具 */
  SPECIAL = 'special',
}

/**
 * 背包道具接口
 */
export interface InventoryItem {
  /** 道具 ID */
  itemId: string;
  /** 道具名称 */
  name: string;
  /** 道具分类 */
  category: ItemCategory;
  /** 数量 */
  quantity: number;
  /** 优先级（数值越小越优先使用） */
  priority: number;
  /** 恢复量（对于恢复类道具） */
  healAmount?: number;
  /** 效果描述 */
  effect?: string;
}

/**
 * 机器人背包数据接口
 */
export interface BotInventory {
  /** 机器人 ID */
  botId: string;
  /** 道具列表 */
  items: Map<string, InventoryItem>;
  /** 最大道具数量 */
  maxSlots: number;
  /** 使用策略 */
  usageStrategy: ItemUsageStrategy;
  /** 最后使用道具的时间 */
  lastUsedTime: number;
  /** 使用冷却时间（毫秒） */
  useCooldown: number;
}

/**
 * 道具使用结果接口
 */
export interface ItemUseResult {
  /** 是否成功 */
  success: boolean;
  /** 消息 */
  message: string;
  /** 使用的道具 ID */
  itemId?: string;
  /** 剩余数量 */
  remainingQuantity?: number;
}

/**
 * 机器人背包管理器类
 * 单例模式
 */
export class BotInventoryManager {
  private static instance: BotInventoryManager;

  /** 机器人背包列表 */
  private inventories: Map<string, BotInventory> = new Map();

  /** 道具使用记录 */
  private usageHistory: Map<string, number[]> = new Map();

  /** HP 阈值（低于此值时考虑使用恢复道具） */
  private readonly HP_THRESHOLD_LOW = 0.3;
  private readonly HP_THRESHOLD_CRITICAL = 0.15;

  /** 是否已初始化 */
  private initialized = false;

  /**
   * 私有构造函数，确保单例
   */
  private constructor() {}

  /**
   * 获取机器人背包管理器单例实例
   */
  static getInstance(): BotInventoryManager {
    if (!BotInventoryManager.instance) {
      BotInventoryManager.instance = new BotInventoryManager();
    }
    return BotInventoryManager.instance;
  }

  /**
   * 初始化机器人背包管理器
   */
  initialize(): void {
    if (this.initialized) {
      console.warn('[BotInventoryManager] 已经初始化');
      return;
    }

    this.initialized = true;
    console.log('[BotInventoryManager] 机器人背包管理器已初始化');
  }

  /**
   * 创建机器人背包
   * @param botId 机器人 ID
   * @param personality 机器人性格
   * @returns 背包数据
   */
  createInventory(botId: string, personality: BotPersonality): BotInventory {
    const strategy = this.getStrategyFromPersonality(personality);
    const inventory: BotInventory = {
      botId,
      items: new Map(),
      maxSlots: 20,
      usageStrategy: strategy,
      lastUsedTime: 0,
      useCooldown: 3000, // 3 秒冷却
    };

    // 添加初始道具
    this.addInitialItems(inventory);

    this.inventories.set(botId, inventory);
    console.log(`[BotInventoryManager] 创建背包: ${botId} (策略: ${strategy})`);

    return inventory;
  }

  /**
   * 根据性格获取使用策略
   */
  private getStrategyFromPersonality(personality: BotPersonality): ItemUsageStrategy {
    switch (personality) {
      case BotPersonality.AGGRESSIVE:
        return ItemUsageStrategy.AGGRESSIVE;
      case BotPersonality.COLLECTOR:
        return ItemUsageStrategy.COLLECTOR;
      case BotPersonality.SUPPORTIVE:
        return ItemUsageStrategy.CONSERVATIVE;
      case BotPersonality.BALANCED:
      default:
        return ItemUsageStrategy.BALANCED;
    }
  }

  /**
   * 添加初始道具
   */
  private addInitialItems(inventory: BotInventory): void {
    // 基础恢复道具
    const initialItems: InventoryItem[] = [
      {
        itemId: 'potion',
        name: '药水',
        category: ItemCategory.HEALING,
        quantity: 5,
        priority: 1,
        healAmount: 50,
        effect: '恢复 50 HP',
      },
      {
        itemId: 'super_potion',
        name: '超级药水',
        category: ItemCategory.HEALING,
        quantity: 3,
        priority: 2,
        healAmount: 100,
        effect: '恢复 100 HP',
      },
      {
        itemId: 'antidote_grapes',
        name: '解毒葡萄',
        category: ItemCategory.STATUS,
        quantity: 2,
        priority: 3,
        effect: '解除中毒状态',
      },
      {
        itemId: 'tuxeball',
        name: '精灵球',
        category: ItemCategory.BALL,
        quantity: 10,
        priority: 5,
        effect: '捕捉怪物',
      },
    ];

    for (const item of initialItems) {
      inventory.items.set(item.itemId, item);
    }
  }

  /**
   * 添加道具到背包
   * @param botId 机器人 ID
   * @param itemId 道具 ID
   * @param quantity 数量
   * @returns 是否成功
   */
  addItem(botId: string, itemId: string, quantity: number = 1): boolean {
    const inventory = this.inventories.get(botId);
    if (!inventory) {
      console.warn(`[BotInventoryManager] 机器人背包不存在: ${botId}`);
      return false;
    }

    // 获取道具数据
    const itemData = itemDataLoader.getItem(itemId);
    if (!itemData) {
      console.warn(`[BotInventoryManager] 道具不存在: ${itemId}`);
      return false;
    }

    // 检查背包是否已满
    if (inventory.items.size >= inventory.maxSlots && !inventory.items.has(itemId)) {
      console.warn(`[BotInventoryManager] 背包已满: ${botId}`);
      return false;
    }

    // 添加或更新道具
    const existingItem = inventory.items.get(itemId);
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      inventory.items.set(itemId, {
        itemId,
        name: itemData.name,
        category: this.getItemCategory(itemId),
        quantity,
        priority: this.getItemPriority(itemId),
        healAmount: itemData.effects.find(e => e.type === 'heal')?.healAmount || 0,
        effect: itemData.description,
      });
    }

    console.log(`[BotInventoryManager] 添加道具: ${botId} + ${itemId} x${quantity}`);
    return true;
  }

  /**
   * 获取道具分类
   */
  private getItemCategory(itemId: string): ItemCategory {
    if (itemId.includes('potion') || itemId.includes('heal')) {
      return ItemCategory.HEALING;
    } else if (itemId.includes('antidote') || itemId.includes('cure')) {
      return ItemCategory.STATUS;
    } else if (itemId.includes('ball')) {
      return ItemCategory.BALL;
    } else if (itemId.includes('stone') || itemId.includes('evolution')) {
      return ItemCategory.EVOLUTION;
    } else if (itemId.includes('ether') || itemId.includes('energy')) {
      return ItemCategory.ENERGY;
    }
    return ItemCategory.SPECIAL;
  }

  /**
   * 获取道具优先级
   */
  private getItemPriority(itemId: string): number {
    if (itemId.includes('potion')) return 1;
    if (itemId.includes('super_potion')) return 2;
    if (itemId.includes('revive')) return 0;
    if (itemId.includes('antidote')) return 3;
    if (itemId.includes('ball')) return 5;
    if (itemId.includes('ether')) return 4;
    return 10;
  }

  /**
   * 移除道具
   * @param botId 机器人 ID
   * @param itemId 道具 ID
   * @param quantity 数量
   * @returns 是否成功
   */
  removeItem(botId: string, itemId: string, quantity: number = 1): boolean {
    const inventory = this.inventories.get(botId);
    if (!inventory) return false;

    const item = inventory.items.get(itemId);
    if (!item) return false;

    item.quantity -= quantity;
    if (item.quantity <= 0) {
      inventory.items.delete(itemId);
    }

    console.log(`[BotInventoryManager] 移除道具: ${botId} - ${itemId} x${quantity}`);
    return true;
  }

  /**
   * 自动使用道具（战斗中）
   * @param botId 机器人 ID
   * @param currentHp 当前 HP
   * @param maxHp 最大 HP
   * @returns 使用结果
   */
  autoUseItem(botId: string, currentHp: number, maxHp: number): ItemUseResult {
    const inventory = this.inventories.get(botId);
    if (!inventory) {
      return { success: false, message: '背包不存在' };
    }

    // 检查冷却
    const now = Date.now();
    if (now - inventory.lastUsedTime < inventory.useCooldown) {
      return { success: false, message: '冷却中' };
    }

    const hpPercent = currentHp / maxHp;

    // 根据策略决定是否使用道具
    let shouldUse = false;
    switch (inventory.usageStrategy) {
      case ItemUsageStrategy.CONSERVATIVE:
        // 只在严重低 HP 时使用
        shouldUse = hpPercent <= this.HP_THRESHOLD_CRITICAL;
        break;

      case ItemUsageStrategy.AGGRESSIVE:
        // 较低 HP 时就使用，保持战斗能力
        shouldUse = hpPercent <= this.HP_THRESHOLD_LOW;
        break;

      case ItemUsageStrategy.BALANCED:
        // 根据情况决定
        shouldUse = hpPercent <= this.HP_THRESHOLD_LOW;
        break;

      case ItemUsageStrategy.COLLECTOR:
        // 极少使用道具，优先保留
        shouldUse = hpPercent <= this.HP_THRESHOLD_CRITICAL;
        break;
    }

    if (!shouldUse) {
      return { success: false, message: 'HP 不需要恢复' };
    }

    // 找到最佳恢复道具
    const healingItem = this.findBestHealingItem(inventory);
    if (!healingItem) {
      return { success: false, message: '没有可用的恢复道具' };
    }

    // 使用道具
    return this.useItemInternal(botId, healingItem);
  }

  /**
   * 找到最佳恢复道具
   */
  private findBestHealingItem(inventory: BotInventory): InventoryItem | null {
    let bestItem: InventoryItem | null = null;

    for (const item of inventory.items.values()) {
      if (item.category === ItemCategory.HEALING && item.quantity > 0) {
        // 选择优先级最高的道具（优先级数值越小越高）
        if (!bestItem || item.priority < bestItem.priority) {
          bestItem = item;
        }
      }
    }

    return bestItem;
  }

  /**
   * 内部使用道具
   */
  private useItemInternal(botId: string, item: InventoryItem): ItemUseResult {
    const inventory = this.inventories.get(botId);
    if (!inventory) {
      return { success: false, message: '背包不存在' };
    }

    // 记录使用时间
    inventory.lastUsedTime = Date.now();

    // 减少数量
    item.quantity--;
    if (item.quantity <= 0) {
      inventory.items.delete(item.itemId);
    }

    // 记录使用历史
    const history = this.usageHistory.get(botId) || [];
    history.push(Date.now());
    if (history.length > 10) {
      history.shift();
    }
    this.usageHistory.set(botId, history);

    console.log(`[BotInventoryManager] 使用道具: ${botId} 使用 ${item.name}`);

    return {
      success: true,
      message: `使用 ${item.name}: ${item.effect}`,
      itemId: item.itemId,
      remainingQuantity: item.quantity,
    };
  }

  /**
   * 尝试进化怪物
   * @param botId 机器人 ID
   * @param _monsterId 怪物 ID（用于未来扩展：检查怪物是否满足进化条件）
   * @returns 是否有可用的进化石
   */
  canEvolveMonster(botId: string, _monsterId: string): boolean {
    const inventory = this.inventories.get(botId);
    if (!inventory) return false;

    // 未来可以添加：检查 _monsterId 对应的怪物是否满足进化条件
    // 目前只检查是否有进化石
    for (const item of inventory.items.values()) {
      if (item.category === ItemCategory.EVOLUTION && item.quantity > 0) {
        return true;
      }
    }

    return false;
  }

  /**
   * 获取背包
   * @param botId 机器人 ID
   * @returns 背包数据
   */
  getInventory(botId: string): BotInventory | null {
    return this.inventories.get(botId) || null;
  }

  /**
   * 获取所有机器人背包
   */
  getAllInventories(): BotInventory[] {
    return Array.from(this.inventories.values());
  }

  /**
   * 清除背包
   * @param botId 机器人 ID
   */
  clearInventory(botId: string): void {
    const inventory = this.inventories.get(botId);
    if (inventory) {
      inventory.items.clear();
      console.log(`[BotInventoryManager] 清空背包: ${botId}`);
    }
  }

  /**
   * 设置使用策略
   * @param botId 机器人 ID
   * @param strategy 使用策略
   */
  setUsageStrategy(botId: string, strategy: ItemUsageStrategy): void {
    const inventory = this.inventories.get(botId);
    if (inventory) {
      inventory.usageStrategy = strategy;
      console.log(`[BotInventoryManager] 设置策略: ${botId} -> ${strategy}`);
    }
  }

  /**
   * 重置机器人背包管理器
   */
  reset(): void {
    this.inventories.clear();
    this.usageHistory.clear();
    this.initialized = false;
    console.log('[BotInventoryManager] 机器人背包管理器已重置');
  }
}

/**
 * 导出机器人背包管理器单例
 */
export const botInventoryManager = BotInventoryManager.getInstance();
