/**
 * WebSocket 服务器基础架构
 *
 * 功能：
 * - 客户端连接/断开处理
 * - 消息路由系统
 * - 心跳检测（连接保活）
 * - 房间系统（对战房间）
 */

import { WebSocketServer as WSServer, WebSocket } from 'ws';

/**
 * 消息类型枚举
 */
export enum MessageType {
  /** 心跳包 */
  HEARTBEAT = 'heartbeat',
  /** 心跳响应 */
  HEARTBEAT_ACK = 'heartbeat_ack',
  /** 连接请求 */
  CONNECT = 'connect',
  /** 连接响应 */
  CONNECT_ACK = 'connect_ack',
  /** 认证请求 */
  AUTH = 'auth',
  /** 认证响应 */
  AUTH_ACK = 'auth_ack',
  /** 加入房间请求 */
  JOIN_ROOM = 'join_room',
  /** 加入房间响应 */
  JOIN_ROOM_ACK = 'join_room_ack',
  /** 离开房间请求 */
  LEAVE_ROOM = 'leave_room',
  /** 离开房间响应 */
  LEAVE_ROOM_ACK = 'leave_room_ack',
  /** 房间消息 */
  ROOM_MESSAGE = 'room_message',
  /** 错误消息 */
  ERROR = 'error',
}

/**
 * WebSocket 消息接口
 */
export interface WSMessage {
  /** 消息类型 */
  type: MessageType;
  /** 消息数据 */
  data?: any;
  /** 消息 ID（用于请求-响应匹配） */
  messageId?: string;
  /** 时间戳 */
  timestamp?: number;
}

/**
 * 客户端信息接口
 */
export interface ClientInfo {
  /** 连接 ID */
  connectionId: string;
  /** 用户 ID */
  userId?: string;
  /** 用户名 */
  username?: string;
  /** 是否已认证 */
  authenticated: boolean;
  /** 最后活跃时间 */
  lastActive: number;
  /** 加入的房间列表 */
  rooms: Set<string>;
  /** WebSocket 连接 */
  socket: WebSocket;
}

/**
 * 房间信息接口
 */
export interface RoomInfo {
  /** 房间 ID */
  roomId: string;
  /** 房间名称 */
  roomName: string;
  /** 房间类型 */
  roomType: string;
  /** 房间中的客户端列表 */
  clients: Set<string>;
  /** 房间数据 */
  data?: any;
  /** 创建时间 */
  createdAt: number;
}

/**
 * 消息处理器类型
 */
export type MessageHandler = (client: ClientInfo, message: WSMessage) => void | Promise<void>;

/**
 * WebSocket 服务器配置接口
 */
export interface WSServerConfig {
  /** 服务器端口 */
  port: number;
  /** 心跳间隔（毫秒） */
  heartbeatInterval: number;
  /** 心跳超时（毫秒） */
  heartbeatTimeout: number;
  /** 最大连接数 */
  maxConnections: number;
}

/**
 * WebSocket 服务器类
 */
export class WebSocketServer {
  private static instance: WebSocketServer;

  /** WebSocket 服务器实例 */
  private wss: WSServer | null = null;

  /** 客户端列表（连接 ID -> 客户端信息） */
  private clients: Map<string, ClientInfo> = new Map();

  /** 房间列表（房间 ID -> 房间信息） */
  private rooms: Map<string, RoomInfo> = new Map();

  /** 用户 ID 到连接 ID 的映射 */
  private userIdToConnectionId: Map<string, string> = new Map();

  /** 消息处理器（消息类型 -> 处理函数） */
  private messageHandlers: Map<MessageType, MessageHandler> = new Map();

  /** 连接 ID 计数器 */
  private connectionIdCounter: number = 0;

  /** 心跳检测定时器 */
  private heartbeatTimer: NodeJS.Timeout | null = null;

  /** 服务器配置 */
  private config: WSServerConfig;

  /**
   * 私有构造函数，确保单例
   */
  private constructor(config?: Partial<WSServerConfig>) {
    this.config = {
      port: config?.port || 8080,
      heartbeatInterval: config?.heartbeatInterval || 30000, // 默认 30 秒
      heartbeatTimeout: config?.heartbeatTimeout || 90000, // 默认 90 秒
      maxConnections: config?.maxConnections || 1000,
    };
  }

