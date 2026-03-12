import { inputManager, KeyCode } from './InputManager.js';
import { playerController, PlayerState } from './PlayerController.js';
import { npcManager, NPC } from './NPCManager.js';
import { dialogManager } from './DialogManager.js';
import { sceneManager } from './SceneManager.js';
import { TMXObject } from './MapParser.js';
import { shopUI } from '../components/ShopUI.js';
import { audioManager } from './AudioManager.js';

/**
 * 交互类型枚举
 */
export enum InteractionType {
  /** NPC 对话 */
  NPC_DIALOGUE = 'npc_dialogue',
  /** NPC 商店 */
  NPC_SHOP = 'npc_shop',
  /** NPC 任务 */
  NPC_QUEST = 'npc_quest',
  /** NPC 治疗 */
  NPC_HEAL = 'npc_heal',
  /** NPC 传送 */
  NPC_TELEPORT = 'npc_teleport',
  /** 对象交互（宝箱、开关等） */
  OBJECT = 'object',
  /** 地图传送点 */
  MAP_TELEPORT = 'map_teleport',
  /** 场景切换 */
  SCENE_CHANGE = 'scene_change',
}

/**
 * 交互事件接口
 */
export interface InteractionEvent {
  /** 交互类型 */
  type: InteractionType;
  /** 交互时间戳 */
  timestamp: number;
  /** NPC ID（NPC 交互时） */
  npcId?: string;
  /** 对象 ID（对象交互时） */
  objectId?: number;
  /** 交互数据 */
  data?: Record<string, unknown>;
}

/**
 * 交互结果接口
 */
export interface InteractionResult {
  /** 是否成功交互 */
  success: boolean;
  /** 交互结果消息 */
  message?: string;
  /** 执行的回调 */
  callback?: () => void;
}

/**
 * 交互配置接口
 */
export interface InteractionConfig {
  /** 交互键（默认空格） */
  interactKey: KeyCode;
  /** 备用交互键 */
  alternateKey: KeyCode;
  /** 交互距离（瓦片） */
  interactDistance: number;
  /** 交互冷却时间（毫秒） */
  interactCooldown: number;
  /** 是否显示交互提示 */
  showInteractionPrompt: boolean;
  /** 交互提示颜色 */
  promptColor: string;
  /** 交互提示字体 */
  promptFont: string;
}

/**
 * 交互回调函数类型
 */
export type InteractionCallback = (event: InteractionEvent) => InteractionResult | void;

/**
 * 交互管理器
 * 负责统一管理游戏内的交互事件
 * 单例模式
 */
export class InteractionManager {
  private static instance: InteractionManager;

  /** 配置 */
  private config: InteractionConfig = {
    interactKey: KeyCode.SPACE,
    alternateKey: KeyCode.ENTER,
    interactDistance: 1,
    interactCooldown: 200,
    showInteractionPrompt: true,
    promptColor: '#48bb78',
    promptFont: '14px Arial',
  };

  /** 最后一次交互时间 */
  private lastInteractionTime: number = 0;

  /** 当前可交互对象 */
  private currentInteractable: NPC | TMXObject | null = null;

  /** 当前交互提示文本 */
  private currentPrompt: string = '';

  /** 是否显示交互提示 */
  private showPrompt: boolean = false;

  /** 交互事件历史记录 */
  private eventHistory: InteractionEvent[] = [];

  /** 最大历史记录数量 */
  private readonly MAX_HISTORY_SIZE = 100;

  /** 交互回调映射 */
  private callbacks: Map<InteractionType, InteractionCallback[]> = new Map();

  /** 通用交互回调列表 */
  private globalCallbacks: InteractionCallback[] = [];

  /** 是否已初始化 */
  private initialized = false;

  /**
   * 私有构造函数，确保单例
   */
  private constructor() {}

  /**
   * 获取交互管理器单例实例
   */
  static getInstance(): InteractionManager {
    if (!InteractionManager.instance) {
      InteractionManager.instance = new InteractionManager();
    }
    return InteractionManager.instance;
  }

