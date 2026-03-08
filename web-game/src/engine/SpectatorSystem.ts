/**
 * 观战系统增强 - 战斗回放与数据分析
 *
 * 功能：
 * - 战斗回放功能（记录每回合战斗数据）
 * - 支持快进/暂停/倒退
 * - 导出回放文件（JSON 格式）
 * - 观战聊天室（WebSocket 消息广播）
 * - 精彩时刻标记（暴击、闪避、绝杀）
 * - 战斗数据统计面板（伤害总计、回合数、命中率等）
 */

import { BattleState, BattleEvent, BattleAction, BattleResult } from './BattleState';
import { SpectatorManager, SpectatorInfo } from './SpectatorManager';
import { BattleReplay, BattleReplayData, ReplayTurn, ReplayState } from './BattleReplay';

/**
 * 精彩时刻类型枚举
 */
export enum HighlightType {
  /** 暴击 */
  CRITICAL = 'critical',
  /** 闪避 */
  EVADED = 'evaded',
  /** 绝杀 */
  FINISHING_BLOW = 'finishing_blow',
  /** 连续攻击 */
  COMBO = 'combo',
  /** 状态异常 */
  STATUS_APPLIED = 'status_applied',
  /** 回复大量 HP */
  MASSIVE_HEAL = 'massive_heal',
}

/**
 * 精彩时刻接口
 */
export interface HighlightMoment {
  /** 精彩时刻 ID */
  id?: string;
  /** 精彩时刻类型 */
  type: HighlightType;
  /** 回合序号 */
  turnNumber: number;
  /** 时间戳 */
  timestamp: number;
  /** 描述 */
  description: string;
  /** 相关单位 ID */
  actorId: string;
  /** 目标单位 ID */
  targetId?: string;
  /** 技能 ID（如果适用） */
  techniqueId?: string;
  /** 伤害值（如果适用） */
  damage?: number;
}

/**
 * 战斗统计数据接口
 */
export interface BattleStatistics {
  /** 战斗 ID */
  battleId: string;
  /** 总回合数 */
  totalTurns: number;
  /** 总时长（毫秒） */
  duration: number;
  /** 玩家伤害统计 */
  playerDamageStats: PlayerDamageStats;
  /** 敌方伤害统计 */
  enemyDamageStats: PlayerDamageStats;
  /** 技能使用统计 Map<技能ID, 使用次数> */
  techniqueUsage: Map<string, number>;
  /** 属性克制统计 */
  typeEffectivenessStats: TypeEffectivenessStats;
  /** 命中率统计 */
  accuracyStats: AccuracyStats;
  /** 精彩时刻列表 */
  highlights: HighlightMoment[];
}

/**
 * 玩家伤害统计接口
 */
export interface PlayerDamageStats {
  /** 玩家 ID */
  playerId: string;
  /** 总造成伤害 */
  totalDamageDealt: number;
  /** 总承受伤害 */
  totalDamageTaken: number;
  /** 最高单次伤害 */
  maxDamageDealt: number;
  /** 最高承受伤害 */
  maxDamageTaken: number;
  /** 暴击次数 */
  criticalHits: number;
  /** 闪避次数 */
  evades: number;
  /** 击杀次数 */
  knockouts: number;
  /** 被击杀次数 */
  timesKnockedOut: number;
}

/**
 * 属性克制统计接口
 */
export interface TypeEffectivenessStats {
  /** 超克制（>2x）次数 */
  superEffectiveCount: number;
  /** 克制（2x）次数 */
  effectiveCount: number;
  /** 普通（1x）次数 */
  normalCount: number;
  /** 被抵抗（0.5x）次数 */
  resistedCount: number;
  /** 无效（0x）次数 */
  immuneCount: number;
}

/**
 * 命中率统计接口
 */
export interface AccuracyStats {
  /** 总尝试次数 */
  totalAttempts: number;
  /** 成功次数 */
  hits: number;
  /** 失败次数 */
  misses: number;
  /** 命中率 */
  hitRate: number;
}

/**
 * 回放控制接口
 */
