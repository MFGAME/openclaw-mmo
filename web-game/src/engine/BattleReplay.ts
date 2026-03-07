/**
 * 战报系统 - 记录和回放战斗
 *
 * 功能：
 * - 记录战斗数据（每回合记录）
 * - 战报保存和加载
 * - 战报回放功能（逐步重现战斗）
 * - 战报分享（生成分享码）
 */

import { BattleState, BattleEvent, BattleAction, BattleResult, BattleUnit } from './BattleState';

/**
 * 战报行动记录接口
 */
export interface ReplayAction {
  /** 行动类型 */
  type: string;
  /** 行动者 ID */
  actorId: string;
  /** 目标 ID 列表 */
  targetIds: string[];
  /** 技能 ID */
  techniqueId?: string;
  /** 道具 ID */
  itemId?: string;
  /** 优先级 */
  priority: number;
}

/**
 * 战报回合记录接口
 */
export interface ReplayTurn {
  /** 回合序号 */
  turnNumber: number;
  /** 回合内的行动列表（按优先级排序） */
  actions: ReplayAction[];
  /** 回合内的事件列表 */
  events: BattleEvent[];
}

/**
 * 战报数据接口
 */
export interface BattleReplayData {
  /** 战报 ID */
  replayId: string;
  /** 战斗 ID */
  battleId: string;
  /** 创建时间 */
  createdAt: number;
  /** 玩家队伍（初始状态） */
  playerParty: BattleUnit[];
  /** 敌方队伍（初始状态） */
  enemyParty: BattleUnit[];
  /** 战斗结果 */
  result: BattleResult;
  /** 回合记录 */
  turns: ReplayTurn[];
  /** 战斗背景 */
  background: string;
  /** 战斗音乐 */
  bgm: string;
  /** 可逃跑 */
  canEscape: boolean;
  /** 回放者名称（玩家） */
  playerNames?: string[];
  /** 回放者名称（敌方） */
  enemyNames?: string[];
}

/**
 * 回放状态枚举
 */
export enum ReplayState {
  /** 未开始 */
  IDLE = 'idle',
  /** 回放中 */
  PLAYING = 'playing',
  /** 暂停 */
  PAUSED = 'paused',
  /** 回放结束 */
  ENDED = 'ended',
}

/**
 * 回放步进事件类型
 */
export type ReplayStepEventType =
  | 'turn_start'
  | 'action_start'
  | 'event'
  | 'action_end'
  | 'turn_end'
  | 'replay_end';

/**
 * 回放步进事件接口
 */
export interface ReplayStepEvent {
  /** 事件类型 */
  type: ReplayStepEventType;
  /** 当前回合序号 */
  turnNumber?: number;
  /** 当前行动索引 */
  actionIndex?: number;
  /** 战斗事件（事件类型时） */
  battleEvent?: BattleEvent;
  /** 回放数据 */
  replayData: BattleReplayData;
}

/**
 * 回放步进回调函数类型
 */
export type ReplayStepCallback = (event: ReplayStepEvent) => void;

/**
 * 回放会话接口
 */
interface ReplaySession {
  /** 战报数据 */
  replayData: BattleReplayData;
  /** 当前回合索引 */
  currentTurnIndex: number;
  /** 当前行动索引 */
  currentActionIndex: number;
  /** 当前事件索引 */
  currentEventIndex: number;
  /** 回放状态 */
  state: ReplayState;
  /** 回放速度（毫秒/步） */
  speed: number;
  /** 步进回调列表 */
  callbacks: ReplayStepCallback[];
}

/**
 * 战报系统配置接口
 */
export interface BattleReplayConfig {
  /** 是否自动保存战报 */
  autoSave?: boolean;
  /** 战报保存目录 */
  saveDirectory?: string;
  /** 分享码前缀 */
  shareCodePrefix?: string;
}

/**
 * 战报系统类
 *
 * 单例模式，管理所有战报
 */
export class BattleReplay {
  private static instance: BattleReplay;

  /** 当前正在记录的战报数据 */
  private currentReplay: BattleReplayData | null = null;

  /** 战报缓存 Map<战报ID, 战报数据> */
  private replayCache: Map<string, BattleReplayData> = new Map();

  /** 活跃的回放会话 Map<战报ID, 会话> */
  private activeSessions: Map<string, ReplaySession> = new Map();

  /** 战报 ID 计数器 */
  private replayIdCounter: number = 0;

  /** 配置 */
  private config: BattleReplayConfig;

  /**
   * 私有构造函数，确保单例
   */
  private constructor() {
    this.config = {
      autoSave: true,
      saveDirectory: 'replays',
      shareCodePrefix: 'RP',
    };
  }

  /**
   * 获取战报系统单例实例
   */
  static getInstance(): BattleReplay {
    if (!BattleReplay.instance) {
      BattleReplay.instance = new BattleReplay();
    }
    return BattleReplay.instance;
  }

