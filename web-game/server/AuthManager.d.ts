/**
 * 玩家认证管理器
 *
 * 功能：
 * - 玩家注册（用户名/密码）
 * - 玩家登录验证
 * - 会话管理（Session Token）
 * - 玩家数据持久化（JSON 文件）
 * - 与 WebSocket 服务器集成
 */
import { WebSocketServer } from './WebSocketServer';
/**
 * 玩家数据接口
 */
export interface PlayerData {
    /** 用户 ID */
    userId: string;
    /** 用户名 */
    username: string;
    /** 密码哈希 */
    passwordHash: string;
    /** 创建时间 */
    createdAt: number;
    /** 最后登录时间 */
    lastLoginAt: number;
    /** 玩家游戏数据 */
    gameData?: {
        /** 等级 */
        level: number;
        /** 经验值 */
        exp: number;
        /** 怪物队伍 */
        party: any[];
        /** 其他游戏数据 */
        [key: string]: any;
    };
}
/**
 * 会话数据接口
 */
export interface SessionData {
    /** 会话 ID */
    sessionId: string;
    /** 用户 ID */
    userId: string;
    /** 用户名 */
    username: string;
    /** 创建时间 */
    createdAt: number;
    /** 过期时间 */
    expiresAt: number;
    /** 最后活跃时间 */
    lastActive: number;
}
/**
 * 注册结果接口
 */
export interface RegisterResult {
    /** 是否成功 */
    success: boolean;
    /** 用户数据 */
    player?: PlayerData;
    /** 错误消息 */
    error?: string;
}
/**
 * 登录结果接口
 */
export interface LoginResult {
    /** 是否成功 */
    success: boolean;
    /** 会话数据 */
    session?: SessionData;
    /** 玩家数据 */
    player?: PlayerData;
    /** 错误消息 */
    error?: string;
}
/**
 * 验证结果接口
 */
export interface VerifyResult {
    /** 是否有效 */
    valid: boolean;
    /** 会话数据 */
    session?: SessionData;
    /** 玩家数据 */
    player?: PlayerData;
    /** 错误消息 */
    error?: string;
}
/**
 * 认证管理器配置接口
 */
export interface AuthManagerConfig {
    /** 数据目录 */
    dataDir: string;
    /** 玩家数据文件名 */
    playersFile: string;
    /** 会话文件名 */
    sessionsFile: string;
    /** 会话有效期（毫秒） */
    sessionTTL: number;
    /** 密码哈希算法 */
    hashAlgorithm: string;
    /** 会话 ID 长度 */
    sessionIdLength: number;
}
/**
 * 认证管理器类
 */
export declare class AuthManager {
    private static instance;
    /** 玩家数据列表（用户名 -> 玩家数据） */
    private players;
    /** 用户 ID 映射（用户 ID -> 用户名） */
    private userIdToUsername;
    /** 会话数据列表（会话 ID -> 会话数据） */
    private sessions;
    /** 用户会话映射（用户 ID -> 会话 ID） */
    private userSessions;
    /** WebSocket 服务器实例 */
    private wsServer;
    /** 配置 */
    private config;
    /** 会话清理定时器 */
    private sessionCleanupTimer;
    /**
     * 私有构造函数，确保单例
     */
    private constructor();
    /**
     * 获取单例实例
     */
    static getInstance(config?: Partial<AuthManagerConfig>): AuthManager;
    /**
     * 初始化数据目录
     */
    private initDataDir;
    /**
     * 加载数据
     */
    private loadData;
    /**
     * 保存数据
     */
    private saveData;
    /**
     * 生成用户 ID
     */
    private generateUserId;
    /**
     * 生成会话 ID
     */
    private generateSessionId;
    /**
     * 哈希密码
     */
    private hashPassword;
    /**
     * 验证密码
     */
    private verifyPassword;
    /**
     * 玩家注册
     */
    register(username: string, password: string): RegisterResult;
    /**
     * 玩家登录
     */
    login(username: string, password: string): LoginResult;
    /**
     * 验证会话
     */
    verifySession(sessionId: string): VerifyResult;
    /**
     * 登出
     */
    logout(sessionId: string): boolean;
    /**
     * 获取玩家数据
     */
    getPlayer(username: string): PlayerData | undefined;
    /**
     * 获取玩家数据（通过用户 ID）
     */
    getPlayerByUserId(userId: string): PlayerData | undefined;
    /**
     * 更新玩家数据
     */
    updatePlayer(username: string, updates: Partial<PlayerData>): boolean;
    /**
     * 修改密码
     */
    changePassword(username: string, oldPassword: string, newPassword: string): boolean;
    /**
     * 删除玩家
     */
    deletePlayer(username: string): boolean;
    /**
     * 清理过期会话
     */
    private cleanupExpiredSessions;
    /**
     * 启动会话清理定时器
     */
    startSessionCleanup(interval?: number): void;
    /**
     * 停止会话清理定时器
     */
    stopSessionCleanup(): void;
    /**
     * 集成 WebSocket 服务器
     */
    integrateWithWebSocketServer(wsServer: WebSocketServer): void;
    /**
     * 处理认证消息
     */
    private handleAuthMessage;
    /**
     * 获取统计信息
     */
    getStats(): {
        playerCount: number;
        sessionCount: number;
        activeSessionCount: number;
    };
}
/**
 * 导出认证管理器单例
 */
export declare const authManager: AuthManager;
//# sourceMappingURL=AuthManager.d.ts.map