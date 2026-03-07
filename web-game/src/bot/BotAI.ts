/**
 * 机器人 AI 系统
 *
 * 基于 Tuxemon 的 NPC 行为系统实现机器人 AI
 *
 * 功能：
 * - 自动移动逻辑（地图探索）
 * - 自动交互逻辑（NPC、物品）
 * - 简单决策树
 * - AI 行为调试日志
 * - 性格驱动的行为模式
 */

import { Direction } from '../engine/PlayerController';
import { botManager, BotType, BotPersonality } from './BotManager';
import { pathfinder, PathPoint } from '../engine/Pathfinder';
import { collisionManager } from '../engine/CollisionManager';

/**
 * AI 决策类型枚举
 */
export enum AIDecisionType {
  /** 移动 */
  MOVE = 'move',
  /** 交互 */
  INTERACT = 'interact',
  /** 对战 */
  BATTLE = 'battle',
  /** 休息 */
  IDLE = 'idle',
}

/**
 * AI 决策结果接口
 */
export interface AIDecision {
  /** 决策类型 */
  type: AIDecisionType;
  /** 目标位置（移动时） */
  targetPosition?: { x: number; y: number };
  /** 目标对象 ID（交互/对战时） */
  targetId?: string;
  /** 动作参数 */
  params?: Record<string, unknown>;
  /** 优先级（数值越大越优先） */
  priority: number;
}

/**
 * 探索目标接口
 */
export interface ExploreTarget {
  /** 目标位置 */
  position: PathPoint;
  /** 目标类型 */
  type: 'unknown' | 'interest' | 'npc' | 'item' | 'exit';
  /** 目标距离 */
  distance: number;
  /** 探索价值（数值越大越值得探索） */
  value: number;
}

/**
 * 交互目标接口
 */
export interface InteractTarget {
  /** 目标 ID */
  id: string;
  /** 目标类型 */
  type: 'npc' | 'item' | 'player';
  /** 目标位置 */
  position: PathPoint;
  /** 交互价值 */
  value: number;
  /** 是否在范围内 */
  inRange: boolean;
}

/**
 * 决策树节点接口
 */
interface DecisionTreeNode {
  /** 条件函数 */
  condition: (botId: string) => boolean;
  /** 条件满足时的决策 */
  decision: AIDecision | null;
  /** 条件不满足时的子节点 */
  elseNode?: DecisionTreeNode;
}

/**
 * 机器人 AI 配置接口
 */
export interface BotAIConfig {
  /** 移动速度（毫秒/格） */
  moveSpeed: number;
  /** 探索范围（瓦片） */
  exploreRange: number;
  /** 交互范围（瓦片） */
  interactRange: number;
  /** 决策间隔（毫秒） */
  decisionInterval: number;
  /** 是否启用调试日志 */
  debugLogging: boolean;
  /** 最大路径长度 */
  maxPathLength: number;
  /** 随机探索概率（0-1） */
  randomExploreProbability: number;
}

/**
 * 机器人 AI 系统类
 */
export class BotAI {
  private static instance: BotAI;

  /** 机器人决策定时器 */
  private decisionTimers: Map<string, NodeJS.Timeout> = new Map();

  /** 机器人当前路径 */
  private botPaths: Map<string, PathPoint[]> = new Map();

  /** 机器人当前路径索引 */
  private botPathIndices: Map<string, number> = new Map();

  /** 机器人当前决策 */
  private currentDecisions: Map<string, AIDecision> = new Map();

  /** 机器人 AI 配置 */
  private botConfigs: Map<string, BotAIConfig> = new Map();

  /** 探索目标缓存 */
  private exploreTargets: Map<string, ExploreTarget[]> = new Map();

  /** 交互目标缓存 */
  private interactTargets: Map<string, InteractTarget[]> = new Map();

  /** 默认配置 */
  private readonly defaultConfig: BotAIConfig = {
    moveSpeed: 300,
    exploreRange: 20,
    interactRange: 3,
    decisionInterval: 1000,
    debugLogging: false,
    maxPathLength: 50,
    randomExploreProbability: 0.3,
  };

  /** 是否已初始化 */
  private initialized = false;

  /**
   * 私有构造函数，确保单例
   */
  private constructor() {}

  /**
   * 获取机器人 AI 单例实例
   */
  static getInstance(): BotAI {
    if (!BotAI.instance) {
      BotAI.instance = new BotAI();
    }
    return BotAI.instance;
  }

