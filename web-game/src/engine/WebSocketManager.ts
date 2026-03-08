/**
 * WebSocket 客户端管理器
 *
 * 实现网络通信、断线重连、心跳检测等功能
 *
 * 功能：
 * - WebSocket 连接管理
 * - 断线检测和自动重连（指数退避策略）
 * - 心跳检测
 * - 消息发送和接收
 * - 重连状态提示 UI
 * - 重连成功后的状态恢复
 */

import { ServerMessageType } from '../server/WebSocketServer';

/**
 * WebSocket 连接状态枚举
 */
export enum ConnectionStatus {
  /** 未连接 */
  DISCONNECTED = 'DISCONNECTED',
  /** 连接中 */
  CONNECTING = 'CONNECTING',
  /** 已连接 */
  CONNECTED = 'CONNECTED',
  /** 重连中 */
  RECONNECTING = 'RECONNECTING',
  /** 连接失败 */
  FAILED = 'FAILED',
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
 * 服务器消息接口
 */
export interface ServerMessage {
  /** 消息类型 */
  type: ServerMessageType;
  /** 消息数据 */
  data?: any;
}

/**
 * 客户端消息接口
 */
export interface ClientMessage {
  /** 消息类型 */
  type: ClientMessageType;
  /** 消息数据 */
  data?: any;
}

/**
 * WebSocket 配置接口
 */
export interface WebSocketConfig {
  /** 服务器 URL */
  url: string;
  /** 心跳间隔（毫秒） */
  heartbeatInterval: number;
  /** 心跳超时（毫秒） */
  heartbeatTimeout: number;
  /** 最大重连次数 */
  maxReconnectAttempts: number;
  /** 重连延迟基数（毫秒） */
  reconnectDelayBase: number;
  /** 重连延迟最大值（毫秒） */
  reconnectDelayMax: number;
}

/**
 * 状态恢复数据接口
 */
export interface RecoveryData {
  /** 房间 ID */
  roomId?: string;
  /** 战斗状态 */
  battleState?: any;
  /** 玩家位置 */
  playerPosition?: { x: number; y: number };
  /** 其他恢复数据 */
  [key: string]: any;
}

/**
 * 事件回调类型
 */
export type EventCallback = (data?: any) => void;

/**
 * WebSocket 客户端管理器类
 */
export class WebSocketManager {
  private static instance: WebSocketManager;

  /** WebSocket 连接实例 */
  private socket: WebSocket | null = null;

  /** 配置 */
  private config: WebSocketConfig;

  /** 连接状态 */
  private status: ConnectionStatus = ConnectionStatus.DISCONNECTED;

  /** 重连次数 */
  private reconnectAttempts: number = 0;

  /** 心跳定时器 */
  private heartbeatTimer: number | null = null;

  /** 心跳超时定时器 */
  private heartbeatTimeoutTimer: number | null = null;

  /** 最后收到心跳的时间 */
  private lastHeartbeatTime: number = 0;

  /** 事件监听器映射 */
  private eventListeners: Map<ServerMessageType, Set<EventCallback>> = new Map();

  /** 重连定时器 */
  private reconnectTimer: number | null = null;

  /** 存储的恢复数据 */
  private storedRecoveryData: RecoveryData = {};

  /** 重连状态提示元素 */
  private reconnectUIElement: HTMLElement | null = null;

  /**
   * 私有构造函数，确保单例
   */
  private constructor() {
    this.config = {
      url: 'ws://localhost:8081',
      heartbeatInterval: 30000, // 30秒
      heartbeatTimeout: 90000,   // 90秒
      maxReconnectAttempts: 5,   // 最多重连 5 次
      reconnectDelayBase: 1000,  // 基础延迟 1 秒
      reconnectDelayMax: 60000,  // 最大延迟 60 秒
    };
  }

