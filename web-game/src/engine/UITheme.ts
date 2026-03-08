/**
 * UI 主题系统
 *
 * 提供统一的 UI 主题管理，包括：
 * - 主题色板（主色、辅色、警告色、成功色）
 * - 统一字体样式（标题、正文、小字）
 * - 统一组件样式（按钮、面板、对话框）
 * - 支持主题切换（亮色/暗色模式）
 */

/**
 * 主题模式枚举
 */
export enum ThemeMode {
  /** 亮色模式 */
  LIGHT = 'light',
  /** 暗色模式 */
  DARK = 'dark',
}

/**
 * 颜色接口
 */
export interface UIColor {
  /** 主色 */
  primary: string;
  /** 主色变体（用于悬停等） */
  primaryVariant: string;
  /** 主色变体浅色（用于背景等） */
  primaryLight: string;
  /** 辅助色 */
  secondary: string;
  /** 辅助色变体 */
  secondaryVariant: string;
  /** 背景色 */
  background: string;
  /** 表面色（用于卡片、面板等） */
  surface: string;
  /** 边框色 */
  border: string;
  /** 文字色 */
  text: string;
  /** 文字次要色 */
  textSecondary: string;
  /** 警告色 */
  warning: string;
  /** 成功色 */
  success: string;
  /** 错误色 */
  error: string;
  /** 信息色 */
  info: string;
  /** 遮罩色（半透明） */
  overlay: string;
}

/**
 * 字体样式接口
 */
export interface UIFontStyles {
  /** 标题 H1 */
  h1: string;
  /** 标题 H2 */
  h2: string;
  /** 标题 H3 */
  h3: string;
  /** 正文大 */
  bodyLarge: string;
  /** 正文 */
  body: string;
  /** 正文小 */
  bodySmall: string;
  /** 标签 */
  caption: string;
}

/**
 * 圆角样式接口
 */
export interface UIRadiusStyles {
  /** 小圆角 */
  small: number;
  /** 中等圆角 */
  medium: number;
  /** 大圆角 */
  large: number;
  /** 完全圆角 */
  full: number;
}

/**
 * 阴影样式接口
 */
export interface UIShadowStyles {
  /** 小阴影 */
  small: string;
  /** 中等阴影 */
  medium: string;
  /** 大阴影 */
  large: string;
}

/**
 * 主题配置接口
 */
export interface ThemeConfig {
  /** 颜色配置 */
  colors: UIColor;
  /** 字体样式 */
  fonts: UIFontStyles;
  /** 圆角样式 */
  radius: UIRadiusStyles;
  /** 阴影样式 */
  shadow: UIShadowStyles;
  /** 动画时长（毫秒） */
  animationDuration: {
    fast: number;
    normal: number;
    slow: number;
  };
}

/**
 * 组件样式接口
 */
export interface ComponentStyle {
  /** 背景色 */
  backgroundColor: string;
  /** 边框颜色 */
  borderColor: string;
  /** 文字颜色 */
  textColor: string;
  /** 边框宽度 */
  borderWidth: number;
  /** 圆角 */
  borderRadius: number;
  /** 阴影 */
  boxShadow: string;
  /** 内边距 */
  padding: number;
}

/**
 * 亮色主题配置
 */
