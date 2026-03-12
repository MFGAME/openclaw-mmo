import { inputManager, KeyCode } from './InputManager.js';
import { NPCDialogue } from './NPCManager.js';

/**
 * 对话选项接口
 */
export interface DialogChoice {
  /** 选项文本 */
  text: string;
  /** 下一对话 ID */
  next: string;
  /** 选中后的回调 */
  callback?: () => void;
}

/**
 * 对话状态枚举
 */
export enum DialogState {
  /** 未显示 */
  HIDDEN = 'hidden',
  /** 正在显示文本（打字机效果） */
  TYPING = 'typing',
  /** 等待玩家输入 */
  WAITING = 'waiting',
  /** 显示选项 */
  CHOICES = 'choices',
}

/**
 * 对话配置接口
 */
export interface DialogConfig {
  /** 对话框宽度（像素） */
  width: number;
  /** 对话框高度（像素） */
  height: number;
  /** 距离底部的距离（像素） */
  bottomMargin: number;
  /** 背景颜色 */
  backgroundColor: string;
  /** 文本颜色 */
  textColor: string;
  /** 边框颜色 */
  borderColor: string;
  /** 边框宽度 */
  borderWidth: number;
  /** 字体 */
  font: string;
  /** 文本内边距 */
  textPadding: number;
  /** 选项背景颜色 */
  choiceBackgroundColor: string;
  /** 选项选中颜色 */
  choiceSelectedColor: string;
  /** 选项文本颜色 */
  choiceTextColor: string;
  /** 打字机效果速度（字符/毫秒） */
  typingSpeed: number;
}

/**
 * 对话管理器
 * 负责显示和管理 NPC 对话 UI
 * 单例模式
 */
export class DialogManager {
  private static instance: DialogManager;

  /** 当前对话 */
  private currentDialogue: NPCDialogue | null = null;

  /** 当前显示的文本（用于打字机效果） */
  private displayedText: string = '';

  /** 当前显示的选项 */
  private currentChoices: DialogChoice[] = [];

  /** 当前选中的选项索引 */
  private selectedChoiceIndex: number = 0;

  /** 对话状态 */
  private state: DialogState = DialogState.HIDDEN;

  /** 配置 */
  private config: DialogConfig = {
    width: 600,
    height: 150,
    bottomMargin: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    textColor: '#ffffff',
    borderColor: '#4a5568',
    borderWidth: 2,
    font: '16px Arial',
    textPadding: 20,
    choiceBackgroundColor: 'rgba(74, 85, 104, 0.8)',
    choiceSelectedColor: 'rgba(72, 187, 120, 0.9)',
    choiceTextColor: '#ffffff',
    typingSpeed: 30,
  };

  /** 对话队列（多段对话） */
  private dialogueQueue: NPCDialogue[] = [];

  /** 当前 NPC */
  private currentNPC: string | null = null;

  /** 打字机效果计时器 */
  private typingTimer: number = 0;

  /** 文本位置 X */
  private dialogX: number = 0;

  /** 文本位置 Y */
  private dialogY: number = 0;

  /** 对话结束回调 */
  private onDialogueEnd: (() => void) | null = null;

  /** 选择完成回调 */
  private onChoiceSelected: ((choice: DialogChoice) => void) | null = null;

  /** 是否可见 */
  private visible: boolean = false;

  /** 跳过按钮 */
  private skipKeyPressed: boolean = false;

  /** 是否已初始化 */
  private initialized = false;

  /**
   * 私有构造函数，确保单例
   */
  private constructor() {}

  /**
   * 获取对话管理器单例实例
   */
  static getInstance(): DialogManager {
    if (!DialogManager.instance) {
      DialogManager.instance = new DialogManager();
    }
    return DialogManager.instance;
  }

  /**
   * 初始化对话管理器
   * @param config 配置
   * @param screenWidth 屏幕宽度
   * @param screenHeight 屏幕高度
   */
  initialize(config?: Partial<DialogConfig>, screenWidth = 800, screenHeight = 600): void {
    if (this.initialized) {
      console.warn('[DialogManager] 已经初始化');
      return;
    }

    if (config) {
      this.config = { ...this.config, ...config };
    }

    // 计算对话框位置
    this.dialogX = (screenWidth - this.config.width) / 2;
    this.dialogY = screenHeight - this.config.height - this.config.bottomMargin;

    this.initialized = true;
    console.log('[DialogManager] 对话管理器已初始化');
  }

  /**
   * 开始对话
   * @param npcId NPC ID
   * @param dialogue 对话数据
   * @param callback 对话结束回调
   */
  showDialogue(npcId: string, dialogue: NPCDialogue, callback?: () => void): void {
    this.currentNPC = npcId;
    this.currentDialogue = dialogue;
    this.onDialogueEnd = callback || null;
    this.visible = true;
    this.state = DialogState.TYPING;
    this.displayedText = '';
    this.typingTimer = 0;

    console.log(`[DialogManager] 开始对话: ${dialogue.text}`);
  }