export interface ReplayControl {
  /** 回放状态 */
  state: ReplayState;
  /** 当前回合 */
  currentTurn: number;
  /** 总回合数 */
  totalTurns: number;
  /** 回放速度（毫秒/步） */
  speed: number;
  /** 是否自动播放 */
  autoPlay: boolean;
}

/**
 * 观战系统配置接口
 */
export interface SpectatorSystemConfig {
  /** 是否自动记录精彩时刻 */
  autoRecordHighlights: boolean;
  /** 最小暴击伤害（低于此值不标记） */
  minCriticalDamage: number;
  /** 最大回放速度（毫秒/步） */
  maxReplaySpeed: number;
  /** 最小回放速度（毫秒/步） */
  minReplaySpeed: number;
  /** 聊天消息历史保留天数 */
  chatHistoryRetentionDays: number;
  /** 统计数据保留天数 */
  statsRetentionDays: number;
}

/**
 * 战斗数据记录接口
 */
interface BattleDataRecord {
  /** 战斗 ID */
  battleId: string;
  /** 开始时间 */
  startTime: number;
  /** 结束时间 */
  endTime?: number;
  /** 战斗结果 */
  result?: BattleResult;
  /** 回合数据 */
  turns: ReplayTurn[];
  /** 战斗事件 */
  events: BattleEvent[];
  /** 精彩时刻 */
  highlights: HighlightMoment[];
  /** 统计数据 */
  statistics?: BattleStatistics;
}

/**
 * 观战系统增强类
 *
 * 单例模式，增强观战功能
 */
export class SpectatorSystem {
  private static instance: SpectatorSystem;

  /** 观战管理器 */
  private spectatorManager: SpectatorManager;

  /** 战斗回放系统 */
  private battleReplay: BattleReplay;

  /** 战斗数据记录 Map<战斗ID, 记录> */
  private battleRecords: Map<string, BattleDataRecord> = new Map();

  /** 活跃的回放控制 Map<回放ID, 控制> */
  private replayControls: Map<string, ReplayControl> = new Map();

  /** 回放定时器 Map<回放ID, 定时器> */
  private replayTimers: Map<string, NodeJS.Timeout> = new Map();

  /** 配置 */
  private config: SpectatorSystemConfig;

  /** 精彩时刻计数器 */
  private highlightIdCounter: number = 0;

  /** 统计数据缓存 Map<玩家ID, 统计数据> */
  private statsCache: Map<string, BattleStatistics> = new Map();

  /**
   * 私有构造函数，确保单例
   */
  private constructor() {
    this.spectatorManager = SpectatorManager.getInstance();
    this.battleReplay = BattleReplay.getInstance();
    this.config = {
      autoRecordHighlights: true,
      minCriticalDamage: 50,
      maxReplaySpeed: 5000,
      minReplaySpeed: 100,
      chatHistoryRetentionDays: 7,
      statsRetentionDays: 30,
    };
    this.startRetentionCleanup();
  }

  /**
   * 获取观战系统增强单例实例
   */
  static getInstance(): SpectatorSystem {
    if (!SpectatorSystem.instance) {
      SpectatorSystem.instance = new SpectatorSystem();
    }
    return SpectatorSystem.instance;
  }

  /**
   * 配置观战系统
   * @param config 配置选项
   */
  configure(config: Partial<SpectatorSystemConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[SpectatorSystem] 配置已更新:', config);
  }

  /**
   * 开始记录战斗
   * @param battleId 战斗 ID
   * @param battleState 战斗初始状态
   * @return 是否开始成功
   */
  startBattleRecording(battleId: string, _battleState: BattleState): boolean {
    // 创建观战会话
    const sessionCreated = this.spectatorManager.createSpectatorSession(battleId, {
      maxSpectators: 50,
      allowChat: true,
      maxChatHistory: 100,
    });

    if (!sessionCreated) {
      console.warn(`[SpectatorSystem] 观战会话已存在: ${battleId}`);
    }

    // 开始回放记录

    // 创建战斗数据记录
    const record: BattleDataRecord = {
      battleId,
      startTime: Date.now(),
      turns: [],
      events: [],
      highlights: [],
    };

    this.battleRecords.set(battleId, record);

    console.log(`[SpectatorSystem] 开始记录战斗: ${battleId}`);
    return true;
  }

