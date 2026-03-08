/**
 * MMO 机器人管理器
 *
 * 基于 Tuxemon 的 NPC 系统实现 MMO 机器人注册和认证
 *
 * 功能：
 * - 机器人注册（创建机器人实例）
 * - 机器人认证（Token 验证）
 * - 机器人状态管理（在线/离线/忙碌）
 * - 机器人会话保持（心跳检测）
 * - 机器人属性管理（等级、资源、怪物队伍）
 * - 机器人数据持久化
 */

import { Direction, PlayerPosition } from '../engine/PlayerController';
import { MonsterInstance } from '../engine/MonsterData';

/**
 * 机器人 AI 性格枚举（对应任务要求的 4 种性格）
 */
export enum BotPersonality {
  /** 激进 - 主动发起战斗，优先攻击 */
  AGGRESSIVE = 'aggressive',
  /** 辅助 - 帮助其他玩家，支持性技能 */
  SUPPORTIVE = 'supportive',
  /** 收集 - 专注于收集资源和捕捉怪物 */
  COLLECTOR = 'collector',
  /** 平衡 - 行为均衡，综合考虑 */
  BALANCED = 'balanced',
}

/**
 * 机器人状态枚举
 */
export enum BotState {
  /** 离线 */
  OFFLINE = 'offline',
  /** 在线 - 空闲 */
  ONLINE = 'online',
  /** 在线 - 忙碌 */
  BUSY = 'busy',
  /** 在线 - 对战中 */
  BATTLING = 'battling',
  /** 在线 - 探索中 */
  EXPLORING = 'exploring',
}

/**
 * 机器人资源数据接口
 */
export interface BotResources {
  /** 金币数量 */
  gold: number;
  /** 捕捉球数量 */
  pokeballs: number;
  /** 超级球数量 */
  superballs: number;
  /** 高级球数量 */
  ultraballs: number;
  /** 大师球数量 */
  masterballs: number;
  /** 治疗药水数量 */
  potions: number;
  /** 超级药水数量 */
  superPotions: number;
  /** 全复药水数量 */
  fullRestores: number;
}

/**
 * 机器人怪物队伍接口
 */
export interface BotMonsterParty {
  /** 当前出战的怪物 */
  activeMonster: MonsterInstance | null;
  /** 备用怪物列表（最多 5 个） */
  reserveMonsters: MonsterInstance[];
  /** 队伍最大容量 */
  maxSize: number;
}

/**
 * 机器人数据接口
 */
export interface BotData {
  /** 机器人唯一标识 */
  id: string;
  /** 机器人名称 */
  name: string;
  /** 机器人状态 */
  state: BotState;
  /** 机器人等级 */
  level: number;
  /** 机器人 AI 性格 */
  personality: BotPersonality;
  /** 当前位置 */
  position: PlayerPosition;
  /** 朝向 */
  direction: Direction;
  /** 认证令牌 */
  token: string;
  /** 最后心跳时间 */
  lastHeartbeat: number;
  /** 创建时间 */
  createdAt: number;
  /** 上次活动时间 */
  lastActivityTime: number;
  /** 机器人资源 */
  resources: BotResources;
  /** 机器人怪物队伍 */
  monsterParty: BotMonsterParty;
  /** 关联的房间 ID（如果在对战中） */
  roomId?: string;
  /** 关联的玩家 ID（如果在对战中） */
  opponentId?: string;
  /** 自定义数据 */
  customData: Record<string, unknown>;
  /** 是否可见 */
  visible: boolean;
  /** 可交互性 */
  interactable: boolean;
  /** 是否启用持久化 */
  persistent: boolean;
}

/**
 * 机器人注册请求接口
 */
export interface BotRegisterRequest {
  /** 机器人名称 */
  name: string;
  /** 机器人 AI 性格 */
  personality: BotPersonality;
  /** 机器人等级 */
  level: number;
  /** 初始金币（可选，默认 0） */
  initialGold?: number;
  /** 是否持久化（可选，默认 false） */
  persistent?: boolean;
}

/**
 * 机器人认证响应接口
 */
export interface BotAuthResponse {
  /** 是否成功 */
  success: boolean;
  /** 机器人数据 */
  bot?: BotData;
  /** 错误信息 */
  error?: string;
}

/**
 * 机器人会话接口
 */
interface BotSession {
  /** 机器人 ID */
  botId: string;
  /** 会话令牌 */
  token: string;
  /** 会话开始时间 */
  startTime: number;
  /** 最后活动时间 */
  lastActivity: number;
  /** 会话状态 */
  state: BotState;
}