  /**
   * 显示对话队列
   * @param npcId NPC ID
   * @param dialogues 对话数组
   * @param callback 对话结束回调
   */
  showDialogueQueue(npcId: string, dialogues: NPCDialogue[], callback?: () => void): void {
    this.dialogueQueue = [...dialogues];
    this.currentNPC = npcId;
    this.onDialogueEnd = callback || null;
    this.visible = true;

    // 开始显示第一条对话
    this.nextDialogue();
  }

  /**
   * 显示下一条对话
   */
  nextDialogue(): void {
    if (this.dialogueQueue.length === 0) {
      // 对话队列已空
      this.hideDialogue();
      if (this.onDialogueEnd) {
        this.onDialogueEnd();
      }
      return;
    }

    const dialogue = this.dialogueQueue.shift()!;
    this.currentDialogue = dialogue;
    this.state = DialogState.TYPING;
    this.displayedText = '';
    this.typingTimer = 0;

    // 检查是否有选项
    if (dialogue.choices && dialogue.choices.length > 0) {
      this.currentChoices = dialogue.choices.map(choice => ({
        text: choice.text,
        next: choice.next,
      }));
      this.selectedChoiceIndex = 0;
    } else {
      this.currentChoices = [];
    }

    console.log(`[DialogManager] 显示对话: ${dialogue.text}`);
  }

  /**
   * 跳转到指定对话
   * @param dialogueId 对话 ID
   */
  goToDialogue(dialogueId: string): void {
    // 需要从 NPC 获取对话数据
    // 这里需要传入获取对话的回调
    console.log(`[DialogManager] 跳转到对话: ${dialogueId}`);
    // TODO: 实现，需要从外部获取对话数据
  }

  /**
   * 隐藏对话框
   */
  hideDialogue(): void {
    this.visible = false;
    this.state = DialogState.HIDDEN;
    this.currentDialogue = null;
    this.displayedText = '';
    this.currentChoices = [];
    this.currentNPC = null;
    this.onDialogueEnd = null;
    console.log('[DialogManager] 对话框已隐藏');
  }

  /**
   * 更新对话状态
   * @param deltaTime 距离上一帧的时间（毫秒）
   */
  update(deltaTime: number): void {
    if (!this.visible || !this.currentDialogue) {
      return;
    }

    switch (this.state) {
      case DialogState.TYPING:
        this.updateTyping(deltaTime);
        break;

      case DialogState.WAITING:
        this.handleWaiting();
        break;

      case DialogState.CHOICES:
        this.handleChoices();
        break;
    }
  }

  /**
   * 更新打字机效果
   */
  private updateTyping(deltaTime: number): void {
    const targetLength = this.currentDialogue!.text.length;
    if (this.displayedText.length >= targetLength) {
      // 打字完成
      this.state = this.currentChoices.length > 0 ? DialogState.CHOICES : DialogState.WAITING;
      return;
    }

    this.typingTimer += deltaTime;
    const charsToAdd = Math.floor(this.typingTimer / this.config.typingSpeed);

    if (charsToAdd > 0) {
      this.displayedText = this.currentDialogue!.text.substring(0, this.displayedText.length + charsToAdd);
      this.typingTimer = this.typingTimer % this.config.typingSpeed;
    }
  }

  /**
   * 处理等待状态
   */
  private handleWaiting(): void {
    // 检查是否按下确认键继续
    if (inputManager.isPressed(KeyCode.SPACE) || inputManager.isPressed(KeyCode.ENTER)) {
      if (!this.skipKeyPressed) {
        this.skipKeyPressed = true;

        // 检查是否有下一条对话
        if (this.currentDialogue?.next) {
          // 跳转到下一条对话
          // 需要从 NPC 获取对话数据
          console.log(`[DialogManager] 跳转到下一条对话: ${this.currentDialogue.next}`);
          // TODO: 实现，需要从外部获取对话数据
        } else {
          // 结束对话
          this.nextDialogue();
        }
      }
    } else {
      this.skipKeyPressed = false;
    }
  }

  /**
   * 处理选项选择
   */
  private handleChoices(): void {
    // 上/下键选择选项
    if (inputManager.isPressed(KeyCode.UP) || inputManager.isPressed(KeyCode.W)) {
      this.selectedChoiceIndex = Math.max(0, this.selectedChoiceIndex - 1);
    }
    if (inputManager.isPressed(KeyCode.DOWN) || inputManager.isPressed(KeyCode.S)) {
      this.selectedChoiceIndex = Math.min(this.currentChoices.length - 1, this.selectedChoiceIndex + 1);
    }

    // 确认选择
    if (inputManager.isPressed(KeyCode.SPACE) || inputManager.isPressed(KeyCode.ENTER)) {
      if (!this.skipKeyPressed) {
        this.skipKeyPressed = true;
        const selectedChoice = this.currentChoices[this.selectedChoiceIndex];

        // 触发回调
        if (this.onChoiceSelected) {
          this.onChoiceSelected(selectedChoice);
        }

        // 执行选项回调
        if (selectedChoice.callback) {
          selectedChoice.callback();
        }

        // 跳转到下一条对话
        if (this.currentDialogue?.action) {
          console.log(`[DialogManager] 执行动作: ${this.currentDialogue.action}`);
          // TODO: 实现动作系统
        }

        this.nextDialogue();
      }
    } else {
      this.skipKeyPressed = false;
    }
  }

