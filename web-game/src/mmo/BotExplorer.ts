/**
 * MMO 机器人自动探索逻辑
 *
 * 基于 Tuxemon 的 NPC 探索系统实现机器人自动移动和探索
 *
 * 功能：
 * - 随机移动算法（避开障碍物）
 * - 目标点导航（使用 A* 寻路）
 * - 遭遇检测（进入草地触发战斗）
 * - 资源点收集逻辑
 * - 探索日志记录
 */

import { Direction, PlayerPosition } from '../engine/PlayerController';
import { BotData, BotPersonality, mmoBotManager } from './BotManager';
import { pathfinder, PathPoint } from '../engine/Pathfinder';
import { collisionManager, CollisionType } from '../engine/CollisionManager';

/**
 * 探索状态枚举
 */
export enum ExplorationState {
  /** 空闲 */
  IDLE = 'idle',
  /** 移动中 */
  MOVING = 'moving',
  /** 收集资源 */
  COLLECTING = 'collecting',
  /** 遭遇战斗 */
  BATTLE_ENCOUNTER = 'battle_encounter',
  /** 等待 */
  WAITING = 'waiting',
}

/**
 * 探索目标接口
 */
export interface ExploreTarget {
  /** 目标位置 */
  position: PathPoint;
  /** 目标类型 */
  type: 'random' | 'resource' | 'exit' | 'safe_zone';
  /** 目标优先级（数值越大越优先） */
  priority: number;
  /** 目标距离 */
  distance: number;
}

/**
 * 遭遇结果接口
 */
export interface EncounterResult {
  /** 是否发生遭遇 */
  encountered: boolean;
  /** 遭遇类型 */
  encounterType: 'wild_monster' | 'trainer' | 'resource' | 'none';
  /** 遭遇数据（怪物 ID、资源 ID 等） */
  encounterData?: string;
  /** 遭遇位置 */
  position?: { x: number; y: number };
}

/**
 * 资源收集结果接口
 */
export interface ResourceCollectionResult {
  /** 是否成功收集 */
  collected: boolean;
  /** 资源类型 */
  resourceType: 'gold' | 'item' | 'pokeball';
  /** 资源数量 */
  amount: number;
  /** 资源 ID（如果有） */
  resourceId?: string;
}

/**
 * 探索配置接口
 */
export interface ExplorationConfig {
  /** 移动速度（毫秒/格） */
  moveSpeed: number;
  /** 探索范围（瓦片） */
  exploreRange: number;
  /** 最大路径长度 */
  maxPathLength: number;
  /** 遭遇触发概率（0-1） */
  encounterProbability: number;
  /** 资源收集概率（0-1） */
  resourceProbability: number;
  /** 等待时间（毫秒） */
  waitTime: number;
  /** 是否启用调试日志 */
  debugLogging: boolean;
}

/**
 * 探索日志接口
 */
export interface ExplorationLog {
  /** 日志 ID */
  id: string;
  /** 机器人 ID */
  botId: string;
  /** 日志时间 */
  timestamp: number;
  /** 日志类型 */
  type: 'movement' | 'encounter' | 'collection' | 'error';
  /** 日志消息 */
  message: string;
  /** 附加数据 */
  data?: Record<string, unknown>;
}

/**
 * 机器人探索器类
 */
export class BotExplorer {
  private static instance: BotExplorer;

  /** 机器人探索状态映射 */
  private explorationStates: Map<string, ExplorationState> = new Map();

  /** 机器人路径映射 */
  private botPaths: Map<string, PathPoint[]> = new Map();

  /** 机器人当前路径索引 */
  private botPathIndices: Map<string, number> = new Map();

  /** 机器人探索目标映射 */
  private exploreTargets: Map<string, ExploreTarget | null> = new Map();

  /** 机器人探索配置映射 */
  private botConfigs: Map<string, ExplorationConfig> = new Map();

  /** 探索定时器映射 */
  private explorationTimers: Map<string, NodeJS.Timeout> = new Map();

  /** 探索日志 */
  private explorationLogs: ExplorationLog[] = [];

  /** 最大日志数量 */
  private readonly MAX_LOGS = 1000;

