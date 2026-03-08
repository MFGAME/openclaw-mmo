/**
 * 音效加载器
 *
 * 负责从 assets/tuxemon/sounds/ 加载 Tuxemon 原版音效资源
 * 提供音效播放接口，音效优先级管理，音量控制和分组
 */

import { audioManager, SFXPriority, SFXOptions } from './AudioManager';

/**
 * 音效分组
 */
export enum SoundGroup {
  /** 战斗音效 */
  BATTLE = 'battle',
  /** 菜单音效 */
  MENU = 'menu',
  /** 技能音效 */
  TECHNIQUE = 'technique',
  /** 环境音效 */
  ENVIRONMENT = 'environment',
  /** UI 音效 */
  UI = 'ui',
  /** 状态音效 */
  STATUS = 'status',
}

/**
 * 音效类型（战斗基础）
 */
export enum SoundType {
  /** 普通攻击 */
  ATTACK = 'attack',
  /** 伤害 */
  DAMAGE = 'damage',
  /** 治疗 */
  HEAL = 'heal',
  /** 状态效果 */
  STATUS = 'status',
  /** 升级 */
  LEVEL_UP = 'level_up',
  /** 胜利 */
  VICTORY = 'victory',
  /** 失败 */
  DEFEAT = 'defeat',
  /** 怪物出现 */
  MONSTER_APPEAR = 'monster_appear',
  /** 怪物倒下 */
  MONSTER_FAINT = 'monster_faint',
  /** 捕捉成功 */
  CATCH_SUCCESS = 'catch_success',
  /** 捕捉失败 */
  CATCH_FAIL = 'catch_fail',
}

/**
 * 菜单音效类型
 */
export enum MenuSoundType {
  /** 菜单选择 */
  SELECT = 'menu_select',
  /** 菜单确认 */
  CONFIRM = 'menu_confirm',
  /** 菜单取消 */
  CANCEL = 'menu_cancel',
  /** 错误 */
  ERROR = 'error',
}

/**
 * 技能属性音效类型
 */
export enum ElementSoundType {
  /** 火 */
  FIRE = 'element_fire',
  /** 水 */
  WATER = 'element_water',
  /** 草 */
  GRASS = 'element_grass',
  /** 电 */
  ELECTRIC = 'element_electric',
  /** 冰 */
  ICE = 'element_ice',
  /** 飞行 */
  FLYING = 'element_flying',
  /** 格斗 */
  FIGHTING = 'element_fighting',
  /** 毒 */
  POISON = 'element_poison',
  /** 地面 */
  GROUND = 'element_ground',
  /** 岩石 */
  ROCK = 'element_rock',
  /** 虫 */
  BUG = 'element_bug',
  /** 幽灵 */
  GHOST = 'element_ghost',
  /** 钢 */
  STEEL = 'element_steel',
  /** 龙 */
  DRAGON = 'element_dragon',
  /** 恶 */
  DARK = 'element_dark',
  /** 妖精 */
  FAIRY = 'element_fairy',
  /** 一般 */
  NORMAL = 'element_normal',
}

/**
 * 音效信息接口
 */
export interface SoundInfo {
  /** 音效 ID */
  id: string;
  /** 音效分组 */
  group: SoundGroup;
  /** 文件名（不含扩展名） */
  filename: string;
  /** 音效名称 */
  name: string;
  /** 描述 */
  description: string;
  /** 默认优先级 */
  priority: SFXPriority;
  /** 音量倍率 */
  volumeMultiplier: number;
}

/**
 * 音效加载器配置
 */
export interface SoundLoaderConfig {
  /** 音效文件基础路径 */
  soundsPath: string;
  /** 音量分组设置 */
  groupVolumes: Map<SoundGroup, number>;
  /** 最大并发音效数 */
  maxConcurrentSFX: number;
}

/**
 * 分组音效映射
 */
interface GroupSoundMapping {
  [group: string]: string[];
}

/**
 * 音效加载器类
 */
export class SoundLoader {
  private static instance: SoundLoader;

  /** 音效信息缓存 */
  private soundInfoCache: Map<string, SoundInfo> = new Map();