  /**
   * 初始化机器人 AI 系统
   */
  initialize(): void {
    if (this.initialized) {
      console.warn('[BotAI] 已经初始化');
      return;
    }

    this.initialized = true;
    console.log('[BotAI] 机器人 AI 系统已初始化');
  }

  /**
   * 为机器人启动 AI
   * @param botId 机器人 ID
   * @param config AI 配置（可选）
   */
  startBotAI(botId: string, config?: Partial<BotAIConfig>): void {
    const bot = botManager.getBot(botId);
    if (!bot) {
      console.error(`[BotAI] 机器人不存在: ${botId}`);
      return;
    }

    // 设置 AI 配置
    const fullConfig: BotAIConfig = { ...this.defaultConfig, ...config };
    this.botConfigs.set(botId, fullConfig);

    // 设置机器人在线
    botManager.setBotOnline(botId);

    // 启动决策定时器
    this.startDecisionTimer(botId, fullConfig);

    console.log(`[BotAI] 机器人 AI 已启动: ${bot.name} (${botId})`);
    this.logDebug(botId, `AI 配置: ${JSON.stringify(fullConfig, null, 2)}`);
  }

  /**
   * 为机器人停止 AI
   * @param botId 机器人 ID
   */
  stopBotAI(botId: string): void {
    const timer = this.decisionTimers.get(botId);
    if (timer) {
      clearInterval(timer);
      this.decisionTimers.delete(botId);
    }

    this.botPaths.delete(botId);
    this.botPathIndices.delete(botId);
    this.currentDecisions.delete(botId);
    this.botConfigs.delete(botId);
    this.exploreTargets.delete(botId);
    this.interactTargets.delete(botId);

    botManager.setBotOffline(botId);

    console.log(`[BotAI] 机器人 AI 已停止: ${botId}`);
  }

  /**
   * 更新机器人状态
   * @param botId 机器人 ID
   * @param deltaTime 距离上一帧的时间（毫秒）
   */
  updateBot(botId: string, deltaTime: number): void {
    const bot = botManager.getBot(botId);
    if (!bot) {
      return;
    }

    const config = this.botConfigs.get(botId);
    if (!config) {
      return;
    }

    // 更新移动
    this.updateBotMovement(botId, bot, deltaTime, config);

    // 执行当前决策
    this.executeCurrentDecision(botId, bot, config);
  }

  /**
   * 生成 AI 决策
   * @param botId 机器人 ID
   * @returns AI 决策
   */
  generateDecision(botId: string): AIDecision {
    const bot = botManager.getBot(botId);
    if (!bot) {
      return this.createIdleDecision();
    }

    // 根据机器人类型选择决策策略
    switch (bot.type) {
      case BotType.BATTLE:
        return this.generateBattleBotDecision(botId, bot);
      case BotType.SOCIAL:
        return this.generateSocialBotDecision(botId, bot);
      case BotType.GATHERER:
        return this.generateGathererBotDecision(botId, bot);
      case BotType.EXPLORER:
        return this.generateExplorerBotDecision(botId, bot);
      default:
        return this.generateBalancedBotDecision(botId, bot);
    }
  }

  /**
   * 生成对战机器人决策
   */
  private generateBattleBotDecision(botId: string, bot: any): AIDecision {
    // 激进型机器人优先寻找玩家对战
    if (bot.personality === BotPersonality.AGGRESSIVE) {
      const opponent = this.findNearbyPlayer(botId);
      if (opponent) {
        return {
          type: AIDecisionType.BATTLE,
          targetId: opponent.id,
          priority: 100,
        };
      }
    }

    // 平衡型和辅助型机器人先探索
    return this.generateExploreDecision(botId, bot);
  }

  /**
   * 生成社交机器人决策
   */
  private generateSocialBotDecision(botId: string, bot: any): AIDecision {
    // 寻找附近的 NPC 交互
    const npc = this.findNearbyNPC(botId);
    if (npc) {
      return {
        type: AIDecisionType.INTERACT,
        targetId: npc.id,
        priority: 80,
      };
    }

    // 友好型机器人寻找玩家聊天
    if (bot.personality === BotPersonality.FRIENDLY) {
      const player = this.findNearbyPlayer(botId);
      if (player) {
        return {
          type: AIDecisionType.INTERACT,
          targetId: player.id,
          priority: 70,
        };
      }
    }

    return this.generateExploreDecision(botId, bot);
  }

