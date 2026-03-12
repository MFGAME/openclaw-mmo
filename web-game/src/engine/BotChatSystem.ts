/**
 * 机器人聊天系统
 *
 * 功能：
 * - 机器人自动聊天回复
 * - 基于性格的聊天风格
 * - 上下文感知的对话
 * - 常用语和特殊对话
 */

import { BotPersonality } from '../bot/BotManager.js';

/**
 * 聊天触发类型
 */
export enum ChatTrigger {
  /** 遇见玩家 */
  MEET_PLAYER = 'meet_player',
  /** 战斗开始 */
  BATTLE_START = 'battle_start',
  /** 战斗胜利 */
  BATTLE_WIN = 'battle_win',
  /** 战斗失败 */
  BATTLE_LOSE = 'battle_lose',
  /** 升级 */
  LEVEL_UP = 'level_up',
  /** 进化 */
  EVOLVE = 'evolve',
  /** 被挑战 */
  CHALLENGED = 'challenged',
  /** 休闲对话 */
  CASUAL = 'casual',
  /** 拒绝挑战 */
  DECLINE = 'decline',
  /** 道别 */
  GOODBYE = 'goodbye',
}

/**
 * 聊天消息接口
 */
export interface ChatMessage {
  /** 触发类型 */
  trigger: ChatTrigger;
  /** 机器人性格（可选，用于内部标识） */
  personality?: BotPersonality;
  /** 消息列表 */
  messages: string[];
}

/**
 * 聊天结果接口
 */
export interface ChatResult {
  /** 机器人 ID */
  botId: string;
  /** 机器人名称 */
  botName: string;
  /** 消息内容 */
  message: string;
  /** 消息类型 */
  type: ChatTrigger;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 聊天历史记录
 */
interface ChatHistory {
  /** 最近发送的消息 */
  recentMessages: string[];
  /** 消息计数器 */
  messageCount: number;
}

/**
 * 机器人聊天系统类
 * 单例模式
 */
export class BotChatSystem {
  private static instance: BotChatSystem;

  /** 聊天消息库 */
  private chatMessages: Map<string, ChatMessage[]> = new Map();

  /** 聊天历史记录 */
  private chatHistory: Map<string, ChatHistory> = new Map();

  /** 最大历史记录数量 */
  private readonly MAX_HISTORY_SIZE = 10;

  /** 消息发送冷却时间（毫秒） */
  private readonly MESSAGE_COOLDOWN = 5000;

  /** 是否已初始化 */
  private initialized = false;

  /**
   * 私有构造函数，确保单例
   */
  private constructor() {}

  /**
   * 获取机器人聊天系统单例实例
   */
  static getInstance(): BotChatSystem {
    if (!BotChatSystem.instance) {
      BotChatSystem.instance = new BotChatSystem();
    }
    return BotChatSystem.instance;
  }

  /**
   * 初始化机器人聊天系统
   */
  initialize(): void {
    if (this.initialized) {
      console.warn('[BotChatSystem] 已经初始化');
      return;
    }

    this.initChatMessages();
    this.initialized = true;
    console.log('[BotChatSystem] 机器人聊天系统已初始化');
  }

  /**
   * 初始化聊天消息库
   */
  private initChatMessages(): void {
    // 激进型对话
    this.addChatMessages('aggressive', [
      {
        trigger: ChatTrigger.MEET_PLAYER,
        messages: [
          '你看起来很弱嘛！',
          '来决斗吧！',
          '哼，让我看看你的实力！',
        ],
      },
      {
        trigger: ChatTrigger.BATTLE_START,
        messages: [
          '我会给你上一课的！',
          '准备好接受失败吧！',
          '我的怪物会摧毁你！',
        ],
      },
      {
        trigger: ChatTrigger.BATTLE_WIN,
        messages: [
          '太弱了！',
          '这就是实力的差距！',
          '再来挑战我吧，哈哈！',
        ],
      },
      {
        trigger: ChatTrigger.BATTLE_LOSE,
        messages: [
          '怎么可能...！',
          '下次我绝对不会输！',
          '这不算数！',
        ],
      },
      {
        trigger: ChatTrigger.CHALLENGED,
        messages: [
          '好啊，来吧！',
          '你会后悔的！',
          '正合我意！',
        ],
      },
      {
        trigger: ChatTrigger.DECLINE,
        messages: [
          '哼，胆小鬼！',
          '怕了吗？',
          '没意思...',
        ],
      },
    ]);

    // 辅助型对话
    this.addChatMessages('supportive', [
      {
        trigger: ChatTrigger.MEET_PLAYER,
        messages: [
          '你好！很高兴见到你！',
          '你需要帮助吗？',
          '一起冒险吧！',
        ],
      },
      {
        trigger: ChatTrigger.BATTLE_START,
        messages: [
          '我会尽全力战斗的！',
          '让我来保护你！',
          '加油！',
        ],
      },
      {
        trigger: ChatTrigger.BATTLE_WIN,
        messages: [
          '我们做得很好！',
          '继续保持！',
          '团队合作是最重要的！',
        ],
      },
      {
        trigger: ChatTrigger.BATTLE_LOSE,
        messages: [
          '对不起，我让你失望了...',
          '下次一定会赢回来的！',
          '我会更努力的！',
        ],
      },
      {
        trigger: ChatTrigger.CHALLENGED,
        messages: [
          '嗯...可以试试',
          '我不会让你受伤的',
          '我会小心的',
        ],
      },
    ]);

    // 收集型对话
    this.addChatMessages('collector', [
      {
        trigger: ChatTrigger.MEET_PLAYER,
        messages: [
          '你看到什么稀有物品了吗？',
          '这里应该有宝贝...',
          '我在收集道具呢',
        ],
      },
      {
        trigger: ChatTrigger.BATTLE_START,
        messages: [
          '别打扰我收集！',
          '快点结束吧',
          '我要赶路！',
        ],
      },
      {
        trigger: ChatTrigger.BATTLE_WIN,
        messages: [
          '不错，我可以继续收集了',
          '快让开',
          '还有好多地方要探索呢',
        ],
      },
      {
        trigger: ChatTrigger.BATTLE_LOSE,
        messages: [
          '啊...我的道具！',
          '好吧，下次小心点',
          '我还会回来的',
        ],
      },
      {
        trigger: ChatTrigger.CHALLENGED,
        messages: [
          '我现在很忙',
          '也许下次吧',
          '我没空陪你玩',
        ],
      },
      {
        trigger: ChatTrigger.CASUAL,
        messages: [
          '你有什么稀有道具吗？',
          '知道哪里有好东西吗？',
          '我可以给你一些我的收集',
        ],
      },
    ]);

    // 平衡型对话
    this.addChatMessages('balanced', [
      {
        trigger: ChatTrigger.MEET_PLAYER,
        messages: [
          '你好，旅行者',
          '今天天气不错',
          '在冒险吗？',
        ],
      },
      {
        trigger: ChatTrigger.BATTLE_START,
        messages: [
          '好吧，来一场公平的对决',
          '我会认真对待的',
          '让你见识一下我的实力',
        ],
      },
      {
        trigger: ChatTrigger.BATTLE_WIN,
        messages: [
          '不错的战斗',
          '你很有潜力',
          '期待下次再战',
        ],
      },
      {
        trigger: ChatTrigger.BATTLE_LOSE,
        messages: [
          '你很强',
          '我学到了很多',
          '下次我会更强',
        ],
      },
      {
        trigger: ChatTrigger.LEVEL_UP,
        messages: [
          '我的等级提升了！',
          '又变强了呢',
          '继续努力！',
        ],
      },
      {
        trigger: ChatTrigger.EVOLVE,
        messages: [
          '我进化了！好兴奋！',
          '新的形态！',
          '感觉力量涌上来了！',
        ],
      },
      {
        trigger: ChatTrigger.CHALLENGED,
        messages: [
          '好的，接受挑战',
          '来吧',
          '正好想测试一下',
        ],
      },
      {
        trigger: ChatTrigger.GOODBYE,
        messages: [
          '下次再见！',
          '一路顺风',
          '保重',
        ],
      },
    ]);

    // 友好型对话
    this.addChatMessages('friendly', [
      {
        trigger: ChatTrigger.MEET_PLAYER,
        messages: [
          '嗨！很高兴认识你！',
          '你好呀！新朋友',
          '我们要成为好朋友！',
        ],
      },
      {
        trigger: ChatTrigger.BATTLE_START,
        messages: [
          '我们一定要友好地战斗哦',
          '别受伤了！',
          '我会保护你的',
        ],
      },
      {
        trigger: ChatTrigger.BATTLE_WIN,
        messages: [
          '抱歉让你受伤了...',
          '我们做朋友吧！',
          '要不要一起去冒险？',
        ],
      },
      {
        trigger: ChatTrigger.BATTLE_LOSE,
        messages: [
          '哇，你太厉害了！',
          '教教我吧！',
          '我想和你做朋友',
        ],
      },
      {
        trigger: ChatTrigger.CASUAL,
        messages: [
          '今天的冒险真有趣',
          '你喜欢冒险吗？',
          '你是个好人！',
        ],
      },
      {
        trigger: ChatTrigger.GOODBYE,
        messages: [
          '再见！要再见面哦',
          '想我了就来找我',
          '记得给我带礼物！',
        ],
      },
    ]);

    console.log('[BotChatSystem] 聊天消息库已初始化');
  }