  /** 分组音效映射 */
  private groupMapping: GroupSoundMapping = {};

  /** 分组音量 */
  private groupVolumes: Map<SoundGroup, number>;

  /** 配置 */
  private _config: SoundLoaderConfig;

  /** 获取配置 */
  public get config(): SoundLoaderConfig {
    return this._config;
  }

  /** 是否已初始化 */
  private initialized: boolean = false;

  /**
   * 私有构造函数
   */
  private constructor(config?: Partial<SoundLoaderConfig>) {
    this.groupVolumes = new Map([
      [SoundGroup.BATTLE, 1.0],
      [SoundGroup.MENU, 0.8],
      [SoundGroup.TECHNIQUE, 1.0],
      [SoundGroup.ENVIRONMENT, 0.6],
      [SoundGroup.UI, 0.7],
      [SoundGroup.STATUS, 0.9],
    ]);

    this._config = {
      soundsPath: '/assets/tuxemon/sounds/',
      groupVolumes: this.groupVolumes,
      maxConcurrentSFX: 10,
      ...config,
    };
  }

  /**
   * 获取单例实例
   */
  static getInstance(config?: Partial<SoundLoaderConfig>): SoundLoader {
    if (!SoundLoader.instance) {
      SoundLoader.instance = new SoundLoader(config);
    }
    return SoundLoader.instance;
  }

  /**
   * 初始化音效加载器
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('[SoundLoader] 初始化音效加载器...');

    // 确保音频管理器已初始化
    await audioManager.initialize();

    // 加载音效信息
    await this.loadSoundInfo();

    // 构建分组映射
    this.buildGroupMapping();

    this.initialized = true;
    console.log('[SoundLoader] 音效加载器初始化完成');
  }

  /**
   * 加载音效信息
   */
  private async loadSoundInfo(): Promise<void> {
    console.log('[SoundLoader] 加载音效信息...');

    // Tuxemon 原版音效列表
    const soundList = this.getSoundList();

    for (const sound of soundList) {
      this.soundInfoCache.set(sound.id, sound);
    }

    console.log(`[SoundLoader] 音效信息加载完成: ${soundList.length} 个音效`);
  }

  /**
   * 构建分组映射
   */
  private buildGroupMapping(): void {
    this.groupMapping = {
      [SoundGroup.BATTLE]: [
        'attack', 'damage', 'heal', 'level_up', 'monster_appear', 'monster_faint',
        'catch_success', 'catch_fail', 'victory', 'defeat',
      ],
      [SoundGroup.MENU]: [
        'menu_select', 'menu_confirm', 'menu_cancel', 'error',
      ],
      [SoundGroup.TECHNIQUE]: [
        'element_fire', 'element_water', 'element_grass', 'element_electric',
        'element_ice', 'element_flying', 'element_fighting', 'element_poison',
        'element_ground', 'element_rock', 'element_bug', 'element_ghost',
        'element_steel', 'element_dragon', 'element_dark', 'element_fairy',
        'element_normal',
      ],
      [SoundGroup.ENVIRONMENT]: [
        'footstep', 'water_splash', 'door_open', 'door_close',
      ],
      [SoundGroup.UI]: [
        'notification', 'alert', 'success',
      ],
      [SoundGroup.STATUS]: [
        'status_poison', 'status_burn', 'status_paralyze', 'status_frozen',
        'status_sleep', 'status_confusion', 'status_cure',
      ],
    };
  }

