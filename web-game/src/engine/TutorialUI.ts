/**
 * 教程 UI
 *
 * 新手教程界面渲染
 *
 * 功能：
 * - 显示教程提示框
 * - 显示当前进度（1/5）
 * - 下一步/跳过按钮
 * - 响应式设计
 * - 键盘快捷键支持（Enter 下一步，Esc 跳过）
 */

import { tutorialSystem, TutorialStep, TutorialStepContent } from './TutorialSystem';
import { inputManager, KeyCode } from './InputManager';

/**
 * 教程 UI 配置
 */
export interface TutorialUIConfig {
  /** 提示框宽度 */
  boxWidth: number;
  /** 提示框高度 */
  boxHeight: number;
  /** 按钮宽度 */
  buttonWidth: number;
  /** 按钮高度 */
  buttonHeight: number;
  /** 是否启用键盘快捷键 */
  enableKeyboardShortcuts: boolean;
  /** 提示框位置 */
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

/**
 * 教程 UI 类
 */
export class TutorialUI {
  /** UI 配置 */
  private config: TutorialUIConfig = {
    boxWidth: 400,
    boxHeight: 200,
    buttonWidth: 100,
    buttonHeight: 36,
    enableKeyboardShortcuts: true,
    position: 'bottom',
  };

  /** 是否显示 UI */
  private visible: boolean = false;

  /** 当前步骤内容 */
  private currentStepContent: TutorialStepContent | null = null;

  /** 鼠标位置 */
  private mousePosition: { x: number; y: number } = { x: -1, y: -1 };

  /** 下一步按钮区域 */
  private nextButtonArea: { x: number; y: number; width: number; height: number } | null = null;

  /** 跳过按钮区域 */
  private skipButtonArea: { x: number; y: number; width: number; height: number } | null = null;

  /** 按钮悬停状态 */
  private nextButtonHovered: boolean = false;
  private skipButtonHovered: boolean = false;

  /** 提示框位置（像素） */
  private boxPosition: { x: number; y: number } = { x: 0, y: 0 };

  /** 动画进度（0-1） */
  private animationProgress: number = 0;

  /** 是否正在显示动画 */
  private showingAnimation: boolean = false;

  /** 动画持续时间（毫秒） */
  private readonly ANIMATION_DURATION: number = 200;

  /**
   * 初始化 UI
   * @param config UI 配置
   */
  initialize(config?: Partial<TutorialUIConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // 注册教程系统回调
    tutorialSystem.onStepChange((step) => {
      this.onStepChange(step);
    });

    tutorialSystem.onComplete((skipped) => {
      this.onComplete(skipped);
    });

    console.log('[TutorialUI] Initialized');
  }

  /**
   * 更新 UI
   * @param deltaTime 距离上一帧的时间（毫秒）
   * @param canvasWidth Canvas 宽度
   * @param canvasHeight Canvas 高度
   */
  update(deltaTime: number, canvasWidth: number, canvasHeight: number): void {
    // 更新动画
    if (this.showingAnimation) {
      this.animationProgress += deltaTime / this.ANIMATION_DURATION;
      if (this.animationProgress >= 1) {
        this.animationProgress = 1;
        this.showingAnimation = false;
      }
    }

    // 检查键盘快捷键
    if (this.config.enableKeyboardShortcuts && this.visible) {
      this.handleKeyboardInput();
    }

    // 计算提示框位置
    this.calculateBoxPosition(canvasWidth, canvasHeight);

    // 更新按钮悬停状态
    this.updateButtonHoverStates();
  }

  /**
   * 处理键盘输入
   */
  private handleKeyboardInput(): void {
    // Enter 键 - 下一步
    if (inputManager.isPressed(KeyCode.ENTER)) {
      this.onNextButtonClick();
    }

    // Esc 键 - 跳过
    if (inputManager.isPressed(KeyCode.ESCAPE)) {
      this.onSkipButtonClick();
    }
  }