  /**
   * 记录回合数据
   * @param battleId 战斗 ID
   * @param actions 行动列表
   * @param events 事件列表
   * @param turnNumber 回合序号
   */
  recordTurnData(battleId: string, actions: BattleAction[], events: BattleEvent[], turnNumber: number): void {
    // 记录到回放系统
    this.battleReplay.recordTurn(actions, events, turnNumber);

    // 记录到战斗数据
    const record = this.battleRecords.get(battleId);
    if (!record) return;

    const replayTurn: ReplayTurn = {
      turnNumber,
      actions: actions.map(action => ({
        type: action.type,
        actorId: action.actorId,
        targetIds: action.targetIds,
        techniqueId: action.techniqueId,
        itemId: action.itemId,
        priority: action.priority,
      })),
      events: events.map(event => ({ ...event })),
    };

    record.turns.push(replayTurn);
    record.events.push(...events);

    // 自动检测精彩时刻
    if (this.config.autoRecordHighlights) {
      this.detectHighlights(battleId, events, turnNumber);
    }

    console.log(`[SpectatorSystem] 记录回合 ${turnNumber}: ${actions.length} 行动, ${events.length} 事件`);
  }

  /**
   * 检测精彩时刻
   * @param battleId 战斗 ID
   * @param events 事件列表
   * @param turnNumber 回合序号
   */
  private detectHighlights(battleId: string, events: BattleEvent[], turnNumber: number): void {
    const record = this.battleRecords.get(battleId);
    if (!record) return;

    for (const event of events) {
      // 检测暴击
      if (event.type === 'damage' && event.isCritical === true) {
        const damage = event.value || 0;
        if (damage >= this.config.minCriticalDamage) {
          this.addHighlight(battleId, {
            type: HighlightType.CRITICAL,
            turnNumber,
            timestamp: Date.now(),
            description: `暴击！造成 ${damage} 点伤害`,
            actorId: event.sourceId || '',
            targetId: event.targetId,
            techniqueId: event.techniqueId,
            damage,
          });
        }
      }

      // 检测绝杀（击杀最后一只怪物）
      if (event.type === 'faint') {
        // 检查是否是最后一击
        const faintedUnits = events.filter(e => e.type === 'faint');
        if (faintedUnits.length === 1) {
          this.addHighlight(battleId, {
            type: HighlightType.FINISHING_BLOW,
            turnNumber,
            timestamp: Date.now(),
            description: '绝杀！战斗结束',
            actorId: event.sourceId || '',
            targetId: event.targetId,
          });
        }
      }

      // 检测状态异常
      if (event.type === 'status_apply') {
        this.addHighlight(battleId, {
          type: HighlightType.STATUS_APPLIED,
          turnNumber,
          timestamp: Date.now(),
          description: `施加状态效果: ${event.statusId}`,
          actorId: event.sourceId || '',
          targetId: event.targetId,
          techniqueId: event.techniqueId,
        });
      }

      // 检测大量回复
      if (event.type === 'heal' && (event.value || 0) >= 50) {
        this.addHighlight(battleId, {
          type: HighlightType.MASSIVE_HEAL,
          turnNumber,
          timestamp: Date.now(),
          description: `回复大量 HP: ${event.value}`,
          actorId: event.sourceId || '',
          targetId: event.targetId,
          techniqueId: event.techniqueId,
        });
      }
    }
  }

  /**
   * 添加精彩时刻
   * @param battleId 战斗 ID
   * @param highlight 精彩时刻
   */
  private addHighlight(battleId: string, highlight: HighlightMoment): void {
    const record = this.battleRecords.get(battleId);
    if (!record) return;

    highlight.id = `highlight_${this.highlightIdCounter++}`;
    record.highlights.push(highlight);
  }

