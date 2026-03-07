/**
 * 事件触发系统
 * 用于处理游戏中的各种事件触发器，如区域进入、交互、条件判断等
 * 参考 Tuxemon 的事件系统实现
 */

/**
 * 矩形区域接口
 */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 多边形点接口
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * 触发类型枚举
 */
export enum TriggerType {
  /** 进入区域触发 */
  ENTER_ZONE = 'enter_zone',
  /** 交互触发 */
  INTERACT = 'interact',
  /** 条件触发 */
  CONDITION = 'condition',
  /** 离开区域触发 */
  EXIT_ZONE = 'exit_zone',
}

/**
 * 事件动作类型枚举
 */
export enum ActionType {
  /** 对话 */
  DIALOGUE = 'dialogue',
  /** 传送 */
  TELEPORT = 'teleport',
  /** 触发战斗 */
  BATTLE = 'battle',
  /** 播放动画 */
  ANIMATION = 'animation',
  /** 播放音效 */
  SOUND = 'sound',
  /** 播放音乐 */
  MUSIC = 'music',
  /** 添加物品 */
  ADD_ITEM = 'add_item',
  /** 移除物品 */
  REMOVE_ITEM = 'remove_item',
  /** 设置变量 */
  SET_VARIABLE = 'set_variable',
  /** 自定义函数 */
  CUSTOM = 'custom',
}

/**
 * 事件触发器接口
 */
export interface EventTrigger {
  /** 触发器唯一 ID */
  id: string;
  /** 触发器名称 */
  name: string;
  /** 触发类型 */
  type: TriggerType;
  /** 是否启用 */
  enabled: boolean;
  /** 是否只触发一次 */
  once: boolean;
  /** 是否已触发过 */
  triggered: boolean;
  /** 触发区域（矩形） */
  rect?: Rect;
  /** 触发区域（多边形） */
  polygon?: Point[];
  /** 触发条件函数 */
  condition?: () => boolean;
  /** 触发条件表达式（JavaScript 表达式字符串） */
  conditionExpression?: string;
  /** 触发动作列表 */
  actions: EventAction[];
  /** 自定义数据 */
  customData?: Record<string, any>;
  /** 触发冷却时间（毫秒） */
  cooldown?: number;
  /** 上次触发时间 */
  lastTriggerTime?: number;
}

/**
 * 事件动作接口
 */
export interface EventAction {
  /** 动作类型 */
  type: ActionType;
  /** 动作数据 */
  data: Record<string, any>;
  /** 延迟执行时间（毫秒） */
  delay?: number;
}

/**
 * 事件执行结果接口
 */
export interface EventResult {
  /** 触发器 ID */
  triggerId: string;
  /** 是否成功执行 */
  success: boolean;
  /** 错误信息 */
  error?: string;
}

/**
 * 事件触发器回调函数类型
 */
export type TriggerCallback = (trigger: EventTrigger) => void;

/**
 * 事件动作执行器类型
 */
export type ActionExecutor = (action: EventAction) => Promise<void>;

/**
 * 事件系统
 * 单例模式，管理所有事件触发器
 */
export class EventSystem {
  private static instance: EventSystem;

  /** 触发器映射（ID -> Trigger） */
  private triggers: Map<string, EventTrigger> = new Map();

  /** 动作执行器映射（Type -> Executor） */
  private actionExecutors: Map<ActionType, ActionExecutor> = new Map();

  /** 触发器回调列表 */
  private triggerCallbacks: TriggerCallback[] = [];

  /** 游戏变量（用于条件判断） */
  private variables: Map<string, any> = new Map();

  /** 瓦片宽度 */
  private tileWidth: number = 32;

  /** 瓦片高度 */
  private tileHeight: number = 32;

  /** 是否已初始化 */
  private initialized = false;

  /** 上次玩家所在的瓦片坐标（用于检测进入/离开区域） */
  private lastTileX: number = -1;
  private lastTileY: number = -1;

  /**
   * 私有构造函数，确保单例
   */
  private constructor() {}

  /**
   * 获取事件系统单例实例
   */
  static getInstance(): EventSystem {
    if (!EventSystem.instance) {
      EventSystem.instance = new EventSystem();
    }
    return EventSystem.instance;
  }

  /**
   * 初始化事件系统
   * @param tileWidth 瓦片宽度
   * @param tileHeight 瓦片高度
   */
  initialize(tileWidth: number = 32, tileHeight: number = 32): void {
    if (this.initialized) {
      console.warn('[EventSystem] 已经初始化');
      return;
    }

    this.tileWidth = tileWidth;
    this.tileHeight = tileHeight;

    // 注册默认动作执行器
    this.registerDefaultExecutors();

    this.initialized = true;
    console.log('[EventSystem] 事件系统已初始化');
  }