  /**
   * 计算提示框位置
   * @param canvasWidth Canvas 宽度
   * @param canvasHeight Canvas 高度
   */
  private calculateBoxPosition(canvasWidth: number, canvasHeight: number): void {
    const padding = 20;
    const boxWidth = this.config.boxWidth;
    const boxHeight = this.config.boxHeight;

    switch (this.config.position) {
      case 'top':
        this.boxPosition.x = (canvasWidth - boxWidth) / 2;
        this.boxPosition.y = padding;
        break;
      case 'bottom':
        this.boxPosition.x = (canvasWidth - boxWidth) / 2;
        this.boxPosition.y = canvasHeight - boxHeight - padding;
        break;
      case 'left':
        this.boxPosition.x = padding;
        this.boxPosition.y = (canvasHeight - boxHeight) / 2;
        break;
      case 'right':
        this.boxPosition.x = canvasWidth - boxWidth - padding;
        this.boxPosition.y = (canvasHeight - boxHeight) / 2;
        break;
      case 'center':
      default:
        this.boxPosition.x = (canvasWidth - boxWidth) / 2;
        this.boxPosition.y = (canvasHeight - boxHeight) / 2;
        break;
    }
  }

  /**
   * 更新按钮悬停状态
   */
  private updateButtonHoverStates(): void {
    this.nextButtonHovered = false;
    this.skipButtonHovered = false;

    if (!this.nextButtonArea || !this.skipButtonArea) {
      return;
    }

    const { x, y } = this.mousePosition;

    // 检查下一步按钮
    if (
      x >= this.nextButtonArea.x &&
      x <= this.nextButtonArea.x + this.nextButtonArea.width &&
      y >= this.nextButtonArea.y &&
      y <= this.nextButtonArea.y + this.nextButtonArea.height
    ) {
      this.nextButtonHovered = true;
    }

    // 检查跳过按钮
    if (
      x >= this.skipButtonArea.x &&
      x <= this.skipButtonArea.x + this.skipButtonArea.width &&
      y >= this.skipButtonArea.y &&
      y <= this.skipButtonArea.y + this.skipButtonArea.height
    ) {
      this.skipButtonHovered = true;
    }
  }

  /**
   * 渲染 UI
   * @param ctx Canvas 2D 上下文
   * @param canvasWidth Canvas 宽度
   * @param canvasHeight Canvas 高度
   */
  render(ctx: CanvasRenderingContext2D, canvasWidth: number, _canvasHeight: number): void {
    if (!this.visible || !this.currentStepContent) {
      return;
    }

    ctx.save();

    // 应用动画效果
    const scale = this.easeOutQuad(this.animationProgress);
    const alpha = Math.min(1, this.animationProgress * 2);

    // 计算缩放后的位置和大小
    const boxWidth = this.config.boxWidth * scale;
    const boxHeight = this.config.boxHeight * scale;
    const boxX = this.boxPosition.x + (this.config.boxWidth - boxWidth) / 2;
    const boxY = this.boxPosition.y + (this.config.boxHeight - boxHeight) / 2;

    ctx.globalAlpha = alpha;

    // 渲染提示框
    this.renderTutorialBox(ctx, boxX, boxY, boxWidth, boxHeight);

    // 渲染进度指示器
    this.renderProgressIndicator(ctx, canvasWidth);

    ctx.restore();

    // 更新按钮区域（用于鼠标检测）
    this.updateButtonAreas(boxX, boxY, boxWidth, boxHeight);
  }

  /**
   * 渲染教程提示框
   * @param ctx Canvas 2D 上下文
   * @param x X 位置
   * @param y Y 位置
   * @param width 宽度
   * @param height 高度
   */
  private renderTutorialBox(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    if (!this.currentStepContent) return;

    // 背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.strokeStyle = '#ffd700'; // 金色边框
    ctx.lineWidth = 2;

    this.roundRect(ctx, x, y, width, height, 10);
    ctx.fill();
    ctx.stroke();

    const padding = 16;
    let currentY = y + padding + 24;

    // 标题
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 20px "Microsoft YaHei", Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.currentStepContent.title, x + padding, y + padding + 10);

    // 描述
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px "Microsoft YaHei", Arial';
    ctx.textBaseline = 'top';

    // 描述文字可能需要换行
    const descriptionLines = this.wrapText(
      ctx,
      this.currentStepContent.description,
      width - padding * 2 - 120 // 留出按钮空间
    );

    for (const line of descriptionLines) {
      ctx.fillText(line, x + padding, currentY);
      currentY += 20;
    }

    // 提示
    ctx.fillStyle = '#88ccff';
    ctx.font = 'italic 12px "Microsoft YaHei", Arial';
    const hintLines = this.wrapText(ctx, this.currentStepContent.hint, width - padding * 2 - 120);
    currentY += 8;
    for (const line of hintLines) {
      ctx.fillText(line, x + padding, currentY);
      currentY += 16;
    }

