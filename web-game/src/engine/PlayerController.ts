import { inputManager, KeyCode, SwipeDirection } from './InputManager.js';
import { collisionManager } from './CollisionManager.js';
import { pathfinder, PathPoint } from './Pathfinder.js';
import { audioManager } from './AudioManager.js';

/**
 * 方向枚举
 */
export enum Direction {
  /** 向上 */
  UP = 'up',
  /** 向下 */
  DOWN = 'down',
  /** 向左 */
  LEFT = 'left',
  /** 向右 */
  RIGHT = 'right',
}

/**
 * 玩家状态枚举
 */
export enum PlayerState {
  /** 空闲 */
  IDLE = 'idle',
  /** 移动中 */
  MOVING = 'moving',
  /** 对话中 */
  DIALOGUE = 'dialogue',
  /** 交互中 */
  INTERACTING = 'interacting',
  /** 跳跃中 */
  JUMPING = 'jumping',
}

/**
 * 玩家位置接口
 */
export interface PlayerPosition {
  /** 瓦片 X 坐标 */
  tileX: number;
  /** 瓦片 Y 坐标 */
  tileY: number;
  /** 平滑 X 坐标（像素） */
  x: number;
  /** 平滑 Y 坐标（像素） */
  y: number;
  /** 跳跃高度偏移（像素） */
  jumpOffset: number;
}

/**
 * 玩家配置接口
 */
export interface PlayerConfig {
  /** 瓦片宽度 */
  tileWidth: number;
  /** 瓦片高度 */
  tileHeight: number;
  /** 移动速度（毫秒/格） */
  moveSpeed: number;
  /** 是否启用碰撞检测 */
  enableCollision: boolean;
  /** 是否启用平滑动画 */
  enableSmoothAnimation: boolean;
  /** 玩家碰撞半径 */
  collisionRadius: number;
  /** 键盘移动重复延迟（毫秒） */
  keyRepeatDelay: number;
  /** 键盘移动重复间隔（毫秒） */
  keyRepeatInterval: number;
  /** 虚拟方向键区域配置（用于触摸） */
  virtualDPad?: {
    centerX: number;
    centerY: number;
    radius: number;
  };
  /** 跳跃高度（像素） */
  jumpHeight: number;
  /** 跳跃持续时间（毫秒） */
  jumpDuration: number;
  /** 按下 Space 时是否应跳过跳跃（如：面前有可交互 NPC 时优先对话） */
  shouldSkipJump?: () => boolean;
}

/**
 * 移动事件接口
 */
export interface MoveEvent {
  /** 方向 */
  direction: Direction;
  /** 起始瓦片坐标 */
  fromX: number;
  /** 起始瓦片坐标 */
  fromY: number;
  /** 目标瓦片坐标 */
  toX: number;
  /** 目标瓦片坐标 */
  toY: number;
}

/**
 * 跳跃事件接口
 */
export interface JumpEvent {
  /** 起始位置 */
  fromX: number;
  fromY: number;
  /** 跳跃高度 */
  height: number;
}

/**
 * 移动完成的回调函数
 */
export type MoveCompleteCallback = (event: MoveEvent) => void;

/**
 * 移动被阻挡的回调函数
 */
export type MoveBlockedCallback = (event: MoveEvent) => void;

/**
 * 跳跃开始的回调函数
 */
export type JumpStartCallback = (event: JumpEvent) => void;

/**
 * 跳跃完成的回调函数
 */
export type JumpCompleteCallback = (event: JumpEvent) => void;

/**
 * 玩家控制器
 * 负责玩家移动、输入处理和动画
 * 单例模式
 */
export class PlayerController {
  private static instance: PlayerController;

  /** 玩家位置 */
  private position: PlayerPosition = {
    tileX: 0,
    tileY: 0,
    x: 0,
    y: 0,
    jumpOffset: 0,
  };

  /** 玩家朝向 */
  private facingDirection: Direction = Direction.DOWN;

  /** 玩家状态 */
  private state: PlayerState = PlayerState.IDLE;

  /** 是否在跑步 */
  private running: boolean = false;

  /** 是否在跳跃 */
  private jumping: boolean = false;

  /** 跳跃进度（0-1） */
  private jumpProgress: number = 0;

  /** 跳跃起始位置 */
  private jumpStartX: number = 0;
  private jumpStartY: number = 0;

  /** 基础移动速度（用于跑步计算） */
  private baseMoveSpeed: number = 200;

  /** 配置 */
  private config: PlayerConfig = {
    tileWidth: 32,
    tileHeight: 32,
    moveSpeed: 200,
    enableCollision: true,
    enableSmoothAnimation: true,
    collisionRadius: 12,
    keyRepeatDelay: 200,
    keyRepeatInterval: 100,
    jumpHeight: 32,
    jumpDuration: 400,
  };

  /** 目标位置（用于平滑动画） */
  private targetX: number = 0;
  private targetY: number = 0;

  /** 当前移动的开始位置 */
  private moveStartX: number = 0;
  private moveStartY: number = 0;

  /** 移动进度（0-1） */
  private moveProgress: number = 0;

  /** 当前移动方向 */
  private currentMoveDirection: Direction | null = null;

  /** 上次按键时间 */
  private lastKeyPressTime: number = 0;

  /** 上次移动时间 */
  private lastMoveTime: number = 0;

  /** 上次按下的方向键 */
  private lastDirectionKey: Direction | null = null;

  /** 移动完成回调列表 */
  private moveCompleteCallbacks: MoveCompleteCallback[] = [];

  /** 移动被阻挡回调列表 */
  private moveBlockedCallbacks: MoveBlockedCallback[] = [];

  /** 跳跃开始回调列表 */
  private jumpStartCallbacks: JumpStartCallback[] = [];

  /** 跳跃完成回调列表 */
  private jumpCompleteCallbacks: JumpCompleteCallback[] = [];

  /** 是否已初始化 */
  private initialized = false;

  /** 当前按下的触摸位置 */

  /**
   * 私有构造函数，确保单例
   */
  private constructor() {}

  /**
   * 获取玩家控制器单例实例
   */
  static getInstance(): PlayerController {
    if (!PlayerController.instance) {
      PlayerController.instance = new PlayerController();
    }
    return PlayerController.instance;
  }

  /**
   * 初始化玩家控制器
   * @param config 配置
   */
  initialize(config?: Partial<PlayerConfig>): void {
    if (this.initialized) {
      console.warn('[PlayerController] 已经初始化');
      return;
    }

    if (config) {
      this.config = { ...this.config, ...config };
    }

    // 设置基础移动速度（用于跑步计算）
    this.baseMoveSpeed = this.config.moveSpeed;

    // 初始化位置
    this.position.x = this.position.tileX * this.config.tileWidth;
    this.position.y = this.position.tileY * this.config.tileHeight;
    this.targetX = this.position.x;
    this.targetY = this.position.y;

    this.initialized = true;
    console.log('[PlayerController] 玩家控制器已初始化');
  }

  /**
   * 设置玩家初始位置
   * @param tileX 瓦片 X 坐标
   * @param tileY 瓦片 Y 坐标
   */
  setStartTile(tileX: number, tileY: number): void {
    this.position.tileX = tileX;
    this.position.tileY = tileY;
    this.position.x = tileX * this.config.tileWidth;
    this.position.y = tileY * this.config.tileHeight;
    this.targetX = this.position.x;
    this.targetY = this.position.y;
    this.moveProgress = 0;
    this.state = PlayerState.IDLE;
  }

  /**
   * 更新玩家状态
   * @param deltaTime 距离上一帧的时间（毫秒）
   */
  update(deltaTime: number): void {
    if (!this.initialized) return;

    // 注意：inputManager.update() 应在每帧末尾调用（由 main 主循环负责），
    // 否则 handleInput 中的 isPressed/isHeld 会因 justPressed 被提前清空而失效

    // 如果在对话或交互中，不处理移动
    if (this.state === PlayerState.DIALOGUE || this.state === PlayerState.INTERACTING) {
      return;
    }

    // 处理跳跃动画（跳跃时不能移动）
    if (this.state === PlayerState.JUMPING) {
      this.updateJumpAnimation(deltaTime);
    } else {
      // 检测 Space 键（跳跃），但若面前有可交互对象则优先交给交互系统处理
      const skipJump = this.config.shouldSkipJump?.();
      if (inputManager.isPressed(KeyCode.SPACE) && !skipJump) {
        this.startJump();
      } else {
        // 处理移动动画（Space+skipJump 时由 InteractionManager 处理交互）
        if (this.state === PlayerState.MOVING) {
          this.updateMoveAnimation(deltaTime);
        } else {
          // 处理输入
          this.handleInput();
        }
      }
    }
  }

  /**
   * 处理输入
   */
  private handleInput(): void {
    // 检测 Shift 键（跑步状态）
    const isShiftPressed = inputManager.isHeld(KeyCode.SHIFT) || inputManager.isHeld('Shift') ||
                          inputManager.isHeld(KeyCode.SHIFT.toUpperCase());

    // 平滑切换跑步状态
    this.running = isShiftPressed;
    const currentTime = Date.now();

    // 检查键盘输入
    let direction: Direction | null = null;

    if (inputManager.isPressed(KeyCode.UP) || inputManager.isPressed(KeyCode.W)) {
      direction = Direction.UP;
      this.lastDirectionKey = Direction.UP;
      this.lastKeyPressTime = currentTime;
    } else if (inputManager.isPressed(KeyCode.DOWN) || inputManager.isPressed(KeyCode.S)) {
      direction = Direction.DOWN;
      this.lastDirectionKey = Direction.DOWN;
      this.lastKeyPressTime = currentTime;
    } else if (inputManager.isPressed(KeyCode.LEFT) || inputManager.isPressed(KeyCode.A)) {
      direction = Direction.LEFT;
      this.lastDirectionKey = Direction.LEFT;
      this.lastKeyPressTime = currentTime;
    } else if (inputManager.isPressed(KeyCode.RIGHT) || inputManager.isPressed(KeyCode.D)) {
      direction = Direction.RIGHT;
      this.lastDirectionKey = Direction.RIGHT;
      this.lastKeyPressTime = currentTime;
    } else {
      // 检查长按重复
      if (this.lastDirectionKey) {
        const keyHeld = inputManager.isHeld(
          this.lastDirectionKey === Direction.UP ? KeyCode.UP :
          this.lastDirectionKey === Direction.DOWN ? KeyCode.DOWN :
          this.lastDirectionKey === Direction.LEFT ? KeyCode.LEFT : KeyCode.RIGHT
        );

        if (keyHeld) {
          const timeSincePress = currentTime - this.lastKeyPressTime;
          const timeSinceMove = currentTime - this.lastMoveTime;

          if (timeSincePress >= this.config.keyRepeatDelay &&
              timeSinceMove >= this.config.keyRepeatInterval) {
            direction = this.lastDirectionKey;
          }
        }
      }
    }

    // 检查触摸滑动
    if (!direction && inputManager.hasSwipe()) {
      const swipeDirection = inputManager.getSwipeDirection();
      switch (swipeDirection) {
        case SwipeDirection.UP:
          direction = Direction.UP;
          break;
        case SwipeDirection.DOWN:
          direction = Direction.DOWN;
          break;
        case SwipeDirection.LEFT:
          direction = Direction.LEFT;
          break;
        case SwipeDirection.RIGHT:
          direction = Direction.RIGHT;
          break;
      }
    }

    if (direction) {
      this.tryMove(direction);
    }
  }