  /**
   * 注册默认动作执行器
   */
  private registerDefaultExecutors(): void {
    // 对话动作
    this.registerExecutor(ActionType.DIALOGUE, async (action) => {
      const text = action.data.text as string;
      console.log(`[EventSystem] 执行对话: ${text}`);
      // TODO: 实际调用 dialogManager
    });

    // 传送动作
    this.registerExecutor(ActionType.TELEPORT, async (action) => {
      const mapId = action.data.mapId as string;
      const x = action.data.x as number;
      const y = action.data.y as number;
      console.log(`[EventSystem] 传送到地图 ${mapId} 的位置 (${x}, ${y})`);
      // TODO: 实际调用 sceneManager
    });

    // 战斗动作
    this.registerExecutor(ActionType.BATTLE, async (action) => {
      const battleId = action.data.battleId as string;
      console.log(`[EventSystem] 触发战斗: ${battleId}`);
      // TODO: 实际触发战斗
    });

    // 播放音效
    this.registerExecutor(ActionType.SOUND, async (action) => {
      const soundId = action.data.soundId as string;
      const volume = (action.data.volume as number) || 1.0;
      console.log(`[EventSystem] 播放音效: ${soundId}, 音量: ${volume}`);
      // TODO: 实际播放音效
    });

    // 播放音乐
    this.registerExecutor(ActionType.MUSIC, async (action) => {
      const musicId = action.data.musicId as string;
      const loop = (action.data.loop as boolean) ?? true;
      console.log(`[EventSystem] 播放音乐: ${musicId}, 循环: ${loop}`);
      // TODO: 实际播放音乐
    });

    // 添加物品
    this.registerExecutor(ActionType.ADD_ITEM, async (action) => {
      const itemId = action.data.itemId as string;
      const quantity = (action.data.quantity as number) || 1;
      console.log(`[EventSystem] 添加物品: ${itemId} x${quantity}`);
      // TODO: 实际添加物品
    });

    // 移除物品
    this.registerExecutor(ActionType.REMOVE_ITEM, async (action) => {
      const itemId = action.data.itemId as string;
      const quantity = (action.data.quantity as number) || 1;
      console.log(`[EventSystem] 移除物品: ${itemId} x${quantity}`);
      // TODO: 实际移除物品
    });

    // 设置变量
    this.registerExecutor(ActionType.SET_VARIABLE, async (action) => {
      const name = action.data.name as string;
      const value = action.data.value;
      this.setVariable(name, value);
      console.log(`[EventSystem] 设置变量: ${name} = ${JSON.stringify(value)}`);
    });

    // 自定义函数
    this.registerExecutor(ActionType.CUSTOM, async (action) => {
      const func = action.data.func as () => void;
      if (typeof func === 'function') {
        func();
      }
    });
  }

  /**
   * 添加事件触发器
   * @param trigger 触发器对象
   */
  addTrigger(trigger: EventTrigger): void {
    // 确保 ID 唯一
    if (this.triggers.has(trigger.id)) {
      console.warn(`[EventSystem] 触发器 ID "${trigger.id}" 已存在，将覆盖`);
    }

    this.triggers.set(trigger.id, trigger);
    console.log(`[EventSystem] 添加触发器: ${trigger.id} (${trigger.name})`);
  }

  /**
   * 批量添加事件触发器
   * @param triggers 触发器数组
   */
  addTriggers(triggers: EventTrigger[]): void {
    for (const trigger of triggers) {
      this.addTrigger(trigger);
    }
  }

  /**
   * 移除事件触发器
   * @param id 触发器 ID
   * @returns 是否成功移除
   */
  removeTrigger(id: string): boolean {
    const removed = this.triggers.delete(id);
    if (removed) {
      console.log(`[EventSystem] 移除触发器: ${id}`);
    }
    return removed;
  }

  /**
   * 获取事件触发器
   * @param id 触发器 ID
   * @returns 触发器对象，如果不存在返回 undefined
   */
  getTrigger(id: string): EventTrigger | undefined {
    return this.triggers.get(id);
  }

  /**
   * 获取所有触发器
   * @returns 触发器数组
   */
  getAllTriggers(): EventTrigger[] {
    return Array.from(this.triggers.values());
  }

  /**
   * 获取启用的触发器
   * @returns 启用的触发器数组
   */
  getEnabledTriggers(): EventTrigger[] {
    return Array.from(this.triggers.values()).filter(t => t.enabled);
  }

