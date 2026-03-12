import { collisionManager } from './CollisionManager.js';
import { Direction, PlayerController } from './PlayerController.js';
import { pathfinder } from './Pathfinder.js';
import { PathQueue, PathQueueState } from './PathQueue.js';

/**
 * NPC 行为类型枚举
 */
export enum NPCBehavior {
  /** 静止（不移动） */
  STATIC = 'static',
  /** 随机游走 */
  WANDER = 'wander',
  /** 循环路径 */
  PATROL = 'patrol',
  /** 跟随玩家 */
  FOLLOW = 'follow',
  /** 逃跑 */
  FLEE = 'flee',
}

/**
 * NPC 交互类型枚举
 */
export enum NPCInteractionType {
  /** 对话 */
  DIALOGUE = 'dialogue',
  /** 商店 */
  SHOP = 'shop',
  /** 任务 */
  QUEST = 'quest',
  /** 治疗 */
  HEAL = 'heal',
  /** 传送 */
  TELEPORT = 'teleport',
}

/**
 * NPC 路径点接口
 */
export interface PathPoint {
  /** 瓦片 X 坐标 */
  x: number;
  /** 瓦片 Y 坐标 */
  y: number;
  /** 停留时间（毫秒） */
  waitTime?: number;
}

/**
 * NPC 对话接口
 */
export interface NPCDialogue {
  /** 对话 ID */
  id: string;
  /** 对话文本 */
  text: string;
  /** 下一条对话 ID */
  next?: string;
  /** 选项（分支对话） */
  choices?: { text: string; next: string }[];
  /** 触发的动作 */
  action?: string;
}

/**
 * NPC 接口
 */
export interface NPC {
  /** NPC ID */
  id: string;
  /** NPC 名称 */
  name: string;
  /** 瓦片 X 坐标 */
  tileX: number;
  /** 瓦片 Y 坐标 */
  tileY: number;
  /** 平滑 X 坐标（像素） */
  x: number;
  /** 平滑 Y 坐标（像素） */
  y: number;
  /** 瓦片宽度 */
  tileWidth: number;
  /** 瓦片高度 */
  tileHeight: number;
  /** 朝向 */
  direction: Direction;
  /** 行为类型 */
  behavior: NPCBehavior;
  /** 交互类型 */
  interactionType: NPCInteractionType;
  /** 移动速度（毫秒/格） */
  moveSpeed: number;
  /** 随机游走的间隔范围（毫秒） */
  wanderInterval: [number, number];
  /** 路径点列表（用于巡逻） */
  pathPoints: PathPoint[];
  /** 当前路径点索引 */
  currentPathIndex: number;
  /** 跟随距离（瓦片） */
  followDistance: number;
  /** 对话列表 */
  dialogues: NPCDialogue[];
  /** 初始对话 ID */
  initialDialogueId?: string;
  /** 自定义数据 */
  customData: Record<string, unknown>;
  /** 是否可见 */
  visible: boolean;
  /** 是否可交互 */
  interactable: boolean;
  /** 碰撞半径 */
  collisionRadius: number;
  /** 是否使用 A* 寻路 */
  usePathfinding: boolean;
  /** 路径队列 */
  pathQueue?: PathQueue;
}

/**
 * NPC 移动状态
 */
interface NPCMoveState {
  /** 目标 X 瓦片坐标 */
  targetTileX: number;
  /** 目标 Y 瓦片坐标 */
  targetTileY: number;
  /** 移动进度（0-1） */
  progress: number;
  /** 移动方向 */
  direction: Direction;
  /** 起始 X 像素坐标 */
  startX: number;
  /** 起始 Y 像素坐标 */
  startY: number;
  /** 路径队列（用于多点路径） */
  path?: PathPoint[];
  /** 当前路径索引 */
  pathIndex?: number;
}

/**
 * NPC 管理器
 * 负责管理所有 NPC 的行为和交互
 * 单例模式
 */
