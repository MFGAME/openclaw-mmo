/**
 * 场景管理器 - 管理游戏场景切换和地图加载
 * 
 * 功能：
 * - 管理多个地图/场景
 * - 处理场景切换动画（淡入淡出）
 * - 从 TMX 地图读取传送门对象
 * - 支持室内外场景切换
 */

import { TMXMapData } from './MapParser.js';
import { playerController } from './PlayerController.js';
import { collisionManager } from './CollisionManager.js';

/**
 * 传送门数据接口
 */
export interface TeleportData {
  /** 传送门 ID */
  id: string;
  /** 传送门名称 */
  name: string;
  /** 传送门位置 X（像素） */
  x: number;
  /** 传送门位置 Y（像素） */
  y: number;
  /** 传送门宽度 */
  width: number;
  /** 传送门高度 */
  height: number;
  /** 目标地图 ID */
  targetMapId: string;
  /** 目标位置 X（格子坐标） */
  targetX: number;
  /** 目标位置 Y（格子坐标） */
  targetY: number;
  /** 传送门类型 */
  type: 'door' | 'portal' | 'stairs';
  /** 是否需要条件触发 */
  requires?: {
    item?: string;
    flag?: string;
    level?: number;
  };
}

/**
 * 场景数据接口
 */
export interface SceneData {
  /** 场景 ID */
  id: string;
  /** 场景名称 */
  name: string;
  /** 地图数据 */
  mapData: TMXMapData;
  /** 传送门列表 */
  teleports: TeleportData[];
  /** 是否为室内场景 */
  isIndoor: boolean;
  /** 场景类型 */
  type: 'town' | 'dungeon' | 'building' | 'wild';
  /** 背景音乐 ID */
  bgm?: string;
}

/**
 * 场景切换状态
 */
export enum TransitionState {
  /** 无切换 */
  NONE = 'none',
  /** 淡出中 */
  FADING_OUT = 'fading_out',
  /** 加载中 */
  LOADING = 'loading',
  /** 淡入中 */
  FADING_IN = 'fading_in',
}

/**
 * 场景切换回调
 */
export type SceneTransitionCallback = (
  fromScene: SceneData | null,
  toScene: SceneData
) => void;

/**
 * 场景管理器类
 */
export class SceneManager {
  private static instance: SceneManager;

  /** 当前场景 */
  private currentScene: SceneData | null = null;

  /** 所有场景映射 */
  private scenes: Map<string, SceneData> = new Map();

  /** 切换状态 */
  private transitionState: TransitionState = TransitionState.NONE;

  /** 切换进度（0-1） */
  private transitionProgress: number = 0;

  /** 切换速度（每秒） */
  private transitionSpeed: number = 2.5;

  /** 目标场景 */
  private targetScene: SceneData | null = null;

  /** 目标位置 */
  private targetPosition: { x: number; y: number } | null = null;

  /** 切换回调 */
  private onTransitionCallbacks: SceneTransitionCallback[] = [];

  /** 瓦片宽高 */
  private tileWidth: number = 32;
  private tileHeight: number = 32;

