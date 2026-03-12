/**
 * WebSocket 服务器基础架构
 *
 * 功能：
 * - 客户端连接/断开处理
 * - 消息路由系统
 * - 心跳检测（连接保活）
 * - 房间系统（对战房间）
 */
import { WebSocket } from 'ws';
/**
 * 消息类型枚举
 */
export declare enum MessageType {
    /** 心跳包 */
    HEARTBEAT = "heartbeat",
    /** 心跳响应 */
    HEARTBEAT_ACK = "heartbeat_ack",
    /** 连接请求 */
    CONNECT = "connect",
    /** 连接响应 */
    CONNECT_ACK = "connect_ack",
    /** 认证请求 */
    AUTH = "auth",
    /** 认证响应 */
    AUTH_ACK = "auth_ack",
    /** 加入房间请求 */
    JOIN_ROOM = "join_room",
    /** 加入房间响应 */
    JOIN_ROOM_ACK = "join_room_ack",
    /** 离开房间请求 */
    LEAVE_ROOM = "leave_room",
    /** 离开房间响应 */
    LEAVE_ROOM_ACK = "leave_room_ack",
    /** 房间消息 */
    ROOM_MESSAGE = "room_message",
    /** 错误消息 */
    ERROR = "error"
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
export declare class WebSocketServer {
    private static instance;
    /** WebSocket 服务器实例 */
    private wss;
    /** 客户端列表（连接 ID -> 客户端信息） */
    private clients;
    /** 房间列表（房间 ID -> 房间信息） */
    private rooms;
    /** 用户 ID 到连接 ID 的映射 */
    private userIdToConnectionId;
    /** 消息处理器（消息类型 -> 处理函数） */
    private messageHandlers;
    /** 连接 ID 计数器 */
    private connectionIdCounter;
    /** 心跳检测定时器 */
    private heartbeatTimer;
    /** 服务器配置 */
    private config;
    /**
     * 私有构造函数，确保单例
     */
    private constructor();
    /**
     * 获取单例实例
     */
    static getInstance(config?: Partial<WSServerConfig>): WebSocketServer;
    /**
     * 启动 WebSocket 服务器
     */
    start(): void;
    /**
     * 停止 WebSocket 服务器
     */
    stop(): void;
    /**
     * 处理客户端连接
     */
    private handleConnection;
    /**
     * 处理客户端断开连接
     */
    private handleDisconnection;
    /**
     * 处理客户端消息
     */
    private handleMessage;
    /**
     * 处理消息路由
     */
    private processMessage;
    /**
     * 注册消息处理器
     */
    onMessage(type: MessageType, handler: MessageHandler): void;
    /**
     * 移除消息处理器
     */
    offMessage(type: MessageType): void;
    /**
     * 触发消息处理器
     */
    private triggerMessageHandler;
    /**
     * 发送消息到客户端
     */
    sendMessage(client: ClientInfo, message: WSMessage): boolean;
    /**
     * 发送错误消息到客户端
     */
    sendError(client: ClientInfo, error: string): void;
    /**
     * 广播消息到所有客户端
     */
    broadcast(message: WSMessage, excludeClientIds?: string[]): void;
    /**
     * 创建房间
     */
    createRoom(roomId: string, roomName: string, roomType?: string, data?: any): RoomInfo;
    /**
     * 删除房间
     */
    deleteRoom(roomId: string): boolean;
    /**
     * 客户端加入房间
     */
    joinRoom(client: ClientInfo, roomId: string): boolean;
    /**
     * 客户端离开房间
     */
    leaveRoom(client: ClientInfo, roomId: string, silent?: boolean): boolean;
    /**
     * 发送消息到房间内的所有客户端
     */
    broadcastToRoom(roomId: string, message: WSMessage, excludeClientIds?: string[]): void;
    /**
     * 启动心跳检测
     */
    private startHeartbeatCheck;
    /**
     * 停止心跳检测
     */
    private stopHeartbeatCheck;
    /**
     * 生成连接 ID
     */
    private generateConnectionId;
    /**
     * 根据用户 ID 获取客户端信息
     */
    getClientByUserId(userId: string): ClientInfo | undefined;
    /**
     * 根据连接 ID 获取客户端信息
     */
    getClient(connectionId: string): ClientInfo | undefined;
    /**
     * 获取所有客户端
     */
    getAllClients(): ClientInfo[];
    /**
     * 获取房间信息
     */
    getRoom(roomId: string): RoomInfo | undefined;
    /**
     * 获取所有房间
     */
    getAllRooms(): RoomInfo[];
    /**
     * 设置用户认证信息
     */
    setClientAuth(client: ClientInfo, userId: string, username: string): void;
    /**
     * 获取服务器状态
     */
    getServerStatus(): {
        port: number;
        clientCount: number;
        roomCount: number;
        authenticatedCount: number;
        uptime: number;
    };
}
/**
 * 导出 WebSocket 服务器单例
 */
export declare const wsServer: WebSocketServer;
/**
 * 导出消息类型枚举
 */
export { MessageType };
//# sourceMappingURL=WebSocketServer.d.ts.map