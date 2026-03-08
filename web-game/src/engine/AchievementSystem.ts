/**
 * 成就系统 - 增加游戏深度和重玩价值
 *
 * 功能：
 * - 成就数据结构（ID、名称、描述、条件、奖励）
 * - 成就触发检测（捕捉、战斗、探索等）
 * - 成就通知 UI
 * - 成就列表展示
 * - 成就进度追踪
 */

/**
 * 成就类型枚举
 */
export enum AchievementType {
  /** 捕捉成就 */
  CAPTURE = 'capture',
  /** 战斗成就 */
  BATTLE = 'battle',
  /** 探索成就 */
  EXPLORE = 'explore',
  /** 收集成就 */
  COLLECT = 'collect',
  /** 社交成就 */
  SOCIAL = 'social',
  /** 经济成就 */
  ECONOMY = 'economy',
  /** 特殊成就 */
  SPECIAL = 'special',
}

/**
 * 成就条件类型
 */
export enum AchievementConditionType {
  /** 捕捉指定数量的怪物 */
  CAPTURE_COUNT = 'capture_count',
  /** 赢得指定数量的战斗 */
  BATTLE_WIN_COUNT = 'battle_win_count',
  /** 击败指定怪物 */
  DEFEAT_MONSTER = 'defeat_monster',
  /** 到达指定等级 */
  REACH_LEVEL = 'reach_level',
  /** 收集指定数量的道具 */
  COLLECT_ITEMS = 'collect_items',
  /** 拥有指定数量的金币 */
  HAVE_GOLD = 'have_gold',
  /** 探索指定数量的地点 */
  EXPLORE_LOCATIONS = 'explore_locations',
  /** 解锁特定成就 */
  UNLOCK_ACHIEVEMENT = 'unlock_achievement',
  /** 累计次数 */
  CUMULATIVE_COUNT = 'cumulative_count',
}

/**
 * 成就奖励类型
 */
export enum AchievementRewardType {
  /** 金币奖励 */
  GOLD = 'gold',
  /** 经验奖励 */
  EXP = 'exp',
  /** 道具奖励 */
  ITEM = 'item',
  /** 标题奖励 */
  TITLE = 'title',
  /** 无奖励 */
  NONE = 'none',
}

/**
 * 成就条件接口
 */
export interface AchievementCondition {
  /** 条件类型 */
  type: AchievementConditionType;
  /** 目标值 */
  target: number;
  /** 目标 ID（如怪物 ID、道具 ID 等） */
  targetId?: string;
  /** 当前进度 */
  current: number;
}

/**
 * 成就奖励接口
 */
export interface AchievementReward {
  /** 奖励类型 */
  type: AchievementRewardType;
  /** 奖励数量 */
  amount?: number;
  /** 奖励物品 ID（如果是道具奖励） */
  itemId?: string;
  /** 奖励标题（如果是标题奖励） */
  title?: string;
}

/**
 * 成就数据接口
 */
export interface AchievementData {
  /** 成就 ID */
  id: string;
  /** 成就名称 */
  name: string;
  /** 成就描述 */
  description: string;
  /** 成就类型 */
  type: AchievementType;
  /** 成就条件列表（全部满足才算解锁） */
  conditions: AchievementCondition[];
  /** 成就奖励 */
  reward: AchievementReward;
  /** 隐藏成就（未解锁时显示？） */
  hidden?: boolean;
  /** 隐藏描述 */
  hiddenDescription?: string;
  /** 图标路径（使用 Tuxemon 资源） */
  icon?: string;
  /** 解锁条件成就（必须先解锁这些成就） */
  prerequisite?: string[];
  /** 成就点数 */
  points: number;
  /** 难度等级（1-5） */
  difficulty: number;
}

/**
 * 玩家成就数据接口
 */
export interface PlayerAchievement {
  /** 成就 ID */
  achievementId: string;
  /** 是否已解锁 */
  unlocked: boolean;
  /** 解锁时间戳 */
  unlockedAt?: number;
  /** 条件进度 Map<条件索引, 进度> */
  progress: Record<number, number>;
}