  /**
   * 结束战斗记录
   * @param battleId 战斗 ID
   * @param result 战斗结果
   * @return 战斗统计数据
   */
  endBattleRecording(battleId: string, result: BattleResult): BattleStatistics | null {
    const record = this.battleRecords.get(battleId);
    if (!record) {
      console.warn(`[SpectatorSystem] 战斗记录不存在: ${battleId}`);
      return null;
    }

    // 结束回放记录
    this.battleReplay.stopRecording(result);

    // 更新记录
    record.endTime = Date.now();
    record.result = result;

    // 计算统计数据
    const statistics = this.calculateBattleStatistics(battleId);
    record.statistics = statistics;

    // 缓存统计数据
    for (const unit of [...record.turns[0]?.actions || []].map(a => a.actorId).slice(0, 6)) {
      this.statsCache.set(`${battleId}_${unit}`, statistics);
    }

    // 广播战斗结束
    this.spectatorManager.broadcastBattleState(battleId, {} as BattleState);

    console.log(`[SpectatorSystem] 结束战斗记录: ${battleId}, 结果: ${result}`);
    return statistics;
  }

  /**
   * 计算战斗统计数据
   * @param battleId 战斗 ID
   * @return 战斗统计数据
   */
  private calculateBattleStatistics(battleId: string): BattleStatistics {
    const record = this.battleRecords.get(battleId);
    if (!record) {
      throw new Error(`战斗记录不存在: ${battleId}`);
    }

    const playerDamageStats: PlayerDamageStats = {
      playerId: 'player',
      totalDamageDealt: 0,
      totalDamageTaken: 0,
      maxDamageDealt: 0,
      maxDamageTaken: 0,
      criticalHits: 0,
      evades: 0,
      knockouts: 0,
      timesKnockedOut: 0,
    };

    const enemyDamageStats: PlayerDamageStats = {
      playerId: 'enemy',
      totalDamageDealt: 0,
      totalDamageTaken: 0,
      maxDamageDealt: 0,
      maxDamageTaken: 0,
      criticalHits: 0,
      evades: 0,
      knockouts: 0,
      timesKnockedOut: 0,
    };

    const techniqueUsage = new Map<string, number>();
    const typeEffectivenessStats: TypeEffectivenessStats = {
      superEffectiveCount: 0,
      effectiveCount: 0,
      normalCount: 0,
      resistedCount: 0,
      immuneCount: 0,
    };

    const accuracyStats: AccuracyStats = {
      totalAttempts: 0,
      hits: 0,
      misses: 0,
      hitRate: 0,
    };

    // 分析事件
    for (const event of record.events) {
      // 伤害统计
      if (event.type === 'damage') {
        const damage = event.value || 0;
        const isPlayer = event.sourceId?.startsWith('player');

        if (isPlayer) {
          playerDamageStats.totalDamageDealt += damage;
          playerDamageStats.maxDamageDealt = Math.max(playerDamageStats.maxDamageDealt, damage);
        } else {
          enemyDamageStats.totalDamageDealt += damage;
          enemyDamageStats.maxDamageDealt = Math.max(enemyDamageStats.maxDamageDealt, damage);
        }

        // 暴击统计
        if (event.isCritical === true) {
          if (isPlayer) {
            playerDamageStats.criticalHits++;
          } else {
            enemyDamageStats.criticalHits++;
          }
        }

        // 属性克制统计
        if (event.effective) {
          if (event.effective >= 2.0) {
            typeEffectivenessStats.effectiveCount++;
          } else if (event.effective > 1.0) {
            typeEffectivenessStats.superEffectiveCount++;
          } else if (event.effective === 1.0) {
            typeEffectivenessStats.normalCount++;
          } else if (event.effective > 0) {
            typeEffectivenessStats.resistedCount++;
          } else {
            typeEffectivenessStats.immuneCount++;
          }
        }
      }

      // 击杀统计
      if (event.type === 'faint') {
        const isPlayerKO = event.targetId?.startsWith('player');
        const isPlayerKiller = event.sourceId?.startsWith('player');

        if (isPlayerKO) {
          playerDamageStats.timesKnockedOut++;
          if (isPlayerKiller) {
            playerDamageStats.knockouts++;
          } else {
            enemyDamageStats.knockouts++;
          }
        } else {
          enemyDamageStats.timesKnockedOut++;
          if (isPlayerKiller) {
            playerDamageStats.knockouts++;
          } else {
            enemyDamageStats.knockouts++;
          }
        }
      }

      // 技能使用统计
      if (event.techniqueId) {
        const usage = techniqueUsage.get(event.techniqueId) || 0;
        techniqueUsage.set(event.techniqueId, usage + 1);
      }
    }

    // 计算承受伤害（简化处理）
    playerDamageStats.totalDamageTaken = enemyDamageStats.totalDamageDealt;
    playerDamageStats.maxDamageTaken = enemyDamageStats.maxDamageDealt;
    enemyDamageStats.totalDamageTaken = playerDamageStats.totalDamageDealt;
    enemyDamageStats.maxDamageTaken = playerDamageStats.maxDamageDealt;

    const duration = (record.endTime || Date.now()) - record.startTime;

    return {
      battleId,
      totalTurns: record.turns.length,
      duration,
      playerDamageStats,
      enemyDamageStats,
      techniqueUsage,
      typeEffectivenessStats,
      accuracyStats,
      highlights: record.highlights,
    };
  }