  /**
   * 获取音效列表
   */
  private getSoundList(): SoundInfo[] {
    return [
      // 战斗基础音效
      {
        id: 'attack',
        group: SoundGroup.BATTLE,
        filename: 'attack',
        name: 'Attack',
        description: '普通攻击音效',
        priority: SFXPriority.MEDIUM,
        volumeMultiplier: 1.0,
      },
      {
        id: 'damage',
        group: SoundGroup.BATTLE,
        filename: 'damage',
        name: 'Damage',
        description: '受到伤害音效',
        priority: SFXPriority.HIGH,
        volumeMultiplier: 1.0,
      },
      {
        id: 'heal',
        group: SoundGroup.BATTLE,
        filename: 'heal',
        name: 'Heal',
        description: '恢复生命值音效',
        priority: SFXPriority.MEDIUM,
        volumeMultiplier: 0.9,
      },
      {
        id: 'level_up',
        group: SoundGroup.BATTLE,
        filename: 'level_up',
        name: 'Level Up',
        description: '升级音效',
        priority: SFXPriority.HIGH,
        volumeMultiplier: 1.0,
      },
      {
        id: 'monster_appear',
        group: SoundGroup.BATTLE,
        filename: 'monster_appear',
        name: 'Monster Appear',
        description: '怪物出现音效',
        priority: SFXPriority.HIGH,
        volumeMultiplier: 1.0,
      },
      {
        id: 'monster_faint',
        group: SoundGroup.BATTLE,
        filename: 'monster_faint',
        name: 'Monster Faint',
        description: '怪物倒下音效',
        priority: SFXPriority.HIGH,
        volumeMultiplier: 1.0,
      },
      {
        id: 'catch_success',
        group: SoundGroup.BATTLE,
        filename: 'catch_success',
        name: 'Catch Success',
        description: '捕捉成功音效',
        priority: SFXPriority.CRITICAL,
        volumeMultiplier: 1.0,
      },
      {
        id: 'catch_fail',
        group: SoundGroup.BATTLE,
        filename: 'catch_fail',
        name: 'Catch Fail',
        description: '捕捉失败音效',
        priority: SFXPriority.MEDIUM,
        volumeMultiplier: 0.8,
      },
      {
        id: 'victory',
        group: SoundGroup.BATTLE,
        filename: 'victory',
        name: 'Victory',
        description: '胜利音效',
        priority: SFXPriority.HIGH,
        volumeMultiplier: 1.0,
      },
      {
        id: 'defeat',
        group: SoundGroup.BATTLE,
        filename: 'defeat',
        name: 'Defeat',
        description: '失败音效',
        priority: SFXPriority.HIGH,
        volumeMultiplier: 1.0,
      },

      // 菜单音效
      {
        id: 'menu_select',
        group: SoundGroup.MENU,
        filename: 'menu_select',
        name: 'Menu Select',
        description: '菜单选择音效',
        priority: SFXPriority.LOW,
        volumeMultiplier: 0.8,
      },
      {
        id: 'menu_confirm',
        group: SoundGroup.MENU,
        filename: 'menu_confirm',
        name: 'Menu Confirm',
        description: '菜单确认音效',
        priority: SFXPriority.MEDIUM,
        volumeMultiplier: 0.9,
      },
      {
        id: 'menu_cancel',
        group: SoundGroup.MENU,
        filename: 'menu_cancel',
        name: 'Menu Cancel',
        description: '菜单取消音效',
        priority: SFXPriority.MEDIUM,
        volumeMultiplier: 0.9,
      },
      {
        id: 'error',
        group: SoundGroup.MENU,
        filename: 'error',
        name: 'Error',
        description: '错误音效',
        priority: SFXPriority.MEDIUM,
        volumeMultiplier: 0.8,
      },

      // 技能属性音效
      {
        id: 'element_fire',
        group: SoundGroup.TECHNIQUE,
        filename: 'element_fire',
        name: 'Fire Element',
        description: '火属性技能音效',
        priority: SFXPriority.MEDIUM,
        volumeMultiplier: 1.0,
      },
      {
        id: 'element_water',
        group: SoundGroup.TECHNIQUE,
        filename: 'element_water',
        name: 'Water Element',
        description: '水属性技能音效',
        priority: SFXPriority.MEDIUM,
        volumeMultiplier: 1.0,
      },
      {
        id: 'element_grass',
        group: SoundGroup.TECHNIQUE,
        filename: 'element_grass',
        name: 'Grass Element',
        description: '草属性技能音效',
        priority: SFXPriority.MEDIUM,
        volumeMultiplier: 1.0,
      },
      {
        id: 'element_electric',
        group: SoundGroup.TECHNIQUE,
        filename: 'element_electric',
        name: 'Electric Element',
        description: '电属性技能音效',
        priority: SFXPriority.MEDIUM,
        volumeMultiplier: 1.0,
      },
      {
        id: 'element_ice',
        group: SoundGroup.TECHNIQUE,
        filename: 'element_ice',
        name: 'Ice Element',
        description: '冰属性技能音效',
        priority: SFXPriority.MEDIUM,
        volumeMultiplier: 1.0,
      },
      {
        id: 'element_flying',
        group: SoundGroup.TECHNIQUE,
        filename: 'element_flying',
        name: 'Flying Element',
        description: '飞行属性技能音效',
        priority: SFXPriority.MEDIUM,
        volumeMultiplier: 1.0,
      },
      {
        id: 'element_fighting',
        group: SoundGroup.TECHNIQUE,
        filename: 'element_fighting',
        name: 'Fighting Element',
        description: '格斗属性技能音效',
        priority: SFXPriority.MEDIUM,
        volumeMultiplier: 1.0,
      },
      {
        id: 'element_poison',
        group: SoundGroup.TECHNIQUE,
        filename: 'element_poison',
        name: 'Poison Element',
        description: '毒属性技能音效',
        priority: SFXPriority.MEDIUM,
        volumeMultiplier: 1.0,
      },
      {
        id: 'element_ground',
        group: SoundGroup.TECHNIQUE,
        filename: 'element_ground',
        name: 'Ground Element',
        description: '地面属性技能音效',
        priority: SFXPriority.MEDIUM,
        volumeMultiplier: 1.0,
      },
      {
        id: 'element_rock',
        group: SoundGroup.TECHNIQUE,
        filename: 'element_rock',
        name: 'Rock Element',
        description: '岩石属性技能音效',
        priority: SFXPriority.MEDIUM,
        volumeMultiplier: 1.0,
      },
      {
        id: 'element_bug',
        group: SoundGroup.TECHNIQUE,
        filename: 'element_bug',
        name: 'Bug Element',
        description: '虫属性技能音效',
        priority: SFXPriority.MEDIUM,
        volumeMultiplier: 1.0,
      },
      {
        id: 'element_ghost',
        group: SoundGroup.TECHNIQUE,
        filename: 'element_ghost',
        name: 'Ghost Element',
        description: '幽灵属性技能音效',
        priority: SFXPriority.MEDIUM,
        volumeMultiplier: 1.0,
      },
      {
        id: 'element_steel',
        group: SoundGroup.TECHNIQUE,
        filename: 'element_steel',
        name: 'Steel Element',
        description: '钢属性技能音效',
        priority: SFXPriority.MEDIUM,
        volumeMultiplier: 1.0,
      },
      {
        id: 'element_dragon',
        group: SoundGroup.TECHNIQUE,
        filename: 'element_dragon',
        name: 'Dragon Element',
        description: '龙属性技能音效',
        priority: SFXPriority.MEDIUM,
        volumeMultiplier: 1.0,
      },
      {
        id: 'element_dark',
        group: SoundGroup.TECHNIQUE,
        filename: 'element_dark',
        name: 'Dark Element',
        description: '恶属性技能音效',
        priority: SFXPriority.MEDIUM,
        volumeMultiplier: 1.0,
      },
      {
        id: 'element_fairy',
        group: SoundGroup.TECHNIQUE,
        filename: 'element_fairy',
        name: 'Fairy Element',
        description: '妖精属性技能音效',
        priority: SFXPriority.MEDIUM,
        volumeMultiplier: 1.0,
      },
      {
        id: 'element_normal',
        group: SoundGroup.TECHNIQUE,
        filename: 'element_normal',
        name: 'Normal Element',
        description: '一般属性技能音效',
        priority: SFXPriority.MEDIUM,
        volumeMultiplier: 1.0,
      },

      // 环境音效
      {
        id: 'footstep',
        group: SoundGroup.ENVIRONMENT,
        filename: 'footstep',
        name: 'Footstep',
        description: '脚步声',
        priority: SFXPriority.LOW,
        volumeMultiplier: 0.6,
      },
      {
        id: 'water_splash',
        group: SoundGroup.ENVIRONMENT,
        filename: 'water_splash',
        name: 'Water Splash',
        description: '水花声',
        priority: SFXPriority.MEDIUM,
        volumeMultiplier: 0.8,
      },
      {
        id: 'door_open',
        group: SoundGroup.ENVIRONMENT,
        filename: 'door_open',
        name: 'Door Open',
        description: '开门声',
        priority: SFXPriority.MEDIUM,
        volumeMultiplier: 0.8,
      },
      {
        id: 'door_close',
        group: SoundGroup.ENVIRONMENT,
        filename: 'door_close',
        name: 'Door Close',
        description: '关门声',
        priority: SFXPriority.MEDIUM,
        volumeMultiplier: 0.8,
      },

      // UI 音效
      {
        id: 'notification',
        group: SoundGroup.UI,
        filename: 'notification',
        name: 'Notification',
        description: '通知音效',
        priority: SFXPriority.MEDIUM,
        volumeMultiplier: 0.7,
      },
      {
        id: 'alert',
        group: SoundGroup.UI,
        filename: 'alert',
        name: 'Alert',
        description: '警报音效',
        priority: SFXPriority.HIGH,
        volumeMultiplier: 0.8,
      },
      {
        id: 'success',
        group: SoundGroup.UI,
        filename: 'success',
        name: 'Success',
        description: '成功音效',
        priority: SFXPriority.MEDIUM,
        volumeMultiplier: 0.8,
      },

      // 状态音效
      {
        id: 'status_poison',
        group: SoundGroup.STATUS,
        filename: 'status_poison',
        name: 'Poison Status',
        description: '中毒状态音效',
        priority: SFXPriority.MEDIUM,
        volumeMultiplier: 0.9,
      },
      {
        id: 'status_burn',
        group: SoundGroup.STATUS,
        filename: 'status_burn',
        name: 'Burn Status',
        description: '烧伤状态音效',
        priority: SFXPriority.MEDIUM,
        volumeMultiplier: 0.9,
      },
      {
        id: 'status_paralyze',
        group: SoundGroup.STATUS,
        filename: 'status_paralyze',
        name: 'Paralyze Status',
        description: '麻痹状态音效',
        priority: SFXPriority.MEDIUM,
        volumeMultiplier: 0.9,
      },
      {
        id: 'status_frozen',
        group: SoundGroup.STATUS,
        filename: 'status_frozen',
        name: 'Frozen Status',
        description: '冰冻状态音效',
        priority: SFXPriority.MEDIUM,
        volumeMultiplier: 0.9,
      },
      {
        id: 'status_sleep',
        group: SoundGroup.STATUS,
        filename: 'status_sleep',
        name: 'Sleep Status',
        description: '睡眠状态音效',
        priority: SFXPriority.MEDIUM,
        volumeMultiplier: 0.9,
      },
      {
        id: 'status_confusion',
        group: SoundGroup.STATUS,
        filename: 'status_confusion',
        name: 'Confusion Status',
        description: '混乱状态音效',
        priority: SFXPriority.MEDIUM,
        volumeMultiplier: 0.9,
      },
      {
        id: 'status_cure',
        group: SoundGroup.STATUS,
        filename: 'status_cure',
        name: 'Status Cure',
        description: '状态治愈音效',
        priority: SFXPriority.MEDIUM,
        volumeMultiplier: 0.9,
      },
    ];
  }

  /**
   * 播放音效
   * @param soundId 音效 ID
   * @param options 播放选项
   */
  async play(soundId: string, options?: SFXOptions): Promise<void> {
    if (!this.initialized) {
      console.warn('[SoundLoader] 加载器未初始化，请先调用 initialize()');
      return;
    }

    const soundInfo = this.soundInfoCache.get(soundId);
    if (!soundInfo) {
      console.warn(`[SoundLoader] 音效 ${soundId} 不存在`);
      return;
    }

    // 应用分组音量
    const groupVolume = this.groupVolumes.get(soundInfo.group) || 1.0;
    const finalVolume = options?.volume
      ? options.volume * groupVolume
      : groupVolume * soundInfo.volumeMultiplier;

    // 播放音效
    await audioManager.playSFX(soundInfo.filename, {
      ...options,
      volume: finalVolume,
      priority: options?.priority ?? soundInfo.priority,
    });

    console.log(`[SoundLoader] 播放音效: ${soundInfo.name} (${soundId})`);
  }

  /**
   * 停止音效
   * @param soundId 音效 ID
   */
  stop(soundId: string): void {
    const soundInfo = this.soundInfoCache.get(soundId);
    if (soundInfo) {
      audioManager.stopSFX(soundInfo.filename);
      console.log(`[SoundLoader] 停止音效: ${soundInfo.name} (${soundId})`);
    }
  }

