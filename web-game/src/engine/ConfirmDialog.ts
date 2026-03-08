/**
 * 确认对话框组件
 *
 * 用于显示需要用户确认的操作对话框
 */

/**
 * 确认对话框操作
 */
export enum ConfirmAction {
  /** 确认 */
  CONFIRM = 'confirm',
  /** 取消 */
  CANCEL = 'cancel',
}

/**
 * 确认对话框回调类型
 */
export type ConfirmCallback = (action: ConfirmAction) => void;

/**
 * 确认对话框类
 */
export class ConfirmDialog {
  /** 是否可见 */
  private visible: boolean = false;

  /** 对话框标题 */
  private title: string = '';

  /** 对话框消息 */
  private message: string = '';

  /** 确认按钮文本 */
  private confirmText: string = '确认';

  /** 取消按钮文本 */
  private cancelText: string = '取消';

  /** 回调函数 */
  private callback: ConfirmCallback = () => {};

  /** 当前选中的按钮索引 */
  private selectedIndex: number = 0;

  /** 对话框宽度 */
  private width: number = 400;

  /** 对话框高度 */
  private height: number = 200;

  /** 对话框 X 位置 */
  private x: number = 0;

  /** 对话框 Y 位置 */
  private y: number = 0;

  /**
   * 显示确认对话框
   */
  show(
    title: string,
    message: string,
    callback: ConfirmCallback,
    options?: {
      confirmText?: string;
      cancelText?: string;
    }
  ): void {
    this.title = title;
    this.message = message;
    this.callback = callback;
    this.selectedIndex = 0;

    if (options) {
      this.confirmText = options.confirmText || '确认';
      this.cancelText = options.cancelText || '取消';
    } else {
      this.confirmText = '确认';
      this.cancelText = '取消';
    }

    this.visible = true;
    console.log(`[ConfirmDialog] Showing: ${title}`);
  }

  /**
   * 隐藏对话框
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
   * 处理输入
   */
  handleInput(action: 'up' | 'down' | 'left' | 'right' | 'confirm' | 'cancel' | 'any'): void {
    if (!this.visible) {
      return;
    }

    switch (action) {
      case 'left':
      case 'right':
        // 切换选中按钮
        this.selectedIndex = this.selectedIndex === 0 ? 1 : 0;
        break;

      case 'confirm':
        this.executeSelection();
        break;

      case 'cancel':
        this.hide();
        this.callback(ConfirmAction.CANCEL);
        break;
    }
  }

  /**
   * 执行选中操作
   */
  private executeSelection(): void {
    const action = this.selectedIndex === 0 ? ConfirmAction.CONFIRM : ConfirmAction.CANCEL;
    this.hide();
    this.callback(action);
  }

  /**
   * 更新对话框
   */
  update(_deltaTime: number): void {
    // 对话框没有动画更新
  }

  /**
   * 渲染对话框
   */
  render(ctx: CanvasRenderingContext2D, screenWidth: number, screenHeight: number): void {
    if (!this.visible) return;

    // 计算对话框位置（居中）
    this.x = (screenWidth - this.width) / 2;
    this.y = (screenHeight - this.height) / 2;

    // 绘制遮罩
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, screenWidth, screenHeight);
    ctx.restore();

    // 绘制对话框背景
    this.renderBackground(ctx);

    // 绘制标题
    this.renderTitle(ctx);

    // 绘制消息
    this.renderMessage(ctx);

    // 绘制按钮
    this.renderButtons(ctx);
  }

  /**
   * 绘制对话框背景
   */
  private renderBackground(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    // 主背景
    ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
    ctx.lineWidth = 2;

    this.roundRect(ctx, this.x, this.y, this.width, this.height, 12);
    ctx.fill();
    ctx.stroke();

    // 内边框
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, this.x + 3, this.y + 3, this.width - 6, this.height - 6, 10);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * 绘制标题
   */
  private renderTitle(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(this.title, this.x + this.width / 2, this.y + 20);

    ctx.restore();
  }

  /**
   * 绘制消息
   */
  private renderMessage(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 处理多行消息
    const maxWidth = this.width - 40;
    const lines = this.wrapText(ctx, this.message, maxWidth);
    const lineHeight = 20;
    const startY = this.y + 70;

    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], this.x + this.width / 2, startY + i * lineHeight);
    }

    ctx.restore();
  }

  /**
   * 绘制按钮
   */
  private renderButtons(ctx: CanvasRenderingContext2D): void {
    const buttonWidth = 120;
    const buttonHeight = 40;
    const buttonY = this.y + this.height - 50;
    const buttonSpacing = 20;

    // 确认按钮（左侧）
    const confirmX = this.x + (this.width - buttonWidth * 2 - buttonSpacing) / 2;
    this.renderButton(ctx, confirmX, buttonY, buttonWidth, buttonHeight, this.confirmText, this.selectedIndex === 0);

    // 取消按钮（右侧）
    const cancelX = confirmX + buttonWidth + buttonSpacing;
    this.renderButton(ctx, cancelX, buttonY, buttonWidth, buttonHeight, this.cancelText, this.selectedIndex === 1);
  }

  /**
   * 绘制单个按钮
   */
  private renderButton(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    isSelected: boolean
  ): void {
    ctx.save();

    // 按钮背景
    if (isSelected) {
      ctx.fillStyle = 'rgba(66, 153, 225, 0.8)';
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.8)';
    } else {
      ctx.fillStyle = 'rgba(51, 65, 85, 0.8)';
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.8)';
    }

    ctx.lineWidth = 2;
    this.roundRect(ctx, x, y, width, height, 6);
    ctx.fill();
    ctx.stroke();

    // 按钮文字
    ctx.fillStyle = isSelected ? '#ffffff' : '#cbd5e1';
    ctx.font = isSelected ? 'bold 14px Arial' : '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + width / 2, y + height / 2);

    // 选中指示器（箭头）
    if (isSelected) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Arial';
      ctx.fillText('▶', x - 20, y + height / 2);
    }

    ctx.restore();
  }

  /**
   * 文字换行处理
   */
  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split('');
    const lines: string[] = [];
    let currentLine = '';

    for (const char of words) {
      const testLine = currentLine + char;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine !== '') {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }

    lines.push(currentLine);
    return lines;
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
}

/**
 * 导出确认对话框单例
 */
export const confirmDialog = new ConfirmDialog();
