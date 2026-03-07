/**
 * 货币系统 - 管理游戏经济基础
 *
 * 功能：
 * - 管理玩家货币（金币、钻石）
 * - 货币交易验证（余额检查）
 * - 货币获取逻辑（战斗奖励、任务奖励）
 * - 货币消耗逻辑（购买道具、商店）
 * - 货币变动记录
 */

/**
 * 货币类型枚举
 */
export enum CurrencyType {
  /** 金币 - 基础货币，通过战斗、任务等获得 */
  GOLD = 'gold',
  /** 钻石 - 高级货币，可通过充值或特殊活动获得 */
  DIAMOND = 'diamond',
}

/**
 * 货币变动类型
 */
export enum CurrencyChangeType {
  /** 战斗奖励 */
  BATTLE_REWARD = 'battle_reward',
  /** 任务奖励 */
  QUEST_REWARD = 'quest_reward',
  /** 商店购买 */
  SHOP_PURCHASE = 'shop_purchase',
  /** 道具购买 */
  ITEM_PURCHASE = 'item_purchase',
  /** 交易 */
  TRADE = 'trade',
  /** 系统赠送 */
  GIFT = 'gift',
  /** 其他 */
  OTHER = 'other',
}

/**
 * 货币变动记录接口
 */
export interface CurrencyTransaction {
  /** 交易 ID */
  id: string;
  /** 玩家 ID */
  playerId: string;
  /** 货币类型 */
  currencyType: CurrencyType;
  /** 变动类型 */
  changeType: CurrencyChangeType;
  /** 变动数量（正数表示增加，负数表示减少） */
  amount: number;
  /** 变动后余额 */
  balanceAfter: number;
  /** 时间戳 */
  timestamp: number;
  /** 描述/备注 */
  description: string;
  /** 关联的战斗 ID（战斗奖励时） */
  battleId?: string;
  /** 关联的任务 ID（任务奖励时） */
  questId?: string;
}

/**
 * 玩家货币数据接口
 */
export interface PlayerCurrency {
  /** 玩家 ID */
  playerId: string;
  /** 金币余额 */
  gold: number;
  /** 钻石余额 */
  diamond: number;
}

/**
 * 货币变动结果接口
 */
export interface CurrencyChangeResult {
  /** 是否成功 */
  success: boolean;
  /** 变动数量 */
  amount: number;
  /** 变动后余额 */
  balance: number;
  /** 错误信息（失败时） */
  error?: string;
  /** 交易记录 */
  transaction?: CurrencyTransaction;
}

/**
 * 货币奖励配置接口
 */
export interface CurrencyRewardConfig {
  /** 金币数量 */
  gold?: number;
  /** 钻石数量 */
  diamond?: number;
  /** 奖励描述 */
  description: string;
  /** 奖励类型 */
  rewardType: CurrencyChangeType;
  /** 关联 ID（战斗 ID、任务 ID 等） */
  relatedId?: string;
}

/**
 * 货币系统配置接口
 */
export interface CurrencySystemConfig {
  /** 玩家初始金币 */
  initialGold?: number;
  /** 玩家初始钻石 */
  initialDiamond?: number;
  /** 是否启用交易记录 */
  enableTransactionLog?: boolean;
  /** 交易记录最大保留数量 */
  maxTransactionHistory?: number;
}

/**
 * 货币系统类
 *
 * 单例模式，管理所有玩家的货币
 */
export class CurrencySystem {
  private static instance: CurrencySystem;

  /** 玩家货币数据 Map<玩家ID, 货币数据> */
  private playerCurrencies: Map<string, PlayerCurrency> = new Map();

  /** 交易记录 Map<玩家ID, 交易记录[]> */
  private transactionHistory: Map<string, CurrencyTransaction[]> = new Map();

  /** 交易 ID 计数器 */
  private transactionIdCounter: number = 0;

  /** 配置 */
  private config: CurrencySystemConfig;