  /**
   * 开始跳跃
   */
  private startJump(): void {
    if (this.jumping) return;

    this.jumping = true;
    this.jumpProgress = 0;
    this.state = PlayerState.JUMPING;
    this.jumpStartX = this.position.x;
    this.jumpStartY = this.position.y;

    // 播放跳跃音效（使用 Tuxemon 音效资源）
    audioManager.playSFX('jump');

    // 触发跳跃开始回调
    this.triggerJumpStart({
      fromX: this.position.tileX,
      fromY: this.position.tileY,
      height: this.config.jumpHeight,
    });

    console.log('[PlayerController] Jump started');
  }

  /**
   * 更新跳跃动画
   */
  private updateJumpAnimation(deltaTime: number): void {
    // 更新跳跃进度
    this.jumpProgress += deltaTime / this.config.jumpDuration;

    if (this.jumpProgress >= 1) {
      // 跳跃完成
      this.jumpProgress = 1;
      this.position.jumpOffset = 0;
      this.state = PlayerState.IDLE;
      this.jumping = false;

      // 触发跳跃完成回调
      this.triggerJumpComplete({
        fromX: this.jumpStartX / this.config.tileWidth,
        fromY: this.jumpStartY / this.config.tileHeight,
        height: this.config.jumpHeight,
      });

      console.log('[PlayerController] Jump completed');
    } else {
      // 使用抛物线计算跳跃高度
      // 抛物线公式: y = 4 * h * x * (1 - x)
      const jumpHeight = 4 * this.config.jumpHeight * this.jumpProgress * (1 - this.jumpProgress);
      this.position.jumpOffset = -jumpHeight; // 负值表示向上
    }
  }

  /**
   * 尝试移动
   * @param direction 移动方向
   * @returns 是否开始移动
   */
  tryMove(direction: Direction): boolean {
    if (this.state !== PlayerState.IDLE) {
      return false;
    }

    // 更新朝向
    this.facingDirection = direction;

    // 计算目标瓦片坐标
    let targetTileX = this.position.tileX;
    let targetTileY = this.position.tileY;

    switch (direction) {
      case Direction.UP:
        targetTileY--;
        break;
      case Direction.DOWN:
        targetTileY++;
        break;
      case Direction.LEFT:
        targetTileX--;
        break;
      case Direction.RIGHT:
        targetTileX++;
        break;
    }

    // 碰撞检测
    if (this.config.enableCollision) {
      // 检查目标瓦片
      if (collisionManager.isTileSolid(targetTileX, targetTileY)) {
        // 移动被阻挡
        this.triggerMoveBlocked({
          direction,
          fromX: this.position.tileX,
          fromY: this.position.tileY,
          toX: targetTileX,
          toY: targetTileY,
        });
        return false;
      }
    }

    // 开始移动
    this.startMove(direction, targetTileX, targetTileY);
    return true;
  }

  /**
   * 开始移动
   */
  private startMove(direction: Direction, targetTileX: number, targetTileY: number): void {
    this.currentMoveDirection = direction;
    this.moveStartX = this.position.x;
    this.moveStartY = this.position.y;
    this.targetX = targetTileX * this.config.tileWidth;
    this.targetY = targetTileY * this.config.tileHeight;
    this.moveProgress = 0;
    this.state = PlayerState.MOVING;
    this.lastMoveTime = Date.now();
  }