  /**
   * 添加聊天消息
   */
  private addChatMessages(personalityKey: string, messages: ChatMessage[]): void {
    const existing = this.chatMessages.get(personalityKey) || [];
    this.chatMessages.set(personalityKey, [...existing, ...messages]);
  }

  /**
   * 获取性格对应的键
   */
  private getPersonalityKey(personality: BotPersonality): string {
    switch (personality) {
      case BotPersonality.AGGRESSIVE:
        return 'aggressive';
      case BotPersonality.SUPPORTIVE:
        return 'supportive';
      case BotPersonality.COLLECTOR:
        return 'collector';
      case BotPersonality.BALANCED:
        return 'balanced';
      case BotPersonality.FRIENDLY:
        return 'friendly';
      default:
        return 'balanced';
    }
  }

  /**
   * 生成聊天消息
   * @param botId 机器人 ID
   * @param botName 机器人名称
   * @param personality 机器人性格
   * @param trigger 触发类型
   * @returns 聊天结果
   */
  generateChat(
    botId: string,
    botName: string,
    personality: BotPersonality,
    trigger: ChatTrigger
  ): ChatResult | null {
    // 检查冷却
    if (!this.canSendMessage(botId)) {
      return null;
    }

    const key = this.getPersonalityKey(personality);
    const messages = this.chatMessages.get(key);
    if (!messages) {
      return null;
    }

    // 查找对应触发的消息
    const triggerMessages = messages.find(m => m.trigger === trigger);
    if (!triggerMessages || triggerMessages.messages.length === 0) {
      return null;
    }

    // 随机选择一条消息
    const message = this.getRandomMessage(triggerMessages.messages);

    // 记录消息历史
    this.recordMessage(botId, message);

    console.log(`[BotChatSystem] ${botName} (${personality}): ${message}`);

    return {
      botId,
      botName,
      message,
      type: trigger,
      timestamp: Date.now(),
    };
  }

  /**
   * 获取随机消息
   */
  private getRandomMessage(messages: string[]): string {
    return messages[Math.floor(Math.random() * messages.length)];
  }

  /**
   * 检查是否可以发送消息
   */
  private canSendMessage(botId: string): boolean {
    const history = this.chatHistory.get(botId);
    if (!history) return true;

    const now = Date.now();
    const timeSinceLastMessage = now - this.getLastMessageTime(botId);

    return timeSinceLastMessage >= this.MESSAGE_COOLDOWN;
  }

  /**
   * 获取最后一条消息的时间
   */
  private getLastMessageTime(botId: string): number {
    const history = this.chatHistory.get(botId);
    if (!history || history.recentMessages.length === 0) return 0;

    // 简化：返回时间戳的最后部分（假设存储的是消息本身）
    // 实际应该存储时间戳
    return history.messageCount * this.MESSAGE_COOLDOWN;
  }

  /**
   * 记录消息
   */
  private recordMessage(botId: string, message: string): void {
    const history = this.chatHistory.get(botId);
    if (!history) {
      this.chatHistory.set(botId, {
        recentMessages: [message],
        messageCount: 1,
      });
      return;
    }

    history.recentMessages.push(message);
    history.messageCount++;

    // 限制历史记录大小
    if (history.recentMessages.length > this.MAX_HISTORY_SIZE) {
      history.recentMessages.shift();
    }

    this.chatHistory.set(botId, history);
  }

  /**
   * 获取聊天历史
   * @param botId 机器人 ID
   * @returns 聊天历史
   */
  getChatHistory(botId: string): string[] {
    const history = this.chatHistory.get(botId);
    return history ? history.recentMessages : [];
  }

  /**
   * 清空聊天历史
   * @param botId 机器人 ID
   */
  clearChatHistory(botId: string): void {
    this.chatHistory.delete(botId);
  }

  /**
   * 重置系统
   */
  reset(): void {
    this.chatMessages.clear();
    this.chatHistory.clear();
    this.initialized = false;
    console.log('[BotChatSystem] 聊天系统已重置');
  }
}

/**
 * 导出机器人聊天系统单例
 */
export const botChatSystem = BotChatSystem.getInstance();