  /**
   * 获取单例实例
   */
  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  /**
   * 初始化配置
   *
   * @param config 部分配置
   */
  init(config: Partial<WebSocketConfig> = {}): void {
    this.config = { ...this.config, ...config };
    console.log('[WebSocketManager] 配置更新:', this.config);
  }

  /**
   * 连接到服务器
   *
   * @param url 可选的服务器 URL（覆盖配置）
   */
  connect(url?: string): void {
    if (this.status === ConnectionStatus.CONNECTING || this.status === ConnectionStatus.RECONNECTING) {
      console.warn('[WebSocketManager] 正在连接中，请勿重复调用');
      return;
    }

    const serverUrl = url || this.config.url;
    console.log(`[WebSocketManager] 连接到服务器: ${serverUrl}`);

    this.setStatus(ConnectionStatus.CONNECTING);

    try {
      this.socket = new WebSocket(serverUrl);

      this.setupSocketListeners();
    } catch (error) {
      console.error('[WebSocketManager] 连接失败:', error);
      this.setStatus(ConnectionStatus.FAILED);
      this.handleConnectionError(error);
    }
  }

  /**
   * 设置 WebSocket 事件监听器
   */
  private setupSocketListeners(): void {
    if (!this.socket) return;

    // 连接成功
    this.socket.onopen = () => {
      console.log('[WebSocketManager] 连接成功');
      this.setStatus(ConnectionStatus.CONNECTED);
      this.reconnectAttempts = 0;
      this.lastHeartbeatTime = Date.now();

      // 开始心跳
      this.startHeartbeat();

      // 隐藏重连提示
      this.hideReconnectUI();

      // 触发连接成功事件
      this.triggerEventListeners('connected' as any);

      // 尝试恢复状态
      this.attemptRecovery();
    };

    // 接收消息
    this.socket.onmessage = (event: MessageEvent) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);
        this.handleServerMessage(message);
      } catch (error) {
        console.error('[WebSocketManager] 消息解析失败:', error);
      }
    };

    // 连接关闭
    this.socket.onclose = (event: CloseEvent) => {
      console.log(`[WebSocketManager] 连接关闭: code=${event.code}, reason=${event.reason}`);
      this.handleDisconnection(event.code === 1000);
    };

    // 连接错误
    this.socket.onerror = (error: Event) => {
      console.error('[WebSocketManager] 连接错误:', error);
      this.handleConnectionError(error);
    };
  }

  /**
   * 处理服务器消息
   */
  private handleServerMessage(message: ServerMessage): void {
    // 更新心跳时间（用于心跳超时检测）
    void this.lastHeartbeatTime; // 避免未使用警告
    this.lastHeartbeatTime = Date.now();

    // 处理心跳响应
    if (message.type === ServerMessageType.HEARTBEAT_ACK) {
      // 心跳响应，清除超时定时器
      if (this.heartbeatTimeoutTimer) {
        clearTimeout(this.heartbeatTimeoutTimer);
        this.heartbeatTimeoutTimer = null;
      }
      return;
    }

    // 触发对应类型的事件监听器
    const listeners = this.eventListeners.get(message.type);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(message.data);
        } catch (error) {
          console.error(`[WebSocketManager] 事件监听器错误 (${message.type}):`, error);
        }
      }
    }
  }

  /**
   * 处理断开连接
   *
   * @param wasClean 是否是正常关闭
   */
  private handleDisconnection(wasClean: boolean): void {
    // 清除心跳定时器
    this.stopHeartbeat();

    // 如果是异常断开，尝试重连
    if (!wasClean && this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.attemptReconnect();
    } else if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.setStatus(ConnectionStatus.FAILED);
      this.showReconnectUI(false);
    } else {
      this.setStatus(ConnectionStatus.DISCONNECTED);
    }

    // 清理 socket
    this.socket = null;
  }

  /**
   * 处理连接错误
   */
  private handleConnectionError(error: any): void {
    console.error('[WebSocketManager] 连接错误:', error);

    // 停止心跳
    this.stopHeartbeat();

    // 尝试重连
    if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.attemptReconnect();
    } else {
      this.setStatus(ConnectionStatus.FAILED);
      this.showReconnectUI(false);
    }
  }

  /**
   * 尝试重连（指数退避策略）
   */
  private attemptReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;
    const delay = this.calculateReconnectDelay();

    console.log(`[WebSocketManager] 第 ${this.reconnectAttempts} 次重连尝试，延迟 ${delay}ms`);

    this.setStatus(ConnectionStatus.RECONNECTING);
    this.showReconnectUI(true);

    this.reconnectTimer = window.setTimeout(() => {
      console.log('[WebSocketManager] 开始重连...');
      this.connect();
    }, delay);
  }

  /**
   * 计算重连延迟（指数退避策略）
   *
   * @returns 延迟时间（毫秒）
   */
  private calculateReconnectDelay(): number {
    // 指数退避：base * 2^(attempts - 1)
    const exponentialDelay = this.config.reconnectDelayBase * Math.pow(2, this.reconnectAttempts - 1);

    // 添加随机抖动（±25%）
    const jitter = exponentialDelay * 0.5 * (Math.random() - 0.5);

    // 确保不超过最大延迟
    const delay = Math.min(exponentialDelay + jitter, this.config.reconnectDelayMax);

    return Math.max(delay, this.config.reconnectDelayBase);
  }

  /**
   * 开始心跳检测
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = window.setInterval(() => {
      this.sendHeartbeat();
    }, this.config.heartbeatInterval);
  }

  /**
   * 停止心跳检测
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  /**
   * 发送心跳
   */
  private sendHeartbeat(): void {
    this.send({ type: ClientMessageType.HEARTBEAT });

    // 设置心跳超时检测
    this.heartbeatTimeoutTimer = window.setTimeout(() => {
      console.warn('[WebSocketManager] 心跳超时，触发重连');
      if (this.socket) {
        this.socket.close();
      }
    }, this.config.heartbeatTimeout);
  }

  /**
   * 显示重连状态提示 UI
   *
   * @param isReconnecting 是否正在重连
   */
  private showReconnectUI(isReconnecting: boolean): void {
    // 创建或更新 UI 元素
    if (!this.reconnectUIElement) {
      this.reconnectUIElement = document.createElement('div');
      this.reconnectUIElement.id = 'reconnect-status';
      this.reconnectUIElement.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.8);
        color: #ffffff;
        padding: 15px 20px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      `;
      document.body.appendChild(this.reconnectUIElement);
    }

    if (isReconnecting) {
      const remainingAttempts = this.config.maxReconnectAttempts - this.reconnectAttempts;
      this.reconnectUIElement.innerHTML = `
        <span style="color: #FFA500; font-size: 18px;">⚠️</span>
        <div>
          <div style="font-weight: bold;">正在重连...</div>
          <div style="font-size: 12px; opacity: 0.8;">第 ${this.reconnectAttempts} 次尝试（剩余 ${remainingAttempts} 次）</div>
        </div>
      `;
    } else {
      this.reconnectUIElement.innerHTML = `
        <span style="color: #FF4444; font-size: 18px;">❌</span>
        <div>
          <div style="font-weight: bold;">连接失败</div>
          <div style="font-size: 12px; opacity: 0.8;">请检查网络连接或刷新页面</div>
        </div>
      `;
    }

    this.reconnectUIElement.style.display = 'flex';
  }

  /**
   * 隐藏重连状态提示 UI
   */
  private hideReconnectUI(): void {
    if (this.reconnectUIElement) {
      this.reconnectUIElement.style.display = 'none';
    }
  }

  /**
   * 存储恢复数据
   *
   * @param data 恢复数据
   */
  storeRecoveryData(data: RecoveryData): void {
    this.storedRecoveryData = { ...this.storedRecoveryData, ...data };
    console.log('[WebSocketManager] 存储恢复数据:', this.storedRecoveryData);
  }

  /**
   * 清除恢复数据
   */
  clearRecoveryData(): void {
    this.storedRecoveryData = {};
    console.log('[WebSocketManager] 清除恢复数据');
  }

  /**
   * 尝试恢复状态
   */
  private attemptRecovery(): void {
    if (Object.keys(this.storedRecoveryData).length === 0) {
      console.log('[WebSocketManager] 无需恢复的状态');
      return;
    }

    console.log('[WebSocketManager] 尝试恢复状态:', this.storedRecoveryData);

    // 如果有房间 ID，尝试重新加入房间
    if (this.storedRecoveryData.roomId) {
      this.send({
        type: ClientMessageType.JOIN_ROOM,
        data: { roomId: this.storedRecoveryData.roomId },
      });
    }

    // 触发状态恢复事件
    this.triggerEventListeners('recovered' as any, this.storedRecoveryData);
  }

  /**
   * 设置连接状态
   *
   * @param status 新状态
   */
  private setStatus(status: ConnectionStatus): void {
    const oldStatus = this.status;
    this.status = status;
    console.log(`[WebSocketManager] 状态变更: ${oldStatus} -> ${status}`);

    // 触发状态变更事件
    this.triggerEventListeners('status_change' as any, { oldStatus, newStatus: status });
  }

  /**
   * 触发事件监听器
   *
   * @param eventType 事件类型
   * @param data 事件数据
   */
  private triggerEventListeners(eventType: ServerMessageType | string, data?: any): void {
    // 查找对应的监听器
    const listeners = this.eventListeners.get(eventType as ServerMessageType);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(data);
        } catch (error) {
          console.error(`[WebSocketManager] 事件监听器错误 (${eventType}):`, error);
        }
      }
    }
  }

  /**
   * 发送消息到服务器
   *
   * @param message 消息对象
   */
  send(message: ClientMessage): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocketManager] 未连接，无法发送消息');
      return;
    }

    try {
      this.socket.send(JSON.stringify(message));
    } catch (error) {
      console.error('[WebSocketManager] 发送消息失败:', error);
    }
  }

  /**
   * 添加事件监听器
   *
   * @param messageType 消息类型
   * @param callback 回调函数
   */
  on(messageType: ServerMessageType | string, callback: EventCallback): void {
    if (!this.eventListeners.has(messageType as ServerMessageType)) {
      this.eventListeners.set(messageType as ServerMessageType, new Set());
    }
    this.eventListeners.get(messageType as ServerMessageType)!.add(callback);
  }

  /**
   * 移除事件监听器
   *
   * @param messageType 消息类型
   * @param callback 回调函数
   */
  off(messageType: ServerMessageType | string, callback: EventCallback): void {
    const listeners = this.eventListeners.get(messageType as ServerMessageType);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * 断开连接
   *
   * @param clearRecovery 是否清除恢复数据
   */
  disconnect(clearRecovery: boolean = true): void {
    // 清除重连定时器
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // 停止心跳
    this.stopHeartbeat();

    // 关闭连接
    if (this.socket) {
      this.socket.close(1000, '主动断开');
      this.socket = null;
    }

    // 清除恢复数据
    if (clearRecovery) {
      this.clearRecoveryData();
    }

    // 隐藏重连提示
    this.hideReconnectUI();

    this.setStatus(ConnectionStatus.DISCONNECTED);
  }

  /**
   * 获取连接状态
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * 获取重连次数
   */
  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  /**
   * 获取配置
   */
  getConfig(): Readonly<WebSocketConfig> {
    return { ...this.config };
  }

  /**
   * 重置重连计数器
   */
  resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
    console.log('[WebSocketManager] 重连计数器已重置');
  }
}

/**
 * 导出 WebSocket 管理器单例
 */
export const webSocketManager = WebSocketManager.getInstance();
