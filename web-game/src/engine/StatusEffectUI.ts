/**
 * 状态效果图标 UI
 *
 * 在战斗中显示怪物状态图标
 *
 * 功能：
 * - 显示怪物当前状态效果图标
 * - 状态添加/移除动画
 * - 鼠标悬停显示状态详情
 * - 最多显示 4 个图标，超出显示 "+N"
 */

import { StatusEffectId, StatusEffectInstance, StatusEffectData } from './StatusEffectManager';
import { StatusEffectType } from './StatusEffectManager';

/**
 * 状态图标映射（使用 Emoji 作为临时图标，后续可替换为 Tuxemon 资源）
 */
const STATUS_ICONS: Record<string, string> = {
  poison: '🟣',        // 中毒 - 紫色
  bad_poison: '🟤',     // 剧毒 - 棕色
  burn: '🔥',           // 灼烧 - 火焰
  paralysis: '⚡',       // 麻痹 - 闪电
  freeze: '❄️',         // 冰冻 - 冰
  sleep: '💤',          // 睡眠 - ZZZ
  confuse: '🌀',        // 混乱 - 漩涡
  flinch: '😨',         // 畏缩 - 害怕
  bound: '🔗',          // 束缚 - 链条
  taunt: '😤',          // 挑衅 - 生气
  fear: '😰',           // 恐惧 - 流汗
  faint: '😵',          // 气绝 - 晕倒
  weaken: '📉',         // 虚弱 - 下降
  vulnerable: '💔',     // 破防 - 破碎心
  curse: '😈',          // 诅咒 - 恶魔
  doom: '💀',           // 厄运 - 骷髅
  revive: '✨',         // 复活 - 闪光
  shield: '🛡️',        // 护盾 - 盾牌
  reflect: '🪞',        // 反射 - 镜子
  light_screen: '💡',   // 光墙 - 灯泡
  substitute: '🎭',     // 替身 - 面具
  amnesia: '🧠',       // 健忘 - 大脑
  slow: '🐌',           // 缓慢 - 蜗牛
  silence: '🔇',        // 沉默 - 静音
  blind: '👁️',         // 失明 - 眼睛
  hypnosis: '👁️‍🗨️',     // 沉睡 - 闭眼
  drunk: '🍺',          // 醉酒 - 啤酒
  rage: '😠',           // 狂暴 - 生气
  mock: '🤪',           // 嘲讽 - 鬼脸
  seal: '🔒',           // 封印 - 锁
  drain: '💧',          // 吸收 - 水滴
  regenerate: '💚',     // 再生 - 绿心
  poison_sting: '🦂',   // 毒针 - 蝎子
};

/**
 * 状态图标动画状态
 */
enum IconAnimationState {
  /** 无动画 */
  NONE = 'none',
  /** 弹出动画（添加时） */
  POP_IN = 'pop_in',
  /** 淡出动画（移除时） */
  FADE_OUT = 'fade_out',
}

/**
 * 状态图标条目接口
 */
interface StatusIconEntry {
  /** 状态 ID */
  id: StatusEffectId;
  /** 状态数据 */
  data: StatusEffectData;
  /** 实例 */
  instance: StatusEffectInstance;
  /** 当前动画状态 */
  animationState: IconAnimationState;
  /** 动画进度（0-1） */
  animationProgress: number;
  /** 目标 X 位置 */
  targetX: number;
  /** 目标 Y 位置 */
  targetY: number;
  /** 当前 X 位置 */
  currentX: number;
  /** 当前 Y 位置 */
  currentY: number;
  /** 是否正在被移除 */
  isRemoving: boolean;
}

/**
 * 状态图标 UI 配置
 */
export interface StatusEffectUIConfig {
  /** 图标大小 */
  iconSize: number;
  /** 图标间距 */
  iconSpacing: number;
  /** 最大显示数量 */
  maxIcons: number;
  /** 弹出动画持续时间（毫秒） */
  popInDuration: number;
  /** 淡出动画持续时间（毫秒） */
  fadeOutDuration: number;
  /** 是否启用悬停提示 */
  enableTooltip: boolean;
}

/**
 * 状态图标 UI 类
 */
export class StatusEffectUI {
  /** UI 配置 */
  private config: StatusEffectUIConfig = {
    iconSize: 32,
    iconSpacing: 4,
    maxIcons: 4,
    popInDuration: 200,
    fadeOutDuration: 300,
    enableTooltip: true,
  };

