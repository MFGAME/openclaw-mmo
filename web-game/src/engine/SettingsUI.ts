/**
 * 设置 UI 组件
 *
 * 提供游戏设置界面，包括：
 * - 音量控制（BGM、SFX、语音）
 * - 主题切换（亮色/暗色模式）
 * - 其他游戏设置
 */

import { audioManager } from './AudioManager.js';
import { uiTheme, ThemeMode } from './UITheme.js';

/**
 * 设置操作
 */
export enum SettingsAction {
  /** 返回 */
  BACK = 'back',
}

/**
 * 设置选项类型
 */
enum SettingType {
  /** 滑块（音量等） */
  SLIDER = 'slider',
  /** 选项（主题等） */
  OPTION = 'option',
  /** 按钮 */
  BUTTON = 'button',
}

/**
 * 设置选项接口
 */
interface SettingOption {
  /** 选项 ID */
  id: string;
  /** 选项类型 */
  type: SettingType;
  /** 选项标签 */
  label: string;
  /** 当前值 */
  value: number | string;
  /** 可选值列表（用于 OPTION 类型） */
  options?: { value: string; label: string }[];
  /** 是否启用 */
  enabled: boolean;
  /** 位置 */
  x: number;
  y: number;
}

/**
 * 设置回调类型
 */
export type SettingsCallback = (action: SettingsAction) => void;

/**
 * 设置 UI 类
 */
export class SettingsUI {
  /** 是否可见 */
  private visible: boolean = false;

  /** 回调函数 */
  private callback: SettingsCallback = () => {};

  /** 设置选项列表 */
  private options: SettingOption[] = [];

  /** 当前选中的选项索引 */
  private selectedIndex: number = 0;

  /** 当前编辑的选项索引 */
  private editingIndex: number = -1;

  /** 面板宽度 */
  private panelWidth: number = 500;

  /** 面板高度 */
  private panelHeight: number = 400;

  /** 面板 X 位置 */
  private panelX: number = 0;

  /** 面板 Y 位置 */
  private panelY: number = 0;

  /**
   * 初始化
   */
  initialize(): void {
    this.initOptions();
    console.log('[SettingsUI] Initialized');
  }

  /**
   * 初始化设置选项
   */
  private initOptions(): void {
    try {

      this.options = [
        {
          id: 'bgmVolume',
          type: SettingType.SLIDER,
          label: '背景音乐',
          value: Math.round(audioManager.getBGMVolume() * 100),
          enabled: true,
          x: 0,
          y: 0,
        },
        {
          id: 'sfxVolume',
          type: SettingType.SLIDER,
          label: '音效',
          value: Math.round(audioManager.getSFXVolume() * 100),
          enabled: true,
          x: 0,
          y: 0,
        },
        {
          id: 'voiceVolume',
          type: SettingType.SLIDER,
          label: '语音',
          value: Math.round(audioManager.getVoiceVolume() * 100),
          enabled: true,
          x: 0,
          y: 0,
        },
        {
          id: 'theme',
          type: SettingType.OPTION,
          label: '主题',
          value: uiTheme.getMode(),
          options: [
            { value: 'light', label: '亮色' },
            { value: 'dark', label: '暗色' },
          ],
          enabled: true,
          x: 0,
          y: 0,
        },
      ];
    } catch (error) {
      console.warn('[SettingsUI] 初始化选项失败:', error);
      this.options = [];
    }
  }

  /**
   * 显示
   */
  show(): void {
    this.visible = true;
    this.initOptions(); // 重新加载当前设置
    this.selectedIndex = 0;
    this.editingIndex = -1;
  }

  /**
   * 隐藏
   */
  hide(): void {
    this.visible = false;
    this.editingIndex = -1;
  }

  /**
   * 是否可见
   */
  isVisible(): boolean {
    return this.visible;
  }

  /**
   * 设置回调
   */
  setCallback(callback: SettingsCallback): void {
    this.callback = callback;
  }