  /** 默认配置 */
  private readonly defaultConfig: ExplorationConfig = {
    moveSpeed: 500,
    exploreRange: 15,
    maxPathLength: 30,
    encounterProbability: 0.15,
    resourceProbability: 0.10,
    waitTime: 1000,
    debugLogging: false,
  };

  /** 是否已初始化 */
  private initialized = false;

  /**
   * 私有构造函数，确保单例
   */
  private constructor() {}

  /**
   * 获取机器人探索器单例实例
   */
  static getInstance(): BotExplorer {
    if (!BotExplorer.instance) {
      BotExplorer.instance = new BotExplorer();
    }
    return BotExplorer.instance;
  }

  /**
   * 初始化机器人探索器
   */
  initialize(): void {
    if (this.initialized) {
      console.warn('[BotExplorer] 已经初始化');
      return;
    }

    this.initialized = true;
    console.log('[BotExplorer] MMO 机器人探索器已初始化');
  }

  /**
   * 为机器人启动探索
   * @param botId 机器人 ID
   * @param config 探索配置（可选）
   */
  startExploration(botId: string, config?: Partial<ExplorationConfig>): boolean {
    const bot = mmoBotManager.getBot(botId);
    if (!bot) {
      console.error(`[BotExplorer] 机器人不存在: ${botId}`);
      return false;
    }

    // 设置机器人探索状态
    mmoBotManager.setBotExploring(botId);

    // 设置探索配置
    const fullConfig: ExplorationConfig = { ...this.defaultConfig, ...config };
    this.botConfigs.set(botId, fullConfig);

    // 初始化探索状态
    this.explorationStates.set(botId, ExplorationState.IDLE);
    this.exploreTargets.set(botId, null);

    // 启动探索循环
    this.startExplorationLoop(botId, fullConfig);

    console.log(`[BotExplorer] 机器人探索已启动: ${bot.name} (${botId})`);
    this.logDebug(botId, `探索配置: ${JSON.stringify(fullConfig, null, 2)}`);

    const logData = { config: fullConfig } as Record<string, unknown>;
    this.addExplorationLog(botId, 'movement', `探索已启动`, logData);

    return true;
  }

  /**
   * 为机器人停止探索
   * @param botId 机器人 ID
   */
  stopExploration(botId: string): void {
    // 清除探索定时器
    const timer = this.explorationTimers.get(botId);
    if (timer) {
      clearInterval(timer);
      this.explorationTimers.delete(botId);
    }

    // 清除探索状态
    this.explorationStates.delete(botId);
    this.botPaths.delete(botId);
    this.botPathIndices.delete(botId);
    this.exploreTargets.delete(botId);
    this.botConfigs.delete(botId);

    console.log(`[BotExplorer] 机器人探索已停止: ${botId}`);

    this.addExplorationLog(botId, 'movement', `探索已停止`);
  }

  /**
   * 停止所有机器人的探索
   */
  stopAllExplorations(): void {
    for (const botId of this.explorationTimers.keys()) {
      this.stopExploration(botId);
    }
    console.log('[BotExplorer] 所有机器人探索已停止');
  }

  /**
   * 启动探索循环
   * @param botId 机器人 ID
   * @param config 探索配置
   */
  private startExplorationLoop(botId: string, config: ExplorationConfig): void {
    const timer = setInterval(() => {
      this.updateExploration(botId);
    }, config.moveSpeed);

    this.explorationTimers.set(botId, timer);
  }

  /**
   * 更新机器人探索
   * @param botId 机器人 ID
   */
  private updateExploration(botId: string): void {
    const bot = mmoBotManager.getBot(botId);
    if (!bot) {
      return;
    }

    const config = this.botConfigs.get(botId);
    if (!config) {
      return;
    }

    const state = this.explorationStates.get(botId) || ExplorationState.IDLE;

    switch (state) {
      case ExplorationState.IDLE:
        this.handleIdleState(botId, bot, config);
        break;

      case ExplorationState.MOVING:
        this.handleMovingState(botId, bot, config);
        break;

      case ExplorationState.COLLECTING:
        this.handleCollectingState(botId, bot, config);
        break;

      case ExplorationState.BATTLE_ENCOUNTER:
        this.handleBattleEncounterState(botId, bot, config);
        break;

      case ExplorationState.WAITING:
        this.handleWaitingState(botId, bot, config);
        break;
    }
  }

