/**
 * 路径队列系统
 *
 * 支持多点路径、循环、暂停和恢复
 */

/**
 * 路径点接口
 */
export interface Waypoint {
  /** X 坐标 */
  x: number;
  /** Y 坐标 */
  y: number;
  /** 停留时间（毫秒） */
  waitTime: number;
  /** 自定义数据 */
  customData?: Record<string, any>;
}

/**
 * 路径队列配置
 */
export interface PathQueueConfig {
  /** 是否循环 */
  loop: boolean;
  /** 循环次数（-1 表示无限循环） */
  loopCount: number;
  /** 是否在到达最后一个点后反向循环 */
  reverseOnEnd: boolean;
}

/**
 * 路径队列状态
 */
export enum PathQueueState {
  /** 空闲 */
  IDLE = 'idle',
  /** 移动中 */
  MOVING = 'moving',
  /** 等待中 */
  WAITING = 'waiting',
  /** 暂停 */
  PAUSED = 'paused',
  /** 完成 */
  COMPLETED = 'completed',
}

/**
 * 路径队列事件
 */
export interface PathQueueEvents {
  /** 路径完成时的回调 */
  onCompleted?: () => void;
  /** 到达路径点时的回调 */
  onWaypointReached?: (waypoint: Waypoint, index: number) => void;
  /** 开始移动时的回调 */
  onMoveStart?: () => void;
  /** 开始等待时的回调 */
  onWaitStart?: (waypoint: Waypoint, index: number) => void;
}

/**
 * 路径队列
 */
export class PathQueue {
  /** 路径点列表 */
  private waypoints: Waypoint[] = [];

  /** 当前路径点索引 */
  private currentIndex: number = 0;

  /** 路径队列配置 */
  private config: PathQueueConfig = {
    loop: false,
    loopCount: 0,
    reverseOnEnd: false,
  };

  /** 当前状态 */
  private state: PathQueueState = PathQueueState.IDLE;

  /** 当前路径方向 */
  private direction: 1 | -1 = 1;

  /** 等待结束时间 */
  private waitEndTime: number = 0;

  /** 当前循环次数 */
  private currentLoop: number = 0;

  /** 事件回调 */
  private events: PathQueueEvents = {};

