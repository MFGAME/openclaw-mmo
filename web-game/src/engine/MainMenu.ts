/**
 * 主菜单组件
 *
 * 负责显示和处理主菜单，包括：
 */

import { saveManager } from './SaveManager.js';
import { audioManager } from './AudioManager.js';
import { confirmDialog, ConfirmAction } from './ConfirmDialog.js';

/**
 * - 菜单选项（开始游戏、继续游戏、设置、退出）
 * - 菜单导航
 * - 菜单动画效果
 * - 存档检查和继续游戏
 * - 操作确认对话框
 */

/**
 * 主菜单操作类型
 */
export enum MainMenuAction {
  /** 开始新游戏 */
  NEW_GAME = 'new_game',
  /** 继续游戏 */
  CONTINUE = 'continue',
  /** 设置 */
  SETTINGS = 'settings',
  /** 退出游戏 */
  QUIT = 'quit',
}

/**
 * 菜单选项接口
 */
interface MenuOption {
  /** 选项 ID */
  id: MainMenuAction;
  /** 选项文本 */
  text: string;
  /** 是否可用 */
  enabled: boolean;
  /** 位置 */
  x: number;
  y: number;
}

/**
 * 主菜单类
 */
export class MainMenu {
  /** 菜单选项列表 */
  private options: MenuOption[] = [];

  /** 当前选中的选项索引 */
  private selectedIndex: number = 0;

  /** 回调函数 */
  onAction?: (action: MainMenuAction) => void;

  /** 菜单动画状态 */
  private animationProgress: number = 0;

  /** 是否可见 */
  private visible: boolean = false;

  /** 菜单宽度 */
  private width: number = 300;

  /** 菜单高度 */
  private height: number = 200;

  /** 菜单 X 位置 */
  private x: number = 0;

  /** 菜单 Y 位置 */
  private y: number = 0;

  /** 是否有存档 */
  private hasSaveFile: boolean = false;

  /**
   * 构造函数
   */
  constructor() {
    this.initOptions();
  }

  /**
   * 初始化菜单选项
   */
  private initOptions(): void {
    this.options = [
      {
        id: MainMenuAction.NEW_GAME,
        text: '开始游戏',
        enabled: true,
        x: 0,
        y: 0,
      },
      {
        id: MainMenuAction.CONTINUE,
        text: '继续游戏',
        enabled: this.hasSaveFile,
        x: 0,
        y: 0,
      },
      {
        id: MainMenuAction.SETTINGS,
        text: '设置',
        enabled: true,
        x: 0,
        y: 0,
      },
      {
        id: MainMenuAction.QUIT,
        text: '退出游戏',
        enabled: true,
        x: 0,
        y: 0,
      },
    ];
  }

  /**
   * 初始化菜单
   */
  initialize(): void {
    this.visible = true;
    this.animationProgress = 0;
    this.selectedIndex = 0;

    // 检查是否有存档
    this.checkSaveFile();

    console.log('[MainMenu] Menu initialized');
  }

  /**
   * 检查是否有存档
   */
  private checkSaveFile(): void {
    try {
      const slotInfo = saveManager.getSlotInfo();

      // 查找最新的存档
      let hasSave = false;
      let latestTime = 0;

      for (const slot of slotInfo) {
        if (slot.hasData && slot.timestamp > latestTime) {
          hasSave = true;
          latestTime = slot.timestamp;
        }
      }

      this.hasSaveFile = hasSave;

      // 更新"继续游戏"选项的可用状态和显示
      const continueOption = this.options.find(opt => opt.id === MainMenuAction.CONTINUE);
      if (continueOption) {
        continueOption.enabled = this.hasSaveFile;
        if (this.hasSaveFile) {
          const date = new Date(latestTime);
          const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
          continueOption.text = `继续游戏 (${dateStr} ${timeStr})`;
        } else {
          continueOption.text = '继续游戏';
        }
      }

      console.log(`[MainMenu] 存档检查完成: ${this.hasSaveFile ? '有存档' : '无存档'}`);
    } catch (error) {
      console.warn('[MainMenu] 存档检查失败:', error);
      this.hasSaveFile = false;
    }
  }