const LIGHT_THEME: ThemeConfig = {
  colors: {
    primary: '#4299e1',
    primaryVariant: '#3182ce',
    primaryLight: '#bee3f8',
    secondary: '#805ad5',
    secondaryVariant: '#6b46c1',
    background: '#f7fafc',
    surface: '#ffffff',
    border: '#e2e8f0',
    text: '#1a202c',
    textSecondary: '#718096',
    warning: '#ed8936',
    success: '#48bb78',
    error: '#f56565',
    info: '#4299e1',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  fonts: {
    h1: 'bold 32px Arial, sans-serif',
    h2: 'bold 24px Arial, sans-serif',
    h3: 'bold 18px Arial, sans-serif',
    bodyLarge: '16px Arial, sans-serif',
    body: '14px Arial, sans-serif',
    bodySmall: '12px Arial, sans-serif',
    caption: '10px Arial, sans-serif',
  },
  radius: {
    small: 4,
    medium: 8,
    large: 12,
    full: 9999,
  },
  shadow: {
    small: '0 1px 2px rgba(0, 0, 0, 0.05)',
    medium: '0 4px 6px rgba(0, 0, 0, 0.1)',
    large: '0 10px 15px rgba(0, 0, 0, 0.1)',
  },
  animationDuration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
};

/**
 * 暗色主题配置
 */
const DARK_THEME: ThemeConfig = {
  colors: {
    primary: '#63b3ed',
    primaryVariant: '#4299e1',
    primaryLight: '#2b6cb0',
    secondary: '#9f7aea',
    secondaryVariant: '#805ad5',
    background: '#0f172a',
    surface: '#1e293b',
    border: '#334155',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    warning: '#f6ad55',
    success: '#68d391',
    error: '#fc8181',
    info: '#63b3ed',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
  fonts: {
    h1: 'bold 32px Arial, sans-serif',
    h2: 'bold 24px Arial, sans-serif',
    h3: 'bold 18px Arial, sans-serif',
    bodyLarge: '16px Arial, sans-serif',
    body: '14px Arial, sans-serif',
    bodySmall: '12px Arial, sans-serif',
    caption: '10px Arial, sans-serif',
  },
  radius: {
    small: 4,
    medium: 8,
    large: 12,
    full: 9999,
  },
  shadow: {
    small: '0 1px 2px rgba(0, 0, 0, 0.3)',
    medium: '0 4px 6px rgba(0, 0, 0, 0.4)',
    large: '0 10px 15px rgba(0, 0, 0, 0.5)',
  },
  animationDuration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
};

/**
 * 存储键名
 */
const THEME_STORAGE_KEY = 'openclaw-theme-mode';

/**
 * UI 主题管理器类 - 单例模式
 */
export class UIThemeManager {
  private static instance: UIThemeManager;

  /** 当前主题模式 */
  private currentMode: ThemeMode;

  /** 主题配置映射 */
  private readonly themeConfigs: Map<ThemeMode, ThemeConfig>;

  /** 主题变化回调 */
  private onThemeChangeCallbacks: ((mode: ThemeMode) => void)[] = [];

  private constructor() {
    this.themeConfigs = new Map([
      [ThemeMode.LIGHT, LIGHT_THEME],
      [ThemeMode.DARK, DARK_THEME],
    ]);

    // 从 localStorage 加载主题模式
    const savedMode = this.loadThemeMode();
    this.currentMode = savedMode || ThemeMode.DARK; // 默认使用暗色主题

    console.log(`[UIThemeManager] 初始化完成，当前主题: ${this.currentMode}`);
  }

  /**
   * 获取单例实例
   */
  static getInstance(): UIThemeManager {
    if (!UIThemeManager.instance) {
      UIThemeManager.instance = new UIThemeManager();
    }
    return UIThemeManager.instance;
  }

  /**
   * 获取当前主题配置
   */
  getTheme(): ThemeConfig {
    return this.themeConfigs.get(this.currentMode)!;
  }

  /**
   * 获取当前颜色配置
   */
  getColors(): UIColor {
    return this.getTheme().colors;
  }

  /**
   * 获取指定颜色
   */
  getColor(key: keyof UIColor): string {
    return this.getColors()[key];
  }

  /**
   * 获取字体样式
   */
  getFonts(): UIFontStyles {
    return this.getTheme().fonts;
  }

  /**
   * 获取指定字体样式
   */
  getFont(key: keyof UIFontStyles): string {
    return this.getFonts()[key];
  }

  /**
   * 获取圆角样式
   */
  getRadius(): UIRadiusStyles {
    return this.getTheme().radius;
  }

  /**
   * 获取指定圆角
   */
  getRadiusValue(key: keyof UIRadiusStyles): number {
    return this.getRadius()[key];
  }

  /**
   * 获取阴影样式
   */
  getShadow(): UIShadowStyles {
    return this.getTheme().shadow;
  }

  /**
   * 获取指定阴影
   */
  getShadowValue(key: keyof UIShadowStyles): string {
    return this.getShadow()[key];
  }

  /**
   * 获取动画时长
   */
  getAnimationDuration() {
    return this.getTheme().animationDuration;
  }

  /**
   * 获取当前主题模式
   */
  getMode(): ThemeMode {
    return this.currentMode;
  }

  /**
   * 设置主题模式
   */
  setTheme(mode: ThemeMode): void {
    if (this.currentMode === mode) {
      return;
    }

    this.currentMode = mode;
    this.saveThemeMode(mode);

    // 触发回调
    this.notifyThemeChange(mode);

    console.log(`[UIThemeManager] 主题已切换: ${mode}`);
  }

  /**
   * 切换主题模式
   */
  toggleTheme(): void {
    const newMode = this.currentMode === ThemeMode.LIGHT ? ThemeMode.DARK : ThemeMode.LIGHT;
    this.setTheme(newMode);
  }

  /**
   * 注册主题变化回调
   */
  onThemeChange(callback: (mode: ThemeMode) => void): void {
    this.onThemeChangeCallbacks.push(callback);
  }

  /**
   * 移除主题变化回调
   */
  offThemeChange(callback: (mode: ThemeMode) => void): void {
    const index = this.onThemeChangeCallbacks.indexOf(callback);
    if (index !== -1) {
      this.onThemeChangeCallbacks.splice(index, 1);
    }
  }

  /**
   * 通知主题变化
   */
  private notifyThemeChange(mode: ThemeMode): void {
    for (const callback of this.onThemeChangeCallbacks) {
      try {
        callback(mode);
      } catch (error) {
        console.error('[UIThemeManager] 主题变化回调执行失败:', error);
      }
    }
  }

  /**
   * 获取按钮样式
   */
  getButtonStyle(variant: 'primary' | 'secondary' | 'danger' = 'primary', state: 'normal' | 'hover' | 'disabled' = 'normal'): ComponentStyle {
    const colors = this.getColors();
    const radius = this.getRadius();
    const shadow = this.getShadow();

    let backgroundColor: string;
    let borderColor: string;
    let textColor: string;

    switch (variant) {
      case 'primary':
        if (state === 'disabled') {
          backgroundColor = colors.border;
          borderColor = colors.border;
          textColor = colors.textSecondary;
        } else if (state === 'hover') {
          backgroundColor = colors.primaryVariant;
          borderColor = colors.primaryVariant;
          textColor = '#ffffff';
        } else {
          backgroundColor = colors.primary;
          borderColor = colors.primary;
          textColor = '#ffffff';
        }
        break;

      case 'secondary':
        if (state === 'disabled') {
          backgroundColor = colors.border;
          borderColor = colors.border;
          textColor = colors.textSecondary;
        } else if (state === 'hover') {
          backgroundColor = colors.secondaryVariant;
          borderColor = colors.secondaryVariant;
          textColor = '#ffffff';
        } else {
          backgroundColor = colors.secondary;
          borderColor = colors.secondary;
          textColor = '#ffffff';
        }
        break;

      case 'danger':
        if (state === 'disabled') {
          backgroundColor = colors.border;
          borderColor = colors.border;
          textColor = colors.textSecondary;
        } else if (state === 'hover') {
          backgroundColor = colors.error;
          borderColor = colors.error;
          textColor = '#ffffff';
        } else {
          backgroundColor = 'rgba(245, 101, 101, 0.1)';
          borderColor = colors.error;
          textColor = colors.error;
        }
        break;
    }

    return {
      backgroundColor,
      borderColor,
      textColor,
      borderWidth: 1,
      borderRadius: radius.medium,
      boxShadow: shadow.small,
      padding: 10,
    };
  }

  /**
   * 获取面板样式
   */
  getPanelStyle(): ComponentStyle {
    const colors = this.getColors();
    const radius = this.getRadius();
    const shadow = this.getShadow();

    return {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      textColor: colors.text,
      borderWidth: 1,
      borderRadius: radius.large,
      boxShadow: shadow.medium,
      padding: 16,
    };
  }

  /**
   * 获取对话框样式
   */
  getDialogStyle(): ComponentStyle {
    const colors = this.getColors();
    const radius = this.getRadius();
    const shadow = this.getShadow();

    return {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      textColor: colors.text,
      borderWidth: 2,
      borderRadius: radius.large,
      boxShadow: shadow.large,
      padding: 24,
    };
  }

  /**
   * 获取输入框样式
   */
  getInputStyle(state: 'normal' | 'focus' | 'error' = 'normal'): ComponentStyle {
    const colors = this.getColors();
    const radius = this.getRadius();
    const shadow = this.getShadow();

    let borderColor: string;
    let textColor: string;

    switch (state) {
      case 'focus':
        borderColor = colors.primary;
        textColor = colors.text;
        break;
      case 'error':
        borderColor = colors.error;
        textColor = colors.text;
        break;
      default:
        borderColor = colors.border;
        textColor = colors.text;
        break;
    }

    return {
      backgroundColor: colors.surface,
      borderColor,
      textColor,
      borderWidth: 1,
      borderRadius: radius.medium,
      boxShadow: shadow.small,
      padding: 10,
    };
  }

  /**
   * 应用主题到 Canvas 上下文
   */
  applyToContext(ctx: CanvasRenderingContext2D): void {
    const colors = this.getColors();
    const fonts = this.getFonts();

    ctx.fillStyle = colors.background;
    ctx.strokeStyle = colors.border;
    ctx.font = fonts.body;
  }

  /**
   * 从 localStorage 加载主题模式
   */
  private loadThemeMode(): ThemeMode | null {
    try {
      const data = localStorage.getItem(THEME_STORAGE_KEY);
      if (data) {
        const mode = data as ThemeMode;
        if (mode === ThemeMode.LIGHT || mode === ThemeMode.DARK) {
          return mode;
        }
      }
    } catch (error) {
      console.warn('[UIThemeManager] 加载主题模式失败:', error);
    }
    return null;
  }

  /**
   * 保存主题模式到 localStorage
   */
  private saveThemeMode(mode: ThemeMode): void {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.warn('[UIThemeManager] 保存主题模式失败:', error);
    }
  }

  /**
   * 绘制圆角矩形
   */
  drawRoundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    fill: boolean = true,
    stroke: boolean = false
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

    if (fill) {
      ctx.fill();
    }
    if (stroke) {
      ctx.stroke();
    }
  }

  /**
   * 绘制按钮
   */
  drawButton(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    variant: 'primary' | 'secondary' | 'danger' = 'primary',
    state: 'normal' | 'hover' | 'disabled' = 'normal'
  ): void {
    const style = this.getButtonStyle(variant, state);
    const radius = style.borderRadius;

    ctx.save();

    // 绘制背景
    ctx.fillStyle = style.backgroundColor;
    ctx.strokeStyle = style.borderColor;
    ctx.lineWidth = style.borderWidth;
    this.drawRoundRect(ctx, x, y, width, height, radius, true, style.borderWidth > 0);

    // 绘制文字
    ctx.fillStyle = style.textColor;
    ctx.font = this.getFont('bodyLarge');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + width / 2, y + height / 2);

    ctx.restore();
  }

  /**
   * 绘制面板
   */
  drawPanel(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    title?: string
  ): void {
    const style = this.getPanelStyle();
    const radius = style.borderRadius;
    const padding = style.padding;

    ctx.save();

    // 绘制背景
    ctx.fillStyle = style.backgroundColor;
    ctx.strokeStyle = style.borderColor;
    ctx.lineWidth = style.borderWidth;
    this.drawRoundRect(ctx, x, y, width, height, radius, true, style.borderWidth > 0);

    // 绘制标题
    if (title) {
      ctx.fillStyle = this.getColor('text');
      ctx.font = this.getFont('h3');
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(title, x + padding, y + padding);
    }

    ctx.restore();
  }

  /**
   * 绘制对话框
   */
  drawDialog(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
    message: string
  ): void {
    const style = this.getDialogStyle();
    const radius = style.borderRadius;
    const padding = style.padding;

    ctx.save();

    // 绘制遮罩
    ctx.fillStyle = this.getColor('overlay');
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // 绘制对话框背景
    ctx.fillStyle = style.backgroundColor;
    ctx.strokeStyle = style.borderColor;
    ctx.lineWidth = style.borderWidth;
    this.drawRoundRect(ctx, x, y, width, height, radius, true, style.borderWidth > 0);

    // 绘制标题
    ctx.fillStyle = this.getColor('text');
    ctx.font = this.getFont('h2');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(title, x + width / 2, y + padding);

    // 绘制消息
    ctx.fillStyle = this.getColor('textSecondary');
    ctx.font = this.getFont('body');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 处理多行消息
    const maxWidth = width - padding * 2;
    const lines = this.wrapText(ctx, message, maxWidth);
    const lineHeight = 20;
    const startY = y + padding + 30;

    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], x + width / 2, startY + i * lineHeight);
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
   * 获取渐变色
   */
  getGradient(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, vertical: boolean = true): CanvasGradient {
    const colors = this.getColors();
    const gradient = vertical
      ? ctx.createLinearGradient(x, y, x, y + height)
      : ctx.createLinearGradient(x, y, x + width, y);

    gradient.addColorStop(0, colors.primaryLight);
    gradient.addColorStop(1, colors.primary);

    return gradient;
  }

  /**
   * 销毁主题管理器
   */
  destroy(): void {
    this.onThemeChangeCallbacks = [];
    console.log('[UIThemeManager] 已销毁');
  }
}

/**
 * 导出 UI 主题管理器单例
 */
export const uiTheme = UIThemeManager.getInstance();