  /**
   * 处理空闲状态
   * @param botId 机器人 ID
   * @param bot 机器人数据
   * @param config 探索配置
   */
  private handleIdleState(botId: string, bot: BotData, config: ExplorationConfig): void {
    // 选择探索目标
    const target = this.selectExploreTarget(botId, bot, config);

    if (target) {
      // 设置探索目标
      this.exploreTargets.set(botId, target);
      this.explorationStates.set(botId, ExplorationState.MOVING);

      // 计算路径
      const path = pathfinder.findPath(
        bot.position.tileX,
        bot.position.tileY,
        target.position.x,
        target.position.y
      );

      if (path.length > 0) {
        // 限制路径长度
        const trimmedPath = path.slice(0, config.maxPathLength);
        this.botPaths.set(botId, trimmedPath);
        this.botPathIndices.set(botId, 0);

        this.logDebug(botId, `开始移动到目标 (${target.position.x}, ${target.position.y})，路径长度: ${trimmedPath.length}`);
      } else {
        this.logDebug(botId, `无法找到路径到目标 (${target.position.x}, ${target.position.y})`);
        this.explorationStates.set(botId, ExplorationState.IDLE);
      }
    }
  }

  /**
   * 处理移动状态
   * @param botId 机器人 ID
   * @param bot 机器人数据
   * @param config 探索配置
   */
  private handleMovingState(botId: string, bot: BotData, config: ExplorationConfig): void {
    const path = this.botPaths.get(botId);
    if (!path || path.length === 0) {
      this.explorationStates.set(botId, ExplorationState.IDLE);
      return;
    }

    const pathIndex = this.botPathIndices.get(botId) || 0;

    // 检查是否到达目标
    if (pathIndex >= path.length) {
      this.explorationStates.set(botId, ExplorationState.IDLE);
      this.botPaths.delete(botId);
      this.botPathIndices.delete(botId);

      this.logDebug(botId, `到达目标位置`);
      this.addExplorationLog(botId, 'movement', `到达目标位置`);

      return;
    }

    // 移动到下一个路径点
    const nextPoint = path[pathIndex];
    this.moveBotTo(botId, bot, nextPoint);

    // 更新路径索引
    this.botPathIndices.set(botId, pathIndex + 1);

    // 检查是否发生遭遇
    const encounterResult = this.checkEncounter(botId, bot, nextPoint, config);
    if (encounterResult.encountered) {
      this.explorationStates.set(botId, ExplorationState.BATTLE_ENCOUNTER);

      this.logDebug(botId, `遭遇 ${encounterResult.encounterType}: ${encounterResult.encounterData}`);

      const encounterData = encounterResult as unknown as Record<string, unknown>;
      this.addExplorationLog(botId, 'encounter', `遭遇 ${encounterResult.encounterType}`, encounterData);

      // 触发遭遇事件（这里简化处理，实际应该通知战斗系统）
      this.triggerEncounter(botId, encounterResult);
    } else {
      // 检查是否可以收集资源
      const collectionResult = this.checkResourceCollection(botId, bot, nextPoint, config);
      if (collectionResult.collected) {
        this.explorationStates.set(botId, ExplorationState.COLLECTING);

        this.logDebug(botId, `收集资源: ${collectionResult.resourceType} x${collectionResult.amount}`);

        const collectionData = collectionResult as unknown as Record<string, unknown>;
        this.addExplorationLog(botId, 'collection', `收集 ${collectionResult.resourceType} x${collectionResult.amount}`, collectionData);

        // 更新机器人资源
        this.updateBotResources(botId, collectionResult);
      }
    }
  }

  /**
   * 处理收集资源状态
   * @param botId 机器人 ID
   * @param bot 机器人数据
   * @param config 探索配置
   */
  private handleCollectingState(botId: string, _bot: BotData, config: ExplorationConfig): void {
    // 等待一段时间后继续探索
    setTimeout(() => {
      this.explorationStates.set(botId, ExplorationState.IDLE);
    }, config.waitTime);
  }