export class NPCManager {
  private static instance: NPCManager;

  /** NPC 列表 */
  private npcs: Map<string, NPC> = new Map();

  /** NPC 移动状态映射 */
  private moveStates: Map<string, NPCMoveState> = new Map();

  /** 下一次随机游走时间映射 */
  private nextWanderTime: Map<string, number> = new Map();

  /** 当前停留时间映射 */
  private currentWaitTime: Map<string, number> = new Map();

  /** 玩家控制器引用 */
  private playerController: PlayerController | null = null;

  /** 当前交互的 NPC */
  private interactingNPC: string | null = null;

  /** 是否已初始化 */
  private initialized = false;

  /**
   * 私有构造函数，确保单例
   */
  private constructor() {}

  /**
   * 获取 NPC 管理器单例实例
   */
  static getInstance(): NPCManager {
    if (!NPCManager.instance) {
      NPCManager.instance = new NPCManager();
    }
    return NPCManager.instance;
  }

  /**
   * 初始化 NPC 管理器
   * @param playerController 玩家控制器
   * @param _tileWidth 瓦片宽度（已废弃，由 NPC 自身属性控制）
   * @param _tileHeight 瓦片高度（已废弃，由 NPC 自身属性控制）
   */
  initialize(playerController: PlayerController, _tileWidth = 32, _tileHeight = 32): void {
    if (this.initialized) {
      console.warn('[NPCManager] 已经初始化');
      return;
    }

    this.playerController = playerController;
    this.initialized = true;
    console.log('[NPCManager] NPC 管理器已初始化');
  }

  /**
   * 添加 NPC
   * @param npc NPC 数据
   */
  addNPC(npc: NPC): void {
    // 初始化平滑坐标
    npc.x = npc.tileX * npc.tileWidth;
    npc.y = npc.tileY * npc.tileHeight;

    // 初始化随机游走时间
    const [min, max] = npc.wanderInterval;
    this.nextWanderTime.set(npc.id, Date.now() + this.randomRange(min, max));

    this.npcs.set(npc.id, npc);
    console.log(`[NPCManager] 添加 NPC: ${npc.name} (${npc.id})`);
  }

  /**
   * 批量添加 NPC
   * @param npcs NPC 数组
   */
  addNPCs(npcs: NPC[]): void {
    for (const npc of npcs) {
      this.addNPC(npc);
    }
  }

  /**
   * 移除 NPC
   * @param id NPC ID
   */
  removeNPC(id: string): void {
    this.npcs.delete(id);
    this.moveStates.delete(id);
    this.nextWanderTime.delete(id);
    this.currentWaitTime.delete(id);
    console.log(`[NPCManager] 移除 NPC: ${id}`);
  }

  /**
   * 获取 NPC
   * @param id NPC ID
   * @returns NPC 数据，如果不存在返回 null
   */
  getNPC(id: string): NPC | null {
    return this.npcs.get(id) || null;
  }

  /**
   * 获取指定位置的 NPC
   * @param tileX 瓦片 X 坐标
   * @param tileY 瓦片 Y 坐标
   * @returns NPC 列表
   */
  getNPCsAtPosition(tileX: number, tileY: number): NPC[] {
    const result: NPC[] = [];
    for (const npc of this.npcs.values()) {
      if (npc.tileX === tileX && npc.tileY === tileY) {
        result.push(npc);
      }
    }
    return result;
  }

  /**
   * 获取玩家附近的 NPC
   * @param distance 搜索距离（瓦片）
   * @returns NPC 列表
   */
  getNearbyNPCs(distance = 2): NPC[] {
    if (!this.playerController) {
      return [];
    }

    const playerPos = this.playerController.getTilePosition();
    const result: NPC[] = [];

    for (const npc of this.npcs.values()) {
      if (!npc.visible || !npc.interactable) {
        continue;
      }

      const dist = Math.abs(npc.tileX - playerPos.tileX) + Math.abs(npc.tileY - playerPos.tileY);
      if (dist <= distance) {
        result.push(npc);
      }
    }

    return result;
  }

