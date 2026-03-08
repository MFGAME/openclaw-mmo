/**
 * 排行榜系统
 *
 * 功能：
 * - 支持 4 种排行类型：等级、胜率、金币、捕捉数
 * - 实时更新排名
 * - 与 WebSocketManager 集成（实时推送排名变化）
 * - 提供排行榜数据查询接口
 * - 支持查看玩家自己的排名
 */

import { webSocketManager } from './WebSocketManager';
import { currencySystem, CurrencyType } from './CurrencySystem';

/**
 * 排行榜类型枚举
 */
export enum LeaderboardType {
  /** 等级排行榜 */
  LEVEL = 'level',
  /** 胜率排行榜 */
  WIN_RATE = 'win_rate',
  /** 金币排行榜 */
  GOLD = 'gold',
  /** 捕捉数排行榜 */
  CAPTURE_COUNT = 'capture_count',
}

/**
 * 排行榜条目接口
 */
export interface LeaderboardEntry {
  /** 玩家 ID */
  playerId: string;
  /** 玩家名 */
  playerName: string;
  /** 分数/数值 */
  score: number;
  /** 排名 */
  rank: number;
  /** 额外数据（根据排行榜类型不同而不同） */
  extraData?: {
    /** 等级 */
    level?: number;
    /** 总战斗次数（胜率排行用） */
    totalBattles?: number;
    /** 胜场次数（胜率排行用） */
    wins?: number;
    /** 败场次数（胜率排行用） */
    losses?: number;
    /** 胜率百分比（胜率排行用） */
    winRate?: number;
  };
}

/**
 * 排行榜数据接口
 */
export interface LeaderboardData {
  /** 排行榜类型 */
  type: LeaderboardType;
  /** 排行榜名称 */
  name: string;
  /** 排行榜条目列表 */
  entries: LeaderboardEntry[];
  /** 最后更新时间戳 */
  lastUpdated: number;
}

/**
 * 玩家统计数据接口
 */
export interface PlayerStats {
  /** 玩家 ID */
  playerId: string;
  /** 玩家名 */
  playerName: string;
  /** 最高等级 */
  maxLevel: number;
  /** 总战斗次数 */
  totalBattles: number;
  /** 胜场次数 */
  wins: number;
  /** 败场次数 */
  losses: number;
  /** 捕捉总数 */
  captureCount: number;
  /** 金币数量 */
  gold: number;
}

/**
 * 排行榜更新事件接口
 */
export interface LeaderboardUpdateEvent {
  /** 排行榜类型 */
  type: LeaderboardType;
  /** 更新的玩家 ID */
  playerId: string;
  /** 旧排名 */
  oldRank?: number;
  /** 新排名 */
  newRank: number;
  /** 分数变化 */
  scoreChange?: number;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 排行榜配置接口
 */
export interface LeaderboardConfig {
  /** 排行榜最大条目数 */
  maxEntries: number;
  /** 是否启用实时更新 */
  enableRealtimeUpdate: boolean;
  /** 排行榜刷新间隔（毫秒） */
  refreshInterval: number;
}

/**
 * 排行榜系统类
 *
 * 单例模式，管理所有排行榜
 */
export class LeaderboardSystem {
  private static instance: LeaderboardSystem;

  /** 玩家统计数据 Map<玩家ID, 统计数据> */
  private playerStats: Map<string, PlayerStats> = new Map();

  /** 排行榜缓存 Map<排行榜类型, 排行榜数据> */
  private leaderboards: Map<LeaderboardType, LeaderboardData> = new Map();

  /** 配置 */
  private config: LeaderboardConfig;

  /** 刷新定时器 */
  private refreshTimer: number | null = null;

  /** 排名变化事件监听器 */
  private rankChangeListeners: Map<LeaderboardType, Set<(event: LeaderboardUpdateEvent) => void>> = new Map();

  /**
   * 私有构造函数，确保单例
   */
  private constructor() {
    this.config = {
      maxEntries: 100,
      enableRealtimeUpdate: true,
      refreshInterval: 30000, // 30秒
    };

    // 初始化所有排行榜
    this.initializeLeaderboards();
  }

  /**
   * 获取排行榜系统单例实例
   */
  static getInstance(): LeaderboardSystem {
    if (!LeaderboardSystem.instance) {
      LeaderboardSystem.instance = new LeaderboardSystem();
    }
    return LeaderboardSystem.instance;
  }

  /**
   * 初始化配置
   * @param config 配置选项
   */
  configure(config: Partial<LeaderboardConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[LeaderboardSystem] 配置已更新:', this.config);

    // 重启定时器
    this.restartRefreshTimer();
  }