  /**
   * 更新移动动画
   */
  private updateMoveAnimation(deltaTime: number): void {
    // 跑步时速度加倍（移动时间减半）
    const currentMoveSpeed = this.running ? this.baseMoveSpeed / 2 : this.baseMoveSpeed;

    // 计算移动进度
    this.moveProgress += deltaTime / currentMoveSpeed;

    if (this.moveProgress >= 1) {
      // 移动完成
      this.moveProgress = 1;
      this.position.x = this.targetX;
      this.position.y = this.targetY;
      this.position.tileX = Math.round(this.targetX / this.config.tileWidth);
      this.position.tileY = Math.round(this.targetY / this.config.tileHeight);
      this.state = PlayerState.IDLE;

      // 播放移动音效（跑步时播放脚步声）
      if (this.running) {
        audioManager.playSFX('footstep');
      }

      // 触发移动完成回调
      if (this.currentMoveDirection) {
        this.triggerMoveComplete({
          direction: this.currentMoveDirection,
          fromX: Math.round(this.moveStartX / this.config.tileWidth),
          fromY: Math.round(this.moveStartY / this.config.tileHeight),
          toX: this.position.tileX,
          toY: this.position.tileY,
        });
      }

      this.currentMoveDirection = null;
    } else {
      // 使用缓动函数进行平滑移动
      const easedProgress = this.easeInOutQuad(this.moveProgress);
      this.position.x = this.moveStartX + (this.targetX - this.moveStartX) * easedProgress;
      this.position.y = this.moveStartY + (this.targetY - this.moveStartY) * easedProgress;
    }
  }

  /**
   * 缓动函数（Ease-in-out Quad）
   */
  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  /**
   * 获取玩家位置
   */
  getPosition(): PlayerPosition {
    return { ...this.position };
  }

  /**
   * 获取玩家瓦片坐标
   */
  getTilePosition(): { tileX: number; tileY: number } {
    return {
      tileX: this.position.tileX,
      tileY: this.position.tileY,
    };
  }

  /**
   * 获取玩家像素坐标
   */
  getPixelPosition(): { x: number; y: number } {
    return {
      x: this.position.x,
      y: this.position.y,
    };
  }

  /**
   * 获取玩家朝向
   */
  getFacingDirection(): Direction {
    return this.facingDirection;
  }

  /**
   * 获取玩家状态
   */
  getState(): PlayerState {
    return this.state;
  }

  /**
   * 设置玩家状态
   */
  setState(state: PlayerState): void {
    this.state = state;
  }

  /**
   * 获取配置
   */
  getConfig(): PlayerConfig {
    return { ...this.config };
  }