  /**
   * 私有构造函数，确保单例
   */
  private constructor() {
    this.config = {
      initialGold: 0,
      initialDiamond: 0,
      enableTransactionLog: true,
      maxTransactionHistory: 500,
    };
  }

  /**
   * 获取货币系统单例实例
   */
  static getInstance(): CurrencySystem {
    if (!CurrencySystem.instance) {
      CurrencySystem.instance = new CurrencySystem();
    }
    return CurrencySystem.instance;
  }

  /**
   * 配置货币系统
   * @param config 配置选项
   */
  configure(config: CurrencySystemConfig): void {
    this.config = { ...this.config, ...config };
    console.log('[CurrencySystem] 配置已更新:', config);
  }

  /**
   * 初始化玩家货币账户
   * @param playerId 玩家 ID
   * @param initialGold 初始金币
   * @param initialDiamond 初始钻石
   */
  initPlayerCurrency(
    playerId: string,
    initialGold: number = this.config.initialGold!,
    initialDiamond: number = this.config.initialDiamond!
  ): void {
    // 如果玩家已存在，不重复初始化
    if (this.playerCurrencies.has(playerId)) {
      console.warn(`[CurrencySystem] 玩家 ${playerId} 的货币账户已存在`);
      return;
    }

    const currency: PlayerCurrency = {
      playerId,
      gold: Math.max(0, initialGold),
      diamond: Math.max(0, initialDiamond),
    };

    this.playerCurrencies.set(playerId, currency);
    this.transactionHistory.set(playerId, []);

    console.log(`[CurrencySystem] 初始化玩家货币: ${playerId}`);
  }

  /**
   * 获取玩家货币数据
   * @param playerId 玩家 ID
   * @returns 玩家货币数据，如果不存在返回 null
   */
  getPlayerCurrency(playerId: string): PlayerCurrency | null {
    const currency = this.playerCurrencies.get(playerId);
    return currency ? { ...currency } : null;
  }

  /**
   * 获取玩家指定类型的货币余额
   * @param playerId 玩家 ID
   * @param currencyType 货币类型
   * @returns 货币余额，如果玩家不存在返回 0
   */
  getBalance(playerId: string, currencyType: CurrencyType): number {
    const currency = this.playerCurrencies.get(playerId);
    if (!currency) return 0;

    switch (currencyType) {
      case CurrencyType.GOLD:
        return currency.gold;
      case CurrencyType.DIAMOND:
        return currency.diamond;
      default:
        return 0;
    }
  }

  /**
   * 增加货币
   * @param playerId 玩家 ID
   * @param currencyType 货币类型
   * @param amount 增加数量
   * @param changeType 变动类型
   * @param description 描述
   * @param relatedId 关联 ID（战斗 ID、任务 ID 等）
   * @returns 变动结果
   */
  addCurrency(
    playerId: string,
    currencyType: CurrencyType,
    amount: number,
    changeType: CurrencyChangeType = CurrencyChangeType.OTHER,
    description: string = '',
    relatedId?: string
  ): CurrencyChangeResult {
    // 验证玩家存在
    const currency = this.playerCurrencies.get(playerId);
    if (!currency) {
      return {
        success: false,
        amount: 0,
        balance: 0,
        error: '玩家货币账户不存在',
      };
    }

    // 验证金额
    if (amount <= 0) {
      return {
        success: false,
        amount: 0,
        balance: this.getBalance(playerId, currencyType),
        error: '增加金额必须大于 0',
      };
    }

    // 增加货币
    switch (currencyType) {
      case CurrencyType.GOLD:
        currency.gold += amount;
        break;
      case CurrencyType.DIAMOND:
        currency.diamond += amount;
        break;
    }

    // 记录交易
    const transaction = this.recordTransaction(
      playerId,
      currencyType,
      changeType,
      amount,
      currency,
      description,
      relatedId
    );

    console.log(`[CurrencySystem] ${playerId} 获得 ${amount} ${currencyType}`);

    return {
      success: true,
      amount,
      balance: this.getBalance(playerId, currencyType),
      transaction: transaction ?? undefined,
    };
  }

