/**
 * 好友系统
 *
 * 功能：
 * - 好友添加请求（发送、接受、拒绝）
 * - 好友删除
 * - 好友列表管理
 * - 在线状态显示
 * - 私聊功能
 * - 好友邀请战斗
 */

import { webSocketManager } from './WebSocketManager';

/**
 * 好友请求状态枚举
 */
export enum FriendRequestStatus {
  /** 待处理 */
  PENDING = 'pending',
  /** 已接受 */
  ACCEPTED = 'accepted',
  /** 已拒绝 */
  REJECTED = 'rejected',
  /** 已取消 */
  CANCELLED = 'cancelled',
}

/**
 * 在线状态枚举
 */
export enum OnlineStatus {
  /** 在线 */
  ONLINE = 'online',
  /** 离开 */
  AWAY = 'away',
  /** 忙碌 */
  BUSY = 'busy',
  /** 离线 */
  OFFLINE = 'offline',
}

/**
 * 好友条目接口
 */
export interface FriendEntry {
  /** 玩家 ID */
  playerId: string;
  /** 玩家名 */
  playerName: string;
  /** 在线状态 */
  onlineStatus: OnlineStatus;
  /** 最后在线时间戳 */
  lastOnlineTime: number;
  /** 备注（可选） */
  note?: string;
  /** 是否被屏蔽 */
  isBlocked: boolean;
  /** 是否被静音 */
  isMuted: boolean;
}

/**
 * 好友请求接口
 */
export interface FriendRequest {
  /** 请求 ID */
  requestId: string;
  /** 发送者 ID */
  senderId: string;
  /** 发送者名称 */
  senderName: string;
  /** 接收者 ID */
  receiverId: string;
  /** 状态 */
  status: FriendRequestStatus;
  /** 时间戳 */
  timestamp: number;
  /** 消息（可选，附带的留言） */
  message?: string;
}

/**
 * 私聊消息接口
 */
export interface ChatMessage {
  /** 消息 ID */
  messageId: string;
  /** 发送者 ID */
  senderId: string;
  /** 接收者 ID */
  receiverId: string;
  /** 内容 */
  content: string;
  /** 时间戳 */
  timestamp: number;
  /** 是否已读 */
  isRead: boolean;
}

/**
 * 好友数据接口
 */
export interface FriendData {
  /** 玩家 ID */
  playerId: string;
  /** 好友列表 Map<好友ID, 好友条目> */
  friends: Map<string, FriendEntry>;
  /** 好友请求列表（收到的） */
  receivedRequests: FriendRequest[];
  /** 好友请求列表（发送的） */
  sentRequests: FriendRequest[];
  /** 私聊消息 Map<好友ID, 消息列表> */
  chatMessages: Map<string, ChatMessage[]>;
  /** 未读消息数量 Map<好友ID, 数量> */
  unreadCount: Map<string, number>;
}

/**
 * 好友请求结果接口
 */
export interface FriendRequestResult {
  /** 是否成功 */
  success: boolean;
  /** 错误消息 */
  error?: string;
  /** 请求 ID（成功时） */
  requestId?: string;
}

/**
 * 聊天发送结果接口
 */
export interface ChatSendResult {
  /** 是否成功 */
  success: boolean;
  /** 错误消息 */
  error?: string;
  /** 消息 ID（成功时） */
  messageId?: string;
}

/**
 * 好友系统配置接口
 */
export interface FriendSystemConfig {
  /** 最大好友数量 */
  maxFriends: number;
  /** 最大私聊消息保留数量（每个好友） */
  maxMessagesPerFriend: number;
  /** 最大好友请求数量 */
  maxRequests: number;
}

/**
 * 好友系统类
 *
 * 单例模式，管理所有玩家的好友关系
 */
export class FriendSystem {
  private static instance: FriendSystem;

  /** 玩家好友数据 Map<玩家ID, 好友数据> */
  private playerData: Map<string, FriendData> = new Map();

  /** 请求 ID 计数器 */
  private requestIdCounter: number = 0;

  /** 消息 ID 计数器 */
  private messageIdCounter: number = 0;

  /** 配置 */
  private config: FriendSystemConfig;

  /** 好友请求事件监听器 */
  private requestListeners: Set<(request: FriendRequest) => void> = new Set();