  /**
   * 生成收集机器人决策
   */
  private generateGathererBotDecision(botId: string, bot: any): AIDecision {
    // 寻找附近的物品
    const item = this.findNearbyItem(botId);
    if (item) {
      return {
        type: AIDecisionType.INTERACT,
        targetId: item.id,
        priority: 90,
      };
    }

    // 探索未知区域
    return this.generateExploreDecision(botId, bot);
  }

  /**
   * 生成探索机器人决策
   */
  private generateExplorerBotDecision(botId: string, bot: any): AIDecision {
    // 探索未知区域
    return this.generateExploreDecision(botId, bot);
  }

  /**
   * 生成平衡机器人决策
   */
  private generateBalancedBotDecision(botId: string, bot: any): AIDecision {
    // 使用决策树
    const decisionTree = this.buildDecisionTree(bot);
    return this.evaluateDecisionTree(botId, decisionTree) || this.createIdleDecision();
  }

  /**
   * 生成探索决策
   */
  private generateExploreDecision(botId: string, bot: any): AIDecision {
    const config = this.botConfigs.get(botId);
    if (!config) {
      return this.createIdleDecision();
    }

    // 随机探索或目标探索
    if (Math.random() < config.randomExploreProbability) {
      // 随机移动
      return this.createRandomMoveDecision(botId, bot, config);
    } else {
      // 目标探索
      const target = this.findExploreTarget(botId, bot, config);
      if (target) {
        return {
          type: AIDecisionType.MOVE,
          targetPosition: target.position,
          priority: target.value,
        };
      }
    }

    return this.createIdleDecision();
  }

  /**
   * 创建随机移动决策
   */
  private createRandomMoveDecision(_botId: string, bot: any, _config: BotAIConfig): AIDecision {
    const directions: Direction[] = [
      Direction.UP,
      Direction.DOWN,
      Direction.LEFT,
      Direction.RIGHT,
    ];

    // 随机选择方向
    const randomDirection = directions[Math.floor(Math.random() * directions.length)];

    // 计算目标位置
    let targetX = bot.position.tileX;
    let targetY = bot.position.tileY;

    switch (randomDirection) {
      case Direction.UP:
        targetY--;
        break;
      case Direction.DOWN:
        targetY++;
        break;
      case Direction.LEFT:
        targetX--;
        break;
      case Direction.RIGHT:
        targetX++;
        break;
    }

    // 检查是否可通行
    if (!collisionManager.isTileSolid(targetX, targetY)) {
      return {
        type: AIDecisionType.MOVE,
        targetPosition: { x: targetX, y: targetY },
        priority: 50,
      };
    }

    return this.createIdleDecision();
  }

  /**
   * 创建空闲决策
   */
  private createIdleDecision(): AIDecision {
    return {
      type: AIDecisionType.IDLE,
      priority: 10,
    };
  }

  /**
   * 构建决策树
   */
  private buildDecisionTree(bot: any): DecisionTreeNode {
    return {
      condition: (botId: string) => {
        // 检查是否有需要交互的目标
        return this.hasInteractTarget(botId);
      },
      decision: this.createInteractDecision(bot.id),
      elseNode: {
        condition: (_botId: string) => {
          // 检查是否有探索目标
          return this.hasExploreTarget(bot.id);
        },
        decision: this.createExploreDecisionFromTarget(bot.id),
        elseNode: {
          condition: () => Math.random() < 0.7,
          decision: this.createRandomMoveDecision(bot.id, bot, this.botConfigs.get(bot.id)!),
          elseNode: {
            condition: () => true,
            decision: this.createIdleDecision(),
          },
        },
      },
    };
  }

  /**
   * 评估决策树
   */
  private evaluateDecisionTree(botId: string, node: DecisionTreeNode): AIDecision | null {
    if (node.condition(botId)) {
      return node.decision;
    } else if (node.elseNode) {
      return this.evaluateDecisionTree(botId, node.elseNode);
    }
    return null;
  }