  /**
   * 开始回放
   * @param battleId 战斗 ID
   * @param speed 回放速度（毫秒/步）
   * @return 回放控制对象
   */
  startReplay(battleId: string, speed: number = 1000): ReplayControl | null {
    // 启动回放
    const started = this.battleReplay.startReplay(battleId, speed);
    if (!started) {
      console.error(`[SpectatorSystem] 无法开始回放: ${battleId}`);
      return null;
    }

    const record = this.battleRecords.get(battleId);
    if (!record) {
      console.error(`[SpectatorSystem] 战斗记录不存在: ${battleId}`);
      return null;
    }

    // 创建回放控制
    const control: ReplayControl = {
      state: ReplayState.PLAYING,
      currentTurn: 0,
      totalTurns: record.turns.length,
      speed: Math.max(this.config.minReplaySpeed, Math.min(this.config.maxReplaySpeed, speed)),
      autoPlay: true,
    };

    this.replayControls.set(battleId, control);

    // 启动自动播放
    this.startAutoPlay(battleId, control);

    console.log(`[SpectatorSystem] 开始回放: ${battleId}`);
    return control;
  }

  /**
   * 启动自动播放
   * @param battleId 战斗 ID
   * @param control 回放控制
   */
  private startAutoPlay(battleId: string, control: ReplayControl): void {
    const timer = setInterval(() => {
      if (control.state !== ReplayState.PLAYING || !control.autoPlay) {
        return;
      }

      const hasNext = this.battleReplay.nextStep(battleId);
      if (!hasNext) {
        control.state = ReplayState.ENDED;
        control.autoPlay = false;
        clearInterval(timer);
        return;
      }

      const record = this.battleRecords.get(battleId);
      if (record) {
        const currentTurn = Math.min(control.currentTurn + 1, record.turns.length);
        control.currentTurn = currentTurn;
      }
    }, control.speed);

    this.replayTimers.set(battleId, timer);
  }

  /**
   * 暂停回放
   * @param battleId 战斗 ID
   * @return 是否暂停成功
   */
  pauseReplay(battleId: string): boolean {
    const paused = this.battleReplay.pauseReplay(battleId);
    if (paused) {
      const control = this.replayControls.get(battleId);
      if (control) {
        control.state = ReplayState.PAUSED;
      }
    }
    return paused;
  }

  /**
   * 继续回放
   * @param battleId 战斗 ID
   * @return 是否继续成功
   */
  resumeReplay(battleId: string): boolean {
    const resumed = this.battleReplay.resumeReplay(battleId);
    if (resumed) {
      const control = this.replayControls.get(battleId);
      if (control) {
        control.state = ReplayState.PLAYING;
      }
    }
    return resumed;
  }