  /**
   * 设置配置
   */
  setConfig(config: Partial<PlayerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 注册移动完成回调
   */
  onMoveComplete(callback: MoveCompleteCallback): void {
    this.moveCompleteCallbacks.push(callback);
  }

  /**
   * 移除移动完成回调
   */
  offMoveComplete(callback: MoveCompleteCallback): void {
    const index = this.moveCompleteCallbacks.indexOf(callback);
    if (index !== -1) {
      this.moveCompleteCallbacks.splice(index, 1);
    }
  }

  /**
   * 注册移动被阻挡回调
   */
  onMoveBlocked(callback: MoveBlockedCallback): void {
    this.moveBlockedCallbacks.push(callback);
  }

  /**
   * 移除移动被阻挡回调
   */
  offMoveBlocked(callback: MoveBlockedCallback): void {
    const index = this.moveBlockedCallbacks.indexOf(callback);
    if (index !== -1) {
      this.moveBlockedCallbacks.splice(index, 1);
    }
  }

  /**
   * 注册跳跃开始回调
   */
  onJumpStart(callback: JumpStartCallback): void {
    this.jumpStartCallbacks.push(callback);
  }

  /**
   * 移除跳跃开始回调
   */
  offJumpStart(callback: JumpStartCallback): void {
    const index = this.jumpStartCallbacks.indexOf(callback);
    if (index !== -1) {
      this.jumpStartCallbacks.splice(index, 1);
    }
  }

  /**
   * 注册跳跃完成回调
   */
  onJumpComplete(callback: JumpCompleteCallback): void {
    this.jumpCompleteCallbacks.push(callback);
  }

  /**
   * 移除跳跃完成回调
   */
  offJumpComplete(callback: JumpCompleteCallback): void {
    const index = this.jumpCompleteCallbacks.indexOf(callback);
    if (index !== -1) {
      this.jumpCompleteCallbacks.splice(index, 1);
    }
  }

  /**
   * 触发移动完成回调
   */
  private triggerMoveComplete(event: MoveEvent): void {
    for (const callback of this.moveCompleteCallbacks) {
      callback(event);
    }
  }

  /**
   * 触发移动被阻挡回调
   */
  private triggerMoveBlocked(event: MoveEvent): void {
    for (const callback of this.moveBlockedCallbacks) {
      callback(event);
    }
  }

  /**
   * 触发跳跃开始回调
   */
  private triggerJumpStart(event: JumpEvent): void {
    for (const callback of this.jumpStartCallbacks) {
      callback(event);
    }
  }

  /**
   * 触发跳跃完成回调
   */
  private triggerJumpComplete(event: JumpEvent): void {
    for (const callback of this.jumpCompleteCallbacks) {
      callback(event);
    }
  }

  /**
   * 强制移动到指定位置（忽略碰撞）
   */
  teleportTo(tileX: number, tileY: number): void {
    this.position.tileX = tileX;
    this.position.tileY = tileY;
    this.position.x = tileX * this.config.tileWidth;
    this.position.y = tileY * this.config.tileHeight;
    this.targetX = this.position.x;
    this.targetY = this.position.y;
    this.moveProgress = 0;
    this.state = PlayerState.IDLE;
    this.position.jumpOffset = 0;
  }

  /**
   * 获取从当前位置到目标位置的路径
   * @param targetX 目标 X 坐标
   * @param targetY 目标 Y 坐标
   * @returns 路径点数组，如果没有路径返回空数组
   */
  findPathTo(targetX: number, targetY: number): PathPoint[] {
    return pathfinder.findPath(this.position.tileX, this.position.tileY, targetX, targetY);
  }

  /**
   * 检查目标位置是否可直接到达
   * @param targetX 目标 X 坐标
   * @param targetY 目标 Y 坐标
   * @returns 是否可直接到达
   */
  isDirectlyReachable(targetX: number, targetY: number): boolean {
    return pathfinder.isDirectlyReachable(
      this.position.tileX,
      this.position.tileY,
      targetX,
      targetY
    );
  }

  /**
   * 获取跑步状态
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * 设置跑步状态
   */
  setRunning(running: boolean): void {
    this.running = running;
  }

  /**
   * 切换跑步状态
   */
  toggleRunning(): void {
    this.running = !this.running;
  }

  /**
   * 获取跳跃状态
   */
  isJumping(): boolean {
    return this.jumping;
  }

  /**
   * 获取跳跃高度偏移（用于渲染）
   */
  getJumpOffset(): number {
    return this.position.jumpOffset;
  }

  /**
   * 获取跳跃进度（0-1）
   */
  getJumpProgress(): number {
    return this.jumpProgress;
  }

  /**
   * 获取基础移动速度
   */
  getBaseMoveSpeed(): number {
    return this.baseMoveSpeed;
  }

  /**
   * 设置基础移动速度
   */
  setBaseMoveSpeed(speed: number): void {
    this.baseMoveSpeed = speed;
  }

  /**
   * 获取当前移动速度（考虑跑步状态）
   */
  getCurrentMoveSpeed(): number {
    return this.running ? this.baseMoveSpeed / 2 : this.baseMoveSpeed;
  }

  /**
   * 重置玩家控制器
   */
  reset(): void {
    this.position = {
      tileX: 0,
      tileY: 0,
      x: 0,
      y: 0,
      jumpOffset: 0,
    };
    this.facingDirection = Direction.DOWN;
    this.state = PlayerState.IDLE;
    this.targetX = 0;
    this.targetY = 0;
    this.moveStartX = 0;
    this.moveStartY = 0;
    this.moveProgress = 0;
    this.currentMoveDirection = null;
    this.lastKeyPressTime = 0;
    this.lastMoveTime = 0;
    this.lastDirectionKey = null;
    this.running = false;
    this.jumping = false;
    this.jumpProgress = 0;
    this.jumpStartX = 0;
    this.jumpStartY = 0;
  }
}

/**
 * 导出玩家控制器单例
 */
export const playerController = PlayerController.getInstance();