  /**
   * 处理遭遇战斗状态
   * @param botId 机器人 ID
   * @param bot 机器人数据
   * @param config 探索配置
   */
  private handleBattleEncounterState(botId: string, _bot: BotData, config: ExplorationConfig): void {
    // 等待一段时间后继续探索（假设战斗已完成）
    setTimeout(() => {
      this.explorationStates.set(botId, ExplorationState.IDLE);
    }, config.waitTime * 2);
  }

  /**
   * 处理等待状态
   * @param botId 机器人 ID
   * @param bot 机器人数据
   * @param config 探索配置
   */
  private handleWaitingState(botId: string, _bot: BotData, config: ExplorationConfig): void {
    // 等待一段时间后继续探索
    setTimeout(() => {
      this.explorationStates.set(botId, ExplorationState.IDLE);
    }, config.waitTime);
  }

  /**
   * 选择探索目标
   * @param botId 机器人 ID
   * @param bot 机器人数据
   * @param config 探索配置
   * @returns 探索目标
   */
  private selectExploreTarget(botId: string, bot: BotData, config: ExplorationConfig): ExploreTarget | null {
    // 根据机器人性格选择目标
    switch (bot.personality) {
      case BotPersonality.AGGRESSIVE:
        // 激进型机器人倾向于进入遭遇区域
        return this.selectAggressiveTarget(botId, bot, config);

      case BotPersonality.COLLECTOR:
        // 收集型机器人倾向于寻找资源点
        return this.selectCollectorTarget(botId, bot, config);

      case BotPersonality.SUPPORTIVE:
        // 辅助型机器人倾向于停留在安全区域
        return this.selectSupportiveTarget(botId, bot, config);

      case BotPersonality.BALANCED:
        // 平衡型机器人随机探索
        return this.selectBalancedTarget(botId, bot, config);

      default:
        return this.selectRandomTarget(botId, bot, config);
    }
  }

  /**
   * 选择激进型目标
   */
  private selectAggressiveTarget(botId: string, bot: BotData, config: ExplorationConfig): ExploreTarget | null {
    // 70% 概率寻找遭遇区域，30% 概率随机移动
    if (Math.random() < 0.7) {
      const grassTile = this.findNearestTile(botId, bot, config, (tileX, tileY) => {
        const collisionType = collisionManager.getCollisionType(tileX, tileY);
        return collisionType === CollisionType.GRASS;
      });

      if (grassTile) {
        return {
          position: { x: grassTile.x, y: grassTile.y },
          type: 'random',
          priority: 80,
          distance: Math.abs(grassTile.x - bot.position.tileX) + Math.abs(grassTile.y - bot.position.tileY),
        };
      }
    }

    return this.selectRandomTarget(botId, bot, config);
  }

  /**
   * 选择收集型目标
   */
  private selectCollectorTarget(botId: string, bot: BotData, config: ExplorationConfig): ExploreTarget | null {
    // 70% 概率寻找边缘区域（可能有资源），30% 概率随机移动
    if (Math.random() < 0.7) {
      const edgeTile = this.findEdgeTile(botId, bot, config);

      if (edgeTile) {
        return {
          position: { x: edgeTile.x, y: edgeTile.y },
          type: 'resource',
          priority: 90,
          distance: Math.abs(edgeTile.x - bot.position.tileX) + Math.abs(edgeTile.y - bot.position.tileY),
        };
      }
    }

    return this.selectRandomTarget(botId, bot, config);
  }

  /**
   * 选择辅助型目标
   */
  private selectSupportiveTarget(botId: string, bot: BotData, config: ExplorationConfig): ExploreTarget | null {
    // 70% 概率停留在中心区域（安全），30% 概率随机移动
    if (Math.random() < 0.7) {
      const safeTile = this.findSafeTile(botId, bot, config);

      if (safeTile) {
        return {
          position: { x: safeTile.x, y: safeTile.y },
          type: 'safe_zone',
          priority: 70,
          distance: Math.abs(safeTile.x - bot.position.tileX) + Math.abs(safeTile.y - bot.position.tileY),
        };
      }
    }

    return this.selectRandomTarget(botId, bot, config);
  }