    // 键盘快捷键提示
    if (this.currentStepContent.keyboardHint) {
      ctx.fillStyle = '#aaaaaa';
      ctx.font = '11px "Microsoft YaHei", Arial';
      ctx.fillText(`快捷键: ${this.currentStepContent.keyboardHint}`, x + padding, y + height - padding - 10);
    }

    // 渲染按钮
    this.renderButtons(ctx, x, y, width, height, padding);
  }

  /**
   * 渲染按钮
   * @param ctx Canvas 2D 上下文
   * @param boxX 提示框 X
   * @param boxY 提示框 Y
   * @param boxWidth 提示框宽度
   * @param boxHeight 提示框高度
   * @param padding 内边距
   */
  private renderButtons(
    ctx: CanvasRenderingContext2D,
    boxX: number,
    boxY: number,
    boxWidth: number,
    boxHeight: number,
    padding: number
  ): void {
    const buttonWidth = this.config.buttonWidth;
    const buttonHeight = this.config.buttonHeight;
    const buttonY = boxY + boxHeight - padding - buttonHeight;

    // 下一步按钮
    const nextButtonX = boxX + boxWidth - padding - buttonWidth;
    this.renderButton(ctx, nextButtonX, buttonY, buttonWidth, buttonHeight, '下一步', this.nextButtonHovered);

    // 跳过按钮
    if (!this.currentStepContent?.isLastStep) {
      const skipButtonX = nextButtonX - buttonWidth - 10;
      this.renderButton(ctx, skipButtonX, buttonY, buttonWidth, buttonHeight, '跳过', this.skipButtonHovered);
    }
  }