  /**
   * 启用触发器
   * @param id 触发器 ID
   */
  enableTrigger(id: string): void {
    const trigger = this.triggers.get(id);
    if (trigger) {
      trigger.enabled = true;
      console.log(`[EventSystem] 启用触发器: ${id}`);
    }
  }

  /**
   * 禁用触发器
   * @param id 触发器 ID
   */
  disableTrigger(id: string): void {
    const trigger = this.triggers.get(id);
    if (trigger) {
      trigger.enabled = false;
      console.log(`[EventSystem] 禁用触发器: ${id}`);
    }
  }

  /**
   * 重置触发器状态（可再次触发）
   * @param id 触发器 ID
   */
  resetTrigger(id: string): void {
    const trigger = this.triggers.get(id);
    if (trigger) {
      trigger.triggered = false;
      trigger.lastTriggerTime = undefined;
      console.log(`[EventSystem] 重置触发器: ${id}`);
    }
  }

  /**
   * 清除所有触发器
   */
  clearTriggers(): void {
    const count = this.triggers.size;
    this.triggers.clear();
    console.log(`[EventSystem] 清除了 ${count} 个触发器`);
  }

  /**
   * 注册动作执行器
   * @param type 动作类型
   * @param executor 执行器函数
   */
  registerExecutor(type: ActionType, executor: ActionExecutor): void {
    this.actionExecutors.set(type, executor);
  }

  /**
   * 检查并触发事件
   * @param playerX 玩家 X 坐标（像素）
   * @param playerY 玩家 Y 坐标（像素）
   * @returns 触发的触发器数量
   */
  checkTriggers(playerX: number, playerY: number): number {
    if (!this.initialized) return 0;

    // 计算当前瓦片坐标
    const currentTileX = Math.floor(playerX / this.tileWidth);
    const currentTileY = Math.floor(playerY / this.tileHeight);

    let triggeredCount = 0;

    for (const trigger of this.getEnabledTriggers()) {
      // 检查是否已经触发过且只触发一次
      if (trigger.once && trigger.triggered) {
        continue;
      }

      // 检查冷却时间
      if (trigger.cooldown && trigger.lastTriggerTime) {
        const timeSinceLastTrigger = Date.now() - trigger.lastTriggerTime;
        if (timeSinceLastTrigger < trigger.cooldown) {
          continue;
        }
      }

      let shouldTrigger = false;

      // 检查条件
      if (this.checkCondition(trigger)) {
        // 根据触发类型检查
        switch (trigger.type) {
          case TriggerType.ENTER_ZONE:
            shouldTrigger = this.checkEnterZone(trigger, currentTileX, currentTileY);
            break;
          case TriggerType.EXIT_ZONE:
            shouldTrigger = this.checkExitZone(trigger, currentTileX, currentTileY);
            break;
          case TriggerType.CONDITION:
            shouldTrigger = true;
            break;
          case TriggerType.INTERACT:
            // 交互触发由外部调用 triggerTrigger
            break;
        }
      }

      if (shouldTrigger) {
        this.executeTrigger(trigger);
        triggeredCount++;
      }
    }

    // 更新上次玩家位置
    this.lastTileX = currentTileX;
    this.lastTileY = currentTileY;

    return triggeredCount;
  }

  /**
   * 手动触发触发器（用于交互）
   * @param id 触发器 ID
   * @returns 是否成功触发
   */
  triggerTrigger(id: string): boolean {
    const trigger = this.triggers.get(id);
    if (!trigger) {
      console.warn(`[EventSystem] 触发器不存在: ${id}`);
      return false;
    }

    if (!trigger.enabled) {
      console.warn(`[EventSystem] 触发器已禁用: ${id}`);
      return false;
    }

    if (trigger.once && trigger.triggered) {
      console.warn(`[EventSystem] 触发器已触发过: ${id}`);
      return false;
    }

    if (trigger.type !== TriggerType.INTERACT && trigger.type !== TriggerType.CONDITION) {
      console.warn(`[EventSystem] 触发器类型不是交互或条件: ${id}`);
      return false;
    }

    if (this.checkCondition(trigger)) {
      this.executeTrigger(trigger);
      return true;
    }

    return false;
  }

  /**
   * 检查进入区域触发
   */
  private checkEnterZone(trigger: EventTrigger, tileX: number, tileY: number): boolean {
    // 检查是否从区域外进入区域内
    const wasInside = this.isInsideZone(trigger, this.lastTileX, this.lastTileY);
    const isInside = this.isInsideZone(trigger, tileX, tileY);

    return !wasInside && isInside;
  }