  /**
   * 选择平衡型目标
   */
  private selectBalancedTarget(botId: string, bot: BotData, config: ExplorationConfig): ExploreTarget | null {
    // 随机选择目标类型
    const random = Math.random();
    if (random < 0.4) {
      return this.selectRandomTarget(botId, bot, config);
    } else if (random < 0.7) {
      return this.selectAggressiveTarget(botId, bot, config);
    } else {
      return this.selectCollectorTarget(botId, bot, config);
    }
  }

  /**
   * 选择随机目标
   */
  private selectRandomTarget(_botId: string, bot: BotData, config: ExplorationConfig): ExploreTarget | null {
    // 在探索范围内随机选择一个可通行的位置
    for (let attempts = 0; attempts < 50; attempts++) {
      const dx = Math.floor((Math.random() - 0.5) * 2 * config.exploreRange);
      const dy = Math.floor((Math.random() - 0.5) * 2 * config.exploreRange);

      const targetX = bot.position.tileX + dx;
      const targetY = bot.position.tileY + dy;

      // 检查是否可通行
      if (!collisionManager.isTileSolid(targetX, targetY)) {
        return {
          position: { x: targetX, y: targetY },
          type: 'random',
          priority: 50,
          distance: Math.abs(dx) + Math.abs(dy),
        };
      }
    }

    return null;
  }

  /**
   * 查找最近的符合条件的位置
   */
  private findNearestTile(
    _botId: string,
    bot: BotData,
    config: ExplorationConfig,
    predicate: (x: number, y: number) => boolean
  ): { x: number; y: number } | null {
    const botX = bot.position.tileX;
    const botY = bot.position.tileY;

    // 从近到远搜索
    for (let distance = 1; distance <= config.exploreRange; distance++) {
      for (let dx = -distance; dx <= distance; dx++) {
        for (let dy = -distance; dy <= distance; dy++) {
          if (Math.abs(dx) + Math.abs(dy) !== distance) {
            continue;
          }

          const tileX = botX + dx;
          const tileY = botY + dy;

          if (!collisionManager.isTileSolid(tileX, tileY) && predicate(tileX, tileY)) {
            return { x: tileX, y: tileY };
          }
        }
      }
    }

    return null;
  }

  /**
   * 查找边缘位置
   */
  private findEdgeTile(_botId: string, bot: BotData, config: ExplorationConfig): { x: number; y: number } | null {
    const botX = bot.position.tileX;
    const botY = bot.position.tileY;

    // 尝试找到地图边缘的位置
    for (let attempts = 0; attempts < 20; attempts++) {
      // 随机选择一个方向
      const directions = [
        { dx: 1, dy: 0 },   // 右
        { dx: -1, dy: 0 },  // 左
        { dx: 0, dy: 1 },   // 下
        { dx: 0, dy: -1 },  // 上
      ];

      const dir = directions[Math.floor(Math.random() * directions.length)];
      const distance = Math.floor(Math.random() * config.exploreRange) + 5;

      const targetX = botX + dir.dx * distance;
      const targetY = botY + dir.dy * distance;

      if (!collisionManager.isTileSolid(targetX, targetY)) {
        return { x: targetX, y: targetY };
      }
    }

    return null;
  }

  /**
   * 查找安全位置
   */
  private findSafeTile(_botId: string, bot: BotData, config: ExplorationConfig): { x: number; y: number } | null {
    // 尝试找到一个安全的位置（非草地，靠近中心）
    const botX = bot.position.tileX;
    const botY = bot.position.tileY;

    for (let attempts = 0; attempts < 20; attempts++) {
      const dx = Math.floor((Math.random() - 0.5) * 2 * config.exploreRange / 2);
      const dy = Math.floor((Math.random() - 0.5) * 2 * config.exploreRange / 2);

      const targetX = botX + dx;
      const targetY = botY + dy;

      if (!collisionManager.isTileSolid(targetX, targetY)) {
        const collisionType = collisionManager.getCollisionType(targetX, targetY);
        if (collisionType !== CollisionType.GRASS) {
          return { x: targetX, y: targetY };
        }
      }
    }

    return null;
  }