  /**
   * 获取玩家面前位置的 NPC
   * @returns NPC 或 null
   */
  getNPCInFrontOfPlayer(): NPC | null {
    if (!this.playerController) {
      return null;
    }

    const playerPos = this.playerController.getTilePosition();
    const direction = this.playerController.getFacingDirection();

    let targetX = playerPos.tileX;
    let targetY = playerPos.tileY;

    switch (direction) {
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

    const npcs = this.getNPCsAtPosition(targetX, targetY);
    return npcs.length > 0 ? npcs[0] : null;
  }

  /**
   * 尝试与 NPC 交互
   * @returns 交互的 NPC，如果没有返回 null
   */
  interact(): NPC | null {
    const npc = this.getNPCInFrontOfPlayer();
    if (npc && npc.interactable) {
      this.interactingNPC = npc.id;
      // NPC 朝向玩家
      this.facePlayer(npc);
      console.log(`[NPCManager] 与 NPC 交互: ${npc.name}`);
      return npc;
    }
    return null;
  }

  /**
   * 结束交互
   */
  endInteraction(): void {
    this.interactingNPC = null;
  }

  /**
   * 让 NPC 朝向玩家
   */
  private facePlayer(npc: NPC): void {
    if (!this.playerController) {
      return;
    }

    const playerPos = this.playerController.getTilePosition();

    const dx = playerPos.tileX - npc.tileX;
    const dy = playerPos.tileY - npc.tileY;

    if (Math.abs(dx) > Math.abs(dy)) {
      npc.direction = dx > 0 ? Direction.RIGHT : Direction.LEFT;
    } else {
      npc.direction = dy > 0 ? Direction.DOWN : Direction.UP;
    }
  }

  /**
   * 获取 NPC 对话
   * @param id NPC ID
   * @param dialogueId 对话 ID，如果未指定则使用初始对话
   * @returns 对话数据，如果不存在返回 null
   */
  getDialogue(id: string, dialogueId?: string): NPCDialogue | null {
    const npc = this.npcs.get(id);
    if (!npc || npc.dialogues.length === 0) {
      return null;
    }

    const targetId = dialogueId || npc.initialDialogueId || npc.dialogues[0].id;
    return npc.dialogues.find(d => d.id === targetId) || null;
  }

  /**
   * 更新所有 NPC
   * @param deltaTime 距离上一帧的时间（毫秒）
   */
  update(deltaTime: number): void {
    const currentTime = Date.now();

    for (const npc of this.npcs.values()) {
      if (!npc.visible) {
        continue;
      }

      // 如果 NPC 正在交互，不移动
      if (this.interactingNPC === npc.id) {
        continue;
      }

      // 更新移动动画
      const moveState = this.moveStates.get(npc.id);
      if (moveState) {
        this.updateMoveAnimation(npc, moveState, deltaTime);
      } else {
        // 处理 AI 行为
        this.handleBehavior(npc, currentTime);
      }
    }
  }

  /**
   * 处理 NPC 行为
   */
  private handleBehavior(npc: NPC, currentTime: number): void {
    switch (npc.behavior) {
      case NPCBehavior.STATIC:
        // 不做任何移动
        break;

      case NPCBehavior.WANDER:
        this.handleWander(npc, currentTime);
        break;

      case NPCBehavior.PATROL:
        this.handlePatrol(npc, currentTime);
        break;

      case NPCBehavior.FOLLOW:
        this.handleFollow(npc, currentTime);
        break;

      case NPCBehavior.FLEE:
        this.handleFlee(npc, currentTime);
        break;
    }
  }

  /**
   * 处理随机游走
   */
  private handleWander(npc: NPC, currentTime: number): void {
    const nextTime = this.nextWanderTime.get(npc.id) || 0;

    // 检查是否需要开始移动
    if (currentTime >= nextTime) {
      // 随机选择一个方向
      const directions: Direction[] = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];
      const randomDirection = directions[Math.floor(Math.random() * directions.length)];

      // 尝试移动
      if (this.tryMoveNPC(npc, randomDirection)) {
        // 移动成功，设置下一次游走时间
        const [min, max] = npc.wanderInterval;
        this.nextWanderTime.set(npc.id, currentTime + this.randomRange(min, max));
      }
    }
  }