  /**
   * 私有构造函数，确保单例
   */
  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): SceneManager {
    if (!SceneManager.instance) {
      SceneManager.instance = new SceneManager();
    }
    return SceneManager.instance;
  }

  /**
   * 初始化场景管理器
   */
  initialize(tileWidth: number = 32, tileHeight: number = 32): void {
    this.tileWidth = tileWidth;
    this.tileHeight = tileHeight;
    console.log('[SceneManager] Initialized');
  }

  /**
   * 注册场景
   */
  registerScene(scene: SceneData): void {
    this.scenes.set(scene.id, scene);
    console.log(`[SceneManager] Registered scene: ${scene.id} (${scene.name})`);
  }

  /**
   * 获取当前场景
   */
  getCurrentScene(): SceneData | null {
    return this.currentScene;
  }

  /**
   * 获取切换状态
   */
  getTransitionState(): TransitionState {
    return this.transitionState;
  }

  /**
   * 是否正在切换
   */
  isTransitioning(): boolean {
    return this.transitionState !== TransitionState.NONE;
  }

  /**
   * 切换到指定场景
   */
  transitionTo(
    sceneId: string,
    targetX?: number,
    targetY?: number,
    instant: boolean = false
  ): boolean {
    const targetScene = this.scenes.get(sceneId);
    if (!targetScene) {
      console.error(`[SceneManager] Scene not found: ${sceneId}`);
      return false;
    }

    // 如果正在切换，忽略新请求
    if (this.isTransitioning()) {
      console.warn('[SceneManager] Already transitioning, ignoring request');
      return false;
    }

    this.targetScene = targetScene;
    this.targetPosition =
      targetX !== undefined && targetY !== undefined
        ? { x: targetX, y: targetY }
        : null;

    if (instant) {
      // 立即切换
      this.performSceneChange();
    } else {
      // 开始淡出动画
      this.transitionState = TransitionState.FADING_OUT;
      this.transitionProgress = 0;
    }

    return true;
  }

  /**
   * 通过传送门触发场景切换
   */
  triggerTeleport(teleport: TeleportData): boolean {
    console.log(`[SceneManager] Triggering teleport: ${teleport.name} -> ${teleport.targetMapId}`);
    return this.transitionTo(
      teleport.targetMapId,
      teleport.targetX,
      teleport.targetY
    );
  }

  /**
   * 检查玩家是否站在传送门上
   */
  checkPlayerOnTeleport(): TeleportData | null {
    if (!this.currentScene) return null;

    const playerTileX = playerController.getTilePosition().tileX;
    const playerTileY = playerController.getTilePosition().tileY;

    for (const teleport of this.currentScene.teleports) {
      const teleportTileX = Math.floor(teleport.x / this.tileWidth);
      const teleportTileY = Math.floor(teleport.y / this.tileHeight);

      if (playerTileX === teleportTileX && playerTileY === teleportTileY) {
        return teleport;
      }
    }

    return null;
  }

  /**
   * 更新场景管理器
   */
  update(deltaTime: number): void {
    if (this.transitionState === TransitionState.NONE) return;

    // 更新切换进度
    this.transitionProgress += this.transitionSpeed * deltaTime;

    switch (this.transitionState) {
      case TransitionState.FADING_OUT:
        if (this.transitionProgress >= 1) {
          this.transitionProgress = 1;
          this.transitionState = TransitionState.LOADING;
          this.performSceneChange();
        }
        break;

      case TransitionState.LOADING:
        // 场景切换在 performSceneChange 中完成
        this.transitionState = TransitionState.FADING_IN;
        this.transitionProgress = 0;
        break;

      case TransitionState.FADING_IN:
        if (this.transitionProgress >= 1) {
          this.transitionProgress = 1;
          this.transitionState = TransitionState.NONE;
          console.log('[SceneManager] Transition complete');
        }
        break;
    }
  }

  /**
   * 执行场景切换
   */
  private performSceneChange(): void {
    if (!this.targetScene) {
      console.error('[SceneManager] No target scene to transition to');
      this.transitionState = TransitionState.NONE;
      return;
    }

    const fromScene = this.currentScene;

    // 切换场景
    this.currentScene = this.targetScene;

    // 更新碰撞管理器的地图
    collisionManager.setMap(this.currentScene.mapData);
    collisionManager.addCollisionLayer({
      layerName: 'ground',
      solidTiles: [1], // 墙壁
    });

    // 移动玩家到目标位置
    if (this.targetPosition) {
      playerController.setStartTile(this.targetPosition.x, this.targetPosition.y);
    }

    // 触发回调
    for (const callback of this.onTransitionCallbacks) {
      callback(fromScene, this.currentScene);
    }

    console.log(`[SceneManager] Switched to scene: ${this.currentScene.id}`);

    // 清空目标
    this.targetScene = null;
    this.targetPosition = null;
  }

  /**
   * 渲染切换效果
   */
  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (this.transitionState === TransitionState.NONE) return;

    ctx.save();

    // 计算透明度
    let alpha = 0;
    if (this.transitionState === TransitionState.FADING_OUT) {
      alpha = this.transitionProgress;
    } else if (this.transitionState === TransitionState.LOADING) {
      alpha = 1;
    } else if (this.transitionState === TransitionState.FADING_IN) {
      alpha = 1 - this.transitionProgress;
    }

    // 绘制黑色遮罩
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.fillRect(0, 0, width, height);

    // 在加载中显示提示
    if (this.transitionState === TransitionState.LOADING) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Loading...', width / 2, height / 2);
    }

    ctx.restore();
  }

  /**
   * 淡出到黑色（异步 Promise 版本）
   * @param duration 淡出持续时间（秒），默认使用切换速度的倒数
   * @returns Promise<void> 淡出完成后 resolve
   */
  async fadeToBlack(duration?: number): Promise<void> {
    // 如果已经在过渡中，先等待当前过渡完成
    if (this.isTransitioning()) {
      await this.waitForTransitionEnd();
    }

    // 计算淡出持续时间（秒）
    const fadeDuration = duration !== undefined ? duration : 1 / this.transitionSpeed;

    return new Promise((resolve) => {
      // 设置为淡出状态
      this.transitionState = TransitionState.FADING_OUT;
      this.transitionProgress = 0;
      this.transitionSpeed = 1 / fadeDuration;

      // 添加一次性回调监听淡出完成
      const checkComplete = () => {
        if (this.transitionProgress >= 1 || this.transitionState === TransitionState.LOADING) {
          resolve();
        } else if (this.transitionState !== TransitionState.FADING_OUT) {
          // 状态异常，直接 resolve
          resolve();
        } else {
          requestAnimationFrame(checkComplete);
        }
      };

      // 启动检查循环
      requestAnimationFrame(checkComplete);
    });
  }

  /**
   * 从黑色淡入（异步 Promise 版本）
   * @param duration 淡入持续时间（秒），默认使用切换速度的倒数
   * @returns Promise<void> 淡入完成后 resolve
   */
  async fadeFromBlack(duration?: number): Promise<void> {
    // 如果已经在过渡中，先等待当前过渡完成
    if (this.isTransitioning()) {
      await this.waitForTransitionEnd();
    }

    // 计算淡入持续时间（秒）
    const fadeDuration = duration !== undefined ? duration : 1 / this.transitionSpeed;

    return new Promise((resolve) => {
      // 设置为淡入状态
      this.transitionState = TransitionState.FADING_IN;
      this.transitionProgress = 0;
      this.transitionSpeed = 1 / fadeDuration;

      // 添加一次性回调监听淡入完成
      const checkComplete = () => {
        if (this.transitionProgress >= 1) {
          this.transitionState = TransitionState.NONE;
          this.transitionProgress = 0;
          resolve();
        } else if (this.transitionState !== TransitionState.FADING_IN) {
          // 状态异常，直接 resolve
          resolve();
        } else {
          requestAnimationFrame(checkComplete);
        }
      };

      // 启动检查循环
      requestAnimationFrame(checkComplete);
    });
  }

  /**
   * 过渡到指定场景（异步 Promise 版本）
   * @param sceneId 目标场景 ID
   * @param targetX 目标位置 X（格子坐标）
   * @param targetY 目标位置 Y（格子坐标）
   * @param fadeDuration 淡入淡出持续时间（秒）
   * @returns Promise<boolean> 过渡是否成功
   */
  async transitionToAsync(
    sceneId: string,
    targetX?: number,
    targetY?: number,
    fadeDuration?: number
  ): Promise<boolean> {
    const targetScene = this.scenes.get(sceneId);
    if (!targetScene) {
      console.error(`[SceneManager] Scene not found: ${sceneId}`);
      return false;
    }

    // 如果正在切换，先等待
    if (this.isTransitioning()) {
      await this.waitForTransitionEnd();
    }

    this.targetScene = targetScene;
    this.targetPosition =
      targetX !== undefined && targetY !== undefined
        ? { x: targetX, y: targetY }
        : null;

    try {
      // 淡出
      await this.fadeToBlack(fadeDuration);

      // 执行场景切换
      this.performSceneChange();

      // 等待一小段时间确保场景加载完成
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 淡入
      await this.fadeFromBlack(fadeDuration);

      console.log(`[SceneManager] Transition to ${sceneId} completed`);
      return true;
    } catch (error) {
      console.error(`[SceneManager] Transition to ${sceneId} failed:`, error);
      this.transitionState = TransitionState.NONE;
      this.transitionProgress = 0;
      return false;
    }
  }

  /**
   * 等待当前过渡完成
   * @returns Promise<void> 过渡完成后 resolve
   */
  private async waitForTransitionEnd(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isTransitioning()) {
        resolve();
        return;
      }

      const checkComplete = () => {
        if (!this.isTransitioning()) {
          resolve();
        } else {
          requestAnimationFrame(checkComplete);
        }
      };

      requestAnimationFrame(checkComplete);
    });
  }

  /**
   * 注册切换回调
   */
  onTransition(callback: SceneTransitionCallback): void {
    this.onTransitionCallbacks.push(callback);
  }

  /**
   * 移除切换回调
   */
  removeTransitionCallback(callback: SceneTransitionCallback): void {
    const index = this.onTransitionCallbacks.indexOf(callback);
    if (index !== -1) {
      this.onTransitionCallbacks.splice(index, 1);
    }
  }

  /**
   * 设置当前场景（直接设置，无动画）
   */
  setCurrentScene(sceneId: string): boolean {
    const scene = this.scenes.get(sceneId);
    if (!scene) {
      console.error(`[SceneManager] Scene not found: ${sceneId}`);
      return false;
    }

    this.currentScene = scene;
    collisionManager.setMap(scene.mapData);
    collisionManager.addCollisionLayer({
      layerName: 'ground',
      solidTiles: [1],
    });

    console.log(`[SceneManager] Set current scene: ${sceneId}`);
    return true;
  }

  /**
   * 获取场景列表
   */
  getSceneList(): string[] {
    return Array.from(this.scenes.keys());
  }

  /**
   * 清空所有场景
   */
  clear(): void {
    this.scenes.clear();
    this.currentScene = null;
    this.transitionState = TransitionState.NONE;
    this.transitionProgress = 0;
    console.log('[SceneManager] Cleared all scenes');
  }
}

/**
 * 导出场景管理器单例
 */
export const sceneManager = SceneManager.getInstance();
