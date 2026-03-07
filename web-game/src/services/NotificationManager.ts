/**
 * 飞书推送通知管理器
 *
 * 基于 Tuxemon 的事件通知系统扩展
 *
 * 功能：
 * - 通知类型枚举（战斗结果、交易完成、系统消息）
 * - 消息模板系统
 * - 飞书 Webhook 推送
 * - 通知订阅管理
 */

/**
 * 通知类型枚举
 */
export enum NotificationType {
  /** 战斗结果 */
  BATTLE_RESULT = 'battle_result',
  /** 交易完成 */
  TRADE_COMPLETE = 'trade_complete',
  /** 系统消息 */
  SYSTEM_MESSAGE = 'system_message',
  /** 好友邀请 */
  FRIEND_INVITE = 'friend_invite',
  /** 邮件通知 */
  MAIL_NOTIFICATION = 'mail_notification',
  /** 活动通知 */
  EVENT_NOTIFICATION = 'event_notification',
}

/**
 * 通知优先级
 */
export enum NotificationPriority {
  /** 低优先级 */
  LOW = 'low',
  /** 普通优先级 */
  NORMAL = 'normal',
  /** 高优先级 */
  HIGH = 'high',
  /** 紧急 */
  URGENT = 'urgent',
}

/**
 * 通知状态
 */
export enum NotificationStatus {
  /** 待发送 */
  PENDING = 'pending',
  /** 发送成功 */
  SENT = 'sent',
  /** 发送失败 */
  FAILED = 'failed',
  /** 已撤回 */
  CANCELLED = 'cancelled',
}

/**
 * 通知接口
 */
export interface Notification {
  /** 通知 ID */
  id: string;
  /** 通知类型 */
  type: NotificationType;
  /** 优先级 */
  priority: NotificationPriority;
  /** 标题 */
  title: string;
  /** 内容 */
  content: string;
  /** 接收者 ID */
  userId: string;
  /** 状态 */
  status: NotificationStatus;
  /** 创建时间 */
  createdAt: Date;
  /** 发送时间 */
  sentAt?: Date;
  /** 重试次数 */
  retryCount: number;
  /** 附加数据 */
  metadata?: Record<string, any>;
}

/**
 * 通知订阅接口
 */
export interface NotificationSubscription {
  /** 用户 ID */
  userId: string;
  /** 订阅的通知类型 */
  types: NotificationType[];
  /** 是否启用 */
  enabled: boolean;
  /** 飞书 Webhook URL */
  webhookUrl?: string;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
}

/**
 * 战斗结果通知数据
 */
export interface BattleResultData {
  /** 玩家 ID */
  playerId: string;
  /** 对手 ID */
  opponentId: string;
  /** 战斗结果 */
  result: 'win' | 'lose' | 'draw';
  /** 战斗回合数 */
  rounds: number;
  /** 获得经验 */
  expGained: number;
  /** 获得金币 */
  goldGained: number;
  /** 使用的怪物 */
  usedMonsters: string[];
}

/**
 * 交易完成通知数据
 */
export interface TradeCompleteData {
  /** 交易 ID */
  tradeId: string;
  /** 买家 ID */
  buyerId: string;
  /** 卖家 ID */
  sellerId: string;
  /** 交易物品 */
  items: Array<{
    itemId: string;
    itemName: string;
    quantity: number;
    price: number;
  }>;
  /** 总金额 */
  totalAmount: number;
}

/**
 * 系统消息数据
 */
export interface SystemMessageData {
  /** 消息类型 */
  messageType: 'maintenance' | 'update' | 'announcement' | 'warning';
  /** 消息标题 */
  title: string;
  /** 消息内容 */
  message: string;
  /** 开始时间 */
  startTime?: Date;
  /** 结束时间 */
  endTime?: Date;
  /** 是否强制阅读 */
  forceRead?: boolean;
}

/**
 * 消息模板接口
 */
export interface MessageTemplate {
  /** 模板 ID */
  id: string;
  /** 通知类型 */
  type: NotificationType;
  /** 标题模板 */
  title: string;
  /** 内容模板 */
  content: string;
  /** 变量列表 */
  variables: string[];
}

/**
 * 飞书 Webhook 响应
 */
export interface FeishuWebhookResponse {
  /** 响应码 */
  code: number;
  /** 响应消息 */
  msg: string;
  /** 数据 */
  data?: any;
}

/**
 * 飞书通知管理器类
 */
export class NotificationManager {
  private static instance: NotificationManager;