  /** 当前显示的图标列表 */
  private icons: StatusIconEntry[] = [];

  /** 鼠标位置 */

  /** 悬停的状态 ID */
  private hoveredStatusId: StatusEffectId | null = null;

  /**
   * 初始化 UI
   * @param config UI 配置
   */
  initialize(config?: Partial<StatusEffectUIConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    console.log('[StatusEffectUI] Initialized');
  }

  /**
   * 更新 UI
   * @param deltaTime 距离上一帧的时间（毫秒）
   */
  update(deltaTime: number): void {

    // 更新所有图标的动画状态
    for (let i = this.icons.length - 1; i >= 0; i--) {
      const icon = this.icons[i];

      // 更新动画进度
      if (icon.animationState !== IconAnimationState.NONE) {
        const duration =
          icon.animationState === IconAnimationState.POP_IN
            ? this.config.popInDuration
            : this.config.fadeOutDuration;

        icon.animationProgress += deltaTime / duration;

        if (icon.animationProgress >= 1) {
          icon.animationProgress = 1;

          // 动画完成
          if (icon.isRemoving) {
            // 移除图标
            this.icons.splice(i, 1);
            continue;
          } else {
            icon.animationState = IconAnimationState.NONE;
          }
        }

        // 更新位置动画
        this.updateIconPosition(icon, i);
      } else {
        // 确保位置正确
        icon.targetX = i * (this.config.iconSize + this.config.iconSpacing);
        icon.targetY = 0;
        icon.currentX = icon.targetX;
        icon.currentY = icon.targetY;
      }
    }
  }

  /**
   * 更新图标位置（带动画）
   * @param icon 图标条目
   * @param index 索引
   */
  private updateIconPosition(icon: StatusIconEntry, index: number): void {
    // 计算目标位置
    icon.targetX = index * (this.config.iconSize + this.config.iconSpacing);
    icon.targetY = 0;

    // 根据动画状态计算当前位置
    if (icon.animationState === IconAnimationState.POP_IN) {
      // 弹出动画：从缩放 0 到 1
      const progress = this.easeOutBack(icon.animationProgress);
      const scale = progress;
      icon.currentX = icon.targetX + (this.config.iconSize * (1 - scale)) / 2;
      icon.currentY = icon.targetY + (this.config.iconSize * (1 - scale)) / 2;
    } else if (icon.animationState === IconAnimationState.FADE_OUT) {
      // 淡出动画：缩小并向上移动
      const progress = icon.animationProgress;
      const scale = 1 - progress;
      icon.currentX = icon.targetX + (this.config.iconSize * (1 - scale)) / 2;
      icon.currentY = icon.targetY - progress * 10;
    }
  }

  /**
   * 缓出回弹函数
   * @param t 进度（0-1）
   * @returns 缓动后的值
   */
  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  /**
   * 渲染 UI
   * @param ctx Canvas 2D 上下文
   * @param x X 位置（怪物精灵图上方）
   * @param y Y 位置（怪物精灵图上方）
   */
  render(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    if (this.icons.length === 0) return;

    ctx.save();
    ctx.translate(x, y);

    // 渲染所有图标
    for (const icon of this.icons) {
      this.renderIcon(ctx, icon);
    }

    // 如果图标数量超过最大显示数，显示 "+N"
    if (this.icons.length > this.config.maxIcons) {
      this.renderMoreIndicator(ctx);
    }

    // 渲染悬停提示
    if (this.config.enableTooltip && this.hoveredStatusId !== null) {
      this.renderTooltip(ctx, x, y);
    }

    ctx.restore();
  }