  /**
   * 显示菜单
   */
  show(): void {
    this.visible = true;
    this.animationProgress = 0;
    // 重新检查存档
    this.checkSaveFile();
  }

  /**
   * 隐藏菜单
   */
  hide(): void {
    this.visible = false;
  }

  /**
   * 是否可见
   */
  isVisible(): boolean {
    return this.visible;
  }

  /**
   * 获取待确认的操作
   */
  getPendingAction(): MainMenuAction | null {
    return this.pendingAction;
  }

  /**
   * 清除待确认的操作
   */
  clearPendingAction(): void {
    this.pendingAction = null;
  }

  /** 等待确认的操作 */
  private pendingAction: MainMenuAction | null = null;

  /**
   * 处理输入
   */
  handleInput(action: 'up' | 'down' | 'left' | 'right' | 'confirm' | 'cancel' | 'any'): void {
    switch (action) {
      case 'up':
        this.moveSelection(-1);
        break;

      case 'down':
        this.moveSelection(1);
        break;

      case 'confirm':
        this.confirmSelection();
        break;

      case 'cancel':
        // 菜单不处理取消操作
        break;

      case 'left':
      case 'right':
        // 左右键不处理
        break;
    }
  }

  /**
   * 移动选择
   */
  private moveSelection(delta: number): void {
    const newIndex = this.selectedIndex + delta;

    // 循环选择，但跳过不可用的选项
    let attempts = 0;
    let validIndex = newIndex;

    while (attempts < this.options.length) {
      if (validIndex < 0) {
        validIndex = this.options.length - 1;
      } else if (validIndex >= this.options.length) {
        validIndex = 0;
      }

      if (this.options[validIndex].enabled) {
        this.selectedIndex = validIndex;
        break;
      }

      validIndex += delta;
      attempts++;
    }

    // 播放选择音效
    this.playSelectSound();
  }

  /**
   * 确认选择
   */
  private confirmSelection(): void {
    const selectedOption = this.options[this.selectedIndex];

    if (selectedOption.enabled) {
      // 检查是否需要确认

      if (selectedOption.id === MainMenuAction.NEW_GAME && this.hasSaveFile) {
        // 有存档时，开始新游戏需要确认
        this.pendingAction = MainMenuAction.NEW_GAME;
        confirmDialog.show(
          '确认开始新游戏',
          '开始新游戏将覆盖现有存档。确定要继续吗？',
          (action: typeof ConfirmAction[keyof typeof ConfirmAction]) => {
            this.handleConfirmAction(action);
          },
          { confirmText: '确定', cancelText: '取消' }
        );
      } else if (selectedOption.id === MainMenuAction.QUIT) {
        // 退出游戏需要确认
        this.pendingAction = MainMenuAction.QUIT;
        confirmDialog.show(
          '确认退出游戏',
          '确定要退出游戏吗？未保存的进度将会丢失。',
          (action: typeof ConfirmAction[keyof typeof ConfirmAction]) => {
            this.handleConfirmAction(action);
          },
          { confirmText: '退出', cancelText: '取消' }
        );
      } else {
        // 其他操作直接执行
        this.playConfirmSound();
        this.triggerAction(selectedOption.id);
      }
    } else {
      // 播放错误音效
      this.playErrorSound();
    }
  }

  /**
   * 处理确认对话框操作
   */
  private handleConfirmAction(action: import('./ConfirmDialog').ConfirmAction): void {
    if (action === 'confirm' && this.pendingAction) {
      this.playConfirmSound();
      this.triggerAction(this.pendingAction);
    } else {
      this.playSelectSound(); // 取消时播放选择音效
    }
    this.pendingAction = null;
  }

  /**
   * 触发菜单操作
   */
  private triggerAction(action: MainMenuAction): void {
    if (this.onAction) {
      this.onAction(action);
    }
  }

  /**
   * 更新菜单
   */
  update(deltaTime: number): void {
    // 更新动画进度
    if (this.visible && this.animationProgress < 1) {
      this.animationProgress += deltaTime * 2;
      if (this.animationProgress > 1) {
        this.animationProgress = 1;
      }
    }
  }

