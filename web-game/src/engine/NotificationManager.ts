/**
 * 飞书推送通知系统
 *
 * 功能：
 * - 定义通知类型（战斗结果、交易完成、系统消息）
 * - 实现飞书消息模板
 * - 实现通知队列和批量发送
 * - 用户订阅管理（订阅/取消订阅）
 * - 集成到战斗/交易系统
 */

/**
 * 通知类型枚举
 */
export enum NotificationType {
  /** 战斗结果 */
  BATTLE_RESULT = 'battle_result',
  /** 交易完成 */
  TRADE_COMPLETE = 'trade_complete',
  /** 挂单成交 */
  LISTING_SOLD = 'listing_sold',
  /** 系统消息 */
  SYSTEM_MESSAGE = 'system_message',
  /** 任务完成 */
  QUEST_COMPLETE = 'quest_complete',
  /** 活动通知 */
  EVENT_NOTIFICATION = 'event_notification',
  /** 好友请求 */
  FRIEND_REQUEST = 'friend_request',
  /** 邀请通知 */
  INVITE_NOTIFICATION = 'invite_notification',
}

/**
 * 通知优先级
 */
export enum NotificationPriority {
  /** 低优先级 - 批量发送 */
  LOW = 'low',
  /** 中优先级 - 立即发送，可延迟 */
  MEDIUM = 'medium',
  /** 高优先级 - 立即发送 */
  HIGH = 'high',
  /** 紧急 - 优先级最高 */
  URGENT = 'urgent',
}

/**
 * 飞书消息卡片元素接口
 */
export interface MessageElement {
  /** 标签类型 */
  tag: string;
  /** 文本内容 */
  text?: string | { tag: string; content: string };
  /** 内容 */
  content?: string;
  /** 样式 */
  style?: string;
  /** 列表项 */
  elements?: MessageElement[];
  /** 链接 */
  href?: string;
  /** 图片 URL */
  img_url?: string;
  /** 动作列表（用于按钮等交互元素） */
  actions?: ActionElement[];
}

/**
 * 动作元素接口（按钮等）
 */
export interface ActionElement {
  /** 标签 */
  tag: 'button';
  /** 按钮文本 */
  text: { tag: 'plain_text'; content: string };
  /** 按钮类型 */
  type: 'primary' | 'default' | 'danger';
  /** 链接 */
  url?: string;
}

/**
 * 飞书消息卡片接口
 */
export interface MessageCard {
  /** 配置 */
  config?: {
    /** 宽屏模式 */
    wide_screen_mode?: boolean;
  };
  /** 头部 */
  header?: {
    /** 标题 */
    title: {
      /** 标签 */
      tag: 'plain_text';
      /** 内容 */
      content: string;
    };
    /** 模板颜色 */
    template?: string;
  };
  /** 元素列表 */
  elements: MessageElement[];
}

/**
 * 飞书消息模板类型
 */
export enum MessageTemplateType {
  /** 纯文本 */
  TEXT = 'text',
  /** 富文本 */
  POST = 'post',
  /** 交互卡片 */
  INTERACTIVE = 'interactive',
}

/**
 * 通知消息接口
 */
export interface NotificationMessage {
  /** 消息 ID */
  messageId: string;
  /** 通知类型 */
  notificationType: NotificationType;
  /** 优先级 */
  priority: NotificationPriority;
  /** 接收者列表（用户 ID 或群组 ID） */
  recipients: string[];
  /** 消息模板类型 */
  templateType: MessageTemplateType;
  /** 文本内容（纯文本消息） */
  textContent?: string;
  /** 富文本内容 */
  postContent?: any;
  /** 交互卡片内容 */
  cardContent?: MessageCard;
  /** 额外数据 */
  data?: Record<string, any>;
  /** 创建时间 */
  createdAt: number;
  /** 发送状态 */
  sent: boolean;
  /** 发送时间 */
  sentAt?: number;
  /** 重试次数 */
  retryCount: number;
  /** 错误信息 */
  error?: string;
}

/**
 * 用户订阅配置接口
 */
export interface UserSubscription {
  /** 用户 ID */
  userId: string;
  /** 飞书用户 ID（open_id） */
  feishuUserId?: string;
  /** 订阅的通知类型 */
  subscribedTypes: NotificationType[];
  /** 是否启用通知 */
  enabled: boolean;
  /** 是否接收批量通知 */
  enableBatch: boolean;
  /** 批量延迟时间（毫秒） */
  batchDelay: number;
  /** 通知时间段（格式 "HH:MM-HH:MM"） */
  notificationHours?: string;
  /** 创建时间 */
  createdAt: number;
  /** 最后更新时间 */
  updatedAt: number;
}

