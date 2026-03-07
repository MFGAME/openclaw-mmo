/**
 * NPC 数据接口和加载器
 *
 * 基于 Tuxemon 的 NPC 数据结构
 */

/**
 * NPC 行为类型枚举
 */
export enum NPCBehavior {
  /** 静止（不移动） */
  STATIC = 'static',
  /** 随机游走 */
  WANDER = 'wander',
  /** 循环路径 */
  PATROL = 'patrol',
  /** 跟随玩家 */
  FOLLOW = 'follow',
  /** 逃跑 */
  FLEE = 'flee',
}

/**
 * NPC 交互类型枚举
 */
export enum NPCInteractionType {
  /** 对话 */
  DIALOGUE = 'dialogue',
  /** 商店 */
  SHOP = 'shop',
  /** 任务 */
  QUEST = 'quest',
  /** 治疗 */
  HEAL = 'heal',
  /** 传送 */
  TELEPORT = 'teleport',
}

/**
 * NPC 数据接口
 */
export interface NPCData {
  /** NPC ID */
  slug: string;
  /** NPC 名称 */
  name: string;
  /** 精灵图名称 */
  spriteName: string;
  /** 战斗精灵图 */
  combatSheet: string;
  /** 职业/类型 */
  type: string;
  /** 对话配置 */
  speech: NPCSpeechConfig;
  /** 战斗配置 */
  combat: NPCCombatConfig;
  /** 音频配置 */
  audio: NPCAudioConfig;
  /** 模板配置 */
  template: NPCTemplate;
}

/**
 * NPC 对话配置
 */
export interface NPCSpeechConfig {
  profile: {
    [key: string]: {
      [key: string]: any;
    };
  };
}

/**
 * NPC 战斗配置
 */
export interface NPCCombatConfig {
  [key: string]: any;
}

/**
 * NPC 音频配置
 */
export interface NPCAudioConfig {
  [key: string]: any;
}

/**
 * NPC 模板配置
 */
export interface NPCTemplate {
  sprite_name: string;
  combat_sheet: string;
  slug: string;
}

/**
 * NPC 数据加载器
 */
export class NPCDataLoader {
  private static instance: NPCDataLoader;

  /** NPC 数据缓存 */
  private npcCache: Map<string, NPCData> = new Map();

  /** 是否已加载 */
  private loaded: boolean = false;