  /**
   * 创建交互决策
   */
  private createInteractDecision(botId: string): AIDecision {
    const targets = this.interactTargets.get(botId);
    if (!targets || targets.length === 0) {
      return this.createIdleDecision();
    }

    // 选择价值最高的目标
    const target = targets.reduce((max, t) => (t.value > max.value ? t : max), targets[0]);

    return {
      type: AIDecisionType.INTERACT,
      targetId: target.id,
      params: { type: target.type },
      priority: target.value,
    };
  }

  /**
   * 从探索目标创建移动决策
   */
  private createExploreDecisionFromTarget(botId: string): AIDecision {
    const targets = this.exploreTargets.get(botId);
    if (!targets || targets.length === 0) {
      return this.createIdleDecision();
    }

    // 选择价值最高的目标
    const target = targets.reduce((max, t) => (t.value > max.value ? t : max), targets[0]);

    return {
      type: AIDecisionType.MOVE,
      targetPosition: target.position,
      priority: target.value,
    };
  }

  /**
   * 检查是否有交互目标
   */
  private hasInteractTarget(botId: string): boolean {
    const targets = this.interactTargets.get(botId);
    return targets !== undefined && targets.length > 0;
  }

  /**
   * 检查是否有探索目标
   */
  private hasExploreTarget(botId: string): boolean {
    const targets = this.exploreTargets.get(botId);
    return targets !== undefined && targets.length > 0;
  }

  /**
   * 查找探索目标
   */
  private findExploreTarget(botId: string, bot: any, config: BotAIConfig): ExploreTarget | null {
    // 更新探索目标缓存
    this.updateExploreTargets(botId, bot, config);

    const targets = this.exploreTargets.get(botId);
    if (!targets || targets.length === 0) {
      return null;
    }

    // 随机选择一个高价值目标
    const highValueTargets = targets.filter(t => t.value >= 50);
    if (highValueTargets.length > 0) {
      return highValueTargets[Math.floor(Math.random() * highValueTargets.length)];
    }

    return targets[Math.floor(Math.random() * targets.length)];
  }

  /**
   * 更新探索目标
   */
  private updateExploreTargets(botId: string, bot: any, config: BotAIConfig): void {
    const targets: ExploreTarget[] = [];
    const botX = bot.position.tileX;
    const botY = bot.position.tileY;

    // 扫描周围的瓦片
    for (let dy = -config.exploreRange; dy <= config.exploreRange; dy++) {
      for (let dx = -config.exploreRange; dx <= config.exploreRange; dx++) {
        const targetX = botX + dx;
        const targetY = botY + dy;

        // 检查是否在地图范围内
        if (targetX < 0 || targetY < 0) {
          continue;
        }

        // 检查是否可通行
        if (collisionManager.isTileSolid(targetX, targetY)) {
          continue;
        }

        // 计算距离
        const distance = Math.abs(dx) + Math.abs(dy);
        if (distance > config.exploreRange) {
          continue;
        }

        // 计算探索价值
        const value = this.calculateExploreValue(bot, targetX, targetY, distance);

        targets.push({
          position: { x: targetX, y: targetY },
          type: 'unknown',
          distance,
          value,
        });
      }
    }

    // 按价值排序
    targets.sort((a, b) => b.value - a.value);

    this.exploreTargets.set(botId, targets);
  }

  /**
   * 计算探索价值
   */
  private calculateExploreValue(bot: any, x: number, y: number, distance: number): number {
    let value = 50; // 基础价值

    // 根据机器人性格调整
    switch (bot.personality) {
      case BotPersonality.AGGRESSIVE:
        // 激进型更喜欢开阔区域
        if (this.isOpenArea(x, y)) {
          value += 20;
        }
        break;
      case BotPersonality.COLLECTOR:
        // 收集型更喜欢边缘区域
        if (this.isEdgeArea(x, y)) {
          value += 20;
        }
        break;
      case BotPersonality.FRIENDLY:
        // 友好型更喜欢中心区域
        if (this.isCenterArea(x, y)) {
          value += 20;
        }
        break;
      case BotPersonality.BALANCED:
        // 平衡型随机偏好
        value += Math.random() * 10;
        break;
    }

    // 距离越远，价值越高
    value += distance * 2;

    return Math.round(value);
  }