  /** 聊天消息事件监听器 Map<好友ID, 监听器> */
  private messageListeners: Map<string, Set<(message: ChatMessage) => void>> = new Map();

  /** 在线状态事件监听器 */
  private onlineStatusListeners: Map<string, Set<(playerId: string, status: OnlineStatus) => void>> = new Map();

  /**
   * 私有构造函数，确保单例
   */
  private constructor() {
    this.config = {
      maxFriends: 200,
      maxMessagesPerFriend: 100,
      maxRequests: 50,
    };
  }

  /**
   * 获取好友系统单例实例
   */
  static getInstance(): FriendSystem {
    if (!FriendSystem.instance) {
      FriendSystem.instance = new FriendSystem();
    }
    return FriendSystem.instance;
  }

  /**
   * 初始化配置
   * @param config 配置选项
   */
  configure(config: Partial<FriendSystemConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[FriendSystem] 配置已更新:', this.config);
  }

  /**
   * 注册玩家（首次登录时调用）
   * @param playerId 玩家 ID
   */
  registerPlayer(playerId: string): void {
    if (this.playerData.has(playerId)) {
      console.warn(`[FriendSystem] 玩家 ${playerId} 已存在`);
      return;
    }

    const data: FriendData = {
      playerId,
      friends: new Map(),
      receivedRequests: [],
      sentRequests: [],
      chatMessages: new Map(),
      unreadCount: new Map(),
    };

    this.playerData.set(playerId, data);
    console.log(`[FriendSystem] 注册玩家: ${playerId}`);
  }

  /**
   * 获取玩家数据
   * @param playerId 玩家 ID
   */
  private getPlayerData(playerId: string): FriendData | null {
    return this.playerData.get(playerId) || null;
  }

  /**
   * 获取或创建玩家数据
   * @param playerId 玩家 ID
   */
  private getOrCreatePlayerData(playerId: string): FriendData {
    let data = this.playerData.get(playerId);

    if (!data) {
      data = {
        playerId,
        friends: new Map(),
        receivedRequests: [],
        sentRequests: [],
        chatMessages: new Map(),
        unreadCount: new Map(),
      };
      this.playerData.set(playerId, data);
    }

    return data;
  }

  /**
   * 检查是否已经是好友
   * @param playerId 玩家 ID
   * @param targetId 目标玩家 ID
   */
  isFriend(playerId: string, targetId: string): boolean {
    const data = this.playerData.get(playerId);
    return data ? data.friends.has(targetId) : false;
  }

  /**
   * 发送好友请求
   * @param senderId 发送者 ID
   * @param receiverId 接收者 ID
   * @param senderName 发送者名称
   * @param message 附带的消息（可选）
   */
  sendFriendRequest(
    senderId: string,
    receiverId: string,
    senderName: string,
    message?: string
  ): FriendRequestResult {
    // 验证参数
    if (senderId === receiverId) {
      return { success: false, error: '不能添加自己为好友' };
    }

    // 获取发送者数据
    const senderData = this.getOrCreatePlayerData(senderId);
    const receiverData = this.getOrCreatePlayerData(receiverId);

    // 检查是否已经是好友
    if (senderData.friends.has(receiverId)) {
      return { success: false, error: '对方已经是你的好友' };
    }

    // 检查是否已经有待处理的请求
    const existingRequest = senderData.sentRequests.find(
      r => r.receiverId === receiverId && r.status === FriendRequestStatus.PENDING
    );
    if (existingRequest) {
      return { success: false, error: '已有待处理的好友请求' };
    }

    // 检查发送者好友数量是否已达上限
    if (senderData.friends.size >= this.config.maxFriends) {
      return { success: false, error: '好友数量已达上限' };
    }

    // 创建好友请求
    this.requestIdCounter++;
    const request: FriendRequest = {
      requestId: `req_${this.requestIdCounter}`,
      senderId,
      senderName,
      receiverId,
      status: FriendRequestStatus.PENDING,
      timestamp: Date.now(),
      message,
    };

    // 添加到发送者的已发送请求列表
    senderData.sentRequests.push(request);

    // 添加到接收者的已接收请求列表
    receiverData.receivedRequests.push(request);

    // 限制请求数量
    this.limitRequests(senderData);
    this.limitRequests(receiverData);

    // 通知接收者
    this.notifyRequestReceived(request);

    // 通过 WebSocket 发送到服务器（用于 MMO 同步）
    try {
      webSocketManager.send({
        type: 'friend_request' as any,
        data: {
          requestId: request.requestId,
          senderId,
          senderName,
          receiverId,
          message,
        },
      });
    } catch (error) {
      console.warn('[FriendSystem] 发送好友请求到服务器失败:', error);
    }

    console.log(`[FriendSystem] ${senderId} 向 ${receiverId} 发送好友请求`);
    return { success: true, requestId: request.requestId };
  }

