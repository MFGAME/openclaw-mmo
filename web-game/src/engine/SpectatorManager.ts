/**
 * 观战系统 - 管理战斗观战功能
 *
 * 功能：
 * - 管理观战席位（最大观战人数）
 * - 实现战斗状态广播（订阅/取消订阅）
 * - 观战者列表显示
 * - 观战者聊天功能（可选）
 */

import { BattleState, BattleEvent } from './BattleState';

/**
 * 观战者信息接口
 */
export interface SpectatorInfo {
  /** 观战者 ID */
  id: string;
  /** 观战者名称 */
  name: string;
  /** 观战者头像 */
  avatar?: string;
  /** 观战时间戳 */
  joinTime: number;
}

/**
 * 观战者聊天消息接口
 */
export interface SpectatorChatMessage {
  /** 观战者 ID */
  spectatorId: string;
  /** 观战者名称 */
  spectatorName: string;
  /** 消息内容 */
  message: string;
  /** 消息时间戳 */
  timestamp: number;
}

/**
 * 观战系统配置接口
 */
export interface SpectatorConfig {
  /** 最大观战人数 */
  maxSpectators?: number;
  /** 是否允许聊天 */
  allowChat?: boolean;
  /** 聊天消息最大历史数量 */
  maxChatHistory?: number;
}

/**
 * 观战事件类型
 */
export type SpectatorEventType =
  | 'spectator_join'
  | 'spectator_leave'
  | 'battle_update'
  | 'spectator_chat';

/**
 * 观战事件接口
 */
export interface SpectatorEvent {
  /** 事件类型 */
  type: SpectatorEventType;
  /** 战斗 ID */
  battleId: string;
  /** 观战者信息（加入/离开事件） */
  spectator?: SpectatorInfo;
  /** 战斗状态（战斗更新事件） */
  battleState?: BattleState;
  /** 聊天消息（聊天事件） */
  chatMessage?: SpectatorChatMessage;
}

/**
 * 观战回调函数类型
 */
export type SpectatorCallback = (event: SpectatorEvent) => void;

/**
 * 战斗观战会话接口
 */
interface BattleSpectatorSession {
  /** 战斗 ID */
  battleId: string;
  /** 观战者列表 */
  spectators: SpectatorInfo[];
  /** 聊天消息历史 */
  chatHistory: SpectatorChatMessage[];
  /** 订阅该战斗的回调列表 */
  callbacks: SpectatorCallback[];
  /** 配置 */
  config: SpectatorConfig;
}

/**
 * 观战管理器类
 *
 * 单例模式，管理所有战斗的观战功能
 */
export class SpectatorManager {
  private static instance: SpectatorManager;

  /** 所有观战会话 Map<战斗ID, 会话> */
  private sessions: Map<string, BattleSpectatorSession> = new Map();

  /** 观战者 ID 计数器 */
  private spectatorIdCounter: number = 0;

  /**
   * 私有构造函数，确保单例
   */
  private constructor() {}

  /**
   * 获取观战管理器单例实例
   */
  static getInstance(): SpectatorManager {
    if (!SpectatorManager.instance) {
      SpectatorManager.instance = new SpectatorManager();
    }
    return SpectatorManager.instance;
  }

  /**
   * 为战斗创建观战会话
   * @param battleId 战斗 ID
   * @param config 观战配置
   * @returns 是否创建成功
   */
  createSpectatorSession(battleId: string, config: SpectatorConfig = {}): boolean {
    // 如果会话已存在，不重复创建
    if (this.sessions.has(battleId)) {
      console.warn(`[SpectatorManager] 战斗 ${battleId} 的观战会话已存在`);
      return false;
    }

    // 创建新会话
    const session: BattleSpectatorSession = {
      battleId,
      spectators: [],
      chatHistory: [],
      callbacks: [],
      config: {
        maxSpectators: config.maxSpectators ?? 50, // 默认最多 50 人观战
        allowChat: config.allowChat ?? true,      // 默认允许聊天
        maxChatHistory: config.maxChatHistory ?? 100, // 默认保留最近 100 条消息
      },
    };

    this.sessions.set(battleId, session);
    console.log(`[SpectatorManager] 创建观战会话: ${battleId}`);
    return true;
  }