/**
 * 通知发送结果接口
 */
export interface SendResult {
  /** 是否成功 */
  success: boolean;
  /** 消息 ID */
  messageId: string;
  /** 错误信息 */
  error?: string;
  /** 飞书返回的 message_id */
  feishuMessageId?: string;
}

/**
 * 批量发送结果接口
 */
export interface BatchSendResult {
  /** 总数 */
  total: number;
  /** 成功数量 */
  success: number;
  /** 失败数量 */
  failed: number;
  /** 失败的消息列表 */
  failedMessages: string[];
}

/**
 * 飞书 API 配置接口
 */
export interface FeishuApiConfig {
  /** 应用 App ID */
  appId: string;
  /** 应用 App Secret */
  appSecret: string;
  /** 访问令牌（自动获取） */
  accessToken?: string;
  /** API 基础 URL */
  apiBaseUrl: string;
  /** 令牌过期时间 */
  tokenExpireTime?: number;
}

/**
 * 通知管理器配置接口
 */
export interface NotificationManagerConfig {
  /** 飞书 API 配置 */
  feishuApi: FeishuApiConfig;
  /** 批量发送延迟（毫秒） */
  batchDelay: number;
  /** 最大重试次数 */
  maxRetries: number;
  /** 重试间隔（毫秒） */
  retryInterval: number;
  /** 队列最大大小 */
  maxQueueSize: number;
  /** 是否启用通知 */
  enabled: boolean;
}

/**
 * 通知管理器类
 *
 * 单例模式，管理飞书推送通知
 */
export class NotificationManager {
  private static instance: NotificationManager;

  /** 配置 */
  private config: NotificationManagerConfig;

  /** 通知队列 */
  private notificationQueue: NotificationMessage[] = [];

  /** 用户订阅数据 Map<用户ID, 订阅配置> */
  private subscriptions: Map<string, UserSubscription> = new Map();

  /** 消息 ID 计数器 */
  private messageIdCounter: number = 0;

  /** 批量发送定时器 */
  private batchTimer: number | null = null;

  /** 是否正在发送 */
  private isSending: boolean = false;

  /**
   * 私有构造函数，确保单例
   */
  private constructor() {
    this.config = {
      feishuApi: {
        appId: '',
        appSecret: '',
        apiBaseUrl: 'https://open.feishu.cn/open-apis',
      },
      batchDelay: 5000,
      maxRetries: 3,
      retryInterval: 3000,
      maxQueueSize: 1000,
      enabled: true,
    };
  }

  /**
   * 获取通知管理器单例实例
   */
  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  /**
   * 初始化通知管理器
   * @param config 配置选项
   */
  async initialize(config?: Partial<NotificationManagerConfig>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // 获取访问令牌
    if (this.config.feishuApi.appId && this.config.feishuApi.appSecret) {
      await this.refreshAccessToken();
    }

    // 启动批量发送定时器
    this.startBatchSender();

    console.log('[NotificationManager] 通知管理器已初始化');
  }