  /**
   * 处理巡逻
   */
  private handlePatrol(npc: NPC, currentTime: number): void {
    // 如果有路径队列，使用路径队列
    if (npc.pathQueue) {
      this.handlePathQueue(npc, currentTime);
      return;
    }

    // 如果启用了寻路，使用 A* 寻路
    if (npc.usePathfinding) {
      const pathPoint = npc.pathPoints[npc.currentPathIndex];
      if (pathPoint) {
        // 如果已经到达目标位置
        if (npc.tileX === pathPoint.x && npc.tileY === pathPoint.y) {
          // 设置等待时间
          this.currentWaitTime.set(npc.id, currentTime + (pathPoint.waitTime || 0));
          // 移动到下一个路径点
          npc.currentPathIndex = (npc.currentPathIndex + 1) % npc.pathPoints.length;
        } else {
          // 使用 A* 寻路移动到目标
          this.moveNPCToPath(npc, pathPoint.x, pathPoint.y);
        }
      }
      return;
    }

    // 原有的简单巡逻逻辑
    const waitTime = this.currentWaitTime.get(npc.id) || 0;

    // 如果正在等待
    if (waitTime > 0) {
      if (currentTime >= waitTime) {
        this.currentWaitTime.set(npc.id, 0);
      }
      return;
    }

    // 获取下一个路径点
    const pathPoint = npc.pathPoints[npc.currentPathIndex];
    if (!pathPoint) {
      return;
    }

    // 如果已经到达目标位置
    if (npc.tileX === pathPoint.x && npc.tileY === pathPoint.y) {
      // 设置等待时间
      this.currentWaitTime.set(npc.id, currentTime + (pathPoint.waitTime || 0));
      // 移动到下一个路径点
      npc.currentPathIndex = (npc.currentPathIndex + 1) % npc.pathPoints.length;
    } else {
      // 移动向目标
      let direction: Direction | null = null;

      if (pathPoint.x > npc.tileX) {
        direction = Direction.RIGHT;
      } else if (pathPoint.x < npc.tileX) {
        direction = Direction.LEFT;
      } else if (pathPoint.y > npc.tileY) {
        direction = Direction.DOWN;
      } else if (pathPoint.y < npc.tileY) {
        direction = Direction.UP;
      }

      if (direction) {
        this.tryMoveNPC(npc, direction);
      }
    }
  }

  /**
   * 处理路径队列
   */
  private handlePathQueue(npc: NPC, currentTime: number): void {
    if (!npc.pathQueue) {
      return;
    }

    // 更新路径队列
    npc.pathQueue.update(currentTime);

    // 检查是否需要移动到下一个路径点
    if (npc.pathQueue.getState() === PathQueueState.MOVING) {
      const nextWaypoint = npc.pathQueue.getCurrentWaypoint();
      if (nextWaypoint) {
        // 如果已经到达当前位置的路径点
        if (npc.tileX === nextWaypoint.x && npc.tileY === nextWaypoint.y) {
          // 通知路径队列已到达
          npc.pathQueue.notifyReached();
        } else {
          // 使用 A* 寻路移动到目标
          this.moveNPCToPath(npc, nextWaypoint.x, nextWaypoint.y);
        }
      }
    }
  }