  /**
   * 构造函数
   */
  constructor(waypoints: Waypoint[] = [], config?: Partial<PathQueueConfig>) {
    this.waypoints = [...waypoints];
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * 设置路径点
   */
  setWaypoints(waypoints: Waypoint[]): void {
    this.waypoints = [...waypoints];
    this.reset();
  }

  /**
   * 添加路径点
   */
  addWaypoint(waypoint: Waypoint): void {
    this.waypoints.push(waypoint);
  }

  /**
   * 在指定位置插入路径点
   */
  insertWaypoint(index: number, waypoint: Waypoint): void {
    this.waypoints.splice(index, 0, waypoint);
  }

  /**
   * 移除路径点
   */
  removeWaypoint(index: number): void {
    this.waypoints.splice(index, 1);
    if (this.currentIndex >= this.waypoints.length) {
      this.currentIndex = Math.max(0, this.waypoints.length - 1);
    }
  }

  /**
   * 获取当前路径点
   */
  getCurrentWaypoint(): Waypoint | null {
    if (this.waypoints.length === 0) {
      return null;
    }
    return this.waypoints[this.currentIndex];
  }

  /**
   * 获取下一个路径点
   */
  getNextWaypoint(): Waypoint | null {
    this.advanceToNextWaypoint();
    return this.getCurrentWaypoint();
  }

  /**
   * 前进到下一个路径点
   */
  private advanceToNextWaypoint(): boolean {
    if (this.waypoints.length === 0) {
      return false;
    }

    // 根据方向计算下一个索引
    const nextIndex = this.currentIndex + this.direction;

    // 检查是否到达边界
    if (nextIndex >= this.waypoints.length) {
      if (this.config.loop) {
        // 检查是否完成所有循环
        if (this.config.loopCount > 0 && this.currentLoop >= this.config.loopCount) {
          this.state = PathQueueState.COMPLETED;
          this.triggerCompleted();
          return false;
        }

        if (this.config.reverseOnEnd) {
          // 反向循环
          this.direction = -1;
          this.currentIndex = Math.max(0, this.waypoints.length - 1);
          this.currentLoop++;
        } else {
          // 正向循环
          this.currentIndex = 0;
          this.currentLoop++;
        }
      } else {
        // 不循环，完成路径
        this.state = PathQueueState.COMPLETED;
        this.triggerCompleted();
        return false;
      }
    } else if (nextIndex < 0) {
      if (this.config.loop && this.config.reverseOnEnd) {
        // 反向循环到起点，转回正向
        this.direction = 1;
        this.currentIndex = 0;
        this.currentLoop++;
      } else {
        // 不循环或没有反向选项，完成路径
        this.state = PathQueueState.COMPLETED;
        this.triggerCompleted();
        return false;
      }
    } else {
      this.currentIndex = nextIndex;
    }

    return true;
  }

  /**
   * 跳转到指定路径点
   */
  jumpToWaypoint(index: number): boolean {
    if (index < 0 || index >= this.waypoints.length) {
      return false;
    }
    this.currentIndex = index;
    this.state = PathQueueState.MOVING;
    return true;
  }

  /**
   * 更新路径队列
   * @param currentTime 当前时间（毫秒）
   */
  update(currentTime: number): void {
    if (this.state === PathQueueState.PAUSED || this.state === PathQueueState.COMPLETED) {
      return;
    }

    if (this.waypoints.length === 0) {
      return;
    }

    const currentWaypoint = this.getCurrentWaypoint();

    switch (this.state) {
      case PathQueueState.IDLE:
        // 开始移动到第一个路径点
        if (currentWaypoint) {
          this.state = PathQueueState.MOVING;
          this.triggerMoveStart();
        }
        break;

      case PathQueueState.MOVING:
        // 移动中，等待外部通知到达路径点
        break;

      case PathQueueState.WAITING:
        // 检查等待是否完成
        if (currentTime >= this.waitEndTime) {
          // 等待完成，移动到下一个路径点
          if (this.advanceToNextWaypoint()) {
            this.state = PathQueueState.MOVING;
            this.triggerMoveStart();
          }
        }
        break;
    }
  }

  /**
   * 通知到达当前路径点
   */
  notifyReached(): void {
    if (this.state !== PathQueueState.MOVING) {
      return;
    }

    const currentWaypoint = this.getCurrentWaypoint();
    if (currentWaypoint) {
      this.triggerWaypointReached(currentWaypoint, this.currentIndex);

      // 检查是否需要等待
      if (currentWaypoint.waitTime > 0) {
        this.state = PathQueueState.WAITING;
        this.waitEndTime = Date.now() + currentWaypoint.waitTime;
        this.triggerWaitStart(currentWaypoint, this.currentIndex);
      } else {
        // 不需要等待，直接移动到下一个路径点
        if (this.advanceToNextWaypoint()) {
          this.triggerMoveStart();
        } else {
          this.triggerCompleted();
        }
      }
    }
  }

  /**
   * 暂停路径队列
   */
  pause(): void {
    if (this.state === PathQueueState.MOVING || this.state === PathQueueState.WAITING) {
      this.state = PathQueueState.PAUSED;
    }
  }

  /**
   * 恢复路径队列
   */
  resume(): void {
    if (this.state === PathQueueState.PAUSED) {
      this.state = PathQueueState.MOVING;
      this.triggerMoveStart();
    }
  }

  /**
   * 重置路径队列
   */
  reset(): void {
    this.currentIndex = 0;
    this.state = PathQueueState.IDLE;
    this.direction = 1;
    this.currentLoop = 0;
    this.waitEndTime = 0;
  }

  /**
   * 清空路径点
   */
  clear(): void {
    this.waypoints = [];
    this.reset();
  }

  /**
   * 获取所有路径点
   */
  getWaypoints(): Waypoint[] {
    return [...this.waypoints];
  }

  /**
   * 获取当前状态
   */
  getState(): PathQueueState {
    return this.state;
  }

  /**
   * 获取当前索引
   */
  getCurrentIndex(): number {
    return this.currentIndex;
  }

  /**
   * 检查是否已完成
   */
  isCompleted(): boolean {
    return this.state === PathQueueState.COMPLETED;
  }

  /**
   * 检查是否为空
   */
  isEmpty(): boolean {
    return this.waypoints.length === 0;
  }

  /**
   * 设置配置
   */
  setConfig(config: Partial<PathQueueConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取配置
   */
  getConfig(): PathQueueConfig {
    return { ...this.config };
  }

  /**
   * 设置事件回调
   */
  setEvents(events: PathQueueEvents): void {
    this.events = { ...this.events, ...events };
  }

  /**
   * 触发路径完成事件
   */
  private triggerCompleted(): void {
    if (this.events.onCompleted) {
      this.events.onCompleted();
    }
  }

  /**
   * 触发到达路径点事件
   */
  private triggerWaypointReached(waypoint: Waypoint, index: number): void {
    if (this.events.onWaypointReached) {
      this.events.onWaypointReached(waypoint, index);
    }
  }

  /**
   * 触发移动开始事件
   */
  private triggerMoveStart(): void {
    if (this.events.onMoveStart) {
      this.events.onMoveStart();
    }
  }

  /**
   * 触发等待开始事件
   */
  private triggerWaitStart(waypoint: Waypoint, index: number): void {
    if (this.events.onWaitStart) {
      this.events.onWaitStart(waypoint, index);
    }
  }

  /**
   * 创建一个简单的线性路径
   */
  static createLinearPath(
    startX: number,
    startY: number,
    points: [number, number][],
    waitTime: number = 0
  ): PathQueue {
    const waypoints: Waypoint[] = [
      { x: startX, y: startY, waitTime: 0 },
      ...points.map(([x, y]) => ({ x, y, waitTime })),
    ];
    return new PathQueue(waypoints, { loop: false });
  }

  /**
   * 创建一个循环路径
   */
  static createLoopPath(
    startX: number,
    startY: number,
    points: [number, number][],
    waitTime: number = 0,
    reverse: boolean = false
  ): PathQueue {
    const waypoints: Waypoint[] = [
      { x: startX, y: startY, waitTime: 0 },
      ...points.map(([x, y]) => ({ x, y, waitTime })),
    ];
    return new PathQueue(waypoints, {
      loop: true,
      loopCount: -1,
      reverseOnEnd: reverse,
    });
  }

  /**
   * 创建一个往返路径
   */
  static createBackAndForthPath(
    startX: number,
    startY: number,
    points: [number, number][],
    waitTime: number = 0
  ): PathQueue {
    const waypoints: Waypoint[] = [
      { x: startX, y: startY, waitTime: 0 },
      ...points.map(([x, y]) => ({ x, y, waitTime })),
    ];
    return new PathQueue(waypoints, {
      loop: true,
      loopCount: -1,
      reverseOnEnd: true,
    });
  }
}
