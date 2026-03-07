/**
 * WebSocket 服务器
 *
 * 基于 ws 库实现网络对战基础设施
 *
 * 功能：
 * - 房间管理（创建/加入/离开房间）
 * - 玩家匹配队列
 * - 战斗状态同步协议
 * - 心跳检测和断线重连
 * - 日志和监控
 */

import WebSocket, { WebSocketServer as WSServer } from 'ws';

/**
 * 玩家信息接口
 */
export interface Player {
  /** 玩家 ID */
  playerId: string;
  /** 玩家名称 */
  playerName: string;
  /** WebSocket 连接 */
  socket: WebSocket;
  /** 加入的房间 ID */
  roomId?: string;
  /** 最后心跳时间 */
  lastHeartbeat: number;
  /** 连接状态 */
  isConnected: boolean;
}

/**
 * 房间信息接口
 */
export interface Room {
  /** 房间 ID */
  roomId: string;
  /** 房间名称 */
  roomName: string;
  /** 房间创建者 ID */
  ownerId: string;
  /** 房间内的玩家列表 */
  players: Player[];
  /** 房间最大玩家数 */
  maxPlayers: number;
  /** 房间类型 */
  roomType: 'pvp' | 'pve' | 'trade';
  /** 房间状态 */
  status: 'waiting' | 'in_progress' | 'ended';
  /** 创建时间 */
  createdAt: number;
  /** 游戏状态数据 */
  gameState?: any;
}

/**
 * 匹配队列玩家接口
 */
export interface MatchmakingPlayer {
  /** 玩家 ID */
  playerId: string;
  /** 玩家名称 */
  playerName: string;
  /** WebSocket 连接 */
  socket: WebSocket;
  /** 玩家等级（用于匹配） */
  playerLevel: number;
  /** 加入队列时间 */
  joinedAt: number;
}

/**
 * 服务器事件类型
 */
export enum ServerEventType {
  /** 玩家加入 */
  PLAYER_JOIN = 'player_join',
  /** 玩家离开 */
  PLAYER_LEAVE = 'player_leave',
  /** 房间创建 */
  ROOM_CREATE = 'room_create',
  /** 房间关闭 */
  ROOM_CLOSE = 'room_close',
  /** 消息发送 */
  MESSAGE = 'message',
  /** 错误 */
  ERROR = 'error',
  /** 战斗开始 */
  BATTLE_START = 'battle_start',
  /** 战斗更新 */
  BATTLE_UPDATE = 'battle_update',
  /** 战斗结束 */
  BATTLE_END = 'battle_end',
}

/**
 * 客户端消息类型
 */
export enum ClientMessageType {
  /** 创建房间 */
  CREATE_ROOM = 'create_room',
  /** 加入房间 */
  JOIN_ROOM = 'join_room',
  /** 离开房间 */
  LEAVE_ROOM = 'leave_room',
  /** 获取房间列表 */
  GET_ROOMS = 'get_rooms',
  /** 开始匹配 */
  START_MATCHMAKING = 'start_matchmaking',
  /** 取消匹配 */
  CANCEL_MATCHMAKING = 'cancel_matchmaking',
  /** 战斗行动 */
  BATTLE_ACTION = 'battle_action',
  /** 心跳 */
  HEARTBEAT = 'heartbeat',
  /** 聊天消息 */
  CHAT_MESSAGE = 'chat_message',
}

/**
 * 服务器消息类型
 */
export enum ServerMessageType {
  /** 房间已创建 */
  ROOM_CREATED = 'room_created',
  /** 已加入房间 */
  ROOM_JOINED = 'room_joined',
  /** 已离开房间 */
  ROOM_LEFT = 'room_left',
  /** 房间列表 */
  ROOM_LIST = 'room_list',
  /** 匹配成功 */
  MATCH_FOUND = 'match_found',
  /** 战斗开始 */
  BATTLE_START = 'battle_start',
  /** 战斗状态更新 */
  BATTLE_STATE = 'battle_state',
  /** 玩家行动确认 */
  ACTION_CONFIRM = 'action_confirm',
  /** 心跳响应 */
  HEARTBEAT_ACK = 'heartbeat_ack',
  /** 错误消息 */
  ERROR = 'error',
  /** 聊天消息 */
  CHAT_MESSAGE = 'chat_message',
}