  /**
   * 停止分组内所有音效
   * @param group 音效分组
   */
  stopGroup(group: SoundGroup): void {
    const soundIds = this.groupMapping[group] || [];
    for (const soundId of soundIds) {
      this.stop(soundId);
    }
    console.log(`[SoundLoader] 停止分组 ${group} 的所有音效`);
  }

  /**
   * 停止所有音效
   */
  stopAll(): void {
    audioManager.stopAllSFX();
    console.log('[SoundLoader] 停止所有音效');
  }

  /**
   * 设置分组音量
   * @param group 音效分组
   * @param volume 音量 (0-1)
   */
  setGroupVolume(group: SoundGroup, volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.groupVolumes.set(group, clampedVolume);
    console.log(`[SoundLoader] 分组 ${group} 音量设置为: ${clampedVolume}`);
  }

  /**
   * 获取分组音量
   * @param group 音效分组
   */
  getGroupVolume(group: SoundGroup): number {
    return this.groupVolumes.get(group) || 1.0;
  }

  /**
   * 获取音效信息
   * @param soundId 音效 ID
   */
  getSoundInfo(soundId: string): SoundInfo | null {
    return this.soundInfoCache.get(soundId) || null;
  }

  /**
   * 获取所有音效信息
   */
  getAllSounds(): SoundInfo[] {
    return Array.from(this.soundInfoCache.values());
  }