  /**
   * 获取单例实例
   */
  static getInstance(config?: Partial<WSServerConfig>): WebSocketServer {
    if (!WebSocketServer.instance) {
      WebSocketServer.instance = new WebSocketServer(config);
    }
    return WebSocketServer.instance;
  }

  /**
   * 启动 WebSocket 服务器
   */
  start(): void {
    if (this.wss) {
      console.warn('[WebSocketServer] Server already running');
      return;
    }

    this.wss = new WSServer({ port: this.config.port });

    this.wss.on('listening', () => {
      console.log(`[WebSocketServer] Server started on port ${this.config.port}`);
    });

    this.wss.on('connection', (socket: WebSocket) => {
      this.handleConnection(socket);
    });

    this.wss.on('error', (error) => {
      console.error('[WebSocketServer] Server error:', error);
    });

    this.wss.on('close', () => {
      console.log('[WebSocketServer] Server closed');
      this.stop();
    });

    // 启动心跳检测
    this.startHeartbeatCheck();
  }

  /**
   * 停止 WebSocket 服务器
   */
  stop(): void {
    if (!this.wss) {
      return;
    }

    // 停止心跳检测
    this.stopHeartbeatCheck();

    // 关闭所有客户端连接
    for (const client of this.clients.values()) {
      client.socket.close();
    }
    this.clients.clear();

    // 关闭服务器
    this.wss.close();
    this.wss = null;

    console.log('[WebSocketServer] Server stopped');
  }

  /**
   * 处理客户端连接
   */
  private handleConnection(socket: WebSocket): void {
    // 检查最大连接数
    if (this.clients.size >= this.config.maxConnections) {
      socket.close(1013, 'Server full'); // 1013: Try Again Later
      return;
    }

    // 生成连接 ID
    const connectionId = this.generateConnectionId();

    // 创建客户端信息
    const client: ClientInfo = {
      connectionId,
      userId: undefined,
      username: undefined,
      authenticated: false,
      lastActive: Date.now(),
      rooms: new Set(),
      socket,
    };

    // 添加到客户端列表
    this.clients.set(connectionId, client);

    console.log(`[WebSocketServer] Client connected: ${connectionId}`);

    // 发送连接确认
    this.sendMessage(client, {
      type: MessageType.CONNECT_ACK,
      data: {
        connectionId,
        serverTime: Date.now(),
      },
    });

    // 设置消息处理器
    socket.on('message', (data: Buffer) => {
      this.handleMessage(client, data);
    });

    socket.on('error', (error) => {
      console.error(`[WebSocketServer] Client error: ${connectionId}`, error);
    });

    socket.on('close', (code, reason) => {
      this.handleDisconnection(client, code, reason);
    });

    // 触发连接事件
    this.triggerMessageHandler(MessageType.CONNECT, client, {
      type: MessageType.CONNECT,
      data: { connectionId },
    });
  }

  /**
   * 处理客户端断开连接
   */
  private handleDisconnection(client: ClientInfo, code: number, reason: Buffer): void {
    const { connectionId, userId, rooms } = client;

    console.log(`[WebSocketServer] Client disconnected: ${connectionId} (code: ${code})`);

    // 从所有房间移除
    for (const roomId of rooms) {
      this.leaveRoom(client, roomId);
    }

    // 清除用户映射
    if (userId) {
      this.userIdToConnectionId.delete(userId);
    }

    // 从客户端列表移除
    this.clients.delete(connectionId);

    // 触发断开事件
    this.triggerMessageHandler(MessageType.CONNECT, client, {
      type: MessageType.CONNECT,
      data: {
        connectionId,
        disconnected: true,
        code,
        reason: reason.toString(),
      },
    });
  }

  /**
   * 处理客户端消息
   */
  private async handleMessage(client: ClientInfo, data: Buffer): Promise<void> {
    // 更新最后活跃时间
    client.lastActive = Date.now();

    try {
      // 解析消息
      const message: WSMessage = JSON.parse(data.toString());

      // 验证消息格式
      if (!message.type) {
        this.sendError(client, 'Invalid message format: missing type');
        return;
      }

      // 记录消息（调试）
      console.log(`[WebSocketServer] Message from ${client.connectionId}:`, message.type);

      // 处理消息
      await this.processMessage(client, message);

    } catch (error) {
      console.error(`[WebSocketServer] Failed to process message:`, error);
      this.sendError(client, 'Failed to process message');
    }
  }