  /**
   * 处理输入
   */
  handleInput(action: 'up' | 'down' | 'left' | 'right' | 'confirm' | 'cancel' | 'any'): void {
    if (!this.visible) return;

    if (this.editingIndex !== -1) {
      // 正在编辑选项
      this.handleEditing(action);
    } else {
      // 导航模式
      switch (action) {
        case 'up':
          this.moveSelection(-1);
          break;

        case 'down':
          this.moveSelection(1);
          break;

        case 'left':
          this.moveValue(-1);
          break;

        case 'right':
          this.moveValue(1);
          break;

        case 'confirm':
          this.startEditing();
          break;

        case 'cancel':
          this.hide();
          this.callback(SettingsAction.BACK);
          break;
      }
    }
  }

  /**
   * 移动选择
   */
  private moveSelection(delta: number): void {
    const newIndex = this.selectedIndex + delta;

    if (newIndex < 0) {
      this.selectedIndex = this.options.length - 1;
    } else if (newIndex >= this.options.length) {
      this.selectedIndex = 0;
    } else {
      this.selectedIndex = newIndex;
    }

    this.playSelectSound();
  }

  /**
   * 移动值（滑块或选项）
   */
  private moveValue(delta: number): void {
    const option = this.options[this.selectedIndex];
    if (!option) return;

    if (option.type === SettingType.SLIDER) {
      // 滑块：以10%为单位调整
      const newValue = Math.max(0, Math.min(100, option.value as number + delta * 10));
      option.value = newValue;
      this.applySetting(option);
      this.playSelectSound();
    } else if (option.type === SettingType.OPTION && option.options) {
      // 选项：切换
      const currentIndex = option.options.findIndex(opt => opt.value === option.value);
      const newIndex = (currentIndex + delta + option.options.length) % option.options.length;
      option.value = option.options[newIndex].value;
      this.applySetting(option);
      this.playSelectSound();
    }
  }

  /**
   * 开始编辑
   */
  private startEditing(): void {
    const option = this.options[this.selectedIndex];
    if (!option) return;

    if (option.type === SettingType.SLIDER) {
      this.editingIndex = this.selectedIndex;
    } else if (option.type === SettingType.OPTION && option.options) {
      // 选项直接切换
      this.moveValue(1);
    }
  }

  /**
   * 处理编辑输入
   */
  private handleEditing(action: 'up' | 'down' | 'left' | 'right' | 'confirm' | 'cancel' | 'any'): void {
    if (action === 'cancel' || action === 'confirm') {
      this.editingIndex = -1;
      this.playConfirmSound();
      return;
    }

    if (action === 'left' || action === 'right') {
      this.moveValue(action === 'left' ? -1 : 1);
    }
  }

  /**
   * 应用设置
   */
  private applySetting(option: SettingOption): void {
    try {

      switch (option.id) {
        case 'bgmVolume':
          audioManager.setBGMVolume((option.value as number) / 100);
          break;

        case 'sfxVolume':
          audioManager.setSFXVolume((option.value as number) / 100);
          break;

        case 'voiceVolume':
          audioManager.setVoiceVolume((option.value as number) / 100);
          break;

        case 'theme':
          uiTheme.setTheme(option.value as ThemeMode);
          break;
      }
    } catch (error) {
      console.warn('[SettingsUI] 应用设置失败:', error);
    }
  }

  /**
   * 更新
   */
  update(_deltaTime: number): void {
    // 设置界面没有动画更新
  }

