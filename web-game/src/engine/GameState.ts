/**
 * 游戏状态枚举
 * 定义游戏中所有可能的状态
 */
export enum GameStateType {
  /** 标题画面 */
  TITLE = 'TITLE',
  /** 主菜单 */
  MENU = 'MENU',
  /** 地图探索 */
  MAP = 'MAP',
  /** 战斗 */
  BATTLE = 'BATTLE',
}

/**
 * 状态数据接口
 * 用于在状态切换时传递数据
 */
export interface StateData {
  [key: string]: unknown;
}

/**
 * 游戏状态接口
 * 定义每个状态必须实现的方法
 */
export interface IGameState {
  /** 状态类型 */
  readonly type: GameStateType;

  /** 进入状态时调用 */
  enter(data?: StateData): void;

  /** 退出状态时调用 */
  exit(): void;

  /** 每帧更新时调用 */
  update(deltaTime: number): void;
}

/**
 * 游戏状态管理器
 * 单例模式，管理游戏状态的生命周期
 */
export class GameStateManager {
  private static instance: GameStateManager;

  /** 当前状态 */
  private currentState: IGameState | null = null;

  /** 上一个状态 */
  private previousState: IGameState | null = null;

  /** 注册的所有状态 */
  private states: Map<GameStateType, IGameState> = new Map();

  /** 状态切换前的数据 */
  private pendingData: StateData | null = null;

  /**
   * 私有构造函数，确保单例
   */
  private constructor() {}

  /**
   * 获取状态管理器单例实例
   */
  static getInstance(): GameStateManager {
    if (!GameStateManager.instance) {
      GameStateManager.instance = new GameStateManager();
    }
    return GameStateManager.instance;
  }

  /**
   * 注册一个状态
   * @param state 要注册的状态实例
   */
  registerState(state: IGameState): void {
    this.states.set(state.type, state);
  }

  /**
   * 批量注册多个状态
   * @param states 要注册的状态数组
   */
  registerStates(...states: IGameState[]): void {
    states.forEach(state => this.registerState(state));
  }

  /**
   * 切换到新状态
   * @param stateType 目标状态类型
   * @param data 传递给新状态的数据
   */
  changeState(stateType: GameStateType, data?: StateData): void {
    const nextState = this.states.get(stateType);

    if (!nextState) {
      console.error(`[GameState] 状态 ${stateType} 未注册`);
      return;
    }

    // 如果已经处于该状态，则不切换
    if (this.currentState?.type === stateType) {
      console.warn(`[GameState] 已经处于 ${stateType} 状态`);
      return;
    }

    // 保存当前状态和待传递的数据
    this.previousState = this.currentState;
    this.pendingData = data || null;

    // 退出当前状态
    if (this.currentState) {
      this.currentState.exit();
    }

    // 进入新状态
    this.currentState = nextState;
    this.currentState.enter(this.pendingData || undefined);

    console.log(`[GameState] 状态切换: ${this.previousState?.type || '无'} -> ${stateType}`);
  }

  /**
   * 返回上一个状态
   * @param data 传递给上一个状态的数据
   */
  revertToPreviousState(data?: StateData): void {
    if (!this.previousState) {
      console.warn('[GameState] 没有上一个状态可以返回');
      return;
    }

    const previousType = this.previousState.type;
    this.changeState(previousType, data);
  }

  /**
   * 更新当前状态
   * @param deltaTime 帧间隔时间（秒）
   */
  update(deltaTime: number): void {
    if (this.currentState) {
      this.currentState.update(deltaTime);
    }
  }

  /**
   * 获取当前状态类型
   */
  getCurrentStateType(): GameStateType | null {
    return this.currentState?.type || null;
  }

  /**
   * 检查是否处于指定状态
   * @param stateType 要检查的状态类型
   */
  isInState(stateType: GameStateType): boolean {
    return this.currentState?.type === stateType;
  }

  /**
   * 检查是否处于任意一个状态中
   */
  isPlaying(): boolean {
    return this.currentState !== null;
  }

  /**
   * 清除所有注册的状态
   */
  clear(): void {
    if (this.currentState) {
      this.currentState.exit();
    }
    this.currentState = null;
    this.previousState = null;
    this.states.clear();
    this.pendingData = null;
  }
}

/**
 * 基础状态类
 * 提供状态的默认实现，方便自定义状态继承
 */
export abstract class BaseState implements IGameState {
  readonly type: GameStateType;

  constructor(stateType: GameStateType) {
    this.type = stateType;
  }

  enter(_data?: StateData): void {
    // 子类可以覆盖此方法
  }

  exit(): void {
    // 子类可以覆盖此方法
  }

  update(_deltaTime: number): void {
    // 子类可以覆盖此方法
  }
}

/**
 * 导出状态管理器单例
 */
export const gameStateManager = GameStateManager.getInstance();