  /**
   * 初始化所有排行榜
   */
  private initializeLeaderboards(): void {
    const types = [
      LeaderboardType.LEVEL,
      LeaderboardType.WIN_RATE,
      LeaderboardType.GOLD,
      LeaderboardType.CAPTURE_COUNT,
    ];

    for (const type of types) {
      const name = this.getLeaderboardName(type);
      this.leaderboards.set(type, {
        type,
        name,
        entries: [],
        lastUpdated: Date.now(),
      });
    }

    console.log('[LeaderboardSystem] 排行榜已初始化');
  }

  /**
   * 获取排行榜名称
   * @param type 排行榜类型
   */
  private getLeaderboardName(type: LeaderboardType): string {
    const names: Record<LeaderboardType, string> = {
      [LeaderboardType.LEVEL]: '等级排行榜',
      [LeaderboardType.WIN_RATE]: '胜率排行榜',
      [LeaderboardType.GOLD]: '金币排行榜',
      [LeaderboardType.CAPTURE_COUNT]: '捕捉排行榜',
    };
    return names[type] || type;
  }

  /**
   * 注册玩家（首次登录时调用）
   * @param playerId 玩家 ID
   * @param playerName 玩家名
   */
  registerPlayer(playerId: string, playerName: string): void {
    if (this.playerStats.has(playerId)) {
      console.warn(`[LeaderboardSystem] 玩家 ${playerId} 已存在`);
      return;
    }

    // 获取玩家金币
    const gold = currencySystem.getBalance(playerId, CurrencyType.GOLD);

    const stats: PlayerStats = {
      playerId,
      playerName,
      maxLevel: 1,
      totalBattles: 0,
      wins: 0,
      losses: 0,
      captureCount: 0,
      gold,
    };

    this.playerStats.set(playerId, stats);
    console.log(`[LeaderboardSystem] 注册玩家: ${playerName} (${playerId})`);

    // 更新排行榜
    this.updateLeaderboards();
  }

  /**
   * 更新玩家等级
   * @param playerId 玩家 ID
   * @param level 新等级
   */
  updatePlayerLevel(playerId: string, level: number): void {
    const stats = this.playerStats.get(playerId);
    if (!stats) return;

    const oldRank = this.getPlayerRank(playerId, LeaderboardType.LEVEL);

    if (level > stats.maxLevel) {
      stats.maxLevel = level;
    }

    // 更新等级排行榜
    this.updateLeaderboard(LeaderboardType.LEVEL);

    const newRank = this.getPlayerRank(playerId, LeaderboardType.LEVEL);

    // 如果排名发生变化，触发事件
    if (oldRank !== newRank && this.config.enableRealtimeUpdate) {
      this.emitRankChangeEvent(LeaderboardType.LEVEL, playerId, oldRank, newRank);
    }
  }

  /**
   * 更新玩家金币
   * @param playerId 玩家 ID
   */
  updatePlayerGold(playerId: string): void {
    const stats = this.playerStats.get(playerId);
    if (!stats) return;

    const oldRank = this.getPlayerRank(playerId, LeaderboardType.GOLD);

    // 从货币系统获取最新金币
    stats.gold = currencySystem.getBalance(playerId, CurrencyType.GOLD);

    // 更新金币排行榜
    this.updateLeaderboard(LeaderboardType.GOLD);

    const newRank = this.getPlayerRank(playerId, LeaderboardType.GOLD);

    // 如果排名发生变化，触发事件
    if (oldRank !== newRank && this.config.enableRealtimeUpdate) {
      this.emitRankChangeEvent(LeaderboardType.GOLD, playerId, oldRank, newRank);
    }
  }

  /**
   * 记录战斗结果
   * @param playerId 玩家 ID
   * @param won 是否胜利
   */
  recordBattleResult(playerId: string, won: boolean): void {
    const stats = this.playerStats.get(playerId);
    if (!stats) return;

    const oldRank = this.getPlayerRank(playerId, LeaderboardType.WIN_RATE);

    stats.totalBattles++;
    if (won) {
      stats.wins++;
    } else {
      stats.losses++;
    }

    // 更新胜率排行榜
    this.updateLeaderboard(LeaderboardType.WIN_RATE);

    const newRank = this.getPlayerRank(playerId, LeaderboardType.WIN_RATE);

    // 如果排名发生变化，触发事件
    if (oldRank !== newRank && this.config.enableRealtimeUpdate) {
      this.emitRankChangeEvent(LeaderboardType.WIN_RATE, playerId, oldRank, newRank);
    }
  }