  /**
   * 初始化交互管理器
   * @param config 配置
   */
  initialize(config?: Partial<InteractionConfig>): void {
    if (this.initialized) {
      console.warn('[InteractionManager] 已经初始化');
      return;
    }

    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.initialized = true;
    console.log('[InteractionManager] 交互管理器已初始化');
  }

  /**
   * 更新交互状态
   * @param _deltaTime 距离上一帧的时间（毫秒）
   */
  update(_deltaTime: number): void {
    // 检查交互输入
    this.checkInteractionInput();

    // 更新可交互对象检测
    this.updateInteractable();

    // 检查传送门
    this.checkTeleport();
  }

  /**
   * 检查交互输入
   */
  private checkInteractionInput(): void {
    // 如果正在对话中，不处理交互输入
    if (dialogManager.isDialogueActive()) {
      return;
    }

    // 检查玩家状态
    if (playerController.getState() !== PlayerState.IDLE) {
      return;
    }

    // 检查交互键是否被按下
    if (inputManager.isPressed(this.config.interactKey) || inputManager.isPressed(this.config.alternateKey)) {
      const currentTime = Date.now();
      const cooldownPassed = currentTime - this.lastInteractionTime >= this.config.interactCooldown;

      if (cooldownPassed) {
        this.performInteraction();
        this.lastInteractionTime = currentTime;
      }
    }
  }

  /**
   * 更新可交互对象
   */
  private updateInteractable(): void {
    this.currentInteractable = null;
    this.currentPrompt = '';
    this.showPrompt = false;

    // 检查玩家面前的 NPC
    const npcInFront = npcManager.getNPCInFrontOfPlayer();
    if (npcInFront && npcInFront.interactable) {
      this.currentInteractable = npcInFront;
      this.currentPrompt = `与 ${npcInFront.name} 交谈`;
      this.showPrompt = true;
      return;
    }

    // 检查其他可交互对象（如宝箱、开关等）
    // TODO: 实现对象交互检测
  }

  /**
   * 执行交互
   */
  private performInteraction(): void {
    if (!this.currentInteractable) {
      return;
    }

    const event: InteractionEvent = {
      type: InteractionType.NPC_DIALOGUE,
      timestamp: Date.now(),
    };

    // 如果是 NPC
    if ('id' in this.currentInteractable) {
      const npc = this.currentInteractable as NPC;
      event.npcId = npc.id;
      event.data = { npc };

      // 开始 NPC 交互
      const result = this.handleNPCInteraction(npc);
      if (result.callback) {
        result.callback();
      }
    } else if ('id' in this.currentInteractable) {
      // 如果是对象
      const obj = this.currentInteractable as TMXObject;
      event.objectId = obj.id;
      event.data = { object: obj };

      // TODO: 实现对象交互
    }

    // 记录事件
    this.recordEvent(event);

    // 触发回调
    this.triggerCallbacks(event);
  }

  /**
   * 处理 NPC 交互
   */
  private handleNPCInteraction(npc: NPC): InteractionResult {
    console.log(`[InteractionManager] 与 NPC 交互: ${npc.name}`);

    // 根据交互类型处理
    switch (npc.interactionType) {
      case 'dialogue':
        return this.handleDialogue(npc);

      case 'shop':
        return this.handleShop(npc);

      case 'quest':
        return this.handleQuest(npc);

      case 'heal':
        return this.handleHeal(npc);

      case 'teleport':
        return this.handleTeleport(npc);

      default:
        return { success: false, message: '未知的交互类型' };
    }
  }

  /**
   * 处理对话
   */
  private handleDialogue(npc: NPC): InteractionResult {
    // 获取对话
    const dialogueId = npc.initialDialogueId || npc.dialogues[0]?.id;
    const dialogue = npc.dialogues.find(d => d.id === dialogueId);

    if (!dialogue) {
      return { success: false, message: '没有可用的对话' };
    }

    // 显示对话
    dialogManager.showDialogueQueue(npc.id, npc.dialogues, () => {
      console.log(`[InteractionManager] 对话结束: ${npc.name}`);
      npcManager.endInteraction();
    });

    return { success: true };
  }

