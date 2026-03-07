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

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { WebSocketServer, MessageType, WSMessage, ClientInfo } from './WebSocketServer';
import { createHash, randomBytes } from 'crypto';

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
export class AuthManager {
  private static instance: AuthManager;

  /** 玩家数据列表（用户名 -> 玩家数据） */
  private players: Map<string, PlayerData> = new Map();

  /** 用户 ID 映射（用户 ID -> 用户名） */
  private userIdToUsername: Map<string, string> = new Map();

  /** 会话数据列表（会话 ID -> 会话数据） */
  private sessions: Map<string, SessionData> = new Map();

  /** 用户会话映射（用户 ID -> 会话 ID） */
  private userSessions: Map<string, string> = new Map();

  /** WebSocket 服务器实例 */
  private wsServer: WebSocketServer | null = null;

  /** 配置 */
  private config: AuthManagerConfig;

  /** 会话清理定时器 */
  private sessionCleanupTimer: NodeJS.Timeout | null = null;

  /**
   * 私有构造函数，确保单例
   */
  private constructor(config?: Partial<AuthManagerConfig>) {
    this.config = {
      dataDir: config?.dataDir || join(process.cwd(), 'data'),
      playersFile: config?.playersFile || 'players.json',
      sessionsFile: config?.sessionsFile || 'sessions.json',
      sessionTTL: config?.sessionTTL || 7 * 24 * 60 * 60 * 1000, // 默认 7 天
      hashAlgorithm: config?.hashAlgorithm || 'sha256',
      sessionIdLength: config?.sessionIdLength || 32,
    };

    // 初始化数据目录
    this.initDataDir();

    // 加载数据
    this.loadData();
  }