  /**
   * 限制好友请求数量
   * @param data 玩家数据
   */
  private limitRequests(data: FriendData): void {
    // 限制接收的请求数量
    if (data.receivedRequests.length > this.config.maxRequests) {
      // 删除最旧的请求
      data.receivedRequests = data.receivedRequests.slice(-this.config.maxRequests);
    }

    // 限制发送的请求数量
    if (data.sentRequests.length > this.config.maxRequests) {
      data.sentRequests = data.sentRequests.slice(-this.config.maxRequests);
    }
  }

  /**
   * 接受好友请求
   * @param playerId 玩家 ID（接收者）
   * @param requestId 请求 ID
   */
  acceptFriendRequest(playerId: string, requestId: string): FriendRequestResult {
    const data = this.getPlayerData(playerId);
    if (!data) {
      return { success: false, error: '玩家不存在' };
    }

    // 查找请求
    const request = data.receivedRequests.find(r => r.requestId === requestId);
    if (!request) {
      return { success: false, error: '好友请求不存在' };
    }

    if (request.status !== FriendRequestStatus.PENDING) {
      return { success: false, error: '请求已处理' };
    }

    // 更新请求状态
    request.status = FriendRequestStatus.ACCEPTED;

    // 获取发送者数据
    const senderData = this.getPlayerData(request.senderId);
    if (senderData) {
      // 更新发送者的请求状态
      const senderRequest = senderData.sentRequests.find(r => r.requestId === requestId);
      if (senderRequest) {
        senderRequest.status = FriendRequestStatus.ACCEPTED;
      }

      // 添加好友关系（双向）
      this.addFriendRelation(playerId, request.senderId, request.senderName);
      this.addFriendRelation(request.senderId, playerId, '');
    }

    console.log(`[FriendSystem] ${playerId} 接受了 ${request.senderId} 的好友请求`);
    return { success: true };
  }

  /**
   * 添加好友关系
   * @param playerId 玩家 ID
   * @param friendId 好友 ID
   * @param friendName 好友名称
   */
  private addFriendRelation(
    playerId: string,
    friendId: string,
    friendName: string
  ): void {
    const data = this.getOrCreatePlayerData(playerId);

    // 如果没有提供好友名称，尝试从好友数据中获取
    if (!friendName) {
      // 这里需要从其他系统获取玩家名称
      // 暂时使用 ID 作为名称
      friendName = friendId;
    }

    const friendEntry: FriendEntry = {
      playerId: friendId,
      playerName: friendName,
      onlineStatus: OnlineStatus.OFFLINE,
      lastOnlineTime: Date.now(),
      isBlocked: false,
      isMuted: false,
    };

    data.friends.set(friendId, friendEntry);
  }

  /**
   * 拒绝好友请求
   * @param playerId 玩家 ID（接收者）
   * @param requestId 请求 ID
   */
  rejectFriendRequest(playerId: string, requestId: string): FriendRequestResult {
    const data = this.getPlayerData(playerId);
    if (!data) {
      return { success: false, error: '玩家不存在' };
    }

    // 查找请求
    const request = data.receivedRequests.find(r => r.requestId === requestId);
    if (!request) {
      return { success: false, error: '好友请求不存在' };
    }

    if (request.status !== FriendRequestStatus.PENDING) {
      return { success: false, error: '请求已处理' };
    }

    // 更新请求状态
    request.status = FriendRequestStatus.REJECTED;

    // 更新发送者的请求状态
    const senderData = this.getPlayerData(request.senderId);
    if (senderData) {
      const senderRequest = senderData.sentRequests.find(r => r.requestId === requestId);
      if (senderRequest) {
        senderRequest.status = FriendRequestStatus.REJECTED;
      }
    }

    console.log(`[FriendSystem] ${playerId} 拒绝了 ${request.senderId} 的好友请求`);
    return { success: true };
  }

  /**
   * 取消好友请求
   * @param playerId 玩家 ID（发送者）
   * @param requestId 请求 ID
   */
  cancelFriendRequest(playerId: string, requestId: string): FriendRequestResult {
    const data = this.getPlayerData(playerId);
    if (!data) {
      return { success: false, error: '玩家不存在' };
    }

    // 查找请求
    const request = data.sentRequests.find(r => r.requestId === requestId);
    if (!request) {
      return { success: false, error: '好友请求不存在' };
    }

    if (request.status !== FriendRequestStatus.PENDING) {
      return { success: false, error: '请求已处理' };
    }

    // 更新请求状态
    request.status = FriendRequestStatus.CANCELLED;

    // 更新接收者的请求状态
    const receiverData = this.getPlayerData(request.receiverId);
    if (receiverData) {
      const receiverRequest = receiverData.receivedRequests.find(r => r.requestId === requestId);
      if (receiverRequest) {
        receiverRequest.status = FriendRequestStatus.CANCELLED;
      }
    }

    console.log(`[FriendSystem] ${playerId} 取消了发送给 ${request.receiverId} 的好友请求`);
    return { success: true };
  }

  /**
   * 删除好友
   * @param playerId 玩家 ID
   * @param friendId 好友 ID
   */
  removeFriend(playerId: string, friendId: string): boolean {
    const data = this.getPlayerData(playerId);
    if (!data) {
      return false;
    }

    if (!data.friends.has(friendId)) {
      return false;
    }

    // 删除好友关系
    data.friends.delete(friendId);

    // 删除私聊消息
    data.chatMessages.delete(friendId);
    data.unreadCount.delete(friendId);

    // 双向删除
    const friendData = this.getPlayerData(friendId);
    if (friendData) {
      friendData.friends.delete(playerId);
      friendData.chatMessages.delete(playerId);
      friendData.unreadCount.delete(playerId);
    }

    console.log(`[FriendSystem] ${playerId} 删除了好友 ${friendId}`);
    return true;
  }

  /**
   * 获取好友列表
   * @param playerId 玩家 ID
   */
  getFriendList(playerId: string): FriendEntry[] {
    const data = this.getPlayerData(playerId);
    if (!data) return [];

    return Array.from(data.friends.values());
  }

  /**
   * 获取在线好友列表
   * @param playerId 玩家 ID
   */
  getOnlineFriends(playerId: string): FriendEntry[] {
    const friends = this.getFriendList(playerId);
    return friends.filter(f => f.onlineStatus !== OnlineStatus.OFFLINE);
  }

  /**
   * 获取好友条目
   * @param playerId 玩家 ID
   * @param friendId 好友 ID
   */
  getFriend(playerId: string, friendId: string): FriendEntry | null {
    const data = this.getPlayerData(playerId);
    if (!data) return null;

    const friend = data.friends.get(friendId);
    return friend ? { ...friend } : null;
  }

  /**
   * 更新好友备注
   * @param playerId 玩家 ID
   * @param friendId 好友 ID
   * @param note 备注
   */
  updateFriendNote(playerId: string, friendId: string, note: string): boolean {
    const data = this.getPlayerData(playerId);
    if (!data) return false;

    const friend = data.friends.get(friendId);
    if (!friend) return false;

    friend.note = note;
    return true;
  }

  /**
   * 设置好友在线状态
   * @param playerId 玩家 ID
   * @param status 在线状态
   */
  setOnlineStatus(playerId: string, status: OnlineStatus): void {
    const data = this.getPlayerData(playerId);
    if (!data) return;

    // 更新自己的状态记录
    // 注意：这里需要在数据结构中添加自己的在线状态

    // 通知所有好友状态变化
    for (const [friendId, friendEntry] of data.friends) {
      friendEntry.onlineStatus = status;
      friendEntry.lastOnlineTime = Date.now();

      // 触发好友端的状态变化事件
      this.notifyOnlineStatusChange(friendId, status);
    }

    console.log(`[FriendSystem] ${playerId} 状态更新为: ${status}`);
  }

  /**
   * 更新好友在线状态（从服务器接收）
   * @param playerId 玩家 ID
   * @param friendId 好友 ID
   * @param status 在线状态
   */
  updateFriendOnlineStatus(playerId: string, friendId: string, status: OnlineStatus): void {
    const data = this.getPlayerData(playerId);
    if (!data) return;

    const friend = data.friends.get(friendId);
    if (!friend) return;

    friend.onlineStatus = status;
    friend.lastOnlineTime = Date.now();

    // 触发本地事件
    this.notifyOnlineStatusChange(friendId, status);
  }

  /**
   * 发送私聊消息
   * @param senderId 发送者 ID
   * @param receiverId 接收者 ID
   * @param content 消息内容
   */
  sendChatMessage(
    senderId: string,
    receiverId: string,
    content: string
  ): ChatSendResult {
    // 验证参数
    if (senderId === receiverId) {
      return { success: false, error: '不能给自己发消息' };
    }

    const senderData = this.getPlayerData(senderId);
    if (!senderData || !senderData.friends.has(receiverId)) {
      return { success: false, error: '对方不是你的好友' };
    }

    const receiverData = this.getPlayerData(receiverId);
    if (!receiverData || !receiverData.friends.has(senderId)) {
      return { success: false, error: '好友关系不存在' };
    }

    // 创建消息
    this.messageIdCounter++;
    const message: ChatMessage = {
      messageId: `msg_${this.messageIdCounter}`,
      senderId,
      receiverId,
      content,
      timestamp: Date.now(),
      isRead: false,
    };

    // 保存到发送者的消息历史
    let senderMessages = senderData.chatMessages.get(receiverId);
    if (!senderMessages) {
      senderMessages = [];
      senderData.chatMessages.set(receiverId, senderMessages);
    }
    senderMessages.push(message);
    this.limitMessages(senderMessages);

    // 保存到接收者的消息历史
    let receiverMessages = receiverData.chatMessages.get(senderId);
    if (!receiverMessages) {
      receiverMessages = [];
      receiverData.chatMessages.set(senderId, receiverMessages);
    }
    receiverMessages.push(message);
    this.limitMessages(receiverMessages);

    // 更新未读计数
    const unreadCount = receiverData.unreadCount.get(senderId) || 0;
    receiverData.unreadCount.set(senderId, unreadCount + 1);

    // 通知接收者
    this.notifyMessageReceived(message);

    // 通过 WebSocket 发送到服务器（用于 MMO 同步）
    try {
      webSocketManager.send({
        type: 'private_message' as any,
        data: {
          messageId: message.messageId,
          senderId,
          receiverId,
          content,
          timestamp: message.timestamp,
        },
      });
    } catch (error) {
      console.warn('[FriendSystem] 发送私聊消息到服务器失败:', error);
    }

    console.log(`[FriendSystem] ${senderId} 向 ${receiverId} 发送消息: ${content}`);
    return { success: true, messageId: message.messageId };
  }

  /**
   * 限制消息数量
   * @param messages 消息列表
   */
  private limitMessages(messages: ChatMessage[]): void {
    if (messages.length > this.config.maxMessagesPerFriend) {
      // 删除最旧的消息
      messages.splice(0, messages.length - this.config.maxMessagesPerFriend);
    }
  }

  /**
   * 获取私聊消息历史
   * @param playerId 玩家 ID
   * @param friendId 好友 ID
   * @param limit 最大返回数量
   */
  getChatMessages(playerId: string, friendId: string, limit?: number): ChatMessage[] {
    const data = this.getPlayerData(playerId);
    if (!data) return [];

    const messages = data.chatMessages.get(friendId) || [];

    // 标记消息为已读
    this.markMessagesAsRead(playerId, friendId);

    if (limit && limit > 0) {
      return messages.slice(-limit);
    }

    return [...messages];
  }

  /**
   * 标记消息为已读
   * @param playerId 玩家 ID
   * @param friendId 好友 ID
   */
  markMessagesAsRead(playerId: string, friendId: string): void {
    const data = this.getPlayerData(playerId);
    if (!data) return;

    const messages = data.chatMessages.get(friendId);
    if (!messages) return;

    // 标记所有消息为已读
    for (const msg of messages) {
      if (msg.receiverId === playerId) {
        msg.isRead = true;
      }
    }

    // 清除未读计数
    data.unreadCount.set(friendId, 0);
  }