  /**
   * 快进（增加回放速度）
   * @param battleId 战斗 ID
   * @param multiplier 速度倍数
   * @return 是否成功
   */
  fastForward(battleId: string, multiplier: number = 2): boolean {
    const control = this.replayControls.get(battleId);
    if (!control) return false;

    const newSpeed = control.speed / multiplier;
    const clampedSpeed = Math.max(this.config.minReplaySpeed, Math.min(this.config.maxReplaySpeed, newSpeed));
    control.speed = clampedSpeed;

    // 重启定时器以应用新速度
    this.restartAutoPlay(battleId, control);

    console.log(`[SpectatorSystem] 快进: ${battleId}, 新速度: ${clampedSpeed}ms/step`);
    return true;
  }

  /**
   * 倒退（跳转到前一个回合）
   * @param battleId 战斗 ID
   * @return 是否成功
   */
  rewind(battleId: string): boolean {
    const control = this.replayControls.get(battleId);
    if (!control || control.currentTurn <= 1) return false;

    const targetTurn = Math.max(1, control.currentTurn - 1);
    return this.seekToTurn(battleId, targetTurn);
  }

  /**
   * 跳转到指定回合
   * @param battleId 战斗 ID
   * @param turnNumber 目标回合序号
   * @return 是否成功
   */
  seekToTurn(battleId: string, turnNumber: number): boolean {
    const sought = this.battleReplay.seekToTurn(battleId, turnNumber);
    if (sought) {
      const control = this.replayControls.get(battleId);
      if (control) {
        control.currentTurn = turnNumber;
      }
    }
    return sought;
  }

  /**
   * 设置回放速度
   * @param battleId 战斗 ID
   * @param speed 新速度（毫秒/步）
   * @return 是否成功
   */
  setReplaySpeed(battleId: string, speed: number): boolean {
    const control = this.replayControls.get(battleId);
    if (!control) return false;

    const clampedSpeed = Math.max(this.config.minReplaySpeed, Math.min(this.config.maxReplaySpeed, speed));
    control.speed = clampedSpeed;

    this.restartAutoPlay(battleId, control);

    console.log(`[SpectatorSystem] 设置回放速度: ${battleId}, 速度: ${clampedSpeed}ms/step`);
    return true;
  }

  /**
   * 重启自动播放
   * @param battleId 战斗 ID
   * @param control 回放控制
   */
  private restartAutoPlay(battleId: string, control: ReplayControl): void {
    const oldTimer = this.replayTimers.get(battleId);
    if (oldTimer) {
      clearInterval(oldTimer);
    }

    if (control.state === ReplayState.PLAYING && control.autoPlay) {
      this.startAutoPlay(battleId, control);
    }
  }

  /**
   * 结束回放
   * @param battleId 战斗 ID
   * @return 是否结束成功
   */
  endReplay(battleId: string): boolean {
    // 清理定时器
    const timer = this.replayTimers.get(battleId);
    if (timer) {
      clearInterval(timer);
      this.replayTimers.delete(battleId);
    }

    // 结束回放
    const ended = this.battleReplay.endReplay(battleId);

    // 清理控制
    this.replayControls.delete(battleId);

    console.log(`[SpectatorSystem] 结束回放: ${battleId}`);
    return ended;
  }

  /**
   * 导出回放文件
   * @param battleId 战斗 ID
   * @return 回放数据（JSON 格式）
   */
  exportReplay(battleId: string): BattleReplayData | null {
    const replayData = this.battleReplay.loadReplay(battleId);
    if (!replayData) {
      console.error(`[SpectatorSystem] 回放数据不存在: ${battleId}`);
      return null;
    }

    // 添加统计数据和精彩时刻
    const record = this.battleRecords.get(battleId);
    if (record) {
      (replayData as any).statistics = record.statistics;
      (replayData as any).highlights = record.highlights;
    }

    console.log(`[SpectatorSystem] 导出回放: ${battleId}`);
    return replayData;
  }

  /**
   * 导入回放文件
   * @param replayData 回放数据
   * @return 是否导入成功
   */
  importReplay(replayData: BattleReplayData): boolean {
    try {
      // 缓存回放数据
      const replayId = replayData.replayId;
      this.battleRecords.set(replayId, {
        battleId: replayId,
        startTime: replayData.createdAt,
        endTime: replayData.createdAt + (replayData as any).duration || 0,
        result: replayData.result,
        turns: replayData.turns,
        events: [],
        highlights: (replayData as any).highlights || [],
        statistics: (replayData as any).statistics,
      });

      console.log(`[SpectatorSystem] 导入回放: ${replayId}`);
      return true;
    } catch (error) {
      console.error(`[SpectatorSystem] 导入回放失败:`, error);
      return false;
    }
  }