  /**
   * 处理消息路由
   */
  private async processMessage(client: ClientInfo, message: WSMessage): Promise<void> {
    // 特殊处理心跳消息
    if (message.type === MessageType.HEARTBEAT) {
      this.sendMessage(client, {
        type: MessageType.HEARTBEAT_ACK,
        timestamp: Date.now(),
      });
      return;
    }

    // 触发对应的消息处理器
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      try {
        await handler(client, message);
      } catch (error) {
        console.error(`[WebSocketServer] Handler error for ${message.type}:`, error);
        this.sendError(client, `Handler error: ${error}`);
      }
    } else {
      console.warn(`[WebSocketServer] No handler for message type: ${message.type}`);
    }
  }

  /**
   * 注册消息处理器
   */
  onMessage(type: MessageType, handler: MessageHandler): void {
    this.messageHandlers.set(type, handler);
  }

  /**
   * 移除消息处理器
   */
  offMessage(type: MessageType): void {
    this.messageHandlers.delete(type);
  }

  /**
   * 触发消息处理器
   */
  private triggerMessageHandler(type: MessageType, client: ClientInfo, message: WSMessage): void {
    const handler = this.messageHandlers.get(type);
    if (handler) {
      try {
        handler(client, message);
      } catch (error) {
        console.error(`[WebSocketServer] Handler error for ${type}:`, error);
      }
    }
  }

  /**
   * 发送消息到客户端
   */
  sendMessage(client: ClientInfo, message: WSMessage): boolean {
    if (client.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      client.socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`[WebSocketServer] Failed to send message to ${client.connectionId}:`, error);
      return false;
    }
  }

  /**
   * 发送错误消息到客户端
   */
  sendError(client: ClientInfo, error: string): void {
    this.sendMessage(client, {
      type: MessageType.ERROR,
      data: {
        error,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * 广播消息到所有客户端
   */
  broadcast(message: WSMessage, excludeClientIds: string[] = []): void {
    for (const client of this.clients.values()) {
      if (!excludeClientIds.includes(client.connectionId)) {
        this.sendMessage(client, message);
      }
    }
  }

  /**
   * 创建房间
   */
  createRoom(roomId: string, roomName: string, roomType: string = 'battle', data?: any): RoomInfo {
    if (this.rooms.has(roomId)) {
      throw new Error(`Room already exists: ${roomId}`);
    }

    const room: RoomInfo = {
      roomId,
      roomName,
      roomType,
      clients: new Set(),
      data,
      createdAt: Date.now(),
    };

    this.rooms.set(roomId, room);
    console.log(`[WebSocketServer] Room created: ${roomId} (${roomName})`);

    return room;
  }

  /**
   * 删除房间
   */
  deleteRoom(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      return false;
    }

    // 将房间中的所有客户端移出房间
    for (const connectionId of room.clients) {
      const client = this.clients.get(connectionId);
      if (client) {
        this.leaveRoom(client, roomId, true);
      }
    }

    this.rooms.delete(roomId);
    console.log(`[WebSocketServer] Room deleted: ${roomId}`);
    return true;
  }

  /**
   * 客户端加入房间
   */
  joinRoom(client: ClientInfo, roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      this.sendError(client, `Room not found: ${roomId}`);
      return false;
    }

    if (room.clients.has(client.connectionId)) {
      return false; // 已经在房间中
    }

    // 添加到房间
    room.clients.add(client.connectionId);
    client.rooms.add(roomId);

    // 通知房间内其他客户端
    this.broadcastToRoom(roomId, {
      type: MessageType.JOIN_ROOM,
      data: {
        connectionId: client.connectionId,
        username: client.username,
        userId: client.userId,
      },
    }, [client.connectionId]);

    // 发送加入成功消息
    this.sendMessage(client, {
      type: MessageType.JOIN_ROOM_ACK,
      data: {
        roomId,
        roomName: room.roomName,
        roomType: room.roomType,
        clients: Array.from(room.clients).map(id => {
          const c = this.clients.get(id);
          return {
            connectionId: id,
            username: c?.username,
            userId: c?.userId,
          };
        }),
      },
    });

    console.log(`[WebSocketServer] Client ${client.connectionId} joined room: ${roomId}`);
    return true;
  }

  /**
   * 客户端离开房间
   */
  leaveRoom(client: ClientInfo, roomId: string, silent: boolean = false): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      return false;
    }

    if (!room.clients.has(client.connectionId)) {
      return false;
    }

    // 从房间移除
    room.clients.delete(client.connectionId);
    client.rooms.delete(roomId);

    // 通知房间内其他客户端
    if (!silent) {
      this.broadcastToRoom(roomId, {
        type: MessageType.LEAVE_ROOM,
        data: {
          connectionId: client.connectionId,
          username: client.username,
        },
      }, [client.connectionId]);
    }

    // 如果房间为空，自动删除
    if (room.clients.size === 0) {
      this.rooms.delete(roomId);
      console.log(`[WebSocketServer] Room deleted (empty): ${roomId}`);
    }

    console.log(`[WebSocketServer] Client ${client.connectionId} left room: ${roomId}`);
    return true;
  }

  /**
   * 发送消息到房间内的所有客户端
   */
  broadcastToRoom(roomId: string, message: WSMessage, excludeClientIds: string[] = []): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }

    for (const connectionId of room.clients) {
      if (!excludeClientIds.includes(connectionId)) {
        const client = this.clients.get(connectionId);
        if (client) {
          this.sendMessage(client, message);
        }
      }
    }
  }

  /**
   * 启动心跳检测
   */
  private startHeartbeatCheck(): void {
    if (this.heartbeatTimer) {
      return;
    }

    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      const timeout = this.config.heartbeatTimeout;

      // 检查所有客户端
      for (const [connectionId, client] of this.clients) {
        if (now - client.lastActive > timeout) {
          console.log(`[WebSocketServer] Client timeout: ${connectionId}`);
          client.socket.close(1000, 'Heartbeat timeout');
        }
      }
    }, this.config.heartbeatInterval);

    console.log(`[WebSocketServer] Heartbeat check started (interval: ${this.config.heartbeatInterval}ms)`);
  }

  /**
   * 停止心跳检测
   */
  private stopHeartbeatCheck(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
      console.log('[WebSocketServer] Heartbeat check stopped');
    }
  }

  /**
   * 生成连接 ID
   */
  private generateConnectionId(): string {
    this.connectionIdCounter++;
    return `conn_${Date.now()}_${this.connectionIdCounter}`;
  }

  /**
   * 根据用户 ID 获取客户端信息
   */
  getClientByUserId(userId: string): ClientInfo | undefined {
    const connectionId = this.userIdToConnectionId.get(userId);
    if (!connectionId) {
      return undefined;
    }
    return this.clients.get(connectionId);
  }

  /**
   * 根据连接 ID 获取客户端信息
   */
  getClient(connectionId: string): ClientInfo | undefined {
    return this.clients.get(connectionId);
  }

  /**
   * 获取所有客户端
   */
  getAllClients(): ClientInfo[] {
    return Array.from(this.clients.values());
  }

  /**
   * 获取房间信息
   */
  getRoom(roomId: string): RoomInfo | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * 获取所有房间
   */
  getAllRooms(): RoomInfo[] {
    return Array.from(this.rooms.values());
  }

  /**
   * 设置用户认证信息
   */
  setClientAuth(client: ClientInfo, userId: string, username: string): void {
    client.userId = userId;
    client.username = username;
    client.authenticated = true;
    this.userIdToConnectionId.set(userId, client.connectionId);
    console.log(`[WebSocketServer] Client authenticated: ${username} (${userId})`);
  }

  /**
   * 获取服务器状态
   */
  getServerStatus(): {
    port: number;
    clientCount: number;
    roomCount: number;
    authenticatedCount: number;
    uptime: number;
  } {
    const authenticatedClients = Array.from(this.clients.values()).filter(c => c.authenticated);

    return {
      port: this.config.port,
      clientCount: this.clients.size,
      roomCount: this.rooms.size,
      authenticatedCount: authenticatedClients.length,
      uptime: this.wss ? Date.now() : 0,
    };
  }
}

/**
 * 导出 WebSocket 服务器单例
 */
export const wsServer = WebSocketServer.getInstance();

/**
 * 导出消息类型枚举
 */
export { MessageType };