  /**
   * 处理跟随
   */
  private handleFollow(npc: NPC, _currentTime: number): void {
    if (!this.playerController) {
      return;
    }

    const playerPos = this.playerController.getTilePosition();
    const dx = playerPos.tileX - npc.tileX;
    const dy = playerPos.tileY - npc.tileY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // 如果距离小于跟随距离的一半，不移动
    if (distance < npc.followDistance / 2) {
      return;
    }

    // 如果距离大于跟随距离，跟随玩家
    if (distance > npc.followDistance) {
      let direction: Direction | null = null;

      if (Math.abs(dx) > Math.abs(dy)) {
        direction = dx > 0 ? Direction.RIGHT : Direction.LEFT;
      } else {
        direction = dy > 0 ? Direction.DOWN : Direction.UP;
      }

      if (direction) {
        this.tryMoveNPC(npc, direction);
      }
    }
  }

  /**
   * 处理逃跑
   */
  private handleFlee(npc: NPC, _currentTime: number): void {
    if (!this.playerController) {
      return;
    }

    const playerPos = this.playerController.getTilePosition();
    const dx = playerPos.tileX - npc.tileX;
    const dy = playerPos.tileY - npc.tileY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // 如果距离太远，不移动
    if (distance > npc.followDistance * 2) {
      return;
    }

    // 向反方向移动
    let direction: Direction | null = null;

    if (Math.abs(dx) > Math.abs(dy)) {
      direction = dx > 0 ? Direction.LEFT : Direction.RIGHT;
    } else {
      direction = dy > 0 ? Direction.UP : Direction.DOWN;
    }

    if (direction) {
      this.tryMoveNPC(npc, direction);
    }
  }

  /**
   * 尝试移动 NPC
   * @returns 是否开始移动
   */
  private tryMoveNPC(npc: NPC, direction: Direction): boolean {
    // 检查是否已经在移动
    if (this.moveStates.has(npc.id)) {
      return false;
    }

    // 计算目标瓦片坐标
    let targetTileX = npc.tileX;
    let targetTileY = npc.tileY;

    switch (direction) {
      case Direction.UP:
        targetTileY--;
        npc.direction = Direction.UP;
        break;
      case Direction.DOWN:
        targetTileY++;
        npc.direction = Direction.DOWN;
        break;
      case Direction.LEFT:
        targetTileX--;
        npc.direction = Direction.LEFT;
        break;
      case Direction.RIGHT:
        targetTileX++;
        npc.direction = Direction.RIGHT;
        break;
    }

    // 碰撞检测
    if (collisionManager.isTileSolid(targetTileX, targetTileY)) {
      return false;
    }

    // 检查是否有其他 NPC 在目标位置
    for (const otherNPC of this.npcs.values()) {
      if (otherNPC.id !== npc.id && otherNPC.visible &&
          otherNPC.tileX === targetTileX && otherNPC.tileY === targetTileY) {
        return false;
      }
    }

    // 开始移动
    this.startMove(npc, direction, targetTileX, targetTileY);
    return true;
  }

  /**
   * 使用 A* 寻路移动 NPC 到目标位置
   * @param npc NPC 实例
   * @param targetX 目标 X 坐标
   * @param targetY 目标 Y 坐标
   * @returns 是否开始移动
   */
  moveNPCToPath(npc: NPC, targetX: number, targetY: number): boolean {
    // 检查是否已经在移动
    if (this.moveStates.has(npc.id)) {
      return false;
    }

    // 使用 A* 寻路
    const path = pathfinder.findPath(npc.tileX, npc.tileY, targetX, targetY);

    if (path.length === 0) {
      return false;
    }

    // 获取第一个路径点（不包括起始点）
    const firstPoint = path[1];
    if (!firstPoint) {
      return false;
    }

    // 计算方向
    let direction: Direction;
    if (firstPoint.y < npc.tileY) {
      direction = Direction.UP;
    } else if (firstPoint.y > npc.tileY) {
      direction = Direction.DOWN;
    } else if (firstPoint.x < npc.tileX) {
      direction = Direction.LEFT;
    } else {
      direction = Direction.RIGHT;
    }

    // 开始移动
    this.startMoveWithPath(npc, direction, firstPoint.x, firstPoint.y, path);
    return true;
  }