  /**
   * 扣除货币
   * @param playerId 玩家 ID
   * @param currencyType 货币类型
   * @param amount 扣除数量
   * @param changeType 变动类型
   * @param description 描述
   * @param relatedId 关联 ID（战斗 ID、任务 ID 等）
   * @returns 变动结果
   */
  subtractCurrency(
    playerId: string,
    currencyType: CurrencyType,
    amount: number,
    changeType: CurrencyChangeType = CurrencyChangeType.OTHER,
    description: string = '',
    relatedId?: string
  ): CurrencyChangeResult {
    // 验证玩家存在
    const currency = this.playerCurrencies.get(playerId);
    if (!currency) {
      return {
        success: false,
        amount: 0,
        balance: 0,
        error: '玩家货币账户不存在',
      };
    }

    // 验证金额
    if (amount <= 0) {
      return {
        success: false,
        amount: 0,
        balance: this.getBalance(playerId, currencyType),
        error: '扣除金额必须大于 0',
      };
    }

    // 检查余额是否足够
    const currentBalance = this.getBalance(playerId, currencyType);
    if (currentBalance < amount) {
      return {
        success: false,
        amount: 0,
        balance: currentBalance,
        error: '余额不足',
      };
    }

    // 扣除货币
    switch (currencyType) {
      case CurrencyType.GOLD:
        currency.gold -= amount;
        break;
      case CurrencyType.DIAMOND:
        currency.diamond -= amount;
        break;
    }

    // 记录交易
    const transaction = this.recordTransaction(
      playerId,
      currencyType,
      changeType,
      -amount,
      currency,
      description,
      relatedId
    );

    console.log(`[CurrencySystem] ${playerId} 消耗 ${amount} ${currencyType}`);

    return {
      success: true,
      amount,
      balance: this.getBalance(playerId, currencyType),
      transaction: transaction ?? undefined,
    };
  }

  /**
   * 检查余额是否足够
   * @param playerId 玩家 ID
   * @param currencyType 货币类型
   * @param amount 需要的金额
   * @returns 余额是否足够
   */
  hasEnoughBalance(playerId: string, currencyType: CurrencyType, amount: number): boolean {
    return this.getBalance(playerId, currencyType) >= amount;
  }

  /**
   * 发放货币奖励
   * @param playerId 玩家 ID
   * @param reward 奖励配置
   * @returns 奖励结果 Map<货币类型, 变动结果>
   */
  grantReward(playerId: string, reward: CurrencyRewardConfig): Map<CurrencyType, CurrencyChangeResult> {
    const results = new Map<CurrencyType, CurrencyChangeResult>();

    if (reward.gold && reward.gold > 0) {
      const result = this.addCurrency(
        playerId,
        CurrencyType.GOLD,
        reward.gold,
        reward.rewardType,
        reward.description,
        reward.relatedId
      );
      results.set(CurrencyType.GOLD, result);
    }

    if (reward.diamond && reward.diamond > 0) {
      const result = this.addCurrency(
        playerId,
        CurrencyType.DIAMOND,
        reward.diamond,
        reward.rewardType,
        reward.description,
        reward.relatedId
      );
      results.set(CurrencyType.DIAMOND, result);
    }

    return results;
  }

  /**
   * 扣除货币（用于购买）
   * @param playerId 玩家 ID
   * @param currencyType 货币类型
   * @param amount 购买金额
   * @param description 描述
   * @returns 扣除结果
   */
  purchase(
    playerId: string,
    currencyType: CurrencyType,
    amount: number,
    description: string = '购买'
  ): CurrencyChangeResult {
    return this.subtractCurrency(
      playerId,
      currencyType,
      amount,
      CurrencyChangeType.SHOP_PURCHASE,
      description
    );
  }