/**
 * WebSocket 服务器配置
 */
export interface WebSocketServerConfig {
  /** 服务器端口 */
  port: number;
  /** 心跳间隔（毫秒） */
  heartbeatInterval: number;
  /** 心跳超时（毫秒） */
  heartbeatTimeout: number;
  /** 最大房间数 */
  maxRooms: number;
  /** 匹配超时（毫秒） */
  matchmakingTimeout: number;
}

/**
 * WebSocket 服务器类
 */
export class WebSocketServer {
  /** 服务器实例 */
  private server: WSServer | null = null;

  /** 配置 */
  private config: WebSocketServerConfig;

  /** 在线玩家列表 */
  private players: Map<string, Player> = new Map();

  /** 房间列表 */
  private rooms: Map<string, Room> = new Map();

  /** 匹配队列 */
  private matchmakingQueue: MatchmakingPlayer[] = [];

  /** 房间 ID 计数器 */
  private roomIdCounter: number = 0;

  /** 心跳检测定时器 */
  private heartbeatTimer: NodeJS.Timeout | null = null;

  /** 匹配定时器 */
  private matchmakingTimer: NodeJS.Timeout | null = null;

  /** 事件监听器 */
  private eventListeners: Map<ServerEventType, Set<Function>> = new Map();

  /**
   * 构造函数
   * @param config 服务器配置
   */
  constructor(config: Partial<WebSocketServerConfig> = {}) {
    this.config = {
      port: config.port || 8081,
      heartbeatInterval: config.heartbeatInterval || 30000, // 30秒
      heartbeatTimeout: config.heartbeatTimeout || 90000,     // 90秒
      maxRooms: config.maxRooms || 100,
      matchmakingTimeout: config.matchmakingTimeout || 60000,   // 60秒
    };
  }

  /**
   * 启动服务器
   */
  start(): void {
    if (this.server) {
      console.warn('[WebSocketServer] 服务器已在运行');
      return;
    }

    this.server = new WSServer({ port: this.config.port });

    this.server.on('connection', (socket, req) => {
      this.handleConnection(socket, req);
    });

    this.server.on('error', (error) => {
      console.error('[WebSocketServer] 服务器错误:', error);
      this.emit(ServerEventType.ERROR, error);
    });

    // 启动心跳检测
    this.startHeartbeatCheck();

    // 启动匹配检查
    this.startMatchmaking();

    console.log(`[WebSocketServer] 服务器启动，监听端口 ${this.config.port}`);
  }

  /**
   * 停止服务器
   */
  stop(): void {
    if (!this.server) {
      return;
    }

    // 停止心跳检测
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    // 停止匹配检查
    if (this.matchmakingTimer) {
      clearInterval(this.matchmakingTimer);
      this.matchmakingTimer = null;
    }

    // 关闭所有连接
    for (const player of this.players.values()) {
      player.socket.close();
    }

    this.server.close();
    this.server = null;

    console.log('[WebSocketServer] 服务器已停止');
  }

  /**
   * 处理新连接
   */
  private handleConnection(socket: WebSocket, _req: any): void {
    // 生成玩家 ID
    const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const player: Player = {
      playerId,
      playerName: `Player_${playerId.substr(-4)}`,
      socket,
      lastHeartbeat: Date.now(),
      isConnected: true,
    };

    this.players.set(playerId, player);

    console.log(`[WebSocketServer] 玩家连接: ${playerId}`);

    // 监听消息
    socket.on('message', (data: Buffer) => {
      this.handleMessage(player, data);
    });

    // 监听关闭
    socket.on('close', () => {
      this.handleDisconnection(player);
    });

    // 监听错误
    socket.on('error', (error) => {
      console.error(`[WebSocketServer] 玩家 ${playerId} 连接错误:`, error);
    });

    // 发送欢迎消息
    this.sendToPlayer(player, {
      type: ServerMessageType.ROOM_LIST,
      data: this.getPublicRoomList(),
    });

    this.emit(ServerEventType.PLAYER_JOIN, player);
  }