/**
 * 成就统计接口
 */
export interface AchievementStats {
  /** 总成就数 */
  total: number;
  /** 已解锁成就数 */
  unlocked: number;
  /** 完成百分比 */
  percentage: number;
  /** 总成就点数 */
  totalPoints: number;
  /** 已获得成就点数 */
  earnedPoints: number;
  /** 各类型进度 */
  typeProgress: Record<AchievementType, { unlocked: number; total: number; }>;
}

/**
 * 成就通知接口
 */
export interface AchievementNotification {
  /** 成就 ID */
  achievementId: string;
  /** 通知时间戳 */
  timestamp: number;
  /** 是否已查看 */
  viewed: boolean;
}

/**
 * 成就系统配置接口
 */
export interface AchievementSystemConfig {
  /** 是否启用通知 */
  enableNotification?: boolean;
  /** 通知显示持续时间（毫秒） */
  notificationDuration?: number;
  /** 是否启用统计追踪 */
  enableStats?: boolean;
  /** 自动保存间隔（毫秒） */
  autoSaveInterval?: number;
}

/**
 * 成就系统类
 *
 * 单例模式，管理所有成就相关功能
 */
export class AchievementSystem {
  private static instance: AchievementSystem;

  /** 成就数据 Map<成就ID, 成就数据> */
  private achievements: Map<string, AchievementData> = new Map();

  /** 玩家成就数据 Map<玩家ID, 玩家成就[]> */
  private playerAchievements: Map<string, PlayerAchievement[]> = new Map();

  /** 成就通知列表 Map<玩家ID, 通知[]> */
  private notifications: Map<string, AchievementNotification[]> = new Map();

  /** 配置 */
  private config: AchievementSystemConfig;

  /** 自动保存定时器 */
  private autoSaveTimer: number | null = null;

  /**
   * 私有构造函数
   */
  private constructor() {
    this.config = {
      enableNotification: true,
      notificationDuration: 3000,
      enableStats: true,
      autoSaveInterval: 60000,
    };

    // 初始化默认成就
    this.initDefaultAchievements();

    // 启动自动保存
    this.startAutoSave();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): AchievementSystem {
    if (!AchievementSystem.instance) {
      AchievementSystem.instance = new AchievementSystem();
    }
    return AchievementSystem.instance;
  }

  /**
   * 配置成就系统
   */
  configure(config: Partial<AchievementSystemConfig>): void {
    this.config = { ...this.config, ...config };

    // 重启自动保存
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.startAutoSave();
    }