  /**
   * 增加捕捉计数
   * @param playerId 玩家 ID
   * @param count 增加的数量
   */
  addCapture(playerId: string, count: number = 1): void {
    const stats = this.playerStats.get(playerId);
    if (!stats) return;

    const oldRank = this.getPlayerRank(playerId, LeaderboardType.CAPTURE_COUNT);

    stats.captureCount += count;

    // 更新捕捉排行榜
    this.updateLeaderboard(LeaderboardType.CAPTURE_COUNT);

    const newRank = this.getPlayerRank(playerId, LeaderboardType.CAPTURE_COUNT);

    // 如果排名发生变化，触发事件
    if (oldRank !== newRank && this.config.enableRealtimeUpdate) {
      this.emitRankChangeEvent(LeaderboardType.CAPTURE_COUNT, playerId, oldRank, newRank);
    }
  }

  /**
   * 更新指定排行榜
   * @param type 排行榜类型
   */
  private updateLeaderboard(type: LeaderboardType): void {
    const leaderboard = this.leaderboards.get(type);
    if (!leaderboard) return;

    // 收集所有玩家数据并计算分数
    const entries: LeaderboardEntry[] = [];

    for (const stats of this.playerStats.values()) {
      let score: number;
      let extraData: LeaderboardEntry['extraData'];

      switch (type) {
        case LeaderboardType.LEVEL:
          score = stats.maxLevel;
          extraData = { level: stats.maxLevel };
          break;

        case LeaderboardType.WIN_RATE:
          // 计算胜率：至少需要 10 场战斗
          const minBattles = 10;
          const winRate = stats.totalBattles >= minBattles
            ? (stats.wins / stats.totalBattles) * 100
            : 0;
          // 胜率排序时，同时考虑胜场数作为次要排序条件
          score = winRate * 1000 + stats.wins;
          extraData = {
            totalBattles: stats.totalBattles,
            wins: stats.wins,
            losses: stats.losses,
            winRate,
          };
          break;

        case LeaderboardType.GOLD:
          score = stats.gold;
          extraData = {};
          break;

        case LeaderboardType.CAPTURE_COUNT:
          score = stats.captureCount;
          extraData = {};
          break;

        default:
          score = 0;
          extraData = {};
      }

      entries.push({
        playerId: stats.playerId,
        playerName: stats.playerName,
        score,
        rank: 0, // 排名稍后计算
        extraData,
      });
    }

    // 按分数降序排序
    entries.sort((a, b) => b.score - a.score);

    // 限制最大条目数
    const limitedEntries = entries.slice(0, this.config.maxEntries);

    // 计算排名
    limitedEntries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // 更新排行榜数据
    leaderboard.entries = limitedEntries;
    leaderboard.lastUpdated = Date.now();
  }

  /**
   * 更新所有排行榜
   */
  private updateLeaderboards(): void {
    const types = [
      LeaderboardType.LEVEL,
      LeaderboardType.WIN_RATE,
      LeaderboardType.GOLD,
      LeaderboardType.CAPTURE_COUNT,
    ];

    for (const type of types) {
      this.updateLeaderboard(type);
    }
  }

  /**
   * 获取排行榜
   * @param type 排行榜类型
   * @param limit 返回的最大数量
   */
  getLeaderboard(type: LeaderboardType, limit?: number): LeaderboardData | null {
    const leaderboard = this.leaderboards.get(type);
    if (!leaderboard) return null;

    if (limit && limit > 0) {
      return {
        ...leaderboard,
        entries: leaderboard.entries.slice(0, limit),
      };
    }

    return leaderboard;
  }

  /**
   * 获取所有排行榜
   */
  getAllLeaderboards(): LeaderboardData[] {
    return Array.from(this.leaderboards.values());
  }

  /**
   * 获取玩家在指定排行榜中的排名
   * @param playerId 玩家 ID
   * @param type 排行榜类型
   */
  getPlayerRank(playerId: string, type: LeaderboardType): number | null {
    const leaderboard = this.leaderboards.get(type);
    if (!leaderboard) return null;

    const entry = leaderboard.entries.find(e => e.playerId === playerId);
    return entry ? entry.rank : null;
  }

  /**
   * 获取玩家在所有排行榜中的排名
   * @param playerId 玩家 ID
   */
  getPlayerAllRanks(playerId: string): Partial<Record<LeaderboardType, number | null>> {
    const ranks: Partial<Record<LeaderboardType, number | null>> = {};

    for (const type of Object.values(LeaderboardType)) {
      ranks[type] = this.getPlayerRank(playerId, type);
    }

    return ranks;
  }

  /**
   * 获取玩家统计数据
   * @param playerId 玩家 ID
   */
  getPlayerStats(playerId: string): PlayerStats | null {
    const stats = this.playerStats.get(playerId);
    return stats ? { ...stats } : null;
  }

