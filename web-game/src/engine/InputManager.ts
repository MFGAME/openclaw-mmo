/**
 * 按键状态枚举
 */
export enum KeyState {
  /** 未按下 */
  RELEASED = 'released',
  /** 按下（刚按下的瞬间） */
  PRESSED = 'pressed',
  /** 按住（持续按下） */
  HELD = 'held',
  /** 释放（刚松开的瞬间） */
  JUST_RELEASED = 'just_released',
}

/**
 * 键码枚举
 * 支持游戏常用按键
 */
export enum KeyCode {
  // 方向键
  UP = 'ArrowUp',
  DOWN = 'ArrowDown',
  LEFT = 'ArrowLeft',
  RIGHT = 'ArrowRight',

  // WASD
  W = 'w',
  A = 'a',
  S = 's',
  D = 'd',

  // 功能键
  SPACE = ' ',
  ENTER = 'Enter',
  ESCAPE = 'Escape',

  // 其他
  TAB = 'Tab',
  SHIFT = 'Shift',
  CONTROL = 'Control',
  ALT = 'Alt',
  KEY_Z = 'z',
  KEY_X = 'x',
  KEY_C = 'c',
}

/**
 * 触摸事件数据接口
 */
export interface TouchData {
  /** X 坐标 */
  x: number;
  /** Y 坐标 */
  y: number;
  /** 触摸点标识符 */
  identifier: number;
}

/**
 * 触摸滑动方向枚举
 */
export enum SwipeDirection {
  /** 无滑动 */
  NONE = 'none',
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
 * 触摸滑动数据接口
 */
export interface SwipeData {
  direction: SwipeDirection;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  distance: number;
}

/**
 * 输入管理器
 * 单例模式，管理键盘和触摸输入
 */
export class InputManager {
  private static instance: InputManager;

  /** 按键状态映射 */
  private keyStates: Map<string, KeyState> = new Map();

  /** 本帧按下的按键 */
  private justPressed: Set<string> = new Set();

  /** 本帧松开的按键 */
  private justReleased: Set<string> = new Set();

  /** 按下时间戳映射 */
  private keyPressTimes: Map<string, number> = new Map();

  /** 触摸点集合 */
  private touches: Map<number, TouchData> = new Map();

  /** 触摸滑动检测 */
  private swipeData: SwipeData = {
    direction: SwipeDirection.NONE,
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
    distance: 0,
  };

  /** 滑动最小距离阈值（像素） */
  private readonly SWIPE_THRESHOLD = 50;

  /** 是否已初始化 */
  private initialized = false;

  /**
   * 私有构造函数，确保单例
   */
  private constructor() {}

  /**
   * 获取输入管理器单例实例
   */
  static getInstance(): InputManager {
    if (!InputManager.instance) {
      InputManager.instance = new InputManager();
    }
    return InputManager.instance;
  }

  /**
   * 初始化输入系统
   * @param target 目标元素，默认为 window
   */
  initialize(target: Window | HTMLElement = window): void {
    if (this.initialized) {
      console.warn('[InputManager] 已经初始化');
      return;
    }

    const eventTarget = target === window ? window.document : target;

    // 键盘事件监听
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));