  /**
   * 按分组获取音效
   * @param group 音效分组
   */
  getSoundsByGroup(group: SoundGroup): SoundInfo[] {
    return Array.from(this.soundInfoCache.values()).filter(sound => sound.group === group);
  }

  /**
   * 搜索音效
   * @param keyword 搜索关键词
   */
  searchSounds(keyword: string): SoundInfo[] {
    const lowerKeyword = keyword.toLowerCase();
    return Array.from(this.soundInfoCache.values()).filter(
      sound =>
        sound.name.toLowerCase().includes(lowerKeyword) ||
        sound.description.toLowerCase().includes(lowerKeyword)
    );
  }

  /**
   * 预加载音效
   * @param soundIds 音效 ID 列表
   */
  async preloadSounds(soundIds: string[]): Promise<void> {
    console.log(`[SoundLoader] 预加载 ${soundIds.length} 个音效...`);

    const promises = soundIds.map(id => {
      const soundInfo = this.soundInfoCache.get(id);
      if (soundInfo) {
        return audioManager.preloadSFX(soundInfo.filename);
      }
      return Promise.resolve();
    });

    await Promise.all(promises);
    console.log('[SoundLoader] 音效预加载完成');
  }

  /**
   * 预加载分组音效
   * @param groups 音效分组列表
   */
  async preloadGroupSounds(groups: SoundGroup[]): Promise<void> {
    const soundIds: string[] = [];

    for (const group of groups) {
      const groupSounds = this.groupMapping[group];
      if (groupSounds) {
        soundIds.push(...groupSounds);
      }
    }

    await this.preloadSounds(soundIds);
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.soundInfoCache.clear();
    this.initialized = false;
    console.log('[SoundLoader] 缓存已清除');
  }

  /**
   * 获取加载状态
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 获取当前播放音效数量
   */
  getPlayingCount(): number {
    return audioManager.getPlayingSFXCount();
  }
}

/**
 * 导出单例
 */
export const soundLoader = SoundLoader.getInstance();