  /**
   * 获取单例实例
   */
  static getInstance(config?: Partial<AuthManagerConfig>): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager(config);
    }
    return AuthManager.instance;
  }

  /**
   * 初始化数据目录
   */
  private initDataDir(): void {
    if (!existsSync(this.config.dataDir)) {
      mkdirSync(this.config.dataDir, { recursive: true });
      console.log(`[AuthManager] Data directory created: ${this.config.dataDir}`);
    }
  }

  /**
   * 加载数据
   */
  private loadData(): void {
    // 加载玩家数据
    const playersPath = join(this.config.dataDir, this.config.playersFile);
    if (existsSync(playersPath)) {
      try {
        const data = readFileSync(playersPath, 'utf-8');
        const playersArray: PlayerData[] = JSON.parse(data);
        for (const player of playersArray) {
          this.players.set(player.username, player);
          this.userIdToUsername.set(player.userId, player.username);
        }
        console.log(`[AuthManager] Loaded ${this.players.size} players`);
      } catch (error) {
        console.error('[AuthManager] Failed to load players:', error);
      }
    }

    // 加载会话数据
    const sessionsPath = join(this.config.dataDir, this.config.sessionsFile);
    if (existsSync(sessionsPath)) {
      try {
        const data = readFileSync(sessionsPath, 'utf-8');
        const sessionsArray: SessionData[] = JSON.parse(data);
        const now = Date.now();
        for (const session of sessionsArray) {
          // 过滤过期会话
          if (session.expiresAt > now) {
            this.sessions.set(session.sessionId, session);
            this.userSessions.set(session.userId, session.sessionId);
          }
        }
        console.log(`[AuthManager] Loaded ${this.sessions.size} sessions`);
      } catch (error) {
        console.error('[AuthManager] Failed to load sessions:', error);
      }
    }
  }

  /**
   * 保存数据
   */
  private saveData(): void {
    // 保存玩家数据
    const playersPath = join(this.config.dataDir, this.config.playersFile);
    const playersArray = Array.from(this.players.values());
    writeFileSync(playersPath, JSON.stringify(playersArray, null, 2), 'utf-8');

    // 保存会话数据
    const sessionsPath = join(this.config.dataDir, this.config.sessionsFile);
    const sessionsArray = Array.from(this.sessions.values());
    writeFileSync(sessionsPath, JSON.stringify(sessionsArray, null, 2), 'utf-8');
  }

  /**
   * 生成用户 ID
   */
  private generateUserId(): string {
    return `user_${Date.now()}_${randomBytes(8).toString('hex')}`;
  }

  /**
   * 生成会话 ID
   */
  private generateSessionId(): string {
    return randomBytes(this.config.sessionIdLength).toString('hex');
  }

  /**
   * 哈希密码
   */
  private hashPassword(password: string, salt?: string): { hash: string; salt: string } {
    const actualSalt = salt || randomBytes(16).toString('hex');
    const hash = createHash(this.config.hashAlgorithm)
      .update(password + actualSalt)
      .digest('hex');
    return { hash, salt: actualSalt };
  }

  /**
   * 验证密码
   */
  private verifyPassword(password: string, hash: string, salt: string): boolean {
    const computedHash = createHash(this.config.hashAlgorithm)
      .update(password + salt)
      .digest('hex');
    return computedHash === hash;
  }

  /**
   * 玩家注册
   */
  register(username: string, password: string): RegisterResult {
    // 验证用户名
    if (!username || username.length < 3) {
      return { success: false, error: '用户名长度至少为 3 个字符' };
    }
    if (!username.match(/^[a-zA-Z0-9_]+$/)) {
      return { success: false, error: '用户名只能包含字母、数字和下划线' };
    }
    if (this.players.has(username)) {
      return { success: false, error: '用户名已存在' };
    }

    // 验证密码
    if (!password || password.length < 6) {
      return { success: false, error: '密码长度至少为 6 个字符' };
    }

    // 创建玩家数据
    const { hash, salt } = this.hashPassword(password);
    const player: PlayerData = {
      userId: this.generateUserId(),
      username,
      passwordHash: `${salt}:${hash}`, // 存储 salt 和 hash
      createdAt: Date.now(),
      lastLoginAt: 0,
      gameData: {
        level: 1,
        exp: 0,
        party: [],
      },
    };

    // 保存到内存
    this.players.set(username, player);
    this.userIdToUsername.set(player.userId, username);

    // 保存到文件
    this.saveData();

    console.log(`[AuthManager] Player registered: ${username}`);
    return { success: true, player };
  }

  /**
   * 玩家登录
   */
  login(username: string, password: string): LoginResult {
    // 验证用户名和密码
    const player = this.players.get(username);
    if (!player) {
      return { success: false, error: '用户名或密码错误' };
    }

    // 验证密码
    const [salt, hash] = player.passwordHash.split(':');
    if (!this.verifyPassword(password, hash, salt)) {
      return { success: false, error: '用户名或密码错误' };
    }

    // 检查是否已有活跃会话
    const existingSessionId = this.userSessions.get(player.userId);
    if (existingSessionId) {
      const existingSession = this.sessions.get(existingSessionId);
      if (existingSession && existingSession.expiresAt > Date.now()) {
        // 返回现有会话
        existingSession.lastActive = Date.now();
        this.saveData();
        console.log(`[AuthManager] Player logged in (existing session): ${username}`);
        return { success: true, session: existingSession, player };
      }
    }

    // 创建新会话
    const session: SessionData = {
      sessionId: this.generateSessionId(),
      userId: player.userId,
      username: player.username,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.config.sessionTTL,
      lastActive: Date.now(),
    };

    // 保存会话
    this.sessions.set(session.sessionId, session);
    this.userSessions.set(player.userId, session.sessionId);

    // 更新玩家最后登录时间
    player.lastLoginAt = Date.now();

    // 保存到文件
    this.saveData();

    console.log(`[AuthManager] Player logged in: ${username}`);
    return { success: true, session, player };
  }

  /**
   * 验证会话
   */
  verifySession(sessionId: string): VerifyResult {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { valid: false, error: '会话不存在' };
    }

    // 检查会话是否过期
    if (session.expiresAt < Date.now()) {
      this.sessions.delete(sessionId);
      this.userSessions.delete(session.userId);
      this.saveData();
      return { valid: false, error: '会话已过期' };
    }

    // 更新最后活跃时间
    session.lastActive = Date.now();
    this.saveData();

    // 获取玩家数据
    const player = this.players.get(session.username);
    if (!player) {
      return { valid: false, error: '玩家不存在' };
    }

    return { valid: true, session, player };
  }

  /**
   * 登出
   */
  logout(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    // 删除会话
    this.sessions.delete(sessionId);
    this.userSessions.delete(session.userId);

    // 保存到文件
    this.saveData();

    console.log(`[AuthManager] Player logged out: ${session.username}`);
    return true;
  }

  /**
   * 获取玩家数据
   */
  getPlayer(username: string): PlayerData | undefined {
    return this.players.get(username);
  }

  /**
   * 获取玩家数据（通过用户 ID）
   */
  getPlayerByUserId(userId: string): PlayerData | undefined {
    const username = this.userIdToUsername.get(userId);
    if (!username) {
      return undefined;
    }
    return this.players.get(username);
  }

  /**
   * 更新玩家数据
   */
  updatePlayer(username: string, updates: Partial<PlayerData>): boolean {
    const player = this.players.get(username);
    if (!player) {
      return false;
    }

    Object.assign(player, updates);
    this.saveData();

    console.log(`[AuthManager] Player data updated: ${username}`);
    return true;
  }

  /**
   * 修改密码
   */
  changePassword(username: string, oldPassword: string, newPassword: string): boolean {
    const player = this.players.get(username);
    if (!player) {
      return false;
    }

    // 验证旧密码
    const [salt, hash] = player.passwordHash.split(':');
    if (!this.verifyPassword(oldPassword, hash, salt)) {
      return false;
    }

    // 验证新密码
    if (!newPassword || newPassword.length < 6) {
      return false;
    }

    // 更新密码
    const { hash: newHash, salt: newSalt } = this.hashPassword(newPassword);
    player.passwordHash = `${newSalt}:${newHash}`;

    // 保存到文件
    this.saveData();

    console.log(`[AuthManager] Password changed: ${username}`);
    return true;
  }

  /**
   * 删除玩家
   */
  deletePlayer(username: string): boolean {
    const player = this.players.get(username);
    if (!player) {
      return false;
    }

    // 删除所有会话
    const sessionId = this.userSessions.get(player.userId);
    if (sessionId) {
      this.sessions.delete(sessionId);
    }
    this.userSessions.delete(player.userId);

    // 删除玩家
    this.players.delete(username);
    this.userIdToUsername.delete(player.userId);

    // 保存到文件
    this.saveData();

    console.log(`[AuthManager] Player deleted: ${username}`);
    return true;
  }

  /**
   * 清理过期会话
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions) {
      if (session.expiresAt < now) {
        expiredSessions.push(sessionId);
        this.userSessions.delete(session.userId);
      }
    }

    for (const sessionId of expiredSessions) {
      this.sessions.delete(sessionId);
    }

    if (expiredSessions.length > 0) {
      this.saveData();
      console.log(`[AuthManager] Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }

  /**
   * 启动会话清理定时器
   */
  startSessionCleanup(interval: number = 60 * 60 * 1000): void {
    if (this.sessionCleanupTimer) {
      return;
    }

    this.sessionCleanupTimer = setInterval(() => {
      this.cleanupExpiredSessions();
    }, interval);

    console.log(`[AuthManager] Session cleanup started (interval: ${interval}ms)`);
  }

  /**
   * 停止会话清理定时器
   */
  stopSessionCleanup(): void {
    if (this.sessionCleanupTimer) {
      clearInterval(this.sessionCleanupTimer);
      this.sessionCleanupTimer = null;
      console.log('[AuthManager] Session cleanup stopped');
    }
  }

  /**
   * 集成 WebSocket 服务器
   */
  integrateWithWebSocketServer(wsServer: WebSocketServer): void {
    this.wsServer = wsServer;

    // 注册认证消息处理器
    wsServer.onMessage(MessageType.AUTH, async (client: ClientInfo, message: WSMessage) => {
      await this.handleAuthMessage(client, message);
    });

    console.log('[AuthManager] Integrated with WebSocket server');
  }

  /**
   * 处理认证消息
   */
  private async handleAuthMessage(client: ClientInfo, message: WSMessage): Promise<void> {
    if (!message.data) {
      wsServer?.sendError(client, 'Invalid auth message: missing data');
      return;
    }

    const { action, username, password, sessionId } = message.data;

    switch (action) {
      case 'register': {
        const result = this.register(username, password);
        if (result.success) {
          wsServer?.sendMessage(client, {
            type: MessageType.AUTH_ACK,
            messageId: message.messageId,
            data: {
              action: 'register',
              success: true,
              player: {
                userId: result.player?.userId,
                username: result.player?.username,
              },
            },
          });
        } else {
          wsServer?.sendMessage(client, {
            type: MessageType.AUTH_ACK,
            messageId: message.messageId,
            data: {
              action: 'register',
              success: false,
              error: result.error,
            },
          });
        }
        break;
      }

      case 'login': {
        const result = this.login(username, password);
        if (result.success) {
          // 设置客户端认证信息
          wsServer?.setClientAuth(client, result.player!.userId, result.player!.username);

          wsServer?.sendMessage(client, {
            type: MessageType.AUTH_ACK,
            messageId: message.messageId,
            data: {
              action: 'login',
              success: true,
              session: result.session,
              player: {
                userId: result.player?.userId,
                username: result.player?.username,
                gameData: result.player?.gameData,
              },
            },
          });
        } else {
          wsServer?.sendMessage(client, {
            type: MessageType.AUTH_ACK,
            messageId: message.messageId,
            data: {
              action: 'login',
              success: false,
              error: result.error,
            },
          });
        }
        break;
      }

      case 'verify': {
        const result = this.verifySession(sessionId);
        if (result.valid) {
          // 设置客户端认证信息
          wsServer?.setClientAuth(client, result.player!.userId, result.player!.username);

          wsServer?.sendMessage(client, {
            type: MessageType.AUTH_ACK,
            messageId: message.messageId,
            data: {
              action: 'verify',
              success: true,
              player: {
                userId: result.player?.userId,
                username: result.player?.username,
                gameData: result.player?.gameData,
              },
            },
          });
        } else {
          wsServer?.sendMessage(client, {
            type: MessageType.AUTH_ACK,
            messageId: message.messageId,
            data: {
              action: 'verify',
              success: false,
              error: result.error,
            },
          });
        }
        break;
      }

      case 'logout': {
        const success = this.logout(sessionId || client.username || '');
        if (success) {
          client.authenticated = false;
          client.userId = undefined;
          client.username = undefined;
        }

        wsServer?.sendMessage(client, {
          type: MessageType.AUTH_ACK,
          messageId: message.messageId,
          data: {
            action: 'logout',
            success,
          },
        });
        break;
      }

      default:
        wsServer?.sendError(client, `Unknown auth action: ${action}`);
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    playerCount: number;
    sessionCount: number;
    activeSessionCount: number;
  } {
    const now = Date.now();
    const activeSessions = Array.from(this.sessions.values()).filter(
      s => s.expiresAt > now && now - s.lastActive < 30 * 60 * 1000 // 30 分钟内活跃
    );

    return {
      playerCount: this.players.size,
      sessionCount: this.sessions.size,
      activeSessionCount: activeSessions.length,
    };
  }
}

/**
 * 导出认证管理器单例
 */
export const authManager = AuthManager.getInstance();
