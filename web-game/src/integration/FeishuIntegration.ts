/**
 * 飞书小程序深度集成
 */

export enum FeishuCardType {
  BATTLE_RESULT = 'battle_result',
  TRADE_NOTIFICATION = 'trade_notification',
  FRIEND_REQUEST = 'friend_request',
}

export enum FeishuCommandType {
  STATUS = 'status',
  BATTLE = 'battle',
  TRADE = 'trade',
  RANKING = 'ranking',
  HELP = 'help',
}

export enum EventType {
  PVP_BATTLE = 'pvp_battle',
}

export interface MessageCard {
  msg_type: string;
  card: any;
}

export interface OAuthUserInfo {
  openId: string;
  name?: string;
}

export interface EventReminder {
  eventId: string;
  type: EventType;
  name: string;
  targetUserIds: string[];
}

export interface FeishuIntegrationConfig {
  appId: string;
  appSecret: string;
  apiBaseUrl: string;
}

export class FeishuIntegration {
  private static instance: FeishuIntegration;
  private config: FeishuIntegrationConfig;

  private constructor() {
    this.config = {
      appId: '',
      appSecret: '',
      apiBaseUrl: 'https://open.feishu.cn/open-apis',
    };
  }

  static getInstance(): FeishuIntegration {
    if (!FeishuIntegration.instance) {
      FeishuIntegration.instance = new FeishuIntegration();
    }
    return FeishuIntegration.instance;
  }

  initialize(config: Partial<FeishuIntegrationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  async sendCard(_chatId: string, _card: MessageCard): Promise<boolean> {
    // 简化实现
    return true;
  }

  createBattleResultCard(_winnerId: string, _loserId: string, _battleDuration: number, _battleId: string): MessageCard {
    return {
      msg_type: 'interactive',
      card: {
        header: { title: { content: '战斗结果' } },
        elements: [],
      },
    };
  }

  createTradeNotificationCard(_fromUserId: string, _toUserId: string, _items: any[], _tradeId: string): MessageCard {
    return {
      msg_type: 'interactive',
      card: {
        header: { title: { content: '交易通知' } },
        elements: [],
      },
    };
  }

  createFriendRequestCard(_fromUserId: string, _toUserId: string, __message: string, _requestId: string): MessageCard {
    return {
      msg_type: 'interactive',
      card: {
        header: { title: { content: '好友请求' } },
        elements: [],
      },
    };
  }

  parseCommand(_message: string, userId: string, chatId: string): any {
    return {
      type: FeishuCommandType.HELP,
      command: 'help',
      params: [],
      userId,
      chatId,
      timestamp: Date.now(),
    };
  }

  async handleCommand(command: any): Promise<string | null> {
    switch (command.type) {
      case FeishuCommandType.STATUS:
        return '角色状态';
      case FeishuCommandType.BATTLE:
        return '发起对战';
      case FeishuCommandType.TRADE:
        return '发起交易';
      default:
        return '未知命令';
    }
  }

  generateAuthUrl(_state: string): string {
    return `https://open.feishu.cn/open-apis/authen/v1/authorize?app_id=${this.config.appId}&_state=${_state}`;
  }

  saveOAuthState(_state: string, _openId: string): void {
    // 简化实现
  }

  verifyOAuthState(__state: string): string | null {
    return null;
  }

  async getUserInfoByCode(_code: string): Promise<OAuthUserInfo | null> {
    return null;
  }

  getUserInfo(openId: string): OAuthUserInfo | null {
    return { openId };
  }

  createEventReminder(_reminder: EventReminder): boolean {
    return true;
  }

  cancelEventReminder(_eventId: string): boolean {
    return true;
  }

  getEventReminders(): EventReminder[] {
    return [];
  }

  getConfig(): FeishuIntegrationConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<FeishuIntegrationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  reset(): void {
    // 清理状态
  }
}

export const feishuIntegration = FeishuIntegration.getInstance();