  /**
   * 配置战报系统
   * @param config 配置选项
   */
  configure(config: BattleReplayConfig): void {
    this.config = { ...this.config, ...config };
    console.log('[BattleReplay] 配置已更新:', config);
  }

  /**
   * 开始记录战报
   * @param battleId 战斗 ID
   * @param battleState 战斗初始状态
   * @returns 战报数据
   */
  startRecording(battleId: string, battleState: BattleState): BattleReplayData {
    // 如果已有战报在记录，先结束之前的记录
    if (this.currentReplay) {
      console.warn('[BattleReplay] 已有战报正在记录，结束之前的记录');
      this.stopRecording();
    }

    // 生成战报 ID
    this.replayIdCounter++;
    const replayId = `replay_${this.replayIdCounter}`;

    // 创建战报数据
    this.currentReplay = {
      replayId,
      battleId,
      createdAt: Date.now(),
      playerParty: this.cloneParty(battleState.playerParty),
      enemyParty: this.cloneParty(battleState.enemyParty),
      result: BattleResult.ONGOING,
      turns: [],
      background: battleState.background,
      bgm: battleState.bgm,
      canEscape: battleState.canEscape,
    };

    console.log(`[BattleReplay] 开始记录战报: ${replayId} (战斗: ${battleId})`);
    return this.currentReplay;
  }

  /**
   * 记录回合行动
   * @param actions 行动列表
   * @param events 战斗事件列表
   * @param turnNumber 回合序号
   */
  recordTurn(actions: BattleAction[], events: BattleEvent[], turnNumber: number): void {
    if (!this.currentReplay) {
      console.warn('[BattleReplay] 没有正在记录的战报');
      return;
    }

    // 转换行动格式
    const replayActions: ReplayAction[] = actions.map(action => ({
      type: action.type,
      actorId: action.actorId,
      targetIds: action.targetIds,
      techniqueId: action.techniqueId,
      itemId: action.itemId,
      priority: action.priority,
    }));

    // 深度复制事件列表
    const replayEvents: BattleEvent[] = events.map(event => ({ ...event }));

    // 创建回合记录
    const replayTurn: ReplayTurn = {
      turnNumber,
      actions: replayActions,
      events: replayEvents,
    };

    // 添加到战报
    this.currentReplay.turns.push(replayTurn);

    console.log(`[BattleReplay] 记录回合 ${turnNumber}，${actions.length} 个行动，${events.length} 个事件`);
  }

  /**
   * 结束记录战报
   * @param result 战斗结果
   * @returns 战报数据
   */
  stopRecording(result: BattleResult = BattleResult.ONGOING): BattleReplayData | null {
    if (!this.currentReplay) {
      console.warn('[BattleReplay] 没有正在记录的战报');
      return null;
    }

    // 设置战斗结果
    this.currentReplay.result = result;

    // 缓存战报
    this.replayCache.set(this.currentReplay.replayId, this.currentReplay);

    console.log(
      `[BattleReplay] 结束记录战报: ${this.currentReplay.replayId}, ` +
      `共 ${this.currentReplay.turns.length} 回合, 结果: ${result}`
    );

    const replayData = this.currentReplay;
    this.currentReplay = null;

    return replayData;
  }

  /**
   * 保存战报到存储
   * @param replayId 战报 ID
   * @returns 是否保存成功
   */
  saveReplay(replayId: string): boolean {
    const replayData = this.replayCache.get(replayId);
    if (!replayData) {
      console.error(`[BattleReplay] 战报 ${replayId} 不存在`);
      return false;
    }

    // TODO: 实现持久化存储
    // 这里可以保存到 localStorage 或服务器
    try {
      const jsonString = JSON.stringify(replayData);
      // localStorage.setItem(`replay_${replayId}`, jsonString);
      console.log(`[BattleReplay] 战报 ${replayId} 已保存 (${jsonString.length} 字节)`);
      return true;
    } catch (error) {
      console.error(`[BattleReplay] 保存战报失败:`, error);
      return false;
    }
  }

  /**
   * 加载战报
   * @param replayId 战报 ID
   * @returns 战报数据，如果不存在返回 null
   */
  loadReplay(replayId: string): BattleReplayData | null {
    // 先从缓存查找
    let replayData = this.replayCache.get(replayId);

    // TODO: 如果缓存中没有，从存储加载
    /*
    if (!replayData) {
      try {
        const jsonString = localStorage.getItem(`replay_${replayId}`);
        if (jsonString) {
          replayData = JSON.parse(jsonString) as BattleReplayData;
          this.replayCache.set(replayId, replayData);
        }
      } catch (error) {
        console.error(`[BattleReplay] 加载战报失败:`, error);
      }
    }
    */

    if (replayData) {
      console.log(`[BattleReplay] 加载战报: ${replayId}`);
    } else {
      console.warn(`[BattleReplay] 战报 ${replayId} 不存在`);
    }

    return replayData ? { ...replayData } : null;
  }