  /**
   * 开始带路径的移动
   */
  private startMoveWithPath(npc: NPC, direction: Direction, targetTileX: number, targetTileY: number, path: PathPoint[]): void {
    const moveState: NPCMoveState = {
      targetTileX,
      targetTileY,
      progress: 0,
      direction,
      startX: npc.x,
      startY: npc.y,
      path: path,
      pathIndex: 0,
    };

    this.moveStates.set(npc.id, moveState);
  }

  /**
   * 设置 NPC 的路径队列
   */
  setNPCPathQueue(npc: NPC, queue: PathQueue): void {
    npc.pathQueue = queue;
    npc.usePathfinding = true;
  }

  /**
   * 移除 NPC 的路径队列
   */
  removeNPCPathQueue(npc: NPC): void {
    npc.pathQueue = undefined;
    npc.usePathfinding = false;
  }

  /**
   * 开始 NPC 移动
   */
  private startMove(npc: NPC, direction: Direction, targetTileX: number, targetTileY: number): void {
    const moveState: NPCMoveState = {
      targetTileX,
      targetTileY,
      progress: 0,
      direction,
      startX: npc.x,
      startY: npc.y,
    };

    this.moveStates.set(npc.id, moveState);
  }

  /**
   * 更新 NPC 移动动画
   */
  private updateMoveAnimation(npc: NPC, moveState: NPCMoveState, deltaTime: number): void {
    // 计算移动进度
    moveState.progress += deltaTime / npc.moveSpeed;

    if (moveState.progress >= 1) {
      // 移动完成
      moveState.progress = 1;
      npc.x = moveState.targetTileX * npc.tileWidth;
      npc.y = moveState.targetTileY * npc.tileHeight;
      npc.tileX = moveState.targetTileX;
      npc.tileY = moveState.targetTileY;

      this.moveStates.delete(npc.id);
    } else {
      // 使用缓动函数进行平滑移动
      const easedProgress = this.easeInOutQuad(moveState.progress);
      const targetX = moveState.targetTileX * npc.tileWidth;
      const targetY = moveState.targetTileY * npc.tileHeight;
      npc.x = moveState.startX + (targetX - moveState.startX) * easedProgress;
      npc.y = moveState.startY + (targetY - moveState.startY) * easedProgress;
    }
  }

  /**
   * 缓动函数（Ease-in-out Quad）
   */
  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  /**
   * 生成随机数
   */
  private randomRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  /**
   * 获取所有 NPC
   * @returns NPC 列表
   */
  getAllNPCs(): NPC[] {
    return Array.from(this.npcs.values());
  }

  /**
   * 清除所有 NPC
   */
  clearAllNPCs(): void {
    this.npcs.clear();
    this.moveStates.clear();
    this.nextWanderTime.clear();
    this.currentWaitTime.clear();
    console.log('[NPCManager] 清除所有 NPC');
  }

  /**
   * 设置 NPC 可见性
   * @param id NPC ID
   * @param visible 是否可见
   */
  setNPCVisible(id: string, visible: boolean): void {
    const npc = this.npcs.get(id);
    if (npc) {
      npc.visible = visible;
    }
  }

  /**
   * 设置 NPC 可交互性
   * @param id NPC ID
   * @param interactable 是否可交互
   */
  setNPCInteractable(id: string, interactable: boolean): void {
    const npc = this.npcs.get(id);
    if (npc) {
      npc.interactable = interactable;
    }
  }

  /**
   * 重置 NPC 管理器
   */
  reset(): void {
    this.npcs.clear();
    this.moveStates.clear();
    this.nextWanderTime.clear();
    this.currentWaitTime.clear();
    this.interactingNPC = null;
  }
}

/**
 * 导出 NPC 管理器单例
 */
export const npcManager = NPCManager.getInstance();