  /**
   * 渲染对话框
   * @param ctx Canvas 2D 上下文
   * @param screenWidth 屏幕宽度
   * @param screenHeight 屏幕高度
   */
  render(ctx: CanvasRenderingContext2D, screenWidth = 800, screenHeight = 600): void {
    if (!this.visible) {
      return;
    }

    // 更新对话框位置（屏幕可能调整大小）
    this.dialogX = (screenWidth - this.config.width) / 2;
    this.dialogY = screenHeight - this.config.height - this.config.bottomMargin;

    ctx.save();

    // 绘制背景
    this.drawBackground(ctx);

    // 绘制文本
    this.drawText(ctx);

    // 绘制选项
    if (this.state === DialogState.CHOICES) {
      this.drawChoices(ctx);
    }

    ctx.restore();
  }

  /**
   * 绘制背景
   */
  private drawBackground(ctx: CanvasRenderingContext2D): void {
    // 圆角矩形
    const radius = 10;
    const x = this.dialogX;
    const y = this.dialogY;
    const width = this.config.width;
    const height = this.config.height;

    // 填充背景
    ctx.fillStyle = this.config.backgroundColor;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();

    // 绘制边框
    ctx.strokeStyle = this.config.borderColor;
    ctx.lineWidth = this.config.borderWidth;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.stroke();
  }

  /**
   * 绘制文本
   */
  private drawText(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.config.textColor;
    ctx.font = this.config.font;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const x = this.dialogX + this.config.textPadding;
    const y = this.dialogY + this.config.textPadding;
    const maxWidth = this.config.width - this.config.textPadding * 2;

    // 支持多行文本
    this.wrapText(ctx, this.displayedText, x, y, maxWidth, 24);
  }

  /**
   * 绘制选项
   */
  private drawChoices(ctx: CanvasRenderingContext2D): void {
    const startY = this.dialogY + this.config.height - 30 - this.currentChoices.length * 30;
    const optionHeight = 28;
    const optionPadding = 4;
    const maxWidth = this.config.width - this.config.textPadding * 2;

    for (let i = 0; i < this.currentChoices.length; i++) {
      const choice = this.currentChoices[i];
      const isSelected = i === this.selectedChoiceIndex;
      const y = startY + i * optionHeight;

      // 绘制选项背景
      ctx.fillStyle = isSelected ? this.config.choiceSelectedColor : this.config.choiceBackgroundColor;
      ctx.beginPath();
      ctx.roundRect(
        this.dialogX + this.config.textPadding,
        y,
        Math.min(ctx.measureText(choice.text).width + 40, maxWidth),
        optionHeight - optionPadding,
        6
      );
      ctx.fill();

      // 绘制选项文本
      ctx.fillStyle = this.config.choiceTextColor;
      ctx.font = this.config.font;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(choice.text, this.dialogX + this.config.textPadding + 10, y + optionHeight / 2 - optionPadding / 2);
    }
  }

  /**
   * 文本换行
   */
  private wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): void {
    const words = text.split('');
    let line = '';
    let lineY = y;

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i];
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;

      if (testWidth > maxWidth && i > 0) {
        ctx.fillText(line, x, lineY);
        line = words[i];
        lineY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, lineY);
  }

  /**
   * 检查是否正在显示对话
   */
  isDialogueActive(): boolean {
    return this.visible;
  }

  /**
   * 获取当前对话状态
   */
  getState(): DialogState {
    return this.state;
  }

  /**
   * 获取当前 NPC
   */
  getCurrentNPC(): string | null {
    return this.currentNPC;
  }

  /**
   * 设置配置
   */
  setConfig(config: Partial<DialogConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取配置
   */
  getConfig(): DialogConfig {
    return { ...this.config };
  }

  /**
   * 注册选择完成回调
   */
  onChoice(callback: (choice: DialogChoice) => void): void {
    this.onChoiceSelected = callback;
  }

  /**
   * 立即显示完整文本（跳过打字效果）
   */
  skipTyping(): void {
    if (this.state === DialogState.TYPING && this.currentDialogue) {
      this.displayedText = this.currentDialogue.text;
      this.state = this.currentChoices.length > 0 ? DialogState.CHOICES : DialogState.WAITING;
    }
  }

  /**
   * 重置对话管理器
   */
  reset(): void {
    this.hideDialogue();
    this.dialogueQueue = [];
    this.selectedChoiceIndex = 0;
    this.skipKeyPressed = false;
  }
}

/**
 * 导出对话管理器单例
 */
export const dialogManager = DialogManager.getInstance();