  /**
   * 发送排名变化事件
   * @param type 排行榜类型
   * @param playerId 玩家 ID
   * @param oldRank 旧排名
   * @param newRank 新排名
   */
  private emitRankChangeEvent(
    type: LeaderboardType,
    playerId: string,
    oldRank: number | null,
    newRank: number | null
  ): void {
    const stats = this.playerStats.get(playerId);
    if (!stats) return;

    const event: LeaderboardUpdateEvent = {
      type,
      playerId,
      oldRank: oldRank ?? undefined,
      newRank: newRank ?? 0,
      timestamp: Date.now(),
    };

    // 触发本地监听器
    const listeners = this.rankChangeListeners.get(type);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (error) {
          console.error(`[LeaderboardSystem] 排名变化监听器错误 (${type}):`, error);
        }
      }
    }

    // 通过 WebSocket 发送给服务器（用于 MMO 同步）
    try {
      // 注意：这里需要在服务器端也实现相应的排行榜同步逻辑
      webSocketManager.send({
        type: 'leaderboard_update' as any,
        data: {
          type,
          playerId,
          playerName: stats.playerName,
          score: this.getScoreForType(stats, type),
          timestamp: event.timestamp,
        },
      });
    } catch (error) {
      console.warn('[LeaderboardSystem] 发送排行榜更新到服务器失败:', error);
    }
  }

  /**
   * 获取玩家在指定排行榜类型的分数
   * @param stats 玩家统计数据
   * @param type 排行榜类型
   */
  private getScoreForType(stats: PlayerStats, type: LeaderboardType): number {
    switch (type) {
      case LeaderboardType.LEVEL:
        return stats.maxLevel;
      case LeaderboardType.WIN_RATE:
        const minBattles = 10;
        return stats.totalBattles >= minBattles
          ? (stats.wins / stats.totalBattles) * 100 * 1000 + stats.wins
          : 0;
      case LeaderboardType.GOLD:
        return stats.gold;
      case LeaderboardType.CAPTURE_COUNT:
        return stats.captureCount;
      default:
        return 0;
    }
  }

  /**
   * 注册排名变化监听器
   * @param type 排行榜类型
   * @param callback 回调函数
   */
  onRankChange(type: LeaderboardType, callback: (event: LeaderboardUpdateEvent) => void): void {
    if (!this.rankChangeListeners.has(type)) {
      this.rankChangeListeners.set(type, new Set());
    }
    this.rankChangeListeners.get(type)!.add(callback);
  }

  /**
   * 移除排名变化监听器
   * @param type 排行榜类型
   * @param callback 回调函数
   */
  offRankChange(type: LeaderboardType, callback: (event: LeaderboardUpdateEvent) => void): void {
    const listeners = this.rankChangeListeners.get(type);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * 启动自动刷新
   */
  startAutoRefresh(): void {
    this.stopAutoRefresh();
    this.refreshTimer = window.setInterval(() => {
      this.updateLeaderboards();
    }, this.config.refreshInterval);
    console.log('[LeaderboardSystem] 自动刷新已启动');
  }

  /**
   * 停止自动刷新
   */
  stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * 重启自动刷新定时器
   */
  private restartRefreshTimer(): void {
    if (this.config.enableRealtimeUpdate) {
      this.startAutoRefresh();
    } else {
      this.stopAutoRefresh();
    }
  }

  /**
   * 删除玩家数据
   * @param playerId 玩家 ID
   */
  removePlayer(playerId: string): boolean {
    const deleted = this.playerStats.delete(playerId);

    if (deleted) {
      // 更新所有排行榜
      this.updateLeaderboards();
      console.log(`[LeaderboardSystem] 删除玩家: ${playerId}`);
    }

    return deleted;
  }

  /**
   * 清除所有数据
   */
  clear(): void {
    this.stopAutoRefresh();
    this.playerStats.clear();
    this.rankChangeListeners.clear();
    this.initializeLeaderboards();
    console.log('[LeaderboardSystem] 所有数据已清除');
  }

  /**
   * 获取系统统计信息
   */
  getStats(): {
    playerCount: number;
    leaderboardCount: number;
    totalEntries: number;
  } {
    let totalEntries = 0;
    for (const leaderboard of this.leaderboards.values()) {
      totalEntries += leaderboard.entries.length;
    }

    return {
      playerCount: this.playerStats.size,
      leaderboardCount: this.leaderboards.size,
      totalEntries,
    };
  }
}

/**
 * 导出排行榜系统单例
 */
export const leaderboardSystem = LeaderboardSystem.getInstance();