  /**
   * 检查离开区域触发
   */
  private checkExitZone(trigger: EventTrigger, tileX: number, tileY: number): boolean {
    // 检查是否从区域内离开区域外
    const wasInside = this.isInsideZone(trigger, this.lastTileX, this.lastTileY);
    const isInside = this.isInsideZone(trigger, tileX, tileY);

    return wasInside && !isInside;
  }

  /**
   * 检查点是否在触发区域内
   */
  private isInsideZone(trigger: EventTrigger, tileX: number, tileY: number): boolean {
    const x = tileX * this.tileWidth;
    const y = tileY * this.tileHeight;

    // 检查矩形区域
    if (trigger.rect) {
      const rect = trigger.rect;
      return x >= rect.x && x < rect.x + rect.width &&
             y >= rect.y && y < rect.y + rect.height;
    }

    // 检查多边形区域
    if (trigger.polygon && trigger.polygon.length >= 3) {
      return this.isPointInPolygon({ x, y }, trigger.polygon);
    }

    return false;
  }

  /**
   * 检查点是否在多边形内（射线法）
   */
  private isPointInPolygon(point: Point, polygon: Point[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;

      if (((yi > point.y) !== (yj > point.y)) &&
          (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  /**
   * 检查触发器条件
   */
  private checkCondition(trigger: EventTrigger): boolean {
    // 检查条件函数
    if (trigger.condition) {
      try {
        return trigger.condition();
      } catch (error) {
        console.error(`[EventSystem] 条件函数执行错误: ${trigger.id}`, error);
        return false;
      }
    }

    // 检查条件表达式
    if (trigger.conditionExpression) {
      try {
        // 创建安全的执行环境
        const variables = Object.fromEntries(this.variables);
        const func = new Function('variables', `with(variables) { return ${trigger.conditionExpression}; }`);
        return func(variables) === true;
      } catch (error) {
        console.error(`[EventSystem] 条件表达式执行错误: ${trigger.id}`, error);
        return false;
      }
    }

    // 没有条件时默认为 true
    return true;
  }

  /**
   * 执行触发器
   */
  private async executeTrigger(trigger: EventTrigger): Promise<void> {
    console.log(`[EventSystem] 触发事件: ${trigger.id} (${trigger.name})`);

    // 标记为已触发
    trigger.triggered = true;
    trigger.lastTriggerTime = Date.now();

    // 调用触发器回调
    for (const callback of this.triggerCallbacks) {
      callback(trigger);
    }

    // 执行所有动作
    for (const action of trigger.actions) {
      await this.executeAction(action);
    }
  }

  /**
   * 执行单个动作
   */
  private async executeAction(action: EventAction): Promise<void> {
    const executor = this.actionExecutors.get(action.type);
    if (!executor) {
      console.warn(`[EventSystem] 未注册动作执行器: ${action.type}`);
      return;
    }

    try {
      // 延迟执行
      if (action.delay && action.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, action.delay));
      }

      await executor(action);
    } catch (error) {
      console.error(`[EventSystem] 动作执行错误: ${action.type}`, error);
    }
  }

  /**
   * 注册触发器回调
   */
  onTrigger(callback: TriggerCallback): void {
    this.triggerCallbacks.push(callback);
  }

  /**
   * 移除触发器回调
   */
  offTrigger(callback: TriggerCallback): void {
    const index = this.triggerCallbacks.indexOf(callback);
    if (index !== -1) {
      this.triggerCallbacks.splice(index, 1);
    }
  }

  /**
   * 设置变量
   */
  setVariable(name: string, value: any): void {
    this.variables.set(name, value);
  }

  /**
   * 获取变量
   */
  getVariable(name: string): any {
    return this.variables.get(name);
  }

  /**
   * 删除变量
   */
  deleteVariable(name: string): boolean {
    return this.variables.delete(name);
  }

  /**
   * 获取所有变量
   */
  getAllVariables(): Record<string, any> {
    return Object.fromEntries(this.variables);
  }

  /**
   * 清除所有变量
   */
  clearVariables(): void {
    this.variables.clear();
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalTriggers: number;
    enabledTriggers: number;
    triggeredTriggers: number;
    variables: number;
  } {
    const triggers = Array.from(this.triggers.values());
    return {
      totalTriggers: triggers.length,
      enabledTriggers: triggers.filter(t => t.enabled).length,
      triggeredTriggers: triggers.filter(t => t.triggered).length,
      variables: this.variables.size,
    };
  }

  /**
   * 重置系统
   */
  reset(): void {
    this.triggers.clear();
    this.triggerCallbacks = [];
    this.variables.clear();
    this.lastTileX = -1;
    this.lastTileY = -1;
    console.log('[EventSystem] 系统已重置');
  }
}

/**
 * 导出事件系统单例
 */
export const eventSystem = EventSystem.getInstance();
