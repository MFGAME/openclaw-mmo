/**
 * 成就通知 UI 组件
 *
 * 基于 Tuxemon 的成就系统
 *
 * 功能：
 * - 成就解锁通知弹窗
 * - 成就图标和名称展示
 * - 成就描述显示
 * - 奖励信息显示
 * - 与 AchievementSystem.ts 集成
 */

import { achievementSystem, AchievementData } from './AchievementSystem';
import { audioManager } from './AudioManager';

/**
 * 成就通知数据接口
 */
export interface AchievementNotificationData {
  /** 成就 ID */
  achievementId: string;
  /** 成就数据 */
  achievement: AchievementData;
  /** 显示时间 */
  showTime: number;
  /** 动画进度（0-1） */
  animationProgress: number;
  /** 是否已隐藏 */
  hidden: boolean;
}

/**
 * 成就通知 UI 配置接口
 */
export interface AchievementNotificationUIConfig {
  /** 通知显示持续时间（毫秒） */
  displayDuration: number;
  /** 同时显示的最大通知数 */
  maxNotifications: number;
  /** 动画速度 */
  animationSpeed: number;
  /** 是否启用音效 */
  enableSound: boolean;
  /** 音效 ID */
  soundId: string;
}

/**
 * 成就通知 UI 类
 *
 * 单例模式，管理成就通知的显示和动画
 */
export class AchievementNotificationUI {
  private static instance: AchievementNotificationUI;

  /** UI 配置 */
  private config: AchievementNotificationUIConfig;

  /** 通知队列 */
  private notifications: AchievementNotificationData[] = [];

  /** 当前显示的通知索引 */
  private currentDisplayIndex: number = 0;

  /** 通知显示计时器 */
  private displayTimer: number | null = null;

  /** 是否正在显示 */
  private isShowing: boolean = false;

  /**
   * 私有构造函数
   */
  private constructor() {
    this.config = {
      displayDuration: 4000,
      maxNotifications: 3,
      animationSpeed: 0.5,
      enableSound: true,
      soundId: 'achievement_unlock', // 使用 Tuxemon 音效
    };
  }

  /**
   * 获取单例实例
   */
  static getInstance(): AchievementNotificationUI {
    if (!AchievementNotificationUI.instance) {
      AchievementNotificationUI.instance = new AchievementNotificationUI();
    }
    return AchievementNotificationUI.instance;
  }

  /**
   * 初始化 UI
   */
  initialize(config?: Partial<AchievementNotificationUIConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    console.log('[AchievementNotificationUI] 初始化完成');
  }

  /**
   * 显示成就通知
   * @param achievementId 成就 ID
   */
  showNotification(achievementId: string): void {
    const achievement = achievementSystem.getAchievement(achievementId);
    if (!achievement) {
      console.warn(`[AchievementNotificationUI] 成就 ${achievementId} 不存在`);
      return;
    }

    // 播放音效
    if (this.config.enableSound) {
      this.playSound();
    }

    // 添加到通知队列
    const notification: AchievementNotificationData = {
      achievementId,
      achievement,
      showTime: Date.now(),
      animationProgress: 0,
      hidden: false,
    };

    this.notifications.push(notification);

    // 限制队列大小
    if (this.notifications.length > this.config.maxNotifications) {
      this.notifications.shift();
    }

    console.log(`[AchievementNotificationUI] 显示成就通知: ${achievement.name}`);

    // 开始显示队列
    if (!this.isShowing) {
      this.startShowing();
    }
  }

  /**
   * 播放音效
   */
  private playSound(): void {
    audioManager.playSFX(this.config.soundId);
  }

  /**
   * 开始显示队列
   */
  private startShowing(): void {
    this.isShowing = true;
    this.currentDisplayIndex = 0;
    this.showNext();
  }

  /**
   * 显示下一个通知
   */
  private showNext(): void {
    // 清除之前的计时器
    if (this.displayTimer) {
      clearTimeout(this.displayTimer);
      this.displayTimer = null;
    }

    // 检查是否还有未显示的通知
    if (this.currentDisplayIndex >= this.notifications.length) {
      this.isShowing = false;
      return;
    }

    const notification = this.notifications[this.currentDisplayIndex];
    notification.animationProgress = 0;
    notification.hidden = false;

    // 设置显示计时器
    this.displayTimer = window.setTimeout(() => {
      this.hideCurrent();
    }, this.config.displayDuration);
  }

  /**
   * 隐藏当前通知
   */
  private hideCurrent(): void {
    const notification = this.notifications[this.currentDisplayIndex];
    if (notification) {
      notification.hidden = true;
    }

    // 移动到下一个通知
    this.currentDisplayIndex++;

    // 检查是否还有通知
    setTimeout(() => {
      // 移除已隐藏的通知
      this.notifications = this.notifications.filter(n => !n.hidden);

      if (this.notifications.length > 0) {
        this.showNext();
      } else {
        this.isShowing = false;
      }
    }, 500); // 等待隐藏动画完成
  }