  /**
   * 获取未读消息数量
   * @param playerId 玩家 ID
   * @param friendId 好友 ID（可选，不指定则返回总未读数）
   */
  getUnreadCount(playerId: string, friendId?: string): number {
    const data = this.getPlayerData(playerId);
    if (!data) return 0;

    if (friendId) {
      return data.unreadCount.get(friendId) || 0;
    }

    // 返回总未读数
    let total = 0;
    for (const count of data.unreadCount.values()) {
      total += count;
    }
    return total;
  }

  /**
   * 邀请好友战斗
   * @param playerId 玩家 ID
   * @param friendId 好友 ID
   */
  inviteToBattle(playerId: string, friendId: string): boolean {
    const data = this.getPlayerData(playerId);
    if (!data || !data.friends.has(friendId)) {
      return false;
    }

    // 检查好友是否在线
    const friend = data.friends.get(friendId);
    if (!friend || friend.onlineStatus === OnlineStatus.OFFLINE) {
      return false;
    }

    // 通过 WebSocket 发送战斗邀请
    try {
      webSocketManager.send({
        type: 'battle_invitation' as any,
        data: {
          inviterId: playerId,
          inviteeId: friendId,
        },
      });
      return true;
    } catch (error) {
      console.warn('[FriendSystem] 发送战斗邀请失败:', error);
      return false;
    }
  }

  /**
   * 获取收到的好友请求列表
   * @param playerId 玩家 ID
   */
  getReceivedRequests(playerId: string): FriendRequest[] {
    const data = this.getPlayerData(playerId);
    if (!data) return [];

    // 只返回待处理的请求
    return data.receivedRequests.filter(r => r.status === FriendRequestStatus.PENDING);
  }

  /**
   * 获取发送的好友请求列表
   * @param playerId 玩家 ID
   */
  getSentRequests(playerId: string): FriendRequest[] {
    const data = this.getPlayerData(playerId);
    if (!data) return [];

    // 只返回待处理的请求
    return data.sentRequests.filter(r => r.status === FriendRequestStatus.PENDING);
  }

  /**
   * 屏蔽好友
   * @param playerId 玩家 ID
   * @param friendId 好友 ID
   */
  blockFriend(playerId: string, friendId: string): boolean {
    const data = this.getPlayerData(playerId);
    if (!data) return false;

    const friend = data.friends.get(friendId);
    if (!friend) return false;

    friend.isBlocked = true;
    console.log(`[FriendSystem] ${playerId} 屏蔽了 ${friendId}`);
    return true;
  }

  /**
   * 解除屏蔽好友
   * @param playerId 玩家 ID
   * @param friendId 好友 ID
   */
  unblockFriend(playerId: string, friendId: string): boolean {
    const data = this.getPlayerData(playerId);
    if (!data) return false;

    const friend = data.friends.get(friendId);
    if (!friend) return false;

    friend.isBlocked = false;
    console.log(`[FriendSystem] ${playerId} 解除了对 ${friendId} 的屏蔽`);
    return true;
  }

  /**
   * 静音好友
   * @param playerId 玩家 ID
   * @param friendId 好友 ID
   */
  muteFriend(playerId: string, friendId: string): boolean {
    const data = this.getPlayerData(playerId);
    if (!data) return false;

    const friend = data.friends.get(friendId);
    if (!friend) return false;

    friend.isMuted = true;
    console.log(`[FriendSystem] ${playerId} 静音了 ${friendId}`);
    return true;
  }

  /**
   * 取消静音好友
   * @param playerId 玩家 ID
   * @param friendId 好友 ID
   */
  unmuteFriend(playerId: string, friendId: string): boolean {
    const data = this.getPlayerData(playerId);
    if (!data) return false;

    const friend = data.friends.get(friendId);
    if (!friend) return false;

    friend.isMuted = false;
    console.log(`[FriendSystem] ${playerId} 取消了对 ${friendId} 的静音`);
    return true;
  }