  /**
   * 移动机器人到指定位置
   * @param botId 机器人 ID
   * @param bot 机器人数据
   * @param target 目标位置
   */
  private moveBotTo(botId: string, bot: BotData, target: PathPoint): void {
    // 更新机器人位置
    const newPosition: PlayerPosition = {
      tileX: target.x,
      tileY: target.y,
      x: target.x * 32,
      y: target.y * 32,
      jumpOffset: 0,
    };

    bot.position = newPosition;

    // 更新朝向
    const dx = target.x - bot.position.tileX;
    const dy = target.y - bot.position.tileY;

    if (Math.abs(dx) > Math.abs(dy)) {
      bot.direction = dx > 0 ? Direction.RIGHT : Direction.LEFT;
    } else {
      bot.direction = dy > 0 ? Direction.DOWN : Direction.UP;
    }

    // 更新机器人管理器中的位置
    mmoBotManager.updateBotPosition(botId, newPosition);
    mmoBotManager.updateBotDirection(botId, bot.direction);

    this.logDebug(botId, `移动到 (${target.x}, ${target.y})`);
  }

  /**
   * 检查是否发生遭遇
   * @param botId 机器人 ID
   * @param bot 机器人数据
   * @param target 目标位置
   * @param config 探索配置
   * @returns 遭遇结果
   */
  private checkEncounter(_botId: string, bot: BotData, target: PathPoint, config: ExplorationConfig): EncounterResult {
    // 检查当前位置是否为遭遇区域
    const collisionType = collisionManager.getCollisionType(target.x, target.y);

    if (collisionType !== CollisionType.GRASS) {
      return { encountered: false, encounterType: 'none' };
    }

    // 根据配置的概率决定是否触发遭遇
    if (Math.random() > config.encounterProbability) {
      return { encountered: false, encounterType: 'none' };
    }

    // 根据机器人性格调整遭遇概率
    let adjustedProbability = config.encounterProbability;
    switch (bot.personality) {
      case BotPersonality.AGGRESSIVE:
        adjustedProbability *= 1.5; // 激进型更容易遭遇
        break;
      case BotPersonality.SUPPORTIVE:
        adjustedProbability *= 0.5; // 辅助型更少遭遇
        break;
    }

    if (Math.random() > adjustedProbability) {
      return { encountered: false, encounterType: 'none' };
    }

    // 决定遭遇类型（简化处理，只考虑野生怪物）
    const encounterType = 'wild_monster';

    // 生成怪物 ID（这里简化处理）
    const monsterIds = ['txmn_cardiling', 'txmn_rockitten', 'txmn_nudiflot', 'txmn_djinnos'];
    const monsterId = monsterIds[Math.floor(Math.random() * monsterIds.length)];

    return {
      encountered: true,
      encounterType,
      encounterData: monsterId,
      position: { x: target.x, y: target.y },
    };
  }

  /**
   * 检查是否可以收集资源
   * @param botId 机器人 ID
   * @param bot 机器人数据
   * @param target 目标位置
   * @param config 探索配置
   * @returns 收集结果
   */
  private checkResourceCollection(_botId: string, bot: BotData, _target: PathPoint, config: ExplorationConfig): ResourceCollectionResult {
    // 收集型机器人有更高的收集概率
    let collectionProbability = config.resourceProbability;
    if (bot.personality === BotPersonality.COLLECTOR) {
      collectionProbability *= 1.5;
    }

    // 检查是否触发资源收集
    if (Math.random() > collectionProbability) {
      return { collected: false, resourceType: 'gold', amount: 0 };
    }

    // 决定资源类型
    const random = Math.random();
    let resourceType: 'gold' | 'item' | 'pokeball';
    let amount = 0;

    if (random < 0.6) {
      // 60% 概率获得金币
      resourceType = 'gold';
      amount = Math.floor(Math.random() * 50) + 10;
    } else if (random < 0.9) {
      // 30% 概率获得捕捉球
      resourceType = 'pokeball';
      amount = Math.floor(Math.random() * 3) + 1;
    } else {
      // 10% 概率获得道具
      resourceType = 'item';
      amount = 1;
    }

    return {
      collected: true,
      resourceType,
      amount,
    };
  }