  /**
   * 观战者加入战斗
   * @param battleId 战斗 ID
   * @param name 观战者名称
   * @param avatar 观战者头像（可选）
   * @returns 观战者信息，如果加入失败返回 null
   */
  joinBattle(battleId: string, name: string, avatar?: string): SpectatorInfo | null {
    const session = this.sessions.get(battleId);
    if (!session) {
      console.error(`[SpectatorManager] 战斗 ${battleId} 的观战会话不存在`);
      return null;
    }

    // 检查观战人数是否已达上限
    if (session.spectators.length >= session.config.maxSpectators!) {
      console.warn(`[SpectatorManager] 战斗 ${battleId} 观战人数已达上限`);
      return null;
    }

    // 创建观战者信息
    this.spectatorIdCounter++;
    const spectator: SpectatorInfo = {
      id: `spectator_${this.spectatorIdCounter}`,
      name,
      avatar,
      joinTime: Date.now(),
    };

    // 添加到观战者列表
    session.spectators.push(spectator);

    // 广播观战者加入事件
    this.broadcastEvent(battleId, {
      type: 'spectator_join',
      battleId,
      spectator,
    });

    console.log(`[SpectatorManager] ${name} 加入观战: ${battleId}`);
    return spectator;
  }

  /**
   * 观战者离开战斗
   * @param battleId 战斗 ID
   * @param spectatorId 观战者 ID
   * @returns 是否离开成功
   */
  leaveBattle(battleId: string, spectatorId: string): boolean {
    const session = this.sessions.get(battleId);
    if (!session) {
      console.error(`[SpectatorManager] 战斗 ${battleId} 的观战会话不存在`);
      return false;
    }

    // 查找观战者
    const spectatorIndex = session.spectators.findIndex(s => s.id === spectatorId);
    if (spectatorIndex === -1) {
      console.warn(`[SpectatorManager] 观战者 ${spectatorId} 不在战斗 ${battleId} 中`);
      return false;
    }

    // 获取观战者信息
    const spectator = session.spectators[spectatorIndex];

    // 从观战者列表中移除
    session.spectators.splice(spectatorIndex, 1);

    // 广播观战者离开事件
    this.broadcastEvent(battleId, {
      type: 'spectator_leave',
      battleId,
      spectator,
    });

    console.log(`[SpectatorManager] ${spectator.name} 离开观战: ${battleId}`);
    return true;
  }

  /**
   * 广播战斗状态更新
   * @param battleId 战斗 ID
   * @param battleState 战斗状态
   */
  broadcastBattleState(battleId: string, battleState: BattleState): void {
    const session = this.sessions.get(battleId);
    if (!session) {
      // 如果会话不存在，静默忽略
      return;
    }

    // 广播战斗更新事件
    this.broadcastEvent(battleId, {
      type: 'battle_update',
      battleId,
      battleState,
    });
  }

  /**
   * 广播战斗事件
   * @param battleId 战斗 ID
   * @param _event 战斗事件（使用下划线前缀表示未使用的参数）
   */
  broadcastBattleEvent(battleId: string, _event: BattleEvent): void {
    const session = this.sessions.get(battleId);
    if (!session) {
      return;
    }

    // 将战斗事件封装为观战事件广播
    this.broadcastEvent(battleId, {
      type: 'battle_update',
      battleId,
    });
  }