  /**
   * 记录交易
   * @param playerId 玩家 ID
   * @param currencyType 货币类型
   * @param changeType 变动类型
   * @param amount 变动数量
   * @param currency 玩家货币数据
   * @param description 描述
   * @param relatedId 关联 ID
   * @returns 交易记录
   */
  private recordTransaction(
    playerId: string,
    currencyType: CurrencyType,
    changeType: CurrencyChangeType,
    amount: number,
    _currency: PlayerCurrency,
    description: string,
    relatedId?: string
  ): CurrencyTransaction | null {
    // 如果未启用交易记录，返回 null
    if (!this.config.enableTransactionLog) {
      return null;
    }

    this.transactionIdCounter++;

    const transaction: CurrencyTransaction = {
      id: `txn_${this.transactionIdCounter}`,
      playerId,
      currencyType,
      changeType,
      amount,
      balanceAfter: this.getBalance(playerId, currencyType),
      timestamp: Date.now(),
      description,
    };

    // 添加关联 ID
    if (relatedId) {
      switch (changeType) {
        case CurrencyChangeType.BATTLE_REWARD:
          transaction.battleId = relatedId;
          break;
        case CurrencyChangeType.QUEST_REWARD:
          transaction.questId = relatedId;
          break;
      }
    }

    // 获取玩家交易历史
    let history = this.transactionHistory.get(playerId);
    if (!history) {
      history = [];
      this.transactionHistory.set(playerId, history);
    }

    // 添加交易记录
    history.push(transaction);

    // 限制交易历史大小
    const maxHistory = this.config.maxTransactionHistory!;
    if (history.length > maxHistory) {
      this.transactionHistory.set(playerId, history.slice(-maxHistory));
    }

    return transaction;
  }

  /**
   * 获取玩家交易历史
   * @param playerId 玩家 ID
   * @param limit 返回的最大数量（可选）
   * @returns 交易记录列表
   */
  getTransactionHistory(playerId: string, limit?: number): CurrencyTransaction[] {
    const history = this.transactionHistory.get(playerId);
    if (!history) return [];

    // 返回最近 limit 条记录
    if (limit && limit > 0) {
      return history.slice(-limit).reverse();
    }

    return [...history].reverse();
  }

  /**
   * 获取玩家指定类型的交易历史
   * @param playerId 玩家 ID
   * @param changeType 变动类型
   * @param limit 返回的最大数量（可选）
   * @returns 交易记录列表
   */
  getTransactionHistoryByType(
    playerId: string,
    changeType: CurrencyChangeType,
    limit?: number
  ): CurrencyTransaction[] {
    const history = this.transactionHistory.get(playerId);
    if (!history) return [];

    const filtered = history.filter(t => t.changeType === changeType);

    if (limit && limit > 0) {
      return filtered.slice(-limit).reverse();
    }

    return [...filtered].reverse();
  }

  /**
   * 删除玩家货币数据
   * @param playerId 玩家 ID
   * @returns 是否删除成功
   */
  removePlayerCurrency(playerId: string): boolean {
    const deleted = this.playerCurrencies.delete(playerId);
    this.transactionHistory.delete(playerId);

    if (deleted) {
      console.log(`[CurrencySystem] 删除玩家货币: ${playerId}`);
    }

    return deleted;
  }

  /**
   * 清除所有货币数据
   */
  clear(): void {
    this.playerCurrencies.clear();
    this.transactionHistory.clear();
    this.transactionIdCounter = 0;
    console.log('[CurrencySystem] 已清除所有货币数据');
  }

  /**
   * 获取系统统计信息
   * @returns 统计信息
   */
  getStats(): {
    playerCount: number;
    totalTransactions: number;
    totalGold: number;
    totalDiamond: number;
  } {
    let totalTransactions = 0;
    for (const history of this.transactionHistory.values()) {
      totalTransactions += history.length;
    }

    let totalGold = 0;
    let totalDiamond = 0;
    for (const currency of this.playerCurrencies.values()) {
      totalGold += currency.gold;
      totalDiamond += currency.diamond;
    }

    return {
      playerCount: this.playerCurrencies.size,
      totalTransactions,
      totalGold,
      totalDiamond,
    };
  }
}

/**
 * 导出货币系统单例
 */
export const currencySystem = CurrencySystem.getInstance();