  /**
   * 处理断开连接
   */
  private handleDisconnection(player: Player): void {
    console.log(`[WebSocketServer] 玩家断开: ${player.playerId}`);

    player.isConnected = false;

    // 从匹配队列中移除
    this.removeFromMatchmaking(player.playerId);

    // 离开房间
    if (player.roomId) {
      this.playerLeaveRoom(player);
    }

    // 移除玩家
    this.players.delete(player.playerId);

    this.emit(ServerEventType.PLAYER_LEAVE, player);
  }

  /**
   * 处理客户端消息
   */
  private handleMessage(player: Player, data: Buffer): void {
    try {
      const message = JSON.parse(data.toString());

      // 更新心跳时间
      player.lastHeartbeat = Date.now();

      switch (message.type) {
        case ClientMessageType.CREATE_ROOM:
          this.handleCreateRoom(player, message);
          break;

        case ClientMessageType.JOIN_ROOM:
          this.handleJoinRoom(player, message);
          break;

        case ClientMessageType.LEAVE_ROOM:
          this.handleLeaveRoom(player);
          break;

        case ClientMessageType.GET_ROOMS:
          this.handleGetRooms(player);
          break;

        case ClientMessageType.START_MATCHMAKING:
          this.handleStartMatchmaking(player, message);
          break;

        case ClientMessageType.CANCEL_MATCHMAKING:
          this.handleCancelMatchmaking(player);
          break;

        case ClientMessageType.BATTLE_ACTION:
          this.handleBattleAction(player, message);
          break;

        case ClientMessageType.HEARTBEAT:
          this.handleHeartbeat(player);
          break;

        case ClientMessageType.CHAT_MESSAGE:
          this.handleChatMessage(player, message);
          break;

        default:
          console.warn(`[WebSocketServer] 未知消息类型: ${message.type}`);
      }
    } catch (error) {
      console.error('[WebSocketServer] 消息解析错误:', error);
    }
  }

  /**
   * 处理创建房间请求
   */
  private handleCreateRoom(player: Player, message: any): void {
    const { roomName, roomType = 'pvp', maxPlayers = 2 } = message.data || {};

    // 检查玩家是否已在房间中
    if (player.roomId) {
      this.sendError(player, '玩家已在房间中');
      return;
    }

    // 检查房间数量限制
    if (this.rooms.size >= this.config.maxRooms) {
      this.sendError(player, '房间数量已达上限');
      return;
    }

    // 生成房间 ID
    const roomId = `room_${++this.roomIdCounter}`;

    const room: Room = {
      roomId,
      roomName: roomName || `房间 ${roomId}`,
      ownerId: player.playerId,
      players: [player],
      maxPlayers,
      roomType,
      status: 'waiting',
      createdAt: Date.now(),
    };

    this.rooms.set(roomId, room);
    player.roomId = roomId;

    console.log(`[WebSocketServer] 创建房间: ${roomId} by ${player.playerName}`);

    // 发送房间创建成功消息
    this.sendToPlayer(player, {
      type: ServerMessageType.ROOM_CREATED,
      data: {
        room: this.getPublicRoomInfo(room),
      },
    });

    // 广播房间列表更新
    this.broadcastRoomList();

    this.emit(ServerEventType.ROOM_CREATE, room);
  }

  /**
   * 处理加入房间请求
   */
  private handleJoinRoom(player: Player, message: any): void {
    const { roomId } = message.data || {};

    if (!roomId) {
      this.sendError(player, '缺少房间 ID');
      return;
    }

    // 检查玩家是否已在房间中
    if (player.roomId) {
      this.sendError(player, '玩家已在房间中');
      return;
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      this.sendError(player, '房间不存在');
      return;
    }

    // 检查房间状态
    if (room.status !== 'waiting') {
      this.sendError(player, '房间不可加入');
      return;
    }

    // 检查房间人数
    if (room.players.length >= room.maxPlayers) {
      this.sendError(player, '房间已满');
      return;
    }

    // 加入房间
    room.players.push(player);
    player.roomId = roomId;

    console.log(`[WebSocketServer] 玩家 ${player.playerName} 加入房间 ${roomId}`);

    // 发送加入成功消息
    this.sendToPlayer(player, {
      type: ServerMessageType.ROOM_JOINED,
      data: {
        room: this.getPublicRoomInfo(room),
      },
    });

    // 通知房间内其他玩家
    this.broadcastToRoom(room, {
      type: ServerMessageType.ROOM_JOINED,
      data: {
        player: {
          playerId: player.playerId,
          playerName: player.playerName,
        },
      },
    }, player);

    // 广播房间列表更新
    this.broadcastRoomList();

    // 如果房间满了，开始游戏
    if (room.players.length === room.maxPlayers) {
      this.startGame(room);
    }
  }