    // 触摸事件监听
    eventTarget.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
    eventTarget.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: true });
    eventTarget.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
    eventTarget.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { passive: true });

    this.initialized = true;
    console.log('[InputManager] 输入系统已初始化');
  }

  /**
   * 清除所有事件监听
   */
  dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    window.removeEventListener('keyup', this.handleKeyUp.bind(this));
    this.initialized = false;
  }

  /**
   * 处理键盘按下事件
   */
  private handleKeyDown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    const current = this.keyStates.get(key);

    if (current !== KeyState.HELD && current !== KeyState.PRESSED) {
      this.keyStates.set(key, KeyState.PRESSED);
      this.justPressed.add(key);
      this.keyPressTimes.set(key, Date.now());
    }
  }

  /**
   * 处理键盘松开事件
   */
  private handleKeyUp(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    this.keyStates.set(key, KeyState.JUST_RELEASED);
    this.justReleased.add(key);
    this.keyPressTimes.delete(key);
  }

  /**
   * 处理触摸开始事件
   */
  private handleTouchStart(event: TouchEvent): void {
    for (const touch of event.changedTouches) {
      this.touches.set(touch.identifier, {
        x: touch.clientX,
        y: touch.clientY,
        identifier: touch.identifier,
      });
    }

    // 单点触摸，记录为滑动的起点
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      this.swipeData.startX = touch.clientX;
      this.swipeData.startY = touch.clientY;
      this.swipeData.direction = SwipeDirection.NONE;
    }
  }

  /**
   * 处理触摸移动事件
   */
  private handleTouchMove(event: TouchEvent): void {
    for (const touch of event.changedTouches) {
      this.touches.set(touch.identifier, {
        x: touch.clientX,
        y: touch.clientY,
        identifier: touch.identifier,
      });
    }
  }

  /**
   * 处理触摸结束事件
   */
  private handleTouchEnd(event: TouchEvent): void {
    for (const touch of event.changedTouches) {
      this.touches.delete(touch.identifier);
    }

    // 检测滑动
    if (event.touches.length === 0) {
      this.detectSwipe();
    }
  }

  /**
   * 检测滑动方向
   */
  private detectSwipe(): void {
    const deltaX = this.swipeData.endX - this.swipeData.startX;
    const deltaY = this.swipeData.endY - this.swipeData.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    this.swipeData.distance = distance;

    if (distance < this.SWIPE_THRESHOLD) {
      this.swipeData.direction = SwipeDirection.NONE;
      return;
    }

    // 判断主要方向
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // 水平滑动
      this.swipeData.direction = deltaX > 0 ? SwipeDirection.RIGHT : SwipeDirection.LEFT;
    } else {
      // 垂直滑动
      this.swipeData.direction = deltaY > 0 ? SwipeDirection.DOWN : SwipeDirection.UP;
    }
  }

  /**
   * 更新输入状态
   * 应该在每帧开始时调用
   */
  update(): void {
    // 将 PRESSED 转换为 HELD
    for (const [key, state] of this.keyStates) {
      if (state === KeyState.PRESSED) {
        this.keyStates.set(key, KeyState.HELD);
      } else if (state === KeyState.JUST_RELEASED) {
        this.keyStates.delete(key);
      }
    }

    // 清空帧状态
    this.justPressed.clear();
    this.justReleased.clear();

    // 重置滑动数据
    this.swipeData = {
      direction: SwipeDirection.NONE,
      startX: 0,
      startY: 0,
      endX: 0,
      endY: 0,
      distance: 0,
    };
  }

  /**
   * 检查按键是否被按下（刚按下的瞬间）
   */
  isPressed(key: KeyCode | string): boolean {
    return this.justPressed.has(key.toLowerCase());
  }

  /**
   * 检查按键是否被按住（持续按下）
   */
  isHeld(key: KeyCode | string): boolean {
    const state = this.keyStates.get(key.toLowerCase());
    return state === KeyState.HELD || state === KeyState.PRESSED;
  }

  /**
   * 检查按键是否被松开（刚松开的瞬间）
   */
  isReleased(key: KeyCode | string): boolean {
    return this.justReleased.has(key.toLowerCase());
  }

  /**
   * 检查按键是否未按下
   */
  isReleasedState(key: KeyCode | string): boolean {
    const state = this.keyStates.get(key.toLowerCase());
    return state === undefined || state === KeyState.JUST_RELEASED;
  }

  /**
   * 获取按键状态
   */
  getKeyState(key: KeyCode | string): KeyState {
    return this.keyStates.get(key.toLowerCase()) || KeyState.RELEASED;
  }

  /**
   * 检查是否有任意按键被按下
   */
  anyKeyPressed(...keys: (KeyCode | string)[]): boolean {
    return keys.some(key => this.isPressed(key));
  }

  /**
   * 检查是否有任意按键被按住
   */
  anyKeyHeld(...keys: (KeyCode | string)[]): boolean {
    return keys.some(key => this.isHeld(key));
  }

  /**
   * 获取所有触摸点
   */
  getTouches(): TouchData[] {
    return Array.from(this.touches.values());
  }

  /**
   * 获取触摸点数量
   */
  getTouchCount(): number {
    return this.touches.size;
  }

  /**
   * 获取滑动数据
   */
  getSwipeData(): SwipeData {
    return { ...this.swipeData };
  }

  /**
   * 检查是否有滑动
   */
  hasSwipe(): boolean {
    return this.swipeData.direction !== SwipeDirection.NONE;
  }

  /**
   * 获取滑动方向
   */
  getSwipeDirection(): SwipeDirection {
    return this.swipeData.direction;
  }

  /**
   * 获取按键按下的持续时间（毫秒）
   */
  getKeyDuration(key: KeyCode | string): number {
    const pressTime = this.keyPressTimes.get(key.toLowerCase());
    return pressTime ? Date.now() - pressTime : 0;
  }
}

/**
 * 导出输入管理器单例
 */
export const inputManager = InputManager.getInstance();