  /**
   * 刷新访问令牌
   */
  private async refreshAccessToken(): Promise<void> {
    const { appId, appSecret, apiBaseUrl } = this.config.feishuApi;

    try {
      const response = await fetch(`${apiBaseUrl}/auth/v3/tenant_access_token/internal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_id: appId,
          app_secret: appSecret,
        }),
      });

      const data = await response.json();

      if (data.code === 0 && data.tenant_access_token) {
        this.config.feishuApi.accessToken = data.tenant_access_token;
        this.config.feishuApi.tokenExpireTime = Date.now() + data.expire * 1000;
        console.log('[NotificationManager] 访问令牌已刷新');
      } else {
        console.error('[NotificationManager] 获取访问令牌失败:', data);
      }
    } catch (error) {
      console.error('[NotificationManager] 刷新访问令牌出错:', error);
    }
  }

  /**
   * 启动批量发送定时器
   */
  private startBatchSender(): void {
    if (this.batchTimer !== null) {
      clearInterval(this.batchTimer);
    }

    this.batchTimer = window.setInterval(() => {
      this.flushBatch();
    }, this.config.batchDelay);
  }

  /**
   * 停止批量发送定时器
   */
  private stopBatchSender(): void {
    if (this.batchTimer !== null) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
  }

  /**
   * 获取有效的访问令牌
   */
  private async getValidAccessToken(): Promise<string | null> {
    // 检查令牌是否即将过期（提前 5 分钟刷新）
    if (
      this.config.feishuApi.accessToken &&
      this.config.feishuApi.tokenExpireTime &&
      this.config.feishuApi.tokenExpireTime - Date.now() > 5 * 60 * 1000
    ) {
      return this.config.feishuApi.accessToken;
    }

    // 刷新令牌
    await this.refreshAccessToken();
    return this.config.feishuApi.accessToken || null;
  }

  /**
   * 添加用户订阅
   * @param userId 用户 ID
   * @param feishuUserId 飞书用户 ID
   * @param types 订阅的通知类型
   */
  addSubscription(
    userId: string,
    feishuUserId: string,
    types: NotificationType[] = []
  ): void {
    const subscription: UserSubscription = {
      userId,
      feishuUserId,
      subscribedTypes: types.length > 0 ? types : Object.values(NotificationType),
      enabled: true,
      enableBatch: true,
      batchDelay: this.config.batchDelay,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.subscriptions.set(userId, subscription);
    console.log(`[NotificationManager] 用户 ${userId} 已订阅通知`);
  }

  /**
   * 更新用户订阅
   * @param userId 用户 ID
   * @param updates 更新的字段
   */
  updateSubscription(
    userId: string,
    updates: Partial<UserSubscription>
  ): boolean {
    const subscription = this.subscriptions.get(userId);
    if (!subscription) {
      return false;
    }

    Object.assign(subscription, updates);
    subscription.updatedAt = Date.now();
    console.log(`[NotificationManager] 用户 ${userId} 订阅已更新`);
    return true;
  }

  /**
   * 取消用户订阅
   * @param userId 用户 ID
   */
  removeSubscription(userId: string): boolean {
    const removed = this.subscriptions.delete(userId);
    if (removed) {
      console.log(`[NotificationManager] 用户 ${userId} 已取消订阅`);
    }
    return removed;
  }

  /**
   * 获取用户订阅
   * @param userId 用户 ID
   */
  getSubscription(userId: string): UserSubscription | null {
    return this.subscriptions.get(userId) || null;
  }

  /**
   * 检查用户是否订阅了指定类型的通知
   * @param userId 用户 ID
   * @param type 通知类型
   */
  isSubscribed(userId: string, type: NotificationType): boolean {
    const subscription = this.subscriptions.get(userId);
    if (!subscription || !subscription.enabled) {
      return false;
    }
    return subscription.subscribedTypes.includes(type);
  }

  /**
   * 发送战斗结果通知
   * @param userId 用户 ID
   * @param battleId 战斗 ID
   * @param result 战斗结果
   */
  sendBattleResultNotification(
    userId: string,
    battleId: string,
    result: 'victory' | 'defeat' | 'draw'
  ): void {
    if (!this.isSubscribed(userId, NotificationType.BATTLE_RESULT)) {
      return;
    }

    const title = result === 'victory' ? '战斗胜利！' :
                  result === 'defeat' ? '战斗失败' : '战斗平局';

    const color = result === 'victory' ? 'green' :
                 result === 'defeat' ? 'red' : 'yellow';

    const card: MessageCard = {
      config: { wide_screen_mode: true },
      header: {
        title: { tag: 'plain_text', content: title },
        template: color,
      },
      elements: [
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**战斗 ID**: ${battleId}\n\n**结果**: ${title}`,
          },
        },
        {
          tag: 'action',
          actions: [
            {
              tag: 'button',
              text: { tag: 'plain_text', content: '查看详情' },
              type: 'primary',
              url: '#',
            },
          ],
        },
      ],
    };

    this.queueNotification(userId, {
      notificationType: NotificationType.BATTLE_RESULT,
      priority: NotificationPriority.MEDIUM,
      templateType: MessageTemplateType.INTERACTIVE,
      cardContent: card,
      data: { battleId, result },
    });
  }

  /**
   * 发送交易完成通知
   * @param userId 用户 ID
   * @param tradeId 交易 ID
   * @param item 商品名称
   * @param quantity 数量
   * @param amount 金额
   */
  sendTradeCompleteNotification(
    userId: string,
    tradeId: string,
    item: string,
    quantity: number,
    amount: number
  ): void {
    if (!this.isSubscribed(userId, NotificationType.TRADE_COMPLETE)) {
      return;
    }

    const card: MessageCard = {
      config: { wide_screen_mode: true },
      header: {
        title: { tag: 'plain_text', content: '交易完成' },
        template: 'blue',
      },
      elements: [
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**交易 ID**: ${tradeId}\n\n**商品**: ${item}\n**数量**: ${quantity}\n**金额**: ${amount} 金币`,
          },
        },
        {
          tag: 'action',
          actions: [
            {
              tag: 'button',
              text: { tag: 'plain_text', content: '查看交易' },
              type: 'primary',
              url: '#',
            },
          ],
        },
      ],
    };

    this.queueNotification(userId, {
      notificationType: NotificationType.TRADE_COMPLETE,
      priority: NotificationPriority.MEDIUM,
      templateType: MessageTemplateType.INTERACTIVE,
      cardContent: card,
      data: { tradeId, item, quantity, amount },
    });
  }

  /**
   * 发送挂单成交通知
   * @param userId 用户 ID
   * @param listingId 挂单 ID
   * @param item 商品名称
   * @param quantity 数量
   * @param price 单价
   */
  sendListingSoldNotification(
    userId: string,
    listingId: string,
    item: string,
    quantity: number,
    price: number
  ): void {
    if (!this.isSubscribed(userId, NotificationType.LISTING_SOLD)) {
      return;
    }

    const total = price * quantity;

    const card: MessageCard = {
      config: { wide_screen_mode: true },
      header: {
        title: { tag: 'plain_text', content: '挂单成交！' },
        template: 'green',
      },
      elements: [
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**挂单 ID**: ${listingId}\n\n**商品**: ${item}\n**数量**: ${quantity}\n**单价**: ${price} 金币\n**总价**: ${total} 金币`,
          },
        },
        {
          tag: 'action',
          actions: [
            {
              tag: 'button',
              text: { tag: 'plain_text', content: '查看市场' },
              type: 'primary',
              url: '#',
            },
          ],
        },
      ],
    };

    this.queueNotification(userId, {
      notificationType: NotificationType.LISTING_SOLD,
      priority: NotificationPriority.HIGH,
      templateType: MessageTemplateType.INTERACTIVE,
      cardContent: card,
      data: { listingId, item, quantity, price, total },
    });
  }

  /**
   * 发送系统消息通知
   * @param userId 用户 ID（不指定则广播给所有订阅用户）
   * @param title 标题
   * @param content 内容
   * @param priority 优先级
   */
  sendSystemMessage(
    userId: string | null,
    title: string,
    content: string,
    priority: NotificationPriority = NotificationPriority.LOW
  ): void {
    const card: MessageCard = {
      config: { wide_screen_mode: true },
      header: {
        title: { tag: 'plain_text', content: title },
        template: 'grey',
      },
      elements: [
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content,
          },
        },
      ],
    };

    if (userId) {
      // 发送给指定用户
      if (this.isSubscribed(userId, NotificationType.SYSTEM_MESSAGE)) {
        this.queueNotification(userId, {
          notificationType: NotificationType.SYSTEM_MESSAGE,
          priority,
          templateType: MessageTemplateType.INTERACTIVE,
          cardContent: card,
          data: { title, content },
        });
      }
    } else {
      // 广播给所有订阅系统消息的用户
      for (const [uid, subscription] of this.subscriptions.entries()) {
        if (
          subscription.enabled &&
          subscription.subscribedTypes.includes(NotificationType.SYSTEM_MESSAGE)
        ) {
          this.queueNotification(uid, {
            notificationType: NotificationType.SYSTEM_MESSAGE,
            priority,
            templateType: MessageTemplateType.INTERACTIVE,
            cardContent: card,
            data: { title, content },
          });
        }
      }
    }
  }

  /**
   * 将通知加入队列
   * @param userId 用户 ID
   * @param message 消息数据
   */
  private queueNotification(userId: string, message: Partial<NotificationMessage>): void {
    const subscription = this.subscriptions.get(userId);
    if (!subscription || !subscription.feishuUserId) {
      console.warn(`[NotificationManager] 用户 ${userId} 未订阅或未设置飞书 ID`);
      return;
    }

    // 检查队列大小
    if (this.notificationQueue.length >= this.config.maxQueueSize) {
      console.warn('[NotificationManager] 通知队列已满，丢弃旧消息');
      this.notificationQueue.shift();
    }

    const notification: NotificationMessage = {
      messageId: `notify_${++this.messageIdCounter}`,
      notificationType: message.notificationType!,
      priority: message.priority!,
      recipients: [subscription.feishuUserId],
      templateType: message.templateType!,
      textContent: message.textContent,
      postContent: message.postContent,
      cardContent: message.cardContent,
      data: message.data,
      createdAt: Date.now(),
      sent: false,
      retryCount: 0,
    };

    this.notificationQueue.push(notification);

    // 高优先级或用户不启用批量时立即发送
    if (
      message.priority === NotificationPriority.HIGH ||
      message.priority === NotificationPriority.URGENT ||
      !subscription.enableBatch
    ) {
      this.sendNotification(notification);
    }
  }

  /**
   * 发送单个通知
   */
  private async sendNotification(notification: NotificationMessage): Promise<void> {
    if (this.isSending || !this.config.enabled) {
      return;
    }

    this.isSending = true;

    try {
      const accessToken = await this.getValidAccessToken();
      if (!accessToken) {
        throw new Error('无法获取访问令牌');
      }

      const { apiBaseUrl } = this.config.feishuApi;

      // 构建消息体
      let msgBody: any;

      switch (notification.templateType) {
        case MessageTemplateType.TEXT:
          msgBody = {
            msg_type: 'text',
            content: {
              text: notification.textContent,
            },
          };
          break;

        case MessageTemplateType.INTERACTIVE:
          msgBody = {
            msg_type: 'interactive',
            card: notification.cardContent,
          };
          break;

        default:
          throw new Error(`不支持的消息模板类型: ${notification.templateType}`);
      }

      // 发送给每个接收者
      for (const recipient of notification.recipients) {
        const response = await fetch(`${apiBaseUrl}/im/v1/messages?receive_id_type=open_id`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            receive_id: recipient,
            msg_type: msgBody.msg_type,
            content: JSON.stringify(msgBody.content || msgBody.card),
          }),
        });

        const data = await response.json();

        if (data.code === 0) {
          notification.sent = true;
          notification.sentAt = Date.now();
          console.log(`[NotificationManager] 通知 ${notification.messageId} 发送成功`);
        } else {
          throw new Error(`飞书 API 错误: ${data.msg}`);
        }
      }
    } catch (error) {
      console.error(`[NotificationManager] 发送通知失败:`, error);
      notification.error = error instanceof Error ? error.message : '未知错误';

      // 重试逻辑
      if (notification.retryCount < this.config.maxRetries) {
        notification.retryCount++;
        setTimeout(() => {
          this.sendNotification(notification);
        }, this.config.retryInterval * notification.retryCount);
      }
    } finally {
      this.isSending = false;
    }
  }

  /**
   * 刷新批量消息
   */
  private flushBatch(): void {
    if (this.notificationQueue.length === 0) {
      return;
    }

    // 分离待发送消息
    const toSend = this.notificationQueue.filter(n => !n.sent);
    this.notificationQueue = this.notificationQueue.filter(n => n.sent);

    // 批量发送
    for (const notification of toSend) {
      this.sendNotification(notification);
    }
  }

  /**
   * 立即刷新批量队列
   */
  async flushBatchNow(): Promise<BatchSendResult> {
    const result: BatchSendResult = {
      total: 0,
      success: 0,
      failed: 0,
      failedMessages: [],
    };

    const toSend = this.notificationQueue.filter(n => !n.sent);
    result.total = toSend.length;

    for (const notification of toSend) {
      await new Promise(resolve => {
        this.sendNotification(notification);
        setTimeout(resolve, 100); // 避免请求过快
      });

      if (notification.sent) {
        result.success++;
      } else {
        result.failed++;
        result.failedMessages.push(notification.messageId);
      }
    }

    return result;
  }

  /**
   * 获取队列统计
   */
  getQueueStats(): {
    total: number;
    pending: number;
    sent: number;
    failed: number;
  } {
    const total = this.notificationQueue.length;
    const pending = this.notificationQueue.filter(n => !n.sent).length;
    const sent = this.notificationQueue.filter(n => n.sent).length;
    const failed = this.notificationQueue.filter(n => n.error).length;

    return { total, pending, sent, failed };
  }

  /**
   * 获取订阅统计
   */
  getSubscriptionStats(): {
    totalUsers: number;
    enabledUsers: number;
    subscriptionsByType: Record<string, number>;
  } {
    const totalUsers = this.subscriptions.size;
    const enabledUsers = Array.from(this.subscriptions.values()).filter(s => s.enabled).length;
    const subscriptionsByType: Record<string, number> = {};

    for (const subscription of this.subscriptions.values()) {
      for (const type of subscription.subscribedTypes) {
        subscriptionsByType[type] = (subscriptionsByType[type] || 0) + 1;
      }
    }

    return { totalUsers, enabledUsers, subscriptionsByType };
  }

  /**
   * 清除队列
   */
  clearQueue(): void {
    this.notificationQueue = [];
    console.log('[NotificationManager] 通知队列已清除');
  }

  /**
   * 清除所有数据
   */
  clear(): void {
    this.stopBatchSender();
    this.notificationQueue = [];
    this.subscriptions.clear();
    this.messageIdCounter = 0;
    console.log('[NotificationManager] 所有数据已清除');
  }
}

/**
 * 导出通知管理器单例
 */
export const notificationManager = NotificationManager.getInstance();