  /**
   * 处理离开房间请求
   */
  private handleLeaveRoom(player: Player): void {
    if (!player.roomId) {
      return;
    }

    this.playerLeaveRoom(player);
  }

  /**
   * 玩家离开房间
   */
  private playerLeaveRoom(player: Player): void {
    const roomId = player.roomId;
    if (!roomId) {
      return;
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      player.roomId = undefined;
      return;
    }

    // 移除玩家
    room.players = room.players.filter(p => p.playerId !== player.playerId);
    player.roomId = undefined;

    console.log(`[WebSocketServer] 玩家 ${player.playerName} 离开房间 ${roomId}`);

    // 如果房间没有玩家了，关闭房间
    if (room.players.length === 0) {
      this.rooms.delete(roomId);
      this.emit(ServerEventType.ROOM_CLOSE, room);
    } else {
      // 如果房主离开了，转移房主权限
      if (room.ownerId === player.playerId) {
        room.ownerId = room.players[0].playerId;
      }

      // 通知房间内其他玩家
      this.broadcastToRoom(room, {
        type: ServerMessageType.ROOM_LEFT,
        data: {
          playerId: player.playerId,
        },
      });
    }

    // 广播房间列表更新
    this.broadcastRoomList();
  }

  /**
   * 处理获取房间列表请求
   */
  private handleGetRooms(player: Player): void {
    this.sendToPlayer(player, {
      type: ServerMessageType.ROOM_LIST,
      data: this.getPublicRoomList(),
    });
  }

  /**
   * 处理开始匹配请求
   */
  private handleStartMatchmaking(player: Player, message: any): void {
    const { playerLevel = 1 } = message.data || {};

    // 检查玩家是否已在匹配队列中
    if (this.isPlayerInMatchmaking(player.playerId)) {
      this.sendError(player, '玩家已在匹配队列中');
      return;
    }

    // 添加到匹配队列
    this.matchmakingQueue.push({
      playerId: player.playerId,
      playerName: player.playerName,
      socket: player.socket,
      playerLevel,
      joinedAt: Date.now(),
    });

    console.log(`[WebSocketServer] 玩家 ${player.playerName} 加入匹配队列 (等级: ${playerLevel})`);
  }

  /**
   * 处理取消匹配请求
   */
  private handleCancelMatchmaking(player: Player): void {
    this.removeFromMatchmaking(player.playerId);
    console.log(`[WebSocketServer] 玩家 ${player.playerName} 取消匹配`);
  }

  /**
   * 处理战斗行动请求
   */
  private handleBattleAction(player: Player, message: any): void {
    if (!player.roomId) {
      this.sendError(player, '玩家不在房间中');
      return;
    }

    const room = this.rooms.get(player.roomId);
    if (!room || room.status !== 'in_progress') {
      this.sendError(player, '游戏未开始');
      return;
    }

    // 将战斗行动转发给对手
    const opponent = room.players.find(p => p.playerId !== player.playerId);
    if (opponent) {
      this.sendToPlayer(opponent, {
        type: ServerMessageType.BATTLE_STATE,
        data: {
          ...message.data,
          senderId: player.playerId,
        },
      });
    }

    // 发送确认消息
    this.sendToPlayer(player, {
      type: ServerMessageType.ACTION_CONFIRM,
      data: {
        actionId: message.data?.actionId,
      },
    });
  }

  /**
   * 处理心跳请求
   */
  private handleHeartbeat(player: Player): void {
    player.lastHeartbeat = Date.now();

    this.sendToPlayer(player, {
      type: ServerMessageType.HEARTBEAT_ACK,
      data: {
        timestamp: Date.now(),
      },
    });
  }