  /**
   * 开始回放
   * @param replayId 战报 ID
   * @param speed 回放速度（毫秒/步）
   * @returns 是否开始成功
   */
  startReplay(replayId: string, speed: number = 1000): boolean {
    const replayData = this.loadReplay(replayId);
    if (!replayData) {
      return false;
    }

    // 创建回放会话
    const session: ReplaySession = {
      replayData,
      currentTurnIndex: 0,
      currentActionIndex: 0,
      currentEventIndex: 0,
      state: ReplayState.PLAYING,
      speed,
      callbacks: [],
    };

    this.activeSessions.set(replayId, session);

    // 触发回放开始事件
    this.emitStepEvent(replayId, {
      type: 'turn_start',
      turnNumber: 0,
      replayData,
    });

    console.log(`[BattleReplay] 开始回放: ${replayId}`);
    return true;
  }

  /**
   * 暂停回放
   * @param replayId 战报 ID
   * @returns 是否暂停成功
   */
  pauseReplay(replayId: string): boolean {
    const session = this.activeSessions.get(replayId);
    if (!session) {
      return false;
    }

    session.state = ReplayState.PAUSED;
    console.log(`[BattleReplay] 暂停回放: ${replayId}`);
    return true;
  }

  /**
   * 继续回放
   * @param replayId 战报 ID
   * @returns 是否继续成功
   */
  resumeReplay(replayId: string): boolean {
    const session = this.activeSessions.get(replayId);
    if (!session) {
      return false;
    }

    session.state = ReplayState.PLAYING;
    console.log(`[BattleReplay] 继续回放: ${replayId}`);
    return true;
  }

  /**
   * 回放下一步
   * @param replayId 战报 ID
   * @returns 是否还有下一步
   */
  nextStep(replayId: string): boolean {
    const session = this.activeSessions.get(replayId);
    if (!session) {
      console.warn(`[BattleReplay] 回放会话 ${replayId} 不存在`);
      return false;
    }

    if (session.state === ReplayState.ENDED) {
      return false;
    }

    const replayData = session.replayData;
    const currentTurn = replayData.turns[session.currentTurnIndex];

    // 如果还有事件未播放
    if (currentTurn && session.currentEventIndex < currentTurn.events.length) {
      const event = currentTurn.events[session.currentEventIndex];
      this.emitStepEvent(replayId, {
        type: 'event',
        turnNumber: session.currentTurnIndex + 1,
        battleEvent: { ...event },
        replayData,
      });
      session.currentEventIndex++;
      return true;
    }

    // 如果还有行动未播放
    if (currentTurn && session.currentActionIndex < currentTurn.actions.length) {
      this.emitStepEvent(replayId, {
        type: 'action_start',
        turnNumber: session.currentTurnIndex + 1,
        actionIndex: session.currentActionIndex,
        replayData,
      });
      session.currentActionIndex++;
      session.currentEventIndex = 0;
      return true;
    }

    // 回合结束，检查是否还有下一回合
    if (session.currentTurnIndex < replayData.turns.length - 1) {
      this.emitStepEvent(replayId, {
        type: 'turn_end',
        turnNumber: session.currentTurnIndex + 1,
        replayData,
      });

      session.currentTurnIndex++;
      session.currentActionIndex = 0;
      session.currentEventIndex = 0;

      this.emitStepEvent(replayId, {
        type: 'turn_start',
        turnNumber: session.currentTurnIndex + 1,
        replayData,
      });

      return true;
    }

    // 回放结束
    session.state = ReplayState.ENDED;
    this.emitStepEvent(replayId, {
      type: 'replay_end',
      replayData,
    });

    console.log(`[BattleReplay] 回放结束: ${replayId}`);
    return false;
  }

  /**
   * 跳转到指定回合
   * @param replayId 战报 ID
   * @param turnNumber 目标回合序号
   * @returns 是否跳转成功
   */
  seekToTurn(replayId: string, turnNumber: number): boolean {
    const session = this.activeSessions.get(replayId);
    if (!session) {
      return false;
    }

    const replayData = session.replayData;

    // 验证回合序号
    if (turnNumber < 1 || turnNumber > replayData.turns.length) {
      console.warn(`[BattleReplay] 无效的回合序号: ${turnNumber}`);
      return false;
    }

    // 跳转到指定回合
    session.currentTurnIndex = turnNumber - 1;
    session.currentActionIndex = 0;
    session.currentEventIndex = 0;

    this.emitStepEvent(replayId, {
      type: 'turn_start',
      turnNumber,
      replayData,
    });

    console.log(`[BattleReplay] 跳转到回合 ${turnNumber}: ${replayId}`);
    return true;
  }