  /**
   * 发送观战者聊天消息
   * @param battleId 战斗 ID
   * @param spectatorId 观战者 ID
   * @param message 消息内容
   * @returns 是否发送成功
   */
  sendChatMessage(battleId: string, spectatorId: string, message: string): boolean {
    const session = this.sessions.get(battleId);
    if (!session) {
      console.error(`[SpectatorManager] 战斗 ${battleId} 的观战会话不存在`);
      return false;
    }

    // 检查是否允许聊天
    if (!session.config.allowChat) {
      console.warn(`[SpectatorManager] 战斗 ${battleId} 不允许聊天`);
      return false;
    }

    // 查找观战者
    const spectator = session.spectators.find(s => s.id === spectatorId);
    if (!spectator) {
      console.warn(`[SpectatorManager] 观战者 ${spectatorId} 不在战斗 ${battleId} 中`);
      return false;
    }

    // 创建聊天消息
    const chatMessage: SpectatorChatMessage = {
      spectatorId,
      spectatorName: spectator.name,
      message,
      timestamp: Date.now(),
    };

    // 添加到聊天历史
    session.chatHistory.push(chatMessage);

    // 限制聊天历史大小
    const maxHistory = session.config.maxChatHistory!;
    if (session.chatHistory.length > maxHistory) {
      session.chatHistory = session.chatHistory.slice(-maxHistory);
    }

    // 广播聊天消息
    this.broadcastEvent(battleId, {
      type: 'spectator_chat',
      battleId,
      chatMessage,
    });

    return true;
  }

  /**
   * 获取战斗的观战者列表
   * @param battleId 战斗 ID
   * @returns 观战者列表
   */
  getSpectators(battleId: string): SpectatorInfo[] {
    const session = this.sessions.get(battleId);
    return session ? [...session.spectators] : [];
  }

  /**
   * 获取战斗的观战者数量
   * @param battleId 战斗 ID
   * @returns 观战者数量
   */
  getSpectatorCount(battleId: string): number {
    const session = this.sessions.get(battleId);
    return session ? session.spectators.length : 0;
  }

  /**
   * 获取聊天消息历史
   * @param battleId 战斗 ID
   * @returns 聊天消息列表
   */
  getChatHistory(battleId: string): SpectatorChatMessage[] {
    const session = this.sessions.get(battleId);
    return session ? [...session.chatHistory] : [];
  }

  /**
   * 订阅观战事件
   * @param battleId 战斗 ID
   * @param callback 回调函数
   * @returns 取消订阅的函数
   */
  subscribe(battleId: string, callback: SpectatorCallback): () => void {
    const session = this.sessions.get(battleId);
    if (!session) {
      console.error(`[SpectatorManager] 战斗 ${battleId} 的观战会话不存在`);
      return () => {};
    }

    // 添加回调
    session.callbacks.push(callback);

    // 返回取消订阅函数
    return () => {
      const index = session.callbacks.indexOf(callback);
      if (index !== -1) {
        session.callbacks.splice(index, 1);
      }
    };
  }

  /**
   * 广播事件到所有订阅者
   * @param battleId 战斗 ID
   * @param event 观战事件
   */
  private broadcastEvent(battleId: string, event: SpectatorEvent): void {
    const session = this.sessions.get(battleId);
    if (!session) return;

    // 触发所有回调
    for (const callback of session.callbacks) {
      try {
        callback(event);
      } catch (error) {
        console.error(`[SpectatorManager] 观战事件回调错误:`, error);
      }
    }
  }

  /**
   * 结束战斗的观战会话
   * @param battleId 战斗 ID
   */
  endSpectatorSession(battleId: string): void {
    const session = this.sessions.get(battleId);
    if (!session) {
      console.warn(`[SpectatorManager] 战斗 ${battleId} 的观战会话不存在`);
      return;
    }

    // 清空所有回调
    session.callbacks = [];
    session.spectators = [];
    session.chatHistory = [];

    // 移除会话
    this.sessions.delete(battleId);

    console.log(`[SpectatorManager] 结束观战会话: ${battleId}`);
  }

  /**
   * 检查观战者是否在观战中
   * @param battleId 战斗 ID
   * @param spectatorId 观战者 ID
   * @returns 是否在观战中
   */
  isSpectating(battleId: string, spectatorId: string): boolean {
    const session = this.sessions.get(battleId);
    if (!session) return false;
    return session.spectators.some(s => s.id === spectatorId);
  }

  /**
   * 清除所有观战会话
   */
  clear(): void {
    for (const [battleId] of this.sessions) {
      this.endSpectatorSession(battleId);
    }
    this.sessions.clear();
    console.log('[SpectatorManager] 已清除所有观战会话');
  }
}

/**
 * 导出观战管理器单例
 */
export const spectatorManager = SpectatorManager.getInstance();