/**
 * 机器人统计信息接口
 */
export interface BotStats {
  /** 总机器人数量 */
  totalBots: number;
  /** 在线机器人数量 */
  onlineBots: number;
  /** 忙碌机器人数量 */
  busyBots: number;
  /** 对战中的机器人数量 */
  battlingBots: number;
  /** 探索中的机器人数量 */
  exploringBots: number;
  /** 各性格机器人数量 */
  botsByPersonality: Record<BotPersonality, number>;
  /** 各状态机器人数量 */
  botsByState: Record<BotState, number>;
}

/**
 * 机器人持久化数据接口
 */
interface BotPersistentData {
  /** 机器人数据 */
  bot: BotData;
  /** 最后保存时间 */
  savedAt: number;
}

/**
 * MMO 机器人管理器类
 * 单例模式
 */
export class BotManager {
  private static instance: BotManager;

  /** 机器人列表 */
  private bots: Map<string, BotData> = new Map();

  /** 会话列表 */
  private sessions: Map<string, BotSession> = new Map();

  /** Token 到 Bot ID 的映射 */
  private tokenToBotId: Map<string, string> = new Map();

  /** 机器人 ID 计数器 */
  private botIdCounter: number = 0;

  /** 心跳检测定时器 */
  private heartbeatTimer: NodeJS.Timeout | null = null;

  /** 会话超时时间（毫秒） */
  private readonly SESSION_TIMEOUT = 300000; // 5 分钟

  /** 心跳检测间隔（毫秒） */
  private readonly HEARTBEAT_INTERVAL = 60000; // 1 分钟

  /** 最大机器人数量 */
  private readonly MAX_BOTS = parseInt(process.env.MAX_BOTS || '100', 10);

  /** 是否已初始化 */
  private initialized = false;

  /** 是否启用调试模式 */
  private debugMode = process.env.BOT_DEBUG_MODE === 'true';

  /** 持久化存储键前缀 */
  private readonly STORAGE_PREFIX = 'mmo_bot_';

  /**
   * 私有构造函数，确保单例
   */
  private constructor() {}

  /**
   * 获取机器人管理器单例实例
   */
  static getInstance(): BotManager {
    if (!BotManager.instance) {
      BotManager.instance = new BotManager();
    }
    return BotManager.instance;
  }

  /**
   * 初始化机器人管理器
   */
  initialize(): void {
    if (this.initialized) {
      console.warn('[BotManager] 已经初始化');
      return;
    }

    // 启动心跳检测
    this.startHeartbeatCheck();

    // 加载持久化的机器人
    this.loadPersistentBots();

    // 创建默认机器人（如果没有持久化的机器人）
    if (this.bots.size === 0) {
      this.createDefaultBots();
    }

    this.initialized = true;
    console.log('[BotManager] MMO 机器人管理器已初始化');
  }

  /**
   * 创建默认机器人
   */
  private createDefaultBots(): void {
    const defaultBots: Array<{ name: string; personality: BotPersonality; level: number }> = [
      { name: '战斗训练师', personality: BotPersonality.AGGRESSIVE, level: 15 },
      { name: '探索先锋', personality: BotPersonality.COLLECTOR, level: 20 },
      { name: '守护者', personality: BotPersonality.SUPPORTIVE, level: 25 },
      { name: '平衡大师', personality: BotPersonality.BALANCED, level: 30 },
    ];

    for (const botConfig of defaultBots) {
      this.registerBot({
        name: botConfig.name,
        personality: botConfig.personality,
        level: botConfig.level,
        initialGold: 500,
      });
    }

    console.log(`[BotManager] 已创建 ${defaultBots.length} 个默认机器人`);
  }