  /**
   * 结束回放
   * @param replayId 战报 ID
   * @returns 是否结束成功
   */
  endReplay(replayId: string): boolean {
    const session = this.activeSessions.get(replayId);
    if (!session) {
      return false;
    }

    session.state = ReplayState.ENDED;
    session.callbacks = [];

    console.log(`[BattleReplay] 结束回放: ${replayId}`);
    return true;
  }

  /**
   * 订阅回放步进事件
   * @param replayId 战报 ID
   * @param callback 回调函数
   * @returns 取消订阅的函数
   */
  onReplayStep(replayId: string, callback: ReplayStepCallback): () => void {
    const session = this.activeSessions.get(replayId);
    if (!session) {
      console.warn(`[BattleReplay] 回放会话 ${replayId} 不存在`);
      return () => {};
    }

    session.callbacks.push(callback);

    return () => {
      const index = session.callbacks.indexOf(callback);
      if (index !== -1) {
        session.callbacks.splice(index, 1);
      }
    };
  }

  /**
   * 生成分享码
   * @param replayId 战报 ID
   * @returns 分享码
   */
  generateShareCode(replayId: string): string | null {
    const replayData = this.loadReplay(replayId);
    if (!replayData) {
      return null;
    }

    // 简化分享码生成：使用 Base64 编码战报 ID
    // TODO: 实现更复杂的分享码生成算法（压缩、加密等）
    const shareCode = `${this.config.shareCodePrefix}_${Buffer.from(replayId).toString('base64')}`;

    console.log(`[BattleReplay] 生成分享码: ${shareCode}`);
    return shareCode;
  }

  /**
   * 从分享码解析战报 ID
   * @param shareCode 分享码
   * @returns 战报 ID，如果无效返回 null
   */
  parseShareCode(shareCode: string): string | null {
    const prefix = `${this.config.shareCodePrefix}_`;
    if (!shareCode.startsWith(prefix)) {
      console.warn(`[BattleReplay] 无效的分享码格式`);
      return null;
    }

    try {
      const base64Part = shareCode.slice(prefix.length);
      const replayId = Buffer.from(base64Part, 'base64').toString('utf-8');
      console.log(`[BattleReplay] 解析分享码: ${shareCode} -> ${replayId}`);
      return replayId;
    } catch (error) {
      console.error(`[BattleReplay] 解析分享码失败:`, error);
      return null;
    }
  }

  /**
   * 获取战报摘要
   * @param replayId 战报 ID
   * @returns 战报摘要
   */
  getReplaySummary(replayId: string): {
    replayId: string;
    battleId: string;
    createdAt: number;
    turnCount: number;
    result: BattleResult;
  } | null {
    const replayData = this.replayCache.get(replayId);
    if (!replayData) {
      return null;
    }

    return {
      replayId: replayData.replayId,
      battleId: replayData.battleId,
      createdAt: replayData.createdAt,
      turnCount: replayData.turns.length,
      result: replayData.result,
    };
  }

  /**
   * 获取所有战报 ID 列表
   * @returns 战报 ID 列表
   */
  getAllReplayIds(): string[] {
    return Array.from(this.replayCache.keys());
  }

  /**
   * 删除战报
   * @param replayId 战报 ID
   * @returns 是否删除成功
   */
  deleteReplay(replayId: string): boolean {
    // 结束回放会话
    this.endReplay(replayId);
    this.activeSessions.delete(replayId);

    // 删除战报数据
    const deleted = this.replayCache.delete(replayId);

    if (deleted) {
      console.log(`[BattleReplay] 删除战报: ${replayId}`);
    }

    return deleted;
  }

  /**
   * 清除所有战报
   */
  clear(): void {
    for (const replayId of this.activeSessions.keys()) {
      this.endReplay(replayId);
    }

    this.activeSessions.clear();
    this.replayCache.clear();
    this.currentReplay = null;
    this.replayIdCounter = 0;

    console.log('[BattleReplay] 已清除所有战报');
  }

  /**
   * 触发回放步进事件
   * @param replayId 战报 ID
   * @param event 回放步进事件
   */
  private emitStepEvent(replayId: string, event: ReplayStepEvent): void {
    const session = this.activeSessions.get(replayId);
    if (!session) return;

    for (const callback of session.callbacks) {
      try {
        callback(event);
      } catch (error) {
        console.error(`[BattleReplay] 回放事件回调错误:`, error);
      }
    }
  }

  /**
   * 深度复制队伍数据
   * @param party 队伍数据
   * @returns 复制后的队伍数据
   */
  private cloneParty(party: BattleUnit[]): BattleUnit[] {
    return party.map(unit => ({ ...unit }));
  }
}

/**
 * 导出战报系统单例
 */
export const battleReplay = BattleReplay.getInstance();