  /**
   * 处理聊天消息
   */
  private handleChatMessage(player: Player, message: any): void {
    const { text } = message.data || {};

    if (!text || typeof text !== 'string') {
      return;
    }

    if (!player.roomId) {
      this.sendError(player, '玩家不在房间中');
      return;
    }

    const room = this.rooms.get(player.roomId);
    if (!room) {
      return;
    }

    const chatMessage = {
      type: ServerMessageType.CHAT_MESSAGE,
      data: {
        playerId: player.playerId,
        playerName: player.playerName,
        text,
        timestamp: Date.now(),
      },
    };

    // 广播聊天消息
    this.broadcastToRoom(room, chatMessage);
  }

  /**
   * 从匹配队列中移除玩家
   */
  private removeFromMatchmaking(playerId: string): void {
    this.matchmakingQueue = this.matchmakingQueue.filter(p => p.playerId !== playerId);
  }

  /**
   * 检查玩家是否在匹配队列中
   */
  private isPlayerInMatchmaking(playerId: string): boolean {
    return this.matchmakingQueue.some(p => p.playerId === playerId);
  }

  /**
   * 启动心跳检测
   */
  private startHeartbeatCheck(): void {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      const timeoutPlayers: Player[] = [];

      for (const player of this.players.values()) {
        if (!player.isConnected) {
          continue;
        }

        if (now - player.lastHeartbeat > this.config.heartbeatTimeout) {
          timeoutPlayers.push(player);
        }
      }

      // 断开超时玩家
      for (const player of timeoutPlayers) {
        console.log(`[WebSocketServer] 玩家 ${player.playerName} 心跳超时，断开连接`);
        player.socket.close();
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * 启动匹配检查
   */
  private startMatchmaking(): void {
    this.matchmakingTimer = setInterval(() => {
      const now = Date.now();
      const timeoutPlayers: MatchmakingPlayer[] = [];

      // 移除超时的匹配请求
      this.matchmakingQueue = this.matchmakingQueue.filter(player => {
        if (now - player.joinedAt > this.config.matchmakingTimeout) {
          timeoutPlayers.push(player);
          return false;
        }
        return true;
      });

      // 通知超时玩家
      for (const player of timeoutPlayers) {
        this.sendToSocket(player.socket, {
          type: ServerMessageType.ERROR,
          data: {
            message: '匹配超时',
          },
        });
      }

      // 尝试匹配
      this.tryMatch();
    }, 5000); // 每 5 秒检查一次
  }

  /**
   * 尝试匹配玩家
   */
  private tryMatch(): void {
    // 简单的匹配算法：选择等级相近的两个玩家
    if (this.matchmakingQueue.length < 2) {
      return;
    }

    const sortedQueue = [...this.matchmakingQueue].sort((a, b) => a.joinedAt - b.joinedAt);

    // 找到第一个玩家
    const player1 = sortedQueue[0];
    if (!player1) {
      return;
    }

    // 找到等级相近的第二个玩家（等级差不超过 5）
    const player2 = sortedQueue.slice(1).find(p =>
      Math.abs(p.playerLevel - player1.playerLevel) <= 5
    );

    if (!player2) {
      return;
    }

    // 从队列中移除这两个玩家
    this.matchmakingQueue = this.matchmakingQueue.filter(p =>
      p.playerId !== player1.playerId && p.playerId !== player2.playerId
    );

    // 创建房间
    this.createMatchRoom(player1, player2);
  }

  /**
   * 创建匹配房间
   */
  private createMatchRoom(player1: MatchmakingPlayer, player2: MatchmakingPlayer): void {
    const roomId = `room_${++this.roomIdCounter}`;

    const room: Room = {
      roomId,
      roomName: `对战房间 ${roomId}`,
      ownerId: player1.playerId,
      players: [], // 稍后添加
      maxPlayers: 2,
      roomType: 'pvp',
      status: 'waiting',
      createdAt: Date.now(),
    };

    // 查找玩家对象
    const p1 = this.players.get(player1.playerId);
    const p2 = this.players.get(player2.playerId);

    if (p1) {
      room.players.push(p1);
      p1.roomId = roomId;
    }
    if (p2) {
      room.players.push(p2);
      p2.roomId = roomId;
    }

    if (room.players.length < 2) {
      console.warn('[WebSocketServer] 匹配玩家已断开连接');
      return;
    }

    this.rooms.set(roomId, room);

    console.log(`[WebSocketServer] 匹配成功: ${player1.playerName} vs ${player2.playerName}`);

    // 通知双方匹配成功
    for (const player of room.players) {
      this.sendToPlayer(player, {
        type: ServerMessageType.MATCH_FOUND,
        data: {
          room: this.getPublicRoomInfo(room),
          opponent: room.players.find(p => p.playerId !== player.playerId)?.playerName,
        },
      });
    }

    // 开始游戏
    setTimeout(() => {
      this.startGame(room);
    }, 3000); // 3 秒后开始游戏
  }

  /**
   * 开始游戏
   */
  private startGame(room: Room): void {
    room.status = 'in_progress';

    console.log(`[WebSocketServer] 游戏开始: ${room.roomId}`);

    // 通知房间内所有玩家
    this.broadcastToRoom(room, {
      type: ServerMessageType.BATTLE_START,
      data: {
        roomId: room.roomId,
        players: room.players.map(p => ({
          playerId: p.playerId,
          playerName: p.playerName,
        })),
      },
    });

    this.emit(ServerEventType.BATTLE_START, room);
  }

  /**
   * 发送消息给玩家
   */
  private sendToPlayer(player: Player, message: any): void {
    this.sendToSocket(player.socket, message);
  }

  /**
   * 发送消息给 WebSocket 连接
   */
  private sendToSocket(socket: WebSocket, message: any): void {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }

  /**
   * 广播消息给房间内所有玩家
   */
  private broadcastToRoom(room: Room, message: any, exclude?: Player): void {
    for (const player of room.players) {
      if (player !== exclude && player.isConnected) {
        this.sendToPlayer(player, message);
      }
    }
  }

  /**
   * 广播房间列表
   */
  private broadcastRoomList(): void {
    const roomList = this.getPublicRoomList();
    const message = {
      type: ServerMessageType.ROOM_LIST,
      data: roomList,
    };

    for (const player of this.players.values()) {
      if (!player.roomId && player.isConnected) {
        this.sendToPlayer(player, message);
      }
    }
  }

  /**
   * 发送错误消息
   */
  private sendError(player: Player, message: string): void {
    this.sendToPlayer(player, {
      type: ServerMessageType.ERROR,
      data: {
        message,
      },
    });
  }

  /**
   * 获取公开的房间信息
   */
  private getPublicRoomInfo(room: Room): any {
    return {
      roomId: room.roomId,
      roomName: room.roomName,
      ownerId: room.ownerId,
      playerCount: room.players.length,
      maxPlayers: room.maxPlayers,
      roomType: room.roomType,
      status: room.status,
      players: room.players.map(p => ({
        playerId: p.playerId,
        playerName: p.playerName,
      })),
    };
  }

  /**
   * 获取公开的房间列表
   */
  private getPublicRoomList(): any[] {
    return Array.from(this.rooms.values())
      .filter(room => room.status === 'waiting')
      .map(room => this.getPublicRoomInfo(room));
  }

  /**
   * 添加事件监听器
   */
  on(event: ServerEventType, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  /**
   * 移除事件监听器
   */
  off(event: ServerEventType, listener: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * 触发事件
   */
  private emit(event: ServerEventType, ...args: any[]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(...args);
        } catch (error) {
          console.error(`[WebSocketServer] 事件监听器错误 (${event}):`, error);
        }
      }
    }
  }

  /**
   * 获取服务器统计信息
   */
  getStats(): any {
    return {
      onlinePlayers: this.players.size,
      activeRooms: this.rooms.size,
      matchmakingPlayers: this.matchmakingQueue.length,
      roomsByStatus: {
        waiting: Array.from(this.rooms.values()).filter(r => r.status === 'waiting').length,
        in_progress: Array.from(this.rooms.values()).filter(r => r.status === 'in_progress').length,
        ended: Array.from(this.rooms.values()).filter(r => r.status === 'ended').length,
      },
    };
  }
}

/**
 * 导出服务器单例
 */
export const webSocketServer = new WebSocketServer();