  /**
   * 注册新机器人
   * @param request 注册请求
   * @returns 认证响应
   */
  registerBot(request: BotRegisterRequest): BotAuthResponse {
    // 检查是否达到最大机器人数量
    if (this.bots.size >= this.MAX_BOTS) {
      return {
        success: false,
        error: `已达到最大机器人数量限制 (${this.MAX_BOTS})`,
      };
    }

    // 生成机器人 ID
    const botId = `mmo_bot_${++this.botIdCounter}_${Date.now()}`;

    // 生成认证令牌
    const token = this.generateToken(botId);

    // 创建默认资源
    const defaultResources: BotResources = {
      gold: request.initialGold || 0,
      pokeballs: 10,
      superballs: 5,
      ultraballs: 2,
      masterballs: 0,
      potions: 5,
      superPotions: 3,
      fullRestores: 1,
    };

    // 创建怪物队伍
    const monsterParty: BotMonsterParty = {
      activeMonster: null,
      reserveMonsters: [],
      maxSize: 6,
    };

    // 创建机器人数据
    const bot: BotData = {
      id: botId,
      name: request.name,
      state: BotState.OFFLINE,
      level: request.level,
      position: {
        tileX: 0,
        tileY: 0,
        x: 0,
        y: 0,
        jumpOffset: 0,
      },
      direction: Direction.DOWN,
      personality: request.personality,
      token,
      lastHeartbeat: Date.now(),
      createdAt: Date.now(),
      lastActivityTime: Date.now(),
      resources: defaultResources,
      monsterParty,
      customData: {},
      visible: true,
      interactable: true,
      persistent: request.persistent || false,
    };

    // 创建会话
    const session: BotSession = {
      botId,
      token,
      startTime: Date.now(),
      lastActivity: Date.now(),
      state: BotState.OFFLINE,
    };

    // 存储数据
    this.bots.set(botId, bot);
    this.sessions.set(token, session);
    this.tokenToBotId.set(token, botId);

    // 如果启用了持久化，保存机器人数据
    if (bot.persistent) {
      this.saveBotData(bot);
    }

    console.log(`[BotManager] 机器人注册成功: ${bot.name} (${botId})`);
    this.logDebug(`机器人详情: ${JSON.stringify(bot, null, 2)}`);

    return {
      success: true,
      bot,
    };
  }

  /**
   * 机器人认证
   * @param token 认证令牌
   * @returns 认证响应
   */
  authenticateBot(token: string): BotAuthResponse {
    const session = this.sessions.get(token);
    if (!session) {
      return {
        success: false,
        error: '无效的认证令牌',
      };
    }

    // 检查会话是否过期
    const now = Date.now();
    if (now - session.lastActivity > this.SESSION_TIMEOUT) {
      this.removeBot(session.botId);
      return {
        success: false,
        error: '会话已过期',
      };
    }

    // 更新最后活动时间
    session.lastActivity = now;

    const bot = this.bots.get(session.botId);
    if (!bot) {
      return {
        success: false,
        error: '机器人不存在',
      };
    }

    bot.lastActivityTime = now;

    this.logDebug(`机器人认证成功: ${bot.name} (${bot.id})`);

    return {
      success: true,
      bot,
    };
  }

  /**
   * 设置机器人在线状态
   * @param botId 机器人 ID
   * @returns 是否成功
   */
  setBotOnline(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) {
      return false;
    }

    bot.state = BotState.ONLINE;
    bot.lastHeartbeat = Date.now();

    // 更新会话状态
    const token = bot.token;
    const session = this.sessions.get(token);
    if (session) {
      session.state = BotState.ONLINE;
      session.lastActivity = Date.now();
    }

    console.log(`[BotManager] 机器人上线: ${bot.name} (${botId})`);
    this.logDebug(`机器人状态: ${bot.state}`);