  /**
   * 渲染
   */
  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.visible) return;

    // 计算面板位置（居中）
    this.panelX = (width - this.panelWidth) / 2;
    this.panelY = (height - this.panelHeight) / 2;

    // 更新选项位置
    this.updateOptionPositions();

    // 绘制背景遮罩
    this.renderOverlay(ctx, width, height);

    // 绘制面板
    this.renderPanel(ctx);

    // 绘制标题
    this.renderTitle(ctx);

    // 绘制选项
    this.renderOptions(ctx);
  }

  /**
   * 绘制背景遮罩
   */
  private renderOverlay(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  /**
   * 绘制面板
   */
  private renderPanel(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    // 主背景
    ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
    ctx.lineWidth = 2;

    this.roundRect(ctx, this.panelX, this.panelY, this.panelWidth, this.panelHeight, 12);
    ctx.fill();
    ctx.stroke();

    // 内边框
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, this.panelX + 3, this.panelY + 3, this.panelWidth - 6, this.panelHeight - 6, 10);
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
    ctx.fillText('设置', this.panelX + this.panelWidth / 2, this.panelY + 20);

    ctx.restore();
  }

  /**
   * 绘制选项
   */
  private renderOptions(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.options.length; i++) {
      const option = this.options[i];
      const isSelected = i === this.selectedIndex;
      const isEditing = i === this.editingIndex;

      this.renderOption(ctx, option, isSelected, isEditing);
    }
  }

  /**
   * 绘制单个选项
   */
  private renderOption(
    ctx: CanvasRenderingContext2D,
    option: SettingOption,
    isSelected: boolean,
    isEditing: boolean
  ): void {
    ctx.save();

    // 选项背景
    if (isSelected || isEditing) {
      ctx.fillStyle = 'rgba(66, 153, 225, 0.2)';
    } else {
      ctx.fillStyle = 'rgba(51, 65, 85, 0.3)';
    }

    const optionWidth = this.panelWidth - 60;
    const optionHeight = 50;
    const optionX = this.panelX + 30;
    const optionY = option.y;

    this.roundRect(ctx, optionX, optionY, optionWidth, optionHeight, 8);
    ctx.fill();

    // 标签
    ctx.fillStyle = isSelected ? '#ffffff' : '#cbd5e1';
    ctx.font = isSelected ? 'bold 16px Arial' : '16px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(option.label, optionX + 15, optionY + optionHeight / 2);

    // 选中指示器
    if (isSelected) {
      ctx.fillStyle = '#60a5fa';
      ctx.font = 'bold 14px Arial';
      ctx.fillText('▶', optionX - 20, optionY + optionHeight / 2);
    }

    // 值显示
    const valueX = optionX + optionWidth - 20;
    if (option.type === SettingType.SLIDER) {
      this.renderSliderValue(ctx, option, valueX, optionY + optionHeight / 2, isSelected, isEditing);
    } else if (option.type === SettingType.OPTION && option.options) {
      const selectedOption = option.options.find(opt => opt.value === option.value);
      if (selectedOption) {
        ctx.fillStyle = isSelected ? '#60a5fa' : '#94a3b8';
        ctx.font = '14px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(selectedOption.label, valueX, optionY + optionHeight / 2);
      }
    }

    ctx.restore();
  }

  /**
   * 绘制滑块值
   */
  private renderSliderValue(
    ctx: CanvasRenderingContext2D,
    option: SettingOption,
    x: number,
    y: number,
    isSelected: boolean,
    isEditing: boolean
  ): void {
    const value = option.value as number;

    // 绘制滑块背景
    const sliderWidth = 100;
    const sliderHeight = 6;
    const sliderX = x - sliderWidth;
    const sliderY = y - sliderHeight / 2;

    ctx.fillStyle = 'rgba(71, 85, 105, 0.5)';
    this.roundRect(ctx, sliderX, sliderY, sliderWidth, sliderHeight, 3);
    ctx.fill();

    // 绘制滑块填充
    const fillWidth = (value / 100) * sliderWidth;
    ctx.fillStyle = isSelected || isEditing ? '#60a5fa' : '#94a3b8';
    this.roundRect(ctx, sliderX, sliderY, fillWidth, sliderHeight, 3);
    ctx.fill();

    // 绘制滑块手柄
    const handleX = sliderX + fillWidth;
    const handleRadius = isEditing ? 8 : 6;
    ctx.beginPath();
    ctx.arc(handleX, y, handleRadius, 0, Math.PI * 2);
    ctx.fillStyle = isSelected || isEditing ? '#60a5fa' : '#e2e8f0';
    ctx.fill();

    // 绘制数值文本
    ctx.fillStyle = isSelected ? '#60a5fa' : '#94a3b8';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`${value}%`, x + 10, y);
  }

  /**
   * 更新选项位置
   */
  private updateOptionPositions(): void {
    const startY = this.panelY + 70;
    const optionHeight = 60;

    for (let i = 0; i < this.options.length; i++) {
      this.options[i].x = this.panelX + 30;
      this.options[i].y = startY + i * optionHeight;
    }
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
    const { audioManager } = require('./AudioManager');
    audioManager.playSFXLegacy('menu_select');
  }

  /**
   * 播放确认音效
   */
  private playConfirmSound(): void {
    const { audioManager } = require('./AudioManager');
    audioManager.playSFXLegacy('menu_confirm');
  }
}

/**
 * 导出设置 UI 单例
 */
export const settingsUI = new SettingsUI();