  /**
   * 更新 UI
   * @param _deltaTime 距离上一帧的时间（毫秒）
   */
  update(_deltaTime: number): void {
    // 更新每个通知的动画进度
    for (const notification of this.notifications) {
      const currentTime = Date.now();
      const elapsed = currentTime - notification.showTime;
      const progress = Math.min(1, elapsed / 1000); // 1秒内完成进入动画

      // 计算动画进度（进入动画）
      if (!notification.hidden) {
        notification.animationProgress = Math.min(1, progress * this.config.animationSpeed);
      }
    }
  }

  /**
   * 渲染 UI
   * @param ctx Canvas 2D 上下文
   * @param width 画布宽度
   * @param height 画布高度
   */
  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (this.notifications.length === 0) return;

    const notificationWidth = 350;
    const notificationHeight = 80;
    const gap = 10;
    const startY = height - 100;

    // 从下往上渲染通知
    for (let i = this.notifications.length - 1; i >= 0; i--) {
      const notification = this.notifications[i];
      const y = startY - i * (notificationHeight + gap);

      // 计算透明度（淡出效果）
      let alpha = 1;
      if (notification.hidden) {
        alpha = Math.max(0, 1 - notification.animationProgress);
      }

      // 渲染通知
      this.renderNotification(
        ctx,
        notification,
        width - notificationWidth - 20,
        y,
        notificationWidth,
        notificationHeight,
        alpha
      );
    }
  }

  /**
   * 渲染单个通知
   */
  private renderNotification(
    ctx: CanvasRenderingContext2D,
    notification: AchievementNotificationData,
    x: number,
    y: number,
    width: number,
    height: number,
    alpha: number
  ): void {
    const achievement = notification.achievement;

    ctx.save();
    ctx.globalAlpha = alpha;

    // 渲染背景
    this.renderBackground(ctx, x, y, width, height);

    // 渲染成就图标
    this.renderIcon(ctx, x, y, height);

    // 渲染成就名称和描述
    this.renderText(ctx, achievement, x, y, width, height);

    ctx.restore();
  }

  /**
   * 渲染背景
   */
  private renderBackground(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    // 主背景（渐变）
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.95)');
    gradient.addColorStop(1, 'rgba(30, 64, 175, 0.95)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 10);
    ctx.fill();

    // 边框
    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 发光效果
    ctx.shadowColor = '#3b82f6';
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;

    // 金色边框（表示成就）
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 3, y + 3, width - 6, height - 6);
  }

  /**
   * 渲染成就图标
   */
  private renderIcon(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    height: number
  ): void {
    const iconSize = height - 20;
    const iconX = x + 15;
    const iconY = y + 10;

    // 如果有图标路径，可以加载并渲染
    // 这里使用默认的成就图标
    const gradient = ctx.createRadialGradient(
      iconX + iconSize / 2, iconY + iconSize / 2, 0,
      iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2
    );
    gradient.addColorStop(0, '#fbbf24');
    gradient.addColorStop(0.7, '#f59e0b');
    gradient.addColorStop(1, '#d97706');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
    ctx.fill();

    // 图标边框
    ctx.strokeStyle = '#fef3c7';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 星星图标
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', iconX + iconSize / 2, iconY + iconSize / 2 + 2);
  }

  /**
   * 渲染文本
   */
  private renderText(
    ctx: CanvasRenderingContext2D,
    achievement: AchievementData,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const textX = x + height + 10;
    const textWidth = width - height - 20;

    // 成就解锁标题
    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('成就解锁！', textX, y + 10);

    // 成就名称
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(achievement.name, textX, y + 30);

    // 成就描述（截断）
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '12px Arial';
    const maxTextWidth = textWidth - 10;
    let description = achievement.description;
    if (ctx.measureText(description).width > maxTextWidth) {
      description = description.substring(0, 30) + '...';
    }
    ctx.fillText(description, textX, y + 52);

    // 成就点数
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`+${achievement.points} 点`, x + width - 10, y + 15);
  }

  /**
   * 获取当前显示的通知数量
   */
  getNotificationCount(): number {
    return this.notifications.length;
  }

  /**
   * 清除所有通知
   */
  clearAll(): void {
    this.notifications = [];
    this.currentDisplayIndex = 0;
    this.isShowing = false;

    if (this.displayTimer) {
      clearTimeout(this.displayTimer);
      this.displayTimer = null;
    }
  }

  /**
   * 设置配置
   */
  setConfig(config: Partial<AchievementNotificationUIConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取配置
   */
  getConfig(): AchievementNotificationUIConfig {
    return { ...this.config };
  }
}

/**
 * 导出单例
 */
export const achievementNotificationUI = AchievementNotificationUI.getInstance();