  /**
   * 通知好友请求已接收
   * @param playerId 玩家 ID
   * @param request 请求
   */
  private notifyRequestReceived(request: FriendRequest): void {
    for (const listener of this.requestListeners) {
      try {
        listener(request);
      } catch (error) {
        console.error('[FriendSystem] 好友请求监听器错误:', error);
      }
    }
  }

  /**
   * 通知消息已接收
   * @param message 消息
   */
  private notifyMessageReceived(message: ChatMessage): void {
    const listeners = this.messageListeners.get(message.senderId);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(message);
        } catch (error) {
          console.error('[FriendSystem] 聊天消息监听器错误:', error);
        }
      }
    }
  }

  /**
   * 通知在线状态变化
   * @param friendId 好友 ID
   * @param status 在线状态
   */
  private notifyOnlineStatusChange(friendId: string, status: OnlineStatus): void {
    const listeners = this.onlineStatusListeners.get(friendId);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(friendId, status);
        } catch (error) {
          console.error('[FriendSystem] 在线状态监听器错误:', error);
        }
      }
    }
  }

  /**
   * 注册好友请求监听器
   * @param callback 回调函数
   */
  onRequestReceived(callback: (request: FriendRequest) => void): void {
    this.requestListeners.add(callback);
  }

  /**
   * 移除好友请求监听器
   * @param callback 回调函数
   */
  offRequestReceived(callback: (request: FriendRequest) => void): void {
    this.requestListeners.delete(callback);
  }

  /**
   * 注册聊天消息监听器
   * @param friendId 好友 ID
   * @param callback 回调函数
   */
  onMessageReceived(friendId: string, callback: (message: ChatMessage) => void): void {
    if (!this.messageListeners.has(friendId)) {
      this.messageListeners.set(friendId, new Set());
    }
    this.messageListeners.get(friendId)!.add(callback);
  }

  /**
   * 移除聊天消息监听器
   * @param friendId 好友 ID
   * @param callback 回调函数
   */
  offMessageReceived(friendId: string, callback: (message: ChatMessage) => void): void {
    const listeners = this.messageListeners.get(friendId);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * 注册在线状态监听器
   * @param friendId 好友 ID
   * @param callback 回调函数
   */
  onOnlineStatusChange(friendId: string, callback: (playerId: string, status: OnlineStatus) => void): void {
    if (!this.onlineStatusListeners.has(friendId)) {
      this.onlineStatusListeners.set(friendId, new Set());
    }
    this.onlineStatusListeners.get(friendId)!.add(callback);
  }

  /**
   * 移除在线状态监听器
   * @param friendId 好友 ID
   * @param callback 回调函数
   */
  offOnlineStatusChange(friendId: string, callback: (playerId: string, status: OnlineStatus) => void): void {
    const listeners = this.onlineStatusListeners.get(friendId);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * 删除玩家数据
   * @param playerId 玩家 ID
   */
  removePlayer(playerId: string): boolean {
    const deleted = this.playerData.delete(playerId);

    // 从所有好友列表中移除该玩家
    for (const data of this.playerData.values()) {
      if (data.friends.has(playerId)) {
        data.friends.delete(playerId);
        data.chatMessages.delete(playerId);
        data.unreadCount.delete(playerId);
      }
    }

    if (deleted) {
      console.log(`[FriendSystem] 删除玩家: ${playerId}`);
    }

    return deleted;
  }

  /**
   * 清除所有数据
   */
  clear(): void {
    this.playerData.clear();
    this.requestListeners.clear();
    this.messageListeners.clear();
    this.onlineStatusListeners.clear();
    console.log('[FriendSystem] 所有数据已清除');
  }

  /**
   * 获取系统统计信息
   */
  getStats(): {
    playerCount: number;
    totalFriendships: number;
    totalRequests: number;
    totalMessages: number;
  } {
    let totalFriendships = 0;
    let totalRequests = 0;
    let totalMessages = 0;

    for (const data of this.playerData.values()) {
      totalFriendships += data.friends.size;
      totalRequests += data.receivedRequests.length + data.sentRequests.length;
      for (const messages of data.chatMessages.values()) {
        totalMessages += messages.length;
      }
    }

    return {
      playerCount: this.playerData.size,
      totalFriendships,
      totalRequests,
      totalMessages,
    };
  }
}

/**
 * 导出好友系统单例
 */
export const friendSystem = FriendSystem.getInstance();