  /**
   * 私有构造函数
   */
  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): NPCDataLoader {
    if (!NPCDataLoader.instance) {
      NPCDataLoader.instance = new NPCDataLoader();
    }
    return NPCDataLoader.instance;
  }

  /**
   * 加载 NPC 数据
   */
  async loadNPCs(_dataUrl?: string): Promise<void> {
    if (this.loaded) return;

    try {
      // 加载 Tuxemon NPC 数据
      await this.loadTuxemonNPCs();
    } catch (error) {
      console.error('[NPCDataLoader] Failed to load Tuxemon NPCs:', error);
      // 加载示例数据作为备用
      this.loadExampleNPCs();
    }
  }

  /**
   * 加载 Tuxemon NPC 数据
   */
  private async loadTuxemonNPCs(): Promise<void> {
    // 获取所有 NPC 文件列表
    const npcFiles = await this.getNPCFileList();

    // 加载每个 NPC 的详细数据
    for (const slug of npcFiles) {
      try {
        const response = await fetch(`/assets/tuxemon/npcs/${slug}.json`);
        if (response.ok) {
          const data = await response.json();
          this.npcCache.set(slug, this.createNPCDataFromRaw(slug, data));
        }
      } catch (e) {
        console.warn(`[NPCDataLoader] Failed to load ${slug}:`, e);
      }
    }

    this.loaded = true;
    console.log(`[NPCDataLoader] Loaded ${this.npcCache.size} NPCs from Tuxemon data`);
  }

  /**
   * 从原始数据创建 NPCData 对象
   */
  private createNPCDataFromRaw(slug: string, data: any): NPCData {
    return {
      slug: slug,
      name: slug, // 使用 slug 作为名称，后续可以从 sprite_name 推导
      spriteName: data.template?.sprite_name || slug,
      combatSheet: data.template?.combat_sheet || 'npc',
      type: data.template?.slug || 'npc',
      speech: data.speech || { profile: { default: {} } },
      combat: data.combat || {},
      audio: data.audio || {},
      template: data.template || {
        sprite_name: slug,
        combat_sheet: 'npc',
        slug: 'npc'
      }
    };
  }

  /**
   * 获取 NPC 文件列表
   */
  private async getNPCFileList(): Promise<string[]> {
    // 从实际的 NPC 文件中获取列表
    // Tuxemon 已知的 NPC 列表
    const knownNPCs = [
      '37707_female', '37707_female_missing', '37707_male', '37707_male_missing',
      'aeble', 'allie', 'azure_npcs', 'bob', 'callie_wren', 'christie',
      'conworker1', 'conworker2', 'conworker3', 'cotton_breeder', 'cotton_misa_bro',
      'cotton_misa_gramps', 'eclipse_bank_npcs', 'eclipse_crystal_town_npcs',
      'eclipse_lion_mountain_npcs', 'eclipse_park_npcs', 'eclipse_route7_npcs',
      'grace', 'happy_guy', 'kay_wren', 'knight1', 'knight2', 'knight3', 'knight4',
      'kyle', 'liela', 'npc_village1', 'npc_village2', 'npc_village3', 'npc_village4',
      'npc_village5', 'npc_village6', 'npc_village7', 'npc_village8', 'npc_village9',
      'npc_village10', 'npc_village11', 'npc_village12', 'npc_village13', 'npc_village14',
      'npc_village15', 'npc_village16', 'npc_village17', 'npc_village18', 'npc_village19',
      'npc_village20', 'npc_village21', 'npc_village22', 'npc_village23', 'npc_village24',
      'npc_village25', 'npc_village26', 'npc_village27', 'npc_village28', 'npc_village29',
      'npc_village30', 'npc_village31', 'npc_village32', 'npc_village33', 'npc_village34',
      'npc_village35', 'npc_village36', 'npc_village37', 'npc_village38', 'npc_village39',
      'npc_village40', 'npc_village41', 'npc_village42', 'npc_village43', 'npc_village44',
      'npc_village45', 'npc_village46', 'npc_village47', 'npc_village48', 'npc_village49',
      'npc_village50', 'npc_village51', 'npc_village52', 'npc_village53', 'npc_village54',
      'npc_village55', 'npc_village56', 'npc_village57', 'npc_village58', 'npc_village59',
      'npc_village60', 'npc_village61', 'npc_village62', 'npc_village63', 'npc_village64',
      'npc_village65', 'npc_village66', 'npc_village67', 'npc_village68', 'npc_village69',
      'npc_village70', 'npc_village71', 'npc_village72', 'npc_village73', 'npc_village74',
      'npc_village75', 'npc_village76', 'npc_village77', 'npc_village78', 'npc_village79',
      'npc_village80', 'npc_village81', 'npc_village82', 'npc_village83', 'npc_village84',
      'npc_village85', 'npc_village86', 'npc_village87', 'npc_village88', 'npc_village89',
      'npc_village90', 'npc_village91', 'npc_village92', 'npc_village93', 'npc_village94',
      'npc_village95', 'npc_village96', 'npc_village97', 'npc_village98', 'npc_village99',
      'npc_village100', 'shopkeeper1', 'shopkeeper2', 'shopkeeper3', 'trainer1',
      'trainer2', 'trainer3', 'trainer4', 'trainer5', 'trainer6', 'villager1',
      'villager2', 'villager3', 'villager4', 'villager5', 'villager6', 'villager7',
      'villager8', 'villager9', 'villager10', 'villager11', 'villager12', 'villager13',
      'villager14', 'villager15', 'villager16', 'villager17', 'villager18', 'villager19',
      'villager20'
    ];

    return knownNPCs;
  }

  /**
   * 加载示例 NPC 数据
   */
  private loadExampleNPCs(): void {
    const exampleNPCs: Record<string, NPCData> = {
      'villager1': {
        slug: 'villager1',
        name: 'Village Elder',
        spriteName: 'bob',
        combatSheet: 'adventurer',
        type: 'npc',
        speech: { profile: { default: {} } },
        combat: {},
        audio: {},
        template: {
          sprite_name: 'bob',
          combat_sheet: 'adventurer',
          slug: 'npc'
        }
      },
      'shopkeeper1': {
        slug: 'shopkeeper1',
        name: 'Shopkeeper',
        spriteName: 'cooldude',
        combatSheet: 'cooldude',
        type: 'shopkeeper',
        speech: { profile: { default: {} } },
        combat: {},
        audio: {},
        template: {
          sprite_name: 'cooldude',
          combat_sheet: 'cooldude',
          slug: 'shopkeeper'
        }
      },
      'trainer1': {
        slug: 'trainer1',
        name: 'Rival Trainer',
        spriteName: 'omnichannelallie',
        combatSheet: 'goth_rose',
        type: 'trainer',
        speech: { profile: { default: {} } },
        combat: {},
        audio: {},
        template: {
          sprite_name: 'omnichannelallie',
          combat_sheet: 'goth_rose',
          slug: 'heroine'
        }
      },
      'knight1': {
        slug: 'knight1',
        name: 'Guard Knight',
        spriteName: 'cooldude',
        combatSheet: 'cooldude',
        type: 'guard',
        speech: { profile: { default: {} } },
        combat: {},
        audio: {},
        template: {
          sprite_name: 'cooldude',
          combat_sheet: 'cooldude',
          slug: 'guard'
        }
      },
    };

    for (const [slug, npc] of Object.entries(exampleNPCs)) {
      this.npcCache.set(slug, npc);
    }

    this.loaded = true;
    console.log(`[NPCDataLoader] Loaded ${this.npcCache.size} example NPCs`);
  }

  /**
   * 获取 NPC 数据
   */
  getNPC(slug: string): NPCData | null {
    return this.npcCache.get(slug) || null;
  }

  /**
   * 获取所有 NPC
   */
  getAllNPCs(): NPCData[] {
    return Array.from(this.npcCache.values());
  }

  /**
   * 获取指定类型的 NPC
   */
  getNPCsByType(type: string): NPCData[] {
    return this.getAllNPCs().filter(npc => npc.type === type);
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.npcCache.clear();
    this.loaded = false;
  }
}

/**
 * 导出单例
 */
export const npcDataLoader = NPCDataLoader.getInstance();