  /**
   * 处理商店
   */
  private handleShop(npc: NPC): InteractionResult {
    // 播放商店音效
    audioManager.playSFX('interface/confirm');

    // 显示欢迎对话（如果有）
    const dialogue = npc.dialogues[0];
    if (dialogue) {
      dialogManager.showDialogue(npc.id, dialogue);
    }

    // 获取关联的商店 ID（从 NPC 自定义数据中获取）
    const shopId = (npc.customData?.shopId as string) || 'village_general_shop';

    // 打开商店 UI
    const success = shopUI.openShop(shopId, 'player', new Map());

    if (success) {
      // 设置商店关闭回调
      const shopCloseCallback = () => {
        console.log(`[InteractionManager] 商店关闭: ${npc.name}`);
        shopUI.setCallback(() => {});
        npcManager.endInteraction();
      };

      shopUI.setCallback((action) => {
        if (action === 'back' || action === 'cancel') {
          shopCloseCallback();
        }
      });

      console.log(`[InteractionManager] 打开商店: ${npc.name}`);
      return { success: true, callback: shopCloseCallback };
    } else {
      console.error(`[InteractionManager] 无法打开商店: ${shopId}`);
      return { success: false, message: '商店无法打开' };
    }
  }

  /**
   * 处理任务
   */
  private handleQuest(npc: NPC): InteractionResult {
    const dialogue = npc.dialogues[0];
    if (dialogue) {
      dialogManager.showDialogue(npc.id, dialogue);
    }

    // TODO: 打开任务 UI
    console.log(`[InteractionManager] 打开任务: ${npc.name}`);
    return { success: true };
  }

  /**
   * 处理治疗
   */
  private handleHeal(npc: NPC): InteractionResult {
    const dialogue = npc.dialogues[0];
    if (dialogue) {
      dialogManager.showDialogue(npc.id, dialogue);
    }

    // TODO: 治疗宠物
    console.log(`[InteractionManager] 治疗: ${npc.name}`);
    return { success: true };
  }

  /**
   * 处理传送
   */
  private handleTeleport(npc: NPC): InteractionResult {
    const dialogue = npc.dialogues[0];
    if (dialogue) {
      dialogManager.showDialogue(npc.id, dialogue);
    }

    // TODO: 传送玩家
    console.log(`[InteractionManager] 传送: ${npc.name}`);
    return { success: true };
  }

  /**
   * 记录事件
   */
  private recordEvent(event: InteractionEvent): void {
    this.eventHistory.push(event);

    // 限制历史记录大小
    if (this.eventHistory.length > this.MAX_HISTORY_SIZE) {
      this.eventHistory.shift();
    }
  }

  /**
   * 触发回调
   */
  private triggerCallbacks(event: InteractionEvent): void {
    // 触发类型特定的回调
    const typeCallbacks = this.callbacks.get(event.type) || [];
    for (const callback of typeCallbacks) {
      callback(event);
    }

    // 触发全局回调
    for (const callback of this.globalCallbacks) {
      callback(event);
    }
  }

  /**
   * 渲染交互提示
   * @param ctx Canvas 2D 上下文
   * @param cameraX 摄像机 X
   * @param cameraY 摄像机 Y
   */
  render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
    if (!this.showPrompt || !this.currentInteractable) {
      return;
    }

    let promptX: number;
    let promptY: number;

    // 如果是 NPC
    if ('x' in this.currentInteractable) {
      const npc = this.currentInteractable as NPC;
      promptX = npc.x - cameraX + 16;
      promptY = npc.y - cameraY - 10;
    } else if ('x' in this.currentInteractable) {
      const obj = this.currentInteractable as TMXObject;
      promptX = obj.x - cameraX + 16;
      promptY = obj.y - cameraY - 10;
    } else {
      return;
    }

    ctx.save();

    // 绘制提示背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.font = this.config.promptFont;
    const textWidth = ctx.measureText(this.currentPrompt).width;
    ctx.beginPath();
    ctx.roundRect(promptX - textWidth / 2 - 8, promptY - 20, textWidth + 16, 24, 6);
    ctx.fill();