  /**
   * 更新机器人资源
   * @param botId 机器人 ID
   * @param result 收集结果
   */
  private updateBotResources(botId: string, result: ResourceCollectionResult): void {
    const bot = mmoBotManager.getBot(botId);
    if (!bot) {
      return;
    }

    switch (result.resourceType) {
      case 'gold':
        mmoBotManager.updateBotResources(botId, {
          gold: bot.resources.gold + result.amount,
        });
        break;

      case 'pokeball':
        mmoBotManager.updateBotResources(botId, {
          pokeballs: bot.resources.pokeballs + result.amount,
        });
        break;

      case 'item':
        // 道具暂时只记录，不实际添加
        break;
    }
  }

  /**
   * 触发遭遇事件
   * @param botId 机器人 ID
   * @param encounterResult 遭遇结果
   */
  private triggerEncounter(botId: string, encounterResult: EncounterResult): void {
    // 这里应该通知战斗系统开始战斗
    // 简化处理，只记录日志
    console.log(`[BotExplorer] 遭遇事件: ${botId} -> ${encounterResult.encounterType} (${encounterResult.encounterData})`);
  }

  /**
   * 添加探索日志
   * @param botId 机器人 ID
   * @param type 日志类型
   * @param message 日志消息
   * @param data 附加数据
   */
  private addExplorationLog(botId: string, type: ExplorationLog['type'], message: string, data?: Record<string, unknown>): void {
    const log: ExplorationLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      botId,
      timestamp: Date.now(),
      type,
      message,
      data,
    };

    this.explorationLogs.push(log);

    // 限制日志数量
    if (this.explorationLogs.length > this.MAX_LOGS) {
      this.explorationLogs.shift();
    }

    this.logDebug(botId, `[${type}] ${message}`);
  }

  /**
   * 获取探索日志
   * @param botId 机器人 ID（可选，不指定则返回所有日志）
   * @param limit 最大日志数量（可选）
   * @returns 探索日志
   */
  getExplorationLogs(botId?: string, limit?: number): ExplorationLog[] {
    let logs = this.explorationLogs;

    if (botId) {
      logs = logs.filter(log => log.botId === botId);
    }

    logs = logs.sort((a, b) => b.timestamp - a.timestamp);

    if (limit) {
      logs = logs.slice(0, limit);
    }

    return logs;
  }

  /**
   * 获取机器人探索状态
   * @param botId 机器人 ID
   * @returns 探索状态
   */
  getExplorationState(botId: string): ExplorationState | null {
    return this.explorationStates.get(botId) || null;
  }

  /**
   * 获取机器人探索配置
   * @param botId 机器人 ID
   * @returns 探索配置
   */
  getExplorationConfig(botId: string): ExplorationConfig | undefined {
    return this.botConfigs.get(botId);
  }

  /**
   * 设置机器人探索配置
   * @param botId 机器人 ID
   * @param config 探索配置
   */
  setExplorationConfig(botId: string, config: Partial<ExplorationConfig>): void {
    const currentConfig = this.botConfigs.get(botId);
    if (currentConfig) {
      const newConfig: ExplorationConfig = { ...currentConfig, ...config };
      this.botConfigs.set(botId, newConfig);
      this.logDebug(botId, `探索配置已更新`);
    }
  }

  /**
   * 调试日志
   * @param botId 机器人 ID
   * @param message 日志消息
   */
  private logDebug(botId: string, message: string): void {
    const config = this.botConfigs.get(botId);
    if (config && config.debugLogging) {
      console.log(`[BotExplorer] [${botId}] ${message}`);
    }
  }

  /**
   * 重置机器人探索器
   */
  reset(): void {
    this.stopAllExplorations();
    this.explorationStates.clear();
    this.botPaths.clear();
    this.botPathIndices.clear();
    this.exploreTargets.clear();
    this.botConfigs.clear();
    this.explorationLogs = [];
    console.log('[BotExplorer] MMO 机器人探索器已重置');
  }
}

/**
 * 导出机器人探索器单例
 */
export const mmoBotExplorer = BotExplorer.getInstance();