  /**
   * 渲染单个图标
   * @param ctx Canvas 2D 上下文
   * @param icon 图标条目
   */
  private renderIcon(ctx: CanvasRenderingContext2D, icon: StatusIconEntry): void {
    // 计算缩放和透明度
    let scale = 1;
    let alpha = 1;

    if (icon.animationState === IconAnimationState.POP_IN) {
      scale = this.easeOutBack(icon.animationProgress);
    } else if (icon.animationState === IconAnimationState.FADE_OUT) {
      scale = 1 - icon.animationProgress;
      alpha = 1 - icon.animationProgress;
    }

    ctx.save();
    ctx.globalAlpha = alpha;

    // 图标位置
    const iconX = icon.currentX;
    const iconY = icon.currentY;
    const iconSize = this.config.iconSize * scale;
    const offset = (this.config.iconSize - iconSize) / 2;

    // 背景框（根据状态类型显示不同颜色）
    this.renderIconBackground(ctx, iconX + offset, iconY + offset, iconSize, icon.data.type);

    // 绘制图标
    ctx.font = `${Math.floor(iconSize * 0.7)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      STATUS_ICONS[icon.id] || '❓',
      iconX + this.config.iconSize / 2,
      iconY + this.config.iconSize / 2 + 2
    );

    // 堆叠层数标记
    if (icon.instance.stacks > 1) {
      ctx.font = 'bold 10px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      const stackText = icon.instance.stacks.toString();
      ctx.strokeText(stackText, iconX + this.config.iconSize - 8, iconY + 12);
      ctx.fillText(stackText, iconX + this.config.iconSize - 8, iconY + 12);
    }

    ctx.restore();
  }

  /**
   * 渲染图标背景
   * @param ctx Canvas 2D 上下文
   * @param x X 位置
   * @param y Y 位置
   * @param size 大小
   * @param type 状态类型
   */
  private renderIconBackground(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    type: StatusEffectType
  ): void {
    // 根据状态类型选择背景颜色
    let bgColor = 'rgba(0, 0, 0, 0.7)';
    let borderColor = '#ffffff';

    switch (type) {
      case StatusEffectType.DAMAGE_OVER_TIME:
        bgColor = 'rgba(128, 0, 128, 0.7)'; // 紫色
        borderColor = '#e056fd';
        break;
      case StatusEffectType.CONTROL:
        bgColor = 'rgba(255, 0, 0, 0.7)'; // 红色
        borderColor = '#ff6b6b';
        break;
      case StatusEffectType.STAT_DEBUFF:
        bgColor = 'rgba(255, 165, 0, 0.7)'; // 橙色
        borderColor = '#ffa502';
        break;
      case StatusEffectType.STAT_BUFF:
        bgColor = 'rgba(0, 128, 0, 0.7)'; // 绿色
        borderColor = '#7bed9f';
        break;
      case StatusEffectType.PROTECTION:
        bgColor = 'rgba(0, 0, 255, 0.7)'; // 蓝色
        borderColor = '#70a1ff';
        break;
      case StatusEffectType.SPECIAL:
        bgColor = 'rgba(128, 0, 128, 0.7)'; // 紫色
        borderColor = '#e056fd';
        break;
    }

    // 绘制圆角矩形背景
    ctx.fillStyle = bgColor;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;

    this.roundRect(ctx, x, y, size, size, 4);
    ctx.fill();
    ctx.stroke();
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
   * 渲染更多指示器（+N）
   * @param ctx Canvas 2D 上下文
   */
  private renderMoreIndicator(ctx: CanvasRenderingContext2D): void {
    const moreCount = this.icons.length - this.config.maxIcons;
    if (moreCount <= 0) return;

    const x = this.config.maxIcons * (this.config.iconSize + this.config.iconSpacing);
    const y = 0;
    const size = this.config.iconSize;

    ctx.save();

    // 背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;

    this.roundRect(ctx, x, y, size, size, 4);
    ctx.fill();
    ctx.stroke();

    // 文字
    ctx.font = 'bold 12px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`+${moreCount}`, x + size / 2, y + size / 2);

    ctx.restore();
  }

  /**
   * 渲染悬停提示
   * @param ctx Canvas 2D 上下文
   * @param x 原始 X 位置
   * @param y 原始 Y 位置
   */
  private renderTooltip(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const icon = this.icons.find(i => i.id === this.hoveredStatusId);
    if (!icon) return;

    ctx.save();

    // 计算提示框位置（在图标下方）
    const iconIndex = this.icons.indexOf(icon);
    const tooltipX = x + iconIndex * (this.config.iconSize + this.config.iconSpacing);
    const tooltipY = y + this.config.iconSize + 10;

    // 提示框尺寸
    const padding = 10;
    const lineHeight = 20;
    const lines = [
      icon.data.name,
      icon.data.description,
      `剩余: ${icon.instance.remainingTurns === 0 ? '永久' : icon.instance.remainingTurns + ' 回合'}`,
    ];

    let maxWidth = 0;
    ctx.font = '14px Arial';
    for (const line of lines) {
      const metrics = ctx.measureText(line);
      maxWidth = Math.max(maxWidth, metrics.width);
    }

    const tooltipWidth = maxWidth + padding * 2;
    const tooltipHeight = lines.length * lineHeight + padding * 2;

    // 背景框
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    this.roundRect(ctx, tooltipX, tooltipY, tooltipWidth, tooltipHeight, 8);
    ctx.fill();
    ctx.stroke();

    // 文字
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    lines.forEach((line, i) => {
      const lineY = tooltipY + padding + i * lineHeight;
      if (i === 0) {
        ctx.fillStyle = '#ffd700'; // 金色标题
      } else {
        ctx.fillStyle = '#ffffff';
      }
      ctx.fillText(line, tooltipX + padding, lineY);
    });

    ctx.restore();
  }

  /**
   * 设置状态效果列表
   * @param statusList 状态效果列表
   */
  setStatusEffects(statusList: StatusEffectInstance[]): void {
    // 获取当前状态 ID 集合
    const currentIds = new Set(this.icons.map(i => i.id));
    const newIds = new Set(statusList.map(s => s.id));

    // 标记需要移除的图标
    for (const icon of this.icons) {
      if (!newIds.has(icon.id)) {
        icon.isRemoving = true;
        icon.animationState = IconAnimationState.FADE_OUT;
        icon.animationProgress = 0;
      }
    }

    // 添加新图标
    for (const instance of statusList) {
      if (!currentIds.has(instance.id)) {
        // 查找状态数据
        const data = this.getStatusData(instance.id);
        if (!data) continue;

        const newIcon: StatusIconEntry = {
          id: instance.id,
          data,
          instance,
          animationState: IconAnimationState.POP_IN,
          animationProgress: 0,
          targetX: 0,
          targetY: 0,
          currentX: 0,
          currentY: 0,
          isRemoving: false,
        };

        this.icons.push(newIcon);
      } else {
        // 更新现有图标的数据
        const existingIcon = this.icons.find(i => i.id === instance.id);
        if (existingIcon) {
          existingIcon.instance = instance;
        }
      }
    }
  }

  /**
   * 获取状态数据（从 StatusEffectManager 获取）
   * @param statusId 状态 ID
   * @returns 状态数据，如果不存在返回 null
   */
  private getStatusData(statusId: StatusEffectId): StatusEffectData | null {
    // 这里需要导入 StatusEffectManager 来获取数据
    // 为了避免循环依赖，这里使用延迟导入
    try {
      const { statusEffectManager } = require('./StatusEffectManager');
      return statusEffectManager.getStatusData(statusId);
    } catch {
      return null;
    }
  }

  /**
   * 处理鼠标移动事件
   * @param x 鼠标 X 位置
   * @param y 鼠标 Y 位置
   */
  handleMouseMove(x: number, y: number): void {
    // mousePosition updated

    // 检查是否悬停在某个图标上
    this.hoveredStatusId = null;

    for (let i = 0; i < Math.min(this.icons.length, this.config.maxIcons); i++) {
      const icon = this.icons[i];
      const iconX = icon.currentX;
      const iconY = icon.currentY;

      if (
        x >= iconX &&
        x <= iconX + this.config.iconSize &&
        y >= iconY &&
        y <= iconY + this.config.iconSize
      ) {
        this.hoveredStatusId = icon.id;
        break;
      }
    }
  }

  /**
   * 清空所有图标
   */
  clear(): void {
    this.icons = [];
    this.hoveredStatusId = null;
    console.log('[StatusEffectUI] Cleared all icons');
  }

  /**
   * 获取当前图标数量
   * @returns 图标数量
   */
  getIconCount(): number {
    return this.icons.length;
  }

  /**
   * 获取最大显示数量
   * @returns 最大显示数量
   */
  getMaxIcons(): number {
    return this.config.maxIcons;
  }

  /**
   * 设置 UI 配置
   * @param config UI 配置
   */
  setConfig(config: Partial<StatusEffectUIConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取 UI 配置
   * @returns UI 配置（只读）
   */
  getConfig(): Readonly<StatusEffectUIConfig> {
    return { ...this.config };
  }
}

/**
 * 导出状态效果 UI 类
 */
export const statusEffectUI = new StatusEffectUI();