  /** 通知队列 */
  private notificationQueue: Map<string, Notification> = new Map();

  /** 通知订阅列表 */
  private subscriptions: Map<string, NotificationSubscription> = new Map();

  /** 消息模板列表 */
  private templates: Map<string, MessageTemplate> = new Map();

  /** 发送中的通知 */
  private sendingNotifications: Set<string> = new Set();

  /** 最大重试次数 */
  private readonly maxRetryCount = 3;

  /** 重试延迟（毫秒） */
  private readonly retryDelay = 5000;

  /**
   * 私有构造函数，确保单例
   */
  private constructor() {
    this.initializeTemplates();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  /**
   * 初始化消息模板
   */
  private initializeTemplates(): void {
    // 战斗结果模板
    this.addTemplate({
      id: 'battle_win',
      type: NotificationType.BATTLE_RESULT,
      title: '战斗胜利！',
      content: '恭喜你在与 {opponent} 的战斗中获得胜利！\n战斗回合: {rounds}\n获得经验: {exp}\n获得金币: {gold}',
      variables: ['opponent', 'rounds', 'exp', 'gold'],
    });

    this.addTemplate({
      id: 'battle_lose',
      type: NotificationType.BATTLE_RESULT,
      title: '战斗失败',
      content: '很遗憾，你在与 {opponent} 的战斗中落败了。\n再接再厉，继续努力！',
      variables: ['opponent'],
    });

    // 交易完成模板
    this.addTemplate({
      id: 'trade_buy',
      type: NotificationType.TRADE_COMPLETE,
      title: '交易完成',
      content: '您已成功购买 {itemNames}，总金额: {totalAmount} 金币。',
      variables: ['itemNames', 'totalAmount'],
    });

    this.addTemplate({
      id: 'trade_sell',
      type: NotificationType.TRADE_COMPLETE,
      title: '交易完成',
      content: '您的物品 {itemNames} 已成功售出，获得 {totalAmount} 金币。',
      variables: ['itemNames', 'totalAmount'],
    });

    // 系统消息模板
    this.addTemplate({
      id: 'maintenance',
      type: NotificationType.SYSTEM_MESSAGE,
      title: '系统维护通知',
      content: '{message}\n维护时间: {startTime} - {endTime}',
      variables: ['message', 'startTime', 'endTime'],
    });

    this.addTemplate({
      id: 'announcement',
      type: NotificationType.SYSTEM_MESSAGE,
      title: '{title}',
      content: '{message}',
      variables: ['title', 'message'],
    });
  }

  /**
   * 添加消息模板
   */
  addTemplate(template: MessageTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * 获取消息模板
   */
  getTemplate(templateId: string): MessageTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * 渲染消息模板
   */
  renderTemplate(templateId: string, variables: Record<string, any>): { title: string; content: string } | null {
    const template = this.templates.get(templateId);
    if (!template) {
      return null;
    }

    let title = template.title;
    let content = template.content;

    // 替换变量
    for (const key of template.variables) {
      const value = variables[key] ?? '';
      const placeholder = `{${key}}`;
      title = title.replace(new RegExp(placeholder, 'g'), String(value));
      content = content.replace(new RegExp(placeholder, 'g'), String(value));
    }

    return { title, content };
  }

  /**
   * 创建通知
   */
  createNotification(
    type: NotificationType,
    title: string,
    content: string,
    userId: string,
    priority: NotificationPriority = NotificationPriority.NORMAL,
    metadata?: Record<string, any>
  ): Notification {
    const notification: Notification = {
      id: this.generateNotificationId(),
      type,
      title,
      content,
      userId,
      priority,
      status: NotificationStatus.PENDING,
      createdAt: new Date(),
      retryCount: 0,
      metadata,
    };

    this.notificationQueue.set(notification.id, notification);
    return notification;
  }

  /**
   * 使用模板创建通知
   */
  createNotificationFromTemplate(
    templateId: string,
    variables: Record<string, any>,
    userId: string,
    priority: NotificationPriority = NotificationPriority.NORMAL,
    metadata?: Record<string, any>
  ): Notification | null {
    const rendered = this.renderTemplate(templateId, variables);
    if (!rendered) {
      console.warn(`[NotificationManager] Template not found: ${templateId}`);
      return null;
    }

    const template = this.templates.get(templateId);
    return this.createNotification(
      template!.type,
      rendered.title,
      rendered.content,
      userId,
      priority,
      metadata
    );
  }

  /**
   * 创建战斗结果通知
   */
  createBattleResultNotification(data: BattleResultData): Notification | null {
    const templateId = data.result === 'win' ? 'battle_win' : 'battle_lose';
    return this.createNotificationFromTemplate(
      templateId,
      {
        opponent: data.opponentId,
        rounds: data.rounds,
        exp: data.expGained,
        gold: data.goldGained,
      },
      data.playerId,
      data.result === 'win' ? NotificationPriority.HIGH : NotificationPriority.NORMAL,
      { battleData: data }
    );
  }

  /**
   * 创建交易完成通知
   */
  createTradeCompleteNotification(data: TradeCompleteData): Notification | null {
    const itemNames = data.items.map(item => `${item.itemName}x${item.quantity}`).join(', ');
    const templateId = data.buyerId === '' ? 'trade_sell' : 'trade_buy'; // 简化判断

    return this.createNotificationFromTemplate(
      templateId,
      {
        itemNames,
        totalAmount: data.totalAmount,
      },
      data.buyerId === '' ? data.sellerId : data.buyerId,
      NotificationPriority.NORMAL,
      { tradeData: data }
    );
  }

  /**
   * 创建系统消息通知
   */
  createSystemNotification(data: SystemMessageData, userId?: string): Notification | null {
    const templateId = data.messageType === 'maintenance' ? 'maintenance' : 'announcement';

    return this.createNotificationFromTemplate(
      templateId,
      {
        title: data.title,
        message: data.message,
        startTime: data.startTime?.toLocaleString('zh-CN') || '',
        endTime: data.endTime?.toLocaleString('zh-CN') || '',
      },
      userId || 'all',
      data.forceRead ? NotificationPriority.URGENT : NotificationPriority.HIGH,
      { systemData: data }
    );
  }

  /**
   * 发送通知
   */
  async sendNotification(notificationId: string): Promise<boolean> {
    const notification = this.notificationQueue.get(notificationId);
    if (!notification) {
      console.warn(`[NotificationManager] Notification not found: ${notificationId}`);
      return false;
    }

    if (this.sendingNotifications.has(notificationId)) {
      console.warn(`[NotificationManager] Notification already sending: ${notificationId}`);
      return false;
    }

    // 检查用户是否订阅了此类型的通知
    const subscription = this.subscriptions.get(notification.userId);
    if (subscription && !subscription.enabled) {
      console.log(`[NotificationManager] User ${notification.userId} has disabled notifications`);
      notification.status = NotificationStatus.CANCELLED;
      return false;
    }

    if (subscription && !subscription.types.includes(notification.type)) {
      console.log(`[NotificationManager] User ${notification.userId} not subscribed to ${notification.type}`);
      notification.status = NotificationStatus.CANCELLED;
      return false;
    }

    this.sendingNotifications.add(notificationId);

    try {
      // 发送到飞书 Webhook
      const success = await this.sendToFeishuWebhook(notification);

      if (success) {
        notification.status = NotificationStatus.SENT;
        notification.sentAt = new Date();
        console.log(`[NotificationManager] Notification sent successfully: ${notificationId}`);
      } else {
        await this.handleSendFailure(notification);
      }

      return success;
    } catch (error) {
      console.error(`[NotificationManager] Failed to send notification ${notificationId}:`, error);
      await this.handleSendFailure(notification);
      return false;
    } finally {
      this.sendingNotifications.delete(notificationId);
    }
  }

  /**
   * 发送到飞书 Webhook
   */
  private async sendToFeishuWebhook(notification: Notification): Promise<boolean> {
    const subscription = this.subscriptions.get(notification.userId);
    if (!subscription || !subscription.webhookUrl) {
      // 如果没有配置 Webhook，记录日志但不返回失败
      console.log(`[NotificationManager] No webhook configured for user ${notification.userId}`);
      return true;
    }

    try {
      const message = this.buildFeishuMessage(notification);
      const response = await fetch(subscription.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const data: FeishuWebhookResponse = await response.json();

      if (data.code === 0) {
        return true;
      } else {
        console.error(`[NotificationManager] Feishu webhook error: ${data.msg}`);
        return false;
      }
    } catch (error) {
      console.error('[NotificationManager] Failed to send to Feishu webhook:', error);
      return false;
    }
  }

  /**
   * 构建飞书消息
   */
  private buildFeishuMessage(notification: Notification): any {
    // 构建卡片消息格式
    return {
      msg_type: 'interactive',
      card: {
        header: {
          title: {
            tag: 'plain_text',
            content: notification.title,
          },
          template: this.getPriorityColor(notification.priority),
        },
        elements: [
          {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: notification.content.replace(/\n/g, '\n'),
            },
          },
          {
            tag: 'div',
            text: {
              tag: 'plain_text',
              content: `时间: ${notification.createdAt.toLocaleString('zh-CN')}`,
            },
          },
        ],
      },
    };
  }

  /**
   * 获取优先级对应的颜色
   */
  private getPriorityColor(priority: NotificationPriority): string {
    switch (priority) {
      case NotificationPriority.URGENT:
        return 'red';
      case NotificationPriority.HIGH:
        return 'orange';
      case NotificationPriority.NORMAL:
        return 'blue';
      case NotificationPriority.LOW:
        return 'grey';
      default:
        return 'blue';
    }
  }

  /**
   * 处理发送失败
   */
  private async handleSendFailure(notification: Notification): Promise<void> {
    notification.retryCount++;

    if (notification.retryCount >= this.maxRetryCount) {
      notification.status = NotificationStatus.FAILED;
      console.error(`[NotificationManager] Notification ${notification.id} failed after ${this.maxRetryCount} retries`);
    } else {
      console.log(`[NotificationManager] Retrying notification ${notification.id}, attempt ${notification.retryCount}`);
      await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      await this.sendNotification(notification.id);
    }
  }

  /**
   * 订阅通知
   */
  subscribe(
    userId: string,
    types: NotificationType[],
    webhookUrl?: string
  ): NotificationSubscription {
    const subscription: NotificationSubscription = {
      userId,
      types,
      enabled: true,
      webhookUrl,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.subscriptions.set(userId, subscription);
    console.log(`[NotificationManager] User ${userId} subscribed to notifications`);
    return subscription;
  }

  /**
   * 取消订阅
   */
  unsubscribe(userId: string): boolean {
    const subscription = this.subscriptions.get(userId);
    if (subscription) {
      subscription.enabled = false;
      subscription.updatedAt = new Date();
      console.log(`[NotificationManager] User ${userId} unsubscribed from notifications`);
      return true;
    }
    return false;
  }

  /**
   * 更新订阅
   */
  updateSubscription(
    userId: string,
    types?: NotificationType[],
    webhookUrl?: string,
    enabled?: boolean
  ): NotificationSubscription | null {
    const subscription = this.subscriptions.get(userId);
    if (!subscription) {
      return null;
    }

    if (types) {
      subscription.types = types;
    }
    if (webhookUrl !== undefined) {
      subscription.webhookUrl = webhookUrl;
    }
    if (enabled !== undefined) {
      subscription.enabled = enabled;
    }
    subscription.updatedAt = new Date();

    console.log(`[NotificationManager] User ${userId} subscription updated`);
    return subscription;
  }

  /**
   * 获取订阅信息
   */
  getSubscription(userId: string): NotificationSubscription | undefined {
    return this.subscriptions.get(userId);
  }

  /**
   * 获取通知
   */
  getNotification(notificationId: string): Notification | undefined {
    return this.notificationQueue.get(notificationId);
  }

  /**
   * 获取用户通知列表
   */
  getUserNotifications(userId: string, limit: number = 20): Notification[] {
    const notifications = Array.from(this.notificationQueue.values())
      .filter(n => n.userId === userId || n.userId === 'all')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);

    return notifications;
  }

  /**
   * 删除通知
   */
  deleteNotification(notificationId: string): boolean {
    return this.notificationQueue.delete(notificationId);
  }

  /**
   * 清理已发送的通知
   */
  cleanupSentNotifications(olderThan: Date): number {
    let count = 0;

    for (const [id, notification] of this.notificationQueue.entries()) {
      if (
        notification.status === NotificationStatus.SENT &&
        notification.createdAt < olderThan
      ) {
        this.notificationQueue.delete(id);
        count++;
      }
    }

    console.log(`[NotificationManager] Cleaned up ${count} sent notifications`);
    return count;
  }

  /**
   * 生成通知 ID
   */
  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 批量发送通知（用于广播系统消息）
   */
  async broadcastSystemMessage(data: SystemMessageData, userIds: string[]): Promise<void> {
    const notification = this.createSystemNotification(data);
    if (!notification) {
      return;
    }

    for (const userId of userIds) {
      const userNotification: Notification = {
        ...notification,
        id: this.generateNotificationId(),
        userId,
      };

      this.notificationQueue.set(userNotification.id, userNotification);
      await this.sendNotification(userNotification.id);
    }
  }
}

/**
 * 导出通知管理器单例
 */
export const notificationManager = NotificationManager.getInstance();