  /**
   * 渲染菜单
   */
  render(ctx: CanvasRenderingContext2D, screenWidth: number, screenHeight: number): void {
    if (!this.visible) return;

    // 计算菜单位置（屏幕右侧）
    this.x = screenWidth - this.width - 50;
    this.y = screenHeight * 0.55;

    // 更新选项位置
    this.updateOptionPositions();

    // 绘制菜单背景
    this.renderBackground(ctx);

    // 绘制选项
    this.renderOptions(ctx);
  }

  /**
   * 更新选项位置
   */
  private updateOptionPositions(): void {
    const startY = this.y + 20;
    const optionHeight = 40;

    for (let i = 0; i < this.options.length; i++) {
      this.options[i].x = this.x + 20;
      this.options[i].y = startY + i * optionHeight;
    }
  }

  /**
   * 绘制菜单背景
   */
  private renderBackground(ctx: CanvasRenderingContext2D): void {
    // 计算动画缩放
    const scaleX = this.easeOutBack(this.animationProgress);
    const scaleWidth = this.width * scaleX;
    const scaleHeight = this.height;

    // 背景框
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
    ctx.lineWidth = 2;

    // 圆角矩形
    this.roundRect(ctx, this.x, this.y, scaleWidth, scaleHeight, 10);
    ctx.fill();
    ctx.stroke();

    // 内边框
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, this.x + 3, this.y + 3, scaleWidth - 6, scaleHeight - 6, 8);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * 绘制选项
   */
  private renderOptions(ctx: CanvasRenderingContext2D): void {
    const optionAlpha = this.easeOutCubic(this.animationProgress);

    for (let i = 0; i < this.options.length; i++) {
      const option = this.options[i];
      const isSelected = i === this.selectedIndex;

      this.renderOption(ctx, option, isSelected, optionAlpha);
    }
  }

  /**
   * 绘制单个选项
   */
  private renderOption(
    ctx: CanvasRenderingContext2D,
    option: MenuOption,
    isSelected: boolean,
    alpha: number
  ): void {
    ctx.save();

    // 选项背景
    if (isSelected) {
      ctx.fillStyle = `rgba(66, 153, 225, ${alpha * 0.5})`;
    } else if (!option.enabled) {
      ctx.fillStyle = `rgba(51, 65, 85, ${alpha * 0.3})`;
    } else {
      ctx.fillStyle = `rgba(30, 41, 59, ${alpha * 0.3})`;
    }

    this.roundRect(ctx, option.x - 10, option.y - 15, this.width - 20, 35, 5);
    ctx.fill();

    // 选项文本
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    if (isSelected) {
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.font = 'bold 18px Arial';
    } else if (!option.enabled) {
      ctx.fillStyle = `rgba(100, 116, 139, ${alpha * 0.5})`;
      ctx.font = '16px Arial';
    } else {
      ctx.fillStyle = `rgba(226, 232, 240, ${alpha})`;
      ctx.font = '16px Arial';
    }

    ctx.fillText(option.text, option.x, option.y);

    // 选中指示器（箭头）
    if (isSelected) {
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.font = 'bold 16px Arial';
      ctx.fillText('▶', option.x - 35, option.y);
    }

    ctx.restore();
  }

  /**
   * 缓动函数（Ease Out Cubic）
   */
  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  /**
   * 缓动函数（Ease Out Back - 带回弹效果）
   */
  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  /**
   * 绘制圆角矩形
   */
  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  /**
   * 播放选择音效
   */
  private playSelectSound(): void {
    audioManager.playSFXLegacy('menu_select');
  }

  /**
   * 播放确认音效
   */
  private playConfirmSound(): void {
    audioManager.playSFXLegacy('menu_confirm');
  }

  /**
   * 播放错误音效
   */
  private playErrorSound(): void {
    audioManager.playSFXLegacy('menu_error');
  }

  /**
   * 设置是否有存档
   */
  setHasSaveFile(hasSave: boolean): void {
    this.hasSaveFile = hasSave;
    this.initOptions();
  }

  /**
   * 获取当前选中的操作
   */
  getSelectedAction(): MainMenuAction | null {
    const selectedOption = this.options[this.selectedIndex];
    return selectedOption.enabled ? selectedOption.id : null;
  }
}