  /**
   * 渲染单个按钮
   * @param ctx Canvas 2D 上下文
   * @param x X 位置
   * @param y Y 位置
   * @param width 宽度
   * @param height 高度
   * @param text 按钮文字
   * @param hovered 是否悬停
   */
  private renderButton(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    hovered: boolean
  ): void {
    // 背景
    ctx.fillStyle = hovered ? '#ffcc00' : '#ffa500';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;

    this.roundRect(ctx, x, y, width, height, 6);
    ctx.fill();
    ctx.stroke();

    // 文字
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 14px "Microsoft YaHei", Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + width / 2, y + height / 2);
  }

  /**
   * 渲染进度指示器
   * @param ctx Canvas 2D 上下文
   * @param canvasWidth Canvas 宽度
   */
  private renderProgressIndicator(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number
  ): void {
    const progress = tutorialSystem.getProgress();
    const completedSteps = tutorialSystem.getCompletedSteps().length;
    const totalSteps = 5;

    const indicatorWidth = 120;
    const indicatorHeight = 30;
    const x = (canvasWidth - indicatorWidth) / 2;
    const y = this.config.position === 'bottom'
      ? this.boxPosition.y + this.config.boxHeight + 15
      : this.boxPosition.y - indicatorHeight - 15;

    // 背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;

    this.roundRect(ctx, x, y, indicatorWidth, indicatorHeight, 6);
    ctx.fill();
    ctx.stroke();

    // 进度文字
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px "Microsoft YaHei", Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`教程进度: ${completedSteps}/${totalSteps}`, x + indicatorWidth / 2, y + indicatorHeight / 2);

    // 进度条
    const progressBarWidth = indicatorWidth - 20;
    const progressBarHeight = 4;
    const progressBarX = x + 10;
    const progressBarY = y + indicatorHeight - 8;

    // 进度条背景
    ctx.fillStyle = '#333333';
    this.roundRect(ctx, progressBarX, progressBarY, progressBarWidth, progressBarHeight, 2);
    ctx.fill();

    // 进度条填充
    ctx.fillStyle = '#ffd700';
    const fillWidth = (progress / 100) * progressBarWidth;
    if (fillWidth > 0) {
      this.roundRect(ctx, progressBarX, progressBarY, fillWidth, progressBarHeight, 2);
      ctx.fill();
    }
  }

  /**
   * 更新按钮区域（用于鼠标检测）
   * @param boxX 提示框 X
   * @param boxY 提示框 Y
   * @param boxWidth 提示框宽度
   * @param boxHeight 提示框高度
   */
  private updateButtonAreas(
    boxX: number,
    boxY: number,
    boxWidth: number,
    boxHeight: number
  ): void {
    const padding = 16;
    const buttonWidth = this.config.buttonWidth;
    const buttonHeight = this.config.buttonHeight;
    const buttonY = boxY + boxHeight - padding - buttonHeight;

    // 下一步按钮区域
    this.nextButtonArea = {
      x: boxX + boxWidth - padding - buttonWidth,
      y: buttonY,
      width: buttonWidth,
      height: buttonHeight,
    };

    // 跳过按钮区域
    if (!this.currentStepContent?.isLastStep) {
      this.skipButtonArea = {
        x: this.nextButtonArea.x - buttonWidth - 10,
        y: buttonY,
        width: buttonWidth,
        height: buttonHeight,
      };
    } else {
      this.skipButtonArea = null;
    }
  }

  /**
   * 处理鼠标移动
   * @param x 鼠标 X 位置
   * @param y 鼠标 Y 位置
   */
  handleMouseMove(x: number, y: number): void {
    this.mousePosition = { x, y };
  }

  /**
   * 处理鼠标点击
   * @returns 是否处理了点击
   */
  handleMouseClick(): boolean {
    if (!this.visible) {
      return false;
    }

    const { x, y } = this.mousePosition;

    // 检查下一步按钮
    if (this.nextButtonArea) {
      if (
        x >= this.nextButtonArea.x &&
        x <= this.nextButtonArea.x + this.nextButtonArea.width &&
        y >= this.nextButtonArea.y &&
        y <= this.nextButtonArea.y + this.nextButtonArea.height
      ) {
        this.onNextButtonClick();
        return true;
      }
    }

    // 检查跳过按钮
    if (this.skipButtonArea) {
      if (
        x >= this.skipButtonArea.x &&
        x <= this.skipButtonArea.x + this.skipButtonArea.width &&
        y >= this.skipButtonArea.y &&
        y <= this.skipButtonArea.y + this.skipButtonArea.height
      ) {
        this.onSkipButtonClick();
        return true;
      }
    }

    return false;
  }

  /**
   * 下一步按钮点击处理
   */
  private onNextButtonClick(): void {
    tutorialSystem.completeCurrentStep();
  }

  /**
   * 跳过按钮点击处理
   */
  private onSkipButtonClick(): void {
    tutorialSystem.skipTutorial();
  }

  /**
   * 教程步骤变化回调
   * @param step 新步骤
   */
  private onStepChange(step: TutorialStep): void {
    if (step === TutorialStep.NOT_STARTED) {
      this.visible = false;
      return;
    }

    if (step === TutorialStep.COMPLETED) {
      this.visible = false;
      return;
    }

    this.currentStepContent = tutorialSystem.getStepContent(step);
    this.visible = true;
    this.showingAnimation = true;
    this.animationProgress = 0;

    console.log('[TutorialUI] 步骤变化:', step);
  }

  /**
   * 教程完成回调
   * @param skipped 是否跳过
   */
  private onComplete(skipped: boolean): void {
    console.log('[TutorialUI] 教程完成，跳过:', skipped);
    this.visible = false;
  }

  /**
   * 文字换行
   * @param ctx Canvas 2D 上下文
   * @param text 文字
   * @param maxWidth 最大宽度
   * @returns 换行后的文字数组
   */
  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const lines: string[] = [];
    const words = text.split('');
    let currentLine = '';

    for (const char of words) {
      const testLine = currentLine + char;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * 绘制圆角矩形
   * @param ctx Canvas 2D 上下文
   * @param x X 位置
   * @param y Y 位置
   * @param width 宽度
   * @param height 高度
   * @param radius 圆角半径
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
   * 缓出二次函数
   * @param t 进度（0-1）
   * @returns 缓动后的值
   */
  private easeOutQuad(t: number): number {
    return t * (2 - t);
  }

  /**
   * 显示 UI
   */
  show(): void {
    if (tutorialSystem.isInTutorial()) {
      this.visible = true;
      this.showingAnimation = true;
      this.animationProgress = 0;
    }
  }

  /**
   * 隐藏 UI
   */
  hide(): void {
    this.visible = false;
  }

  /**
   * 检查 UI 是否可见
   * @returns 是否可见
   */
  isVisible(): boolean {
    return this.visible;
  }

  /**
   * 设置 UI 配置
   * @param config UI 配置
   */
  setConfig(config: Partial<TutorialUIConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取 UI 配置
   * @returns UI 配置（只读）
   */
  getConfig(): Readonly<TutorialUIConfig> {
    return { ...this.config };
  }
}

/**
 * 导出教程 UI 类
 */
export const tutorialUI = new TutorialUI();