    // 绘制提示文本
    ctx.fillStyle = this.config.promptColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.currentPrompt, promptX, promptY - 8);

    // 绘制闪烁的交互键提示
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    const keyName = this.getKeyName(this.config.interactKey);
    ctx.fillText(`[${keyName}]`, promptX, promptY + 10);

    ctx.restore();
  }

  /**
   * 注册交互回调
   * @param type 交互类型
   * @param callback 回调函数
   */
  on(type: InteractionType, callback: InteractionCallback): void {
    if (!this.callbacks.has(type)) {
      this.callbacks.set(type, []);
    }
    this.callbacks.get(type)!.push(callback);
  }

  /**
   * 注册全局交互回调
   * @param callback 回调函数
   */
  onAny(callback: InteractionCallback): void {
    this.globalCallbacks.push(callback);
  }

  /**
   * 移除交互回调
   * @param type 交互类型
   * @param callback 回调函数
   */
  off(type: InteractionType, callback: InteractionCallback): void {
    const callbacks = this.callbacks.get(type);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * 移除全局交互回调
   * @param callback 回调函数
   */
  offAny(callback: InteractionCallback): void {
    const index = this.globalCallbacks.indexOf(callback);
    if (index !== -1) {
      this.globalCallbacks.splice(index, 1);
    }
  }

  /**
   * 获取当前可交互对象
   */
  getCurrentInteractable(): NPC | TMXObject | null {
    return this.currentInteractable;
  }

  /**
   * 获取事件历史记录
   */
  getEventHistory(): InteractionEvent[] {
    return [...this.eventHistory];
  }

  /**
   * 清空事件历史记录
   */
  clearEventHistory(): void {
    this.eventHistory = [];
  }

  /**
   * 设置配置
   */
  setConfig(config: Partial<InteractionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取配置
   */
  getConfig(): InteractionConfig {
    return { ...this.config };
  }

  /**
   * 设置交互提示显示
   */
  setShowPrompt(show: boolean): void {
    this.showPrompt = show;
  }

  /**
   * 重置交互管理器
   */
  reset(): void {
    this.currentInteractable = null;
    this.currentPrompt = '';
    this.showPrompt = false;
    this.eventHistory = [];
    this.lastInteractionTime = 0;
  }

  /**
   * 检查传送门
   * 自动检测玩家是否站在传送门上
   */
  private checkTeleport(): void {
    // 如果正在对话中或场景切换中，不检查传送门
    if (dialogManager.isDialogueActive() || sceneManager.isTransitioning()) {
      return;
    }

    // 检查玩家是否站在传送门上
    const teleport = sceneManager.checkPlayerOnTeleport();
    if (teleport) {
      console.log(`[InteractionManager] Player on teleport: ${teleport.name}`);
      
      // 触发场景切换
      sceneManager.triggerTeleport(teleport);
      
      // 记录事件
      this.recordEvent({
        type: InteractionType.SCENE_CHANGE,
        timestamp: Date.now(),
        data: {
          teleportId: teleport.id,
          targetMapId: teleport.targetMapId,
          targetX: teleport.targetX,
          targetY: teleport.targetY,
        },
      });
    }
  }

  /**
   * 获取键名（用于显示）
   * @param key 键码
   * @returns 键名
   */
  private getKeyName(key: KeyCode | string): string {
    const keyStr = typeof key === 'string' ? key : String(key);
    
    // 将 KeyCode 枚举转换为可读名称
    const keyNameMap: Record<string, string> = {
      'ArrowUp': '↑',
      'ArrowDown': '↓',
      'ArrowLeft': '←',
      'ArrowRight': '→',
      ' ': 'Space',
      'Space': 'Space',
      'Enter': 'Enter',
      'Escape': 'Esc',
    };
    
    return keyNameMap[keyStr] || keyStr;
  }
}

/**
 * 导出交互管理器单例
 */
export const interactionManager = InteractionManager.getInstance();