    return true;
  }

  /**
   * 设置机器人离线状态
   * @param botId 机器人 ID
   * @returns 是否成功
   */
  setBotOffline(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) {
      return false;
    }

    bot.state = BotState.OFFLINE;

    // 更新会话状态
    const token = bot.token;
    const session = this.sessions.get(token);
    if (session) {
      session.state = BotState.OFFLINE;
    }

    // 如果启用了持久化，保存机器人数据
    if (bot.persistent) {
      this.saveBotData(bot);
    }

    console.log(`[BotManager] 机器人离线: ${bot.name} (${botId})`);
    this.logDebug(`机器人状态: ${bot.state}`);

    return true;
  }

  /**
   * 设置机器人忙碌状态
   * @param botId 机器人 ID
   * @returns 是否成功
   */
  setBotBusy(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) {
      return false;
    }

    bot.state = BotState.BUSY;
    bot.lastHeartbeat = Date.now();

    // 更新会话状态
    const token = bot.token;
    const session = this.sessions.get(token);
    if (session) {
      session.state = BotState.BUSY;
      session.lastActivity = Date.now();
    }

    this.logDebug(`机器人忙碌: ${bot.name} (${botId})`);

    return true;
  }

  /**
   * 设置机器人探索状态
   * @param botId 机器人 ID
   * @returns 是否成功
   */
  setBotExploring(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) {
      return false;
    }

    bot.state = BotState.EXPLORING;
    bot.lastHeartbeat = Date.now();

    // 更新会话状态
    const token = bot.token;
    const session = this.sessions.get(token);
    if (session) {
      session.state = BotState.EXPLORING;
      session.lastActivity = Date.now();
    }

    this.logDebug(`机器人探索中: ${bot.name} (${botId})`);

    return true;
  }

  /**
   * 设置机器人对战状态
   * @param botId 机器人 ID
   * @param roomId 房间 ID
   * @param opponentId 对手 ID
   * @returns 是否成功
   */
  setBotBattling(botId: string, roomId: string, opponentId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) {
      return false;
    }

    bot.state = BotState.BATTLING;
    bot.roomId = roomId;
    bot.opponentId = opponentId;
    bot.lastHeartbeat = Date.now();

    // 更新会话状态
    const token = bot.token;
    const session = this.sessions.get(token);
    if (session) {
      session.state = BotState.BATTLING;
      session.lastActivity = Date.now();
    }

    console.log(`[BotManager] 机器人进入战斗: ${bot.name} (${botId}) vs ${opponentId}`);

    return true;
  }

  /**
   * 移除机器人
   * @param botId 机器人 ID
   */
  removeBot(botId: string): void {
    const bot = this.bots.get(botId);
    if (!bot) {
      return;
    }

    // 移除持久化数据（如果存在）
    if (bot.persistent) {
      this.removeBotPersistentData(botId);
    }

    // 移除会话
    this.sessions.delete(bot.token);
    this.tokenToBotId.delete(bot.token);

    // 移除机器人
    this.bots.delete(botId);

    console.log(`[BotManager] 机器人已移除: ${bot.name} (${botId})`);
  }

  /**
   * 更新机器人位置
   * @param botId 机器人 ID
   * @param position 新位置
   * @returns 是否成功
   */
  updateBotPosition(botId: string, position: PlayerPosition): boolean {
    const bot = this.bots.get(botId);
    if (!bot) {
      return false;
    }

    bot.position = position;
    bot.lastActivityTime = Date.now();

    return true;
  }

  /**
   * 更新机器人朝向
   * @param botId 机器人 ID
   * @param direction 新朝向
   * @returns 是否成功
   */
  updateBotDirection(botId: string, direction: Direction): boolean {
    const bot = this.bots.get(botId);
    if (!bot) {
      return false;
    }

    bot.direction = direction;
    bot.lastActivityTime = Date.now();

    return true;
  }

  /**
   * 更新机器人心跳
   * @param botId 机器人 ID
   * @returns 是否成功
   */
  updateBotHeartbeat(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (!bot) {
      return false;
    }

    bot.lastHeartbeat = Date.now();

    // 更新会话活动时间
    const session = this.sessions.get(bot.token);
    if (session) {
      session.lastActivity = Date.now();
    }

    return true;
  }

  /**
   * 获取机器人
   * @param botId 机器人 ID
   * @returns 机器人数据，如果不存在返回 null
   */
  getBot(botId: string): BotData | null {
    return this.bots.get(botId) || null;
  }

  /**
   * 通过 Token 获取机器人
   * @param token 认证令牌
   * @returns 机器人数据，如果不存在返回 null
   */
  getBotByToken(token: string): BotData | null {
    const botId = this.tokenToBotId.get(token);
    if (!botId) {
      return null;
    }
    return this.bots.get(botId) || null;
  }

  /**
   * 获取所有机器人
   * @returns 机器人列表
   */
  getAllBots(): BotData[] {
    return Array.from(this.bots.values());
  }

  /**
   * 获取在线机器人
   * @returns 在线机器人列表
   */
  getOnlineBots(): BotData[] {
    return Array.from(this.bots.values()).filter(
      bot => bot.state === BotState.ONLINE || bot.state === BotState.BUSY || bot.state === BotState.BATTLING || bot.state === BotState.EXPLORING
    );
  }

  /**
   * 根据性格获取机器人
   * @param personality 机器人性格
   * @returns 机器人列表
   */
  getBotsByPersonality(personality: BotPersonality): BotData[] {
    return Array.from(this.bots.values()).filter(bot => bot.personality === personality);
  }

  /**
   * 获取附近机器人
   * @param tileX 瓦片 X 坐标
   * @param tileY 瓦片 Y 坐标
   * @param distance 搜索距离（瓦片）
   * @returns 机器人列表
   */
  getNearbyBots(tileX: number, tileY: number, distance = 5): BotData[] {
    const result: BotData[] = [];

    for (const bot of this.bots.values()) {
      if (!bot.visible) {
        continue;
      }

      const dist = Math.abs(bot.position.tileX - tileX) + Math.abs(bot.position.tileY - tileY);
      if (dist <= distance) {
        result.push(bot);
      }
    }

    return result;
  }

  /**
   * 获取空闲的机器人（可用于对战）
   * @param minLevel 最小等级（默认 1）
   * @param maxLevel 最大等级（默认 100）
   * @returns 机器人列表
   */
  getAvailableBots(minLevel = 1, maxLevel = 100): BotData[] {
    return Array.from(this.bots.values()).filter(bot =>
      bot.visible &&
      bot.interactable &&
      (bot.state === BotState.ONLINE || bot.state === BotState.OFFLINE) &&
      bot.level >= minLevel &&
      bot.level <= maxLevel
    );
  }

  /**
   * 获取统计信息
   * @returns 机器人统计信息
   */
  getStats(): BotStats {
    const bots = Array.from(this.bots.values());

    return {
      totalBots: bots.length,
      onlineBots: bots.filter(b => b.state === BotState.ONLINE).length,
      busyBots: bots.filter(b => b.state === BotState.BUSY).length,
      battlingBots: bots.filter(b => b.state === BotState.BATTLING).length,
      exploringBots: bots.filter(b => b.state === BotState.EXPLORING).length,
      botsByPersonality: {
        [BotPersonality.AGGRESSIVE]: bots.filter(b => b.personality === BotPersonality.AGGRESSIVE).length,
        [BotPersonality.SUPPORTIVE]: bots.filter(b => b.personality === BotPersonality.SUPPORTIVE).length,
        [BotPersonality.COLLECTOR]: bots.filter(b => b.personality === BotPersonality.COLLECTOR).length,
        [BotPersonality.BALANCED]: bots.filter(b => b.personality === BotPersonality.BALANCED).length,
      },
      botsByState: {
        [BotState.OFFLINE]: bots.filter(b => b.state === BotState.OFFLINE).length,
        [BotState.ONLINE]: bots.filter(b => b.state === BotState.ONLINE).length,
        [BotState.BUSY]: bots.filter(b => b.state === BotState.BUSY).length,
        [BotState.BATTLING]: bots.filter(b => b.state === BotState.BATTLING).length,
        [BotState.EXPLORING]: bots.filter(b => b.state === BotState.EXPLORING).length,
      },
    };
  }

  /**
   * 启动心跳检测
   */
  private startHeartbeatCheck(): void {
    if (this.heartbeatTimer) {
      return;
    }

    this.heartbeatTimer = setInterval(() => {
      this.checkHeartbeats();
    }, this.HEARTBEAT_INTERVAL);

    console.log(`[BotManager] 心跳检测已启动，间隔: ${this.HEARTBEAT_INTERVAL}ms`);
  }

  /**
   * 检查所有机器人心跳
   */
  private checkHeartbeats(): void {
    const now = Date.now();
    const timeoutBots: string[] = [];

    for (const bot of this.bots.values()) {
      // 只检查在线状态的机器人
      if (bot.state === BotState.OFFLINE) {
        continue;
      }

      const timeSinceHeartbeat = now - bot.lastHeartbeat;

      // 如果心跳超时，设置为离线
      if (timeSinceHeartbeat > this.SESSION_TIMEOUT) {
        timeoutBots.push(bot.id);
        this.setBotOffline(bot.id);
      }
    }

    if (timeoutBots.length > 0) {
      console.log(`[BotManager] ${timeoutBots.length} 个机器人心跳超时，已设置为离线`);
    }
  }

  /**
   * 生成认证令牌
   * @param botId 机器人 ID
   * @returns 认证令牌
   */
  private generateToken(botId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `mmo_${botId}_${timestamp}_${random}`;
  }

  /**
   * 设置机器人可见性
   * @param botId 机器人 ID
   * @param visible 是否可见
   */
  setBotVisible(botId: string, visible: boolean): void {
    const bot = this.bots.get(botId);
    if (bot) {
      bot.visible = visible;
    }
  }

  /**
   * 设置机器人可交互性
   * @param botId 机器人 ID
   * @param interactable 是否可交互
   */
  setBotInteractable(botId: string, interactable: boolean): void {
    const bot = this.bots.get(botId);
    if (bot) {
      bot.interactable = interactable;
    }
  }

  /**
   * 设置自定义数据
   * @param botId 机器人 ID
   * @param key 键
   * @param value 值
   */
  setCustomData(botId: string, key: string, value: unknown): void {
    const bot = this.bots.get(botId);
    if (bot) {
      bot.customData[key] = value;
    }
  }

  /**
   * 获取自定义数据
   * @param botId 机器人 ID
   * @param key 键
   * @returns 值，如果不存在返回 null
   */
  getCustomData(botId: string, key: string): unknown | null {
    const bot = this.bots.get(botId);
    if (bot && bot.customData.hasOwnProperty(key)) {
      return bot.customData[key];
    }
    return null;
  }

  /**
   * 更新机器人资源
   * @param botId 机器人 ID
   * @param resources 资源更新（可选字段）
   */
  updateBotResources(botId: string, resources: Partial<BotResources>): boolean {
    const bot = this.bots.get(botId);
    if (!bot) {
      return false;
    }

    bot.resources = { ...bot.resources, ...resources };

    // 如果启用了持久化，保存机器人数据
    if (bot.persistent) {
      this.saveBotData(bot);
    }

    return true;
  }

  /**
   * 更新机器人怪物队伍
   * @param botId 机器人 ID
   * @param monsterParty 怪物队伍更新
   */
  updateBotMonsterParty(botId: string, monsterParty: Partial<BotMonsterParty>): boolean {
    const bot = this.bots.get(botId);
    if (!bot) {
      return false;
    }

    bot.monsterParty = { ...bot.monsterParty, ...monsterParty };

    // 如果启用了持久化，保存机器人数据
    if (bot.persistent) {
      this.saveBotData(bot);
    }

    return true;
  }

  /**
   * 保存机器人数据到本地存储
   * @param bot 机器人数据
   */
  private saveBotData(bot: BotData): void {
    try {
      const persistentData: BotPersistentData = {
        bot,
        savedAt: Date.now(),
      };

      const storageKey = this.STORAGE_PREFIX + bot.id;
      localStorage.setItem(storageKey, JSON.stringify(persistentData));

      this.logDebug(`机器人数据已保存: ${bot.name} (${bot.id})`);
    } catch (error) {
      console.error(`[BotManager] 保存机器人数据失败:`, error);
    }
  }

  /**
   * 加载持久化的机器人数据
   */
  private loadPersistentBots(): void {
    try {
      const keys = Object.keys(localStorage);

      for (const key of keys) {
        if (key.startsWith(this.STORAGE_PREFIX)) {
          const dataStr = localStorage.getItem(key);
          if (dataStr) {
            const persistentData = JSON.parse(dataStr) as BotPersistentData;
            const bot = persistentData.bot;

            // 恢复机器人数据
            this.bots.set(bot.id, bot);

            // 恢复会话
            const session: BotSession = {
              botId: bot.id,
              token: bot.token,
              startTime: bot.createdAt,
              lastActivity: Date.now(),
              state: BotState.OFFLINE,
            };

            this.sessions.set(bot.token, session);
            this.tokenToBotId.set(bot.token, bot.id);

            console.log(`[BotManager] 已加载持久化机器人: ${bot.name} (${bot.id})`);
          }
        }
      }
    } catch (error) {
      console.error(`[BotManager] 加载持久化机器人失败:`, error);
    }
  }

  /**
   * 移除机器人持久化数据
   * @param botId 机器人 ID
   */
  private removeBotPersistentData(botId: string): void {
    try {
      const storageKey = this.STORAGE_PREFIX + botId;
      localStorage.removeItem(storageKey);

      this.logDebug(`机器人持久化数据已移除: ${botId}`);
    } catch (error) {
      console.error(`[BotManager] 移除机器人持久化数据失败:`, error);
    }
  }

  /**
   * 重置机器人管理器
   */
  reset(): void {
    this.bots.clear();
    this.sessions.clear();
    this.tokenToBotId.clear();
    this.botIdCounter = 0;

    // 清除所有持久化数据
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith(this.STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    }

    console.log('[BotManager] MMO 机器人管理器已重置');
  }

  /**
   * 调试日志
   * @param message 日志消息
   */
  private logDebug(message: string): void {
    if (this.debugMode) {
      console.log(`[BotManager] [DEBUG] ${message}`);
    }
  }
}

/**
 * 导出机器人管理器单例
 */
export const mmoBotManager = BotManager.getInstance();