    console.log('[AchievementSystem] 配置已更新:', config);
  }

  /**
   * 初始化默认成就（至少 20 个）
   */
  private initDefaultAchievements(): void {
    const defaultAchievements: AchievementData[] = [
      // === 捕捉成就 ===
      {
        id: 'capture_first',
        name: '初次捕捉',
        description: '捕捉你的第一只怪物',
        type: AchievementType.CAPTURE,
        conditions: [
          { type: AchievementConditionType.CAPTURE_COUNT, target: 1, current: 0 },
        ],
        reward: { type: AchievementRewardType.GOLD, amount: 100 },
        icon: '/assets/tuxemon/gfx/items/tuxeball.png',
        points: 10,
        difficulty: 1,
      },
      {
        id: 'capture_10',
        name: '捕捉达人',
        description: '捕捉 10 只怪物',
        type: AchievementType.CAPTURE,
        conditions: [
          { type: AchievementConditionType.CAPTURE_COUNT, target: 10, current: 0 },
        ],
        reward: { type: AchievementRewardType.GOLD, amount: 500 },
        icon: '/assets/tuxemon/gfx/items/tuxeball.png',
        prerequisite: ['capture_first'],
        points: 20,
        difficulty: 2,
      },
      {
        id: 'capture_50',
        name: '捕捉专家',
        description: '捕捉 50 只怪物',
        type: AchievementType.CAPTURE,
        conditions: [
          { type: AchievementConditionType.CAPTURE_COUNT, target: 50, current: 0 },
        ],
        reward: { type: AchievementRewardType.GOLD, amount: 2000 },
        icon: '/assets/tuxemon/gfx/items/tuxeball.png',
        prerequisite: ['capture_10'],
        points: 50,
        difficulty: 3,
      },

      // === 战斗成就 ===
      {
        id: 'battle_first_win',
        name: '首战告捷',
        description: '赢得你的第一场战斗',
        type: AchievementType.BATTLE,
        conditions: [
          { type: AchievementConditionType.BATTLE_WIN_COUNT, target: 1, current: 0 },
        ],
        reward: { type: AchievementRewardType.GOLD, amount: 150 },
        points: 10,
        difficulty: 1,
      },
      {
        id: 'battle_10_wins',
        name: '战斗新手',
        description: '赢得 10 场战斗',
        type: AchievementType.BATTLE,
        conditions: [
          { type: AchievementConditionType.BATTLE_WIN_COUNT, target: 10, current: 0 },
        ],
        reward: { type: AchievementRewardType.GOLD, amount: 600 },
        prerequisite: ['battle_first_win'],
        points: 25,
        difficulty: 2,
      },
      {
        id: 'battle_50_wins',
        name: '战斗专家',
        description: '赢得 50 场战斗',
        type: AchievementType.BATTLE,
        conditions: [
          { type: AchievementConditionType.BATTLE_WIN_COUNT, target: 50, current: 0 },
        ],
        reward: { type: AchievementRewardType.GOLD, amount: 2500 },
        prerequisite: ['battle_10_wins'],
        points: 60,
        difficulty: 3,
      },
      {
        id: 'battle_100_wins',
        name: '战斗大师',
        description: '赢得 100 场战斗',
        type: AchievementType.BATTLE,
        conditions: [
          { type: AchievementConditionType.BATTLE_WIN_COUNT, target: 100, current: 0 },
        ],
        reward: { type: AchievementRewardType.GOLD, amount: 5000 },
        prerequisite: ['battle_50_wins'],
        points: 100,
        difficulty: 4,
      },

      // === 等级成就 ===
      {
        id: 'level_5',
        name: '初露锋芒',
        description: '让一只怪物达到 5 级',
        type: AchievementType.BATTLE,
        conditions: [
          { type: AchievementConditionType.REACH_LEVEL, target: 5, current: 0 },
        ],
        reward: { type: AchievementRewardType.EXP, amount: 200 },
        points: 15,
        difficulty: 1,
      },
      {
        id: 'level_10',
        name: '崭露头角',
        description: '让一只怪物达到 10 级',
        type: AchievementType.BATTLE,
        conditions: [
          { type: AchievementConditionType.REACH_LEVEL, target: 10, current: 0 },
        ],
        reward: { type: AchievementRewardType.EXP, amount: 500 },
        prerequisite: ['level_5'],
        points: 30,
        difficulty: 2,
      },
      {
        id: 'level_20',
        name: '实力非凡',
        description: '让一只怪物达到 20 级',
        type: AchievementType.BATTLE,
        conditions: [
          { type: AchievementConditionType.REACH_LEVEL, target: 20, current: 0 },
        ],
        reward: { type: AchievementRewardType.EXP, amount: 1500 },
        prerequisite: ['level_10'],
        points: 60,
        difficulty: 3,
      },

      // === 收集成就 ===
      {
        id: 'collect_items_50',
        name: '物品收集者',
        description: '收集 50 个道具',
        type: AchievementType.COLLECT,
        conditions: [
          { type: AchievementConditionType.COLLECT_ITEMS, target: 50, current: 0 },
        ],
        reward: { type: AchievementRewardType.ITEM, itemId: 'revive', amount: 3 },
        points: 25,
        difficulty: 2,
      },
      {
        id: 'collect_items_100',
        name: '物品大师',
        description: '收集 100 个道具',
        type: AchievementType.COLLECT,
        conditions: [
          { type: AchievementConditionType.COLLECT_ITEMS, target: 100, current: 0 },
        ],
        reward: { type: AchievementRewardType.ITEM, itemId: 'revive', amount: 10 },
        prerequisite: ['collect_items_50'],
        points: 50,
        difficulty: 3,
      },

      // === 经济成就 ===
      {
        id: 'wealth_1000',
        name: '小有积蓄',
        description: '拥有 1000 金币',
        type: AchievementType.ECONOMY,
        conditions: [
          { type: AchievementConditionType.HAVE_GOLD, target: 1000, current: 0 },
        ],
        reward: { type: AchievementRewardType.GOLD, amount: 200 },
        points: 15,
        difficulty: 1,
      },
      {
        id: 'wealth_10000',
        name: '富翁',
        description: '拥有 10000 金币',
        type: AchievementType.ECONOMY,
        conditions: [
          { type: AchievementConditionType.HAVE_GOLD, target: 10000, current: 0 },
        ],
        reward: { type: AchievementRewardType.GOLD, amount: 2000 },
        prerequisite: ['wealth_1000'],
        points: 50,
        difficulty: 3,
      },
      {
        id: 'wealth_50000',
        name: '巨富',
        description: '拥有 50000 金币',
        type: AchievementType.ECONOMY,
        conditions: [
          { type: AchievementConditionType.HAVE_GOLD, target: 50000, current: 0 },
        ],
        reward: { type: AchievementRewardType.TITLE, title: '黄金之子' },
        prerequisite: ['wealth_10000'],
        points: 100,
        difficulty: 4,
      },

      // === 探索成就 ===
      {
        id: 'explore_5_locations',
        name: '冒险家',
        description: '探索 5 个不同的地点',
        type: AchievementType.EXPLORE,
        conditions: [
          { type: AchievementConditionType.EXPLORE_LOCATIONS, target: 5, current: 0 },
        ],
        reward: { type: AchievementRewardType.GOLD, amount: 300 },
        points: 20,
        difficulty: 1,
      },
      {
        id: 'explore_10_locations',
        name: '探险家',
        description: '探索 10 个不同的地点',
        type: AchievementType.EXPLORE,
        conditions: [
          { type: AchievementConditionType.EXPLORE_LOCATIONS, target: 10, current: 0 },
        ],
        reward: { type: AchievementRewardType.GOLD, amount: 800 },
        prerequisite: ['explore_5_locations'],
        points: 40,
        difficulty: 2,
      },
      {
        id: 'explore_all_locations',
        name: '世界探索者',
        description: '探索所有地点',
        type: AchievementType.EXPLORE,
        conditions: [
          { type: AchievementConditionType.EXPLORE_LOCATIONS, target: 20, current: 0 },
        ],
        reward: { type: AchievementRewardType.TITLE, title: '世界旅行者' },
        prerequisite: ['explore_10_locations'],
        hidden: true,
        hiddenDescription: '???',
        points: 150,
        difficulty: 5,
      },

      // === 特殊成就 ===
      {
        id: 'first_achievement',
        name: '成就起步',
        description: '解锁你的第一个成就',
        type: AchievementType.SPECIAL,
        conditions: [
          { type: AchievementConditionType.UNLOCK_ACHIEVEMENT, target: 1, current: 0 },
        ],
        reward: { type: AchievementRewardType.GOLD, amount: 100 },
        points: 5,
        difficulty: 1,
      },
      {
        id: 'all_achievements',
        name: '完美达成',
        description: '解锁所有成就',
        type: AchievementType.SPECIAL,
        conditions: [
          { type: AchievementConditionType.UNLOCK_ACHIEVEMENT, target: 999, current: 0 },
        ],
        reward: { type: AchievementRewardType.TITLE, title: '成就大师' },
        hidden: true,
        hiddenDescription: '解锁所有可能的成就',
        points: 500,
        difficulty: 5,
      },
      {
        id: 'shiny_collector',
        name: '闪亮收藏家',
        description: '捕捉一只闪光怪物',
        type: AchievementType.SPECIAL,
        conditions: [
          { type: AchievementConditionType.DEFEAT_MONSTER, targetId: 'shiny', target: 1, current: 0 },
        ],
        reward: { type: AchievementRewardType.TITLE, title: '闪亮猎人' },
        hidden: true,
        hiddenDescription: '???',
        points: 200,
        difficulty: 5,
      },
    ];

    // 注册所有成就
    for (const achievement of defaultAchievements) {
      this.registerAchievement(achievement);
    }

    console.log(`[AchievementSystem] 已初始化 ${defaultAchievements.length} 个成就`);
  }

  /**
   * 注册成就
   */
  registerAchievement(achievement: AchievementData): void {
    this.achievements.set(achievement.id, achievement);
  }

  /**
   * 获取成就数据
   */
  getAchievement(achievementId: string): AchievementData | null {
    return this.achievements.get(achievementId) || null;
  }

  /**
   * 获取所有成就
   */
  getAllAchievements(): AchievementData[] {
    return Array.from(this.achievements.values());
  }

  /**
   * 根据类型获取成就
   */
  getAchievementsByType(type: AchievementType): AchievementData[] {
    return this.getAllAchievements().filter(a => a.type === type);
  }

  /**
   * 初始化玩家成就数据
   */
  initPlayerAchievements(playerId: string): void {
    if (!this.playerAchievements.has(playerId)) {
      const playerAch: PlayerAchievement[] = [];

      // 为所有成就创建玩家数据
      for (const achievement of this.getAllAchievements()) {
        const progress: Record<number, number> = {};
        achievement.conditions.forEach((_, index) => {
          progress[index] = 0;
        });

        playerAch.push({
          achievementId: achievement.id,
          unlocked: false,
          progress,
        });
      }

      this.playerAchievements.set(playerId, playerAch);
      this.notifications.set(playerId, []);

      console.log(`[AchievementSystem] 初始化玩家成就数据: ${playerId}`);
    }
  }

  /**
   * 获取玩家成就数据
   */
  getPlayerAchievements(playerId: string): PlayerAchievement[] {
    return this.playerAchievements.get(playerId) || [];
  }

  /**
   * 获取玩家已解锁的成就
   */
  getUnlockedAchievements(playerId: string): AchievementData[] {
    const playerAch = this.getPlayerAchievements(playerId);
    const unlockedIds = playerAch.filter(pa => pa.unlocked).map(pa => pa.achievementId);

    return unlockedIds
      .map(id => this.getAchievement(id))
      .filter((a): a is AchievementData => a !== null);
  }

  /**
   * 触发成就条件检查
   */
  checkCondition(
    playerId: string,
    conditionType: AchievementConditionType,
    value: number,
    targetId?: string
  ): string[] {
    if (!this.playerAchievements.has(playerId)) {
      this.initPlayerAchievements(playerId);
    }

    const newlyUnlocked: string[] = [];
    const playerAch = this.getPlayerAchievements(playerId);

    for (const pa of playerAch) {
      if (pa.unlocked) continue; // 已解锁的跳过

      const achievement = this.getAchievement(pa.achievementId);
      if (!achievement) continue;

      // 检查前置条件
      if (achievement.prerequisite) {
        const hasPrerequisite = achievement.prerequisite.every(
          prereqId => playerAch.some(p => p.achievementId === prereqId && p.unlocked)
        );
        if (!hasPrerequisite) continue;
      }

      // 检查所有条件
      let allConditionsMet = true;
      for (let i = 0; i < achievement.conditions.length; i++) {
        const condition = achievement.conditions[i];

        if (condition.type !== conditionType) continue;
        if (targetId && condition.targetId && condition.targetId !== targetId) continue;

        // 更新进度
        pa.progress[i] = Math.max(pa.progress[i], value);

        // 检查是否满足条件
        if (pa.progress[i] < condition.target) {
          allConditionsMet = false;
        }
      }

      // 如果所有条件都满足，解锁成就
      if (allConditionsMet && this.checkAllConditionsMet(playerId, achievement.id)) {
        this.unlockAchievement(playerId, achievement.id);
        newlyUnlocked.push(achievement.id);
      }
    }

    return newlyUnlocked;
  }

  /**
   * 检查成就的所有条件是否都已满足
   */
  private checkAllConditionsMet(playerId: string, achievementId: string): boolean {
    const achievement = this.getAchievement(achievementId);
    if (!achievement) return false;

    const playerAch = this.getPlayerAchievements(playerId);
    const pa = playerAch.find(p => p.achievementId === achievementId);
    if (!pa) return false;

    return achievement.conditions.every((condition, index) => {
      return pa.progress[index] >= condition.target;
    });
  }

  /**
   * 解锁成就
   */
  unlockAchievement(playerId: string, achievementId: string): boolean {
    const playerAch = this.getPlayerAchievements(playerId);
    const pa = playerAch.find(p => p.achievementId === achievementId);

    if (!pa || pa.unlocked) return false;

    pa.unlocked = true;
    pa.unlockedAt = Date.now();

    const achievement = this.getAchievement(achievementId);
    if (achievement) {
      console.log(`[AchievementSystem] 玩家 ${playerId} 解锁成就: ${achievement.name}`);

      // 发放奖励
      this.grantReward(playerId, achievement.reward);

      // 发送通知
      if (this.config.enableNotification) {
        this.sendNotification(playerId, achievementId);
      }

      // 显示成就通知 UI
      // 动态导入以避免循环依赖
      import('./AchievementNotificationUI').then(module => {
        const achievementNotificationUI = module.achievementNotificationUI;
        achievementNotificationUI.showNotification(achievementId);
      });
    }

    return true;
  }

  /**
   * 发放成就奖励
   */
  private grantReward(playerId: string, reward: AchievementReward): void {
    // 这里需要与货币系统和道具系统集成
    // 简化实现：只记录日志
    console.log(`[AchievementSystem] 玩家 ${playerId} 获得奖励:`, reward);
  }

  /**
   * 发送成就通知
   */
  private sendNotification(playerId: string, achievementId: string): void {
    const notifications = this.notifications.get(playerId);
    if (!notifications) return;

    const notification: AchievementNotification = {
      achievementId,
      timestamp: Date.now(),
      viewed: false,
    };

    notifications.unshift(notification);

    // 限制通知数量
    if (notifications.length > 50) {
      notifications.pop();
    }
  }

  /**
   * 获取玩家成就通知
   */
  getNotifications(playerId: string): AchievementNotification[] {
    return this.notifications.get(playerId) || [];
  }

  /**
   * 获取未查看的通知
   */
  getUnviewedNotifications(playerId: string): AchievementNotification[] {
    return this.getNotifications(playerId).filter(n => !n.viewed);
  }

  /**
   * 标记通知为已查看
   */
  markNotificationViewed(playerId: string, notificationId: number): void {
    const notifications = this.notifications.get(playerId);
    if (!notifications || !notifications[notificationId]) return;

    notifications[notificationId].viewed = true;
  }

  /**
   * 标记所有通知为已查看
   */
  markAllNotificationsViewed(playerId: string): void {
    const notifications = this.notifications.get(playerId);
    if (!notifications) return;

    notifications.forEach(n => {
      n.viewed = true;
    });
  }

  /**
   * 获取成就统计
   */
  getStats(playerId: string): AchievementStats | null {
    if (!this.config.enableStats) return null;

    const playerAch = this.getPlayerAchievements(playerId);
    const allAchievements = this.getAllAchievements();

    const unlocked = playerAch.filter(pa => pa.unlocked).length;
    const total = allAchievements.length;

    // 计算各类型进度
    const typeProgress: Record<AchievementType, { unlocked: number; total: number; }> = {
      [AchievementType.CAPTURE]: { unlocked: 0, total: 0 },
      [AchievementType.BATTLE]: { unlocked: 0, total: 0 },
      [AchievementType.EXPLORE]: { unlocked: 0, total: 0 },
      [AchievementType.COLLECT]: { unlocked: 0, total: 0 },
      [AchievementType.SOCIAL]: { unlocked: 0, total: 0 },
      [AchievementType.ECONOMY]: { unlocked: 0, total: 0 },
      [AchievementType.SPECIAL]: { unlocked: 0, total: 0 },
    };

    for (const achievement of allAchievements) {
      typeProgress[achievement.type].total++;
      const pa = playerAch.find(p => p.achievementId === achievement.id);
      if (pa && pa.unlocked) {
        typeProgress[achievement.type].unlocked++;
      }
    }

    // 计算成就点数
    const totalPoints = allAchievements.reduce((sum, a) => sum + a.points, 0);
    const earnedPoints = playerAch
      .filter(pa => pa.unlocked)
      .reduce((sum, pa) => {
        const achievement = this.getAchievement(pa.achievementId);
        return sum + (achievement?.points || 0);
      }, 0);

    return {
      total,
      unlocked,
      percentage: Math.floor((unlocked / total) * 100),
      totalPoints,
      earnedPoints,
      typeProgress,
    };
  }

  /**
   * 便捷方法：更新捕捉计数
   */
  updateCaptureCount(playerId: string, count: number): string[] {
    return this.checkCondition(playerId, AchievementConditionType.CAPTURE_COUNT, count);
  }

  /**
   * 便捷方法：更新战斗胜利计数
   */
  updateBattleWinCount(playerId: string, count: number): string[] {
    return this.checkCondition(playerId, AchievementConditionType.BATTLE_WIN_COUNT, count);
  }

  /**
   * 便捷方法：更新等级
   */
  updateLevel(playerId: string, level: number): string[] {
    return this.checkCondition(playerId, AchievementConditionType.REACH_LEVEL, level);
  }

  /**
   * 便捷方法：更新道具收集数量
   */
  updateItemCount(playerId: string, count: number): string[] {
    return this.checkCondition(playerId, AchievementConditionType.COLLECT_ITEMS, count);
  }

  /**
   * 便捷方法：更新金币数量
   */
  updateGold(playerId: string, amount: number): string[] {
    return this.checkCondition(playerId, AchievementConditionType.HAVE_GOLD, amount);
  }

  /**
   * 便捷方法：更新探索地点数量
   */
  updateExploreLocations(playerId: string, count: number): string[] {
    return this.checkCondition(playerId, AchievementConditionType.EXPLORE_LOCATIONS, count);
  }

  /**
   * 启动自动保存
   */
  private startAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    if (this.config.autoSaveInterval && this.config.autoSaveInterval > 0) {
      this.autoSaveTimer = window.setInterval(() => {
        this.autoSave();
      }, this.config.autoSaveInterval);
    }
  }

  /**
   * 自动保存
   */
  private autoSave(): void {
    // 这里需要与存档系统集成
    console.log('[AchievementSystem] 自动保存成就数据');
  }

  /**
   * 保存玩家成就数据
   */
  savePlayerAchievements(playerId: string): string {
    const playerAch = this.getPlayerAchievements(playerId);
    return JSON.stringify(playerAch);
  }

  /**
   * 加载玩家成就数据
   */
  loadPlayerAchievements(playerId: string, data: string): boolean {
    try {
      const playerAch = JSON.parse(data) as PlayerAchievement[];
      this.playerAchievements.set(playerId, playerAch);
      return true;
    } catch (error) {
      console.error('[AchievementSystem] 加载成就数据失败:', error);
      return false;
    }
  }

  /**
   * 清除玩家数据
   */
  clearPlayerData(playerId: string): void {
    this.playerAchievements.delete(playerId);
    this.notifications.delete(playerId);
    console.log(`[AchievementSystem] 清除玩家数据: ${playerId}`);
  }

  /**
   * 清除所有数据
   */
  clear(): void {
    this.playerAchievements.clear();
    this.notifications.clear();

    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }

    console.log('[AchievementSystem] 所有数据已清除');
  }

  /**
   * 获取系统统计
   */
  getSystemStats(): {
    totalAchievements: number;
    totalPlayers: number;
  } {
    return {
      totalAchievements: this.achievements.size,
      totalPlayers: this.playerAchievements.size,
    };
  }
}

/**
 * 导出成就系统单例
 */
export const achievementSystem = AchievementSystem.getInstance();