  /**
   * 检查是否是开阔区域
   */
  private isOpenArea(x: number, y: number): boolean {
    // 检查周围 3x3 区域的可通行瓦片数量
    let passableCount = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!collisionManager.isTileSolid(x + dx, y + dy)) {
          passableCount++;
        }
      }
    }
    return passableCount >= 6;
  }

  /**
   * 检查是否是边缘区域
   */
  private isEdgeArea(x: number, y: number): boolean {
    // 简单判断：x 或 y 接近边界
    return x < 5 || y < 5 || x > 50 || y > 50;
  }

  /**
   * 检查是否是中心区域
   */
  private isCenterArea(x: number, y: number): boolean {
    // 简单判断：x 和 y 都在中间范围
    return x > 20 && x < 40 && y > 10 && y < 30;
  }

  /**
   * 查找附近的 NPC
   */
  private findNearbyNPC(botId: string): any | null {
    const bot = botManager.getBot(botId);
    if (!bot) {
      return null;
    }

    const config = this.botConfigs.get(botId);
    if (!config) {
      return null;
    }

    // 这里应该从 NPCManager 获取附近 NPC
    // 暂时返回 null
    return null;
  }

  /**
   * 查找附近的玩家
   */
  private findNearbyPlayer(botId: string): any | null {
    const bot = botManager.getBot(botId);
    if (!bot) {
      return null;
    }

    const config = this.botConfigs.get(botId);
    if (!config) {
      return null;
    }

    // 这里应该从 WebSocketServer 获取附近玩家
    // 暂时返回 null
    return null;
  }

  /**
   * 查找附近的物品
   */
  private findNearbyItem(botId: string): any | null {
    const bot = botManager.getBot(botId);
    if (!bot) {
      return null;
    }

    const config = this.botConfigs.get(botId);
    if (!config) {
      return null;
    }

    // 这里应该从 ItemManager 获取附近物品
    // 暂时返回 null
    return null;
  }

  /**
   * 启动决策定时器
   */
  private startDecisionTimer(botId: string, config: BotAIConfig): void {
    const timer = setInterval(() => {
      const decision = this.generateDecision(botId);
      this.currentDecisions.set(botId, decision);

      this.logDebug(botId, `生成新决策: ${decision.type} (优先级: ${decision.priority})`);
    }, config.decisionInterval);

    this.decisionTimers.set(botId, timer);
  }

  /**
   * 更新机器人移动
   */
  private updateBotMovement(botId: string, bot: any, deltaTime: number, config: BotAIConfig): void {
    const path = this.botPaths.get(botId);
    if (!path || path.length === 0) {
      return;
    }

    const pathIndex = this.botPathIndices.get(botId) || 0;
    const currentPoint = path[pathIndex];

    if (!currentPoint) {
      this.botPaths.delete(botId);
      this.botPathIndices.delete(botId);
      return;
    }

    // 计算移动进度
    const progress = this.calculateMoveProgress(bot, currentPoint, config, deltaTime);

    if (progress >= 1) {
      // 到达当前点，移动到下一个点
      this.moveToNextPathPoint(botId, bot);
    } else {
      // 平滑移动
      this.smoothMove(bot, currentPoint, progress);
    }
  }

  /**
   * 计算移动进度
   */
  private calculateMoveProgress(_bot: any, _target: PathPoint, _config: BotAIConfig, _deltaTime: number): number {
    // 简化实现，实际应该跟踪移动进度
    return 1; // 假设已经移动完成
  }

  /**
   * 移动到下一个路径点
   */
  private moveToNextPathPoint(botId: string, bot: any): void {
    const path = this.botPaths.get(botId);
    if (!path) {
      return;
    }

    const pathIndex = this.botPathIndices.get(botId) || 0;
    const nextIndex = pathIndex + 1;

    if (nextIndex >= path.length) {
      // 路径结束
      this.botPaths.delete(botId);
      this.botPathIndices.delete(botId);
    } else {
      // 移动到下一个点
      const nextPoint = path[nextIndex];
      bot.position.tileX = nextPoint.x;
      bot.position.tileY = nextPoint.y;
      bot.position.x = nextPoint.x * 32;
      bot.position.y = nextPoint.y * 32;
      this.botPathIndices.set(botId, nextIndex);

      // 更新朝向
      this.updateDirection(bot, nextPoint);
    }
  }

  /**
   * 平滑移动
   */
  private smoothMove(bot: any, target: PathPoint, progress: number): void {
    const startX = bot.position.x;
    const startY = bot.position.y;
    const endX = target.x * 32;
    const endY = target.y * 32;

    // 使用缓动函数
    const easedProgress = this.easeInOutQuad(progress);

    bot.position.x = startX + (endX - startX) * easedProgress;
    bot.position.y = startY + (endY - startY) * easedProgress;
  }

  /**
   * 更新朝向
   */
  private updateDirection(bot: any, target: PathPoint): void {
    const dx = target.x - bot.position.tileX;
    const dy = target.y - bot.position.tileY;

    if (Math.abs(dx) > Math.abs(dy)) {
      bot.direction = dx > 0 ? Direction.RIGHT : Direction.LEFT;
    } else {
      bot.direction = dy > 0 ? Direction.DOWN : Direction.UP;
    }
  }

  /**
   * 执行当前决策
   */
  private executeCurrentDecision(botId: string, bot: any, config: BotAIConfig): void {
    const decision = this.currentDecisions.get(botId);
    if (!decision) {
      return;
    }

    switch (decision.type) {
      case AIDecisionType.MOVE:
        this.executeMoveDecision(botId, bot, decision, config);
        break;
      case AIDecisionType.INTERACT:
        this.executeInteractDecision(botId, bot, decision);
        break;
      case AIDecisionType.BATTLE:
        this.executeBattleDecision(botId, bot, decision);
        break;
      case AIDecisionType.IDLE:
        // 空闲，不做任何事
        break;
    }
  }

  /**
   * 执行移动决策
   */
  private executeMoveDecision(botId: string, bot: any, decision: AIDecision, config: BotAIConfig): void {
    if (!decision.targetPosition) {
      return;
    }

    // 计算路径
    const path = pathfinder.findPath(
      bot.position.tileX,
      bot.position.tileY,
      decision.targetPosition.x,
      decision.targetPosition.y
    );

    if (path.length === 0) {
      this.logDebug(botId, `无法找到路径到 (${decision.targetPosition.x}, ${decision.targetPosition.y})`);
      return;
    }

    // 限制路径长度
    const trimmedPath = path.slice(0, config.maxPathLength);
    this.botPaths.set(botId, trimmedPath);
    this.botPathIndices.set(botId, 0);

    this.logDebug(botId, `开始移动，路径长度: ${trimmedPath.length}`);
  }

  /**
   * 执行交互决策
   */
  private executeInteractDecision(botId: string, _bot: any, decision: AIDecision): void {
    this.logDebug(botId, `与目标交互: ${decision.targetId}`);
    // 这里应该执行实际的交互逻辑
  }

  /**
   * 执行对战决策
   */
  private executeBattleDecision(botId: string, _bot: any, decision: AIDecision): void {
    this.logDebug(botId, `发起对战: ${decision.targetId}`);
    // 这里应该执行实际的对战逻辑
  }

  /**
   * 缓动函数
   */
  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  /**
   * 调试日志
   */
  private logDebug(botId: string, message: string): void {
    const config = this.botConfigs.get(botId);
    if (config && config.debugLogging) {
      console.log(`[BotAI] [${botId}] ${message}`);
    }
  }

  /**
   * 获取机器人配置
   */
  getBotConfig(botId: string): BotAIConfig | undefined {
    return this.botConfigs.get(botId);
  }

  /**
   * 设置机器人配置
   */
  setBotConfig(botId: string, config: Partial<BotAIConfig>): void {
    const currentConfig = this.botConfigs.get(botId);
    if (currentConfig) {
      const newConfig: BotAIConfig = { ...currentConfig, ...config };
      this.botConfigs.set(botId, newConfig);

      // 重启决策定时器
      this.stopBotAI(botId);
      this.startBotAI(botId, newConfig);
    }
  }

  /**
   * 停止所有机器人 AI
   */
  stopAllBotAIs(): void {
    for (const botId of this.decisionTimers.keys()) {
      this.stopBotAI(botId);
    }
    console.log('[BotAI] 所有机器人 AI 已停止');
  }

  /**
   * 重置机器人 AI 系统
   */
  reset(): void {
    this.stopAllBotAIs();
    this.botPaths.clear();
    this.botPathIndices.clear();
    this.currentDecisions.clear();
    this.botConfigs.clear();
    this.exploreTargets.clear();
    this.interactTargets.clear();
    console.log('[BotAI] 机器人 AI 系统已重置');
  }
}

/**
 * 导出机器人 AI 单例
 */
export const botAI = BotAI.getInstance();