  /**
   * 获取战斗统计数据
   * @param battleId 战斗 ID
   * @return 战斗统计数据
   */
  getBattleStatistics(battleId: string): BattleStatistics | null {
    const record = this.battleRecords.get(battleId);
    if (!record) {
      console.warn(`[SpectatorSystem] 战斗记录不存在: ${battleId}`);
      return null;
    }

    return record.statistics || this.calculateBattleStatistics(battleId);
  }

  /**
   * 获取精彩时刻列表
   * @param battleId 战斗 ID
   * @return 精彩时刻列表
   */
  getHighlights(battleId: string): HighlightMoment[] {
    const record = this.battleRecords.get(battleId);
    return record ? [...record.highlights] : [];
  }

  /**
   * 按类型获取精彩时刻
   * @param battleId 战斗 ID
   * @param type 精彩时刻类型
   * @return 精彩时刻列表
   */
  getHighlightsByType(battleId: string, type: HighlightType): HighlightMoment[] {
    const highlights = this.getHighlights(battleId);
    return highlights.filter(h => h.type === type);
  }

  /**
   * 获取回放控制
   * @param battleId 战斗 ID
   * @return 回放控制对象
   */
  getReplayControl(battleId: string): ReplayControl | undefined {
    return this.replayControls.get(battleId);
  }

  /**
   * 发送观战者聊天消息
   * @param battleId 战斗 ID
   * @param spectatorId 观战者 ID
   * @param message 消息内容
   * @return 是否发送成功
   */
  sendChatMessage(battleId: string, spectatorId: string, message: string): boolean {
    return this.spectatorManager.sendChatMessage(battleId, spectatorId, message);
  }

  /**
   * 获取观战者列表
   * @param battleId 战斗 ID
   * @return 观战者列表
   */
  getSpectators(battleId: string): SpectatorInfo[] {
    return this.spectatorManager.getSpectators(battleId);
  }

  /**
   * 订阅观战事件
   * @param battleId 战斗 ID
   * @param callback 回调函数
   * @return 取消订阅的函数
   */
  subscribe(battleId: string, callback: (event: any) => void): () => void {
    return this.spectatorManager.subscribe(battleId, callback);
  }

  /**
   * 清理过期数据
   */
  private startRetentionCleanup(): void {
    const cleanupInterval = 24 * 60 * 60 * 1000; // 每天清理一次

    setInterval(() => {
      const statsExpiry = Date.now() - this.config.statsRetentionDays * 24 * 60 * 60 * 1000;

      // 清理统计数据缓存
      for (const [key, stats] of this.statsCache) {
        if (stats.duration < statsExpiry) {
          this.statsCache.delete(key);
        }
      }

      console.log('[SpectatorSystem] 清理过期数据完成');
    }, cleanupInterval);
  }

  /**
   * 清除战斗记录
   * @param battleId 战斗 ID
   */
  clearBattleRecord(battleId: string): void {
    this.endReplay(battleId);
    this.battleRecords.delete(battleId);
    this.replayControls.delete(battleId);

    for (const [key] of this.statsCache) {
      if (key.startsWith(battleId)) {
        this.statsCache.delete(key);
      }
    }

    console.log(`[SpectatorSystem] 清除战斗记录: ${battleId}`);
  }

  /**
   * 清除所有记录
   */
  clear(): void {
    // 清理所有定时器
    for (const timer of this.replayTimers.values()) {
      clearInterval(timer);
    }
    this.replayTimers.clear();

    // 清理记录
    this.battleRecords.clear();
    this.replayControls.clear();
    this.statsCache.clear();

    console.log('[SpectatorSystem] 已清除所有记录');
  }
}

/**
 * 导出观战系统增强单例
 */
export const spectatorSystem = SpectatorSystem.getInstance();
