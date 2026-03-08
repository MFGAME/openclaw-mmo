/**
 * 音乐加载器
 *
 * 负责从 assets/tuxemon/music/ 加载 Tuxemon 原版背景音乐
 * 提供播放/暂停/停止/切换功能，场景音乐管理，音量控制和持久化
 */

import { audioManager } from './AudioManager';

/**
 * 音乐场景类型
 */
export enum MusicScene {
  /** 标题画面 */
  TITLE = 'title',
  /** 城镇/村庄 */
  TOWN = 'town',
  /** 战斗 - 普通 */
  BATTLE_NORMAL = 'battle_normal',
  /** 战斗 - BOSS */
  BATTLE_BOSS = 'battle_boss',
  /** 战斗 - 稀有 */
  BATTLE_RARE = 'battle_rare',
  /** 战斗 - 竞技场 */
  BATTLE_ARENA = 'battle_arena',
  /** 战斗 - 决战 */
  BATTLE_FINAL = 'battle_final',
  /** 道路/野外 */
  ROUTE = 'route',
  /** 洞穴 */
  CAVE = 'cave',
  /** 森林 */
  FOREST = 'forest',
  /** 商店 */
  SHOP = 'shop',
  /** 胜利 */
  VICTORY = 'victory',
  /** 失败 */
  DEFEAT = 'defeat',
}

/**
 * 音乐信息接口
 */
export interface MusicInfo {
  /** 音乐 ID */
  id: string;
  /** 场景类型 */
  scene: MusicScene;
  /** 文件名（不含扩展名） */
  filename: string;
  /** 音乐名称 */
  name: string;
  /** 描述 */
  description: string;
}

/**
 * 音乐加载器配置
 */
export interface MusicLoaderConfig {
  /** 音乐文件基础路径 */
  musicPath: string;
  /** 是否循环播放 */
  defaultLoop: boolean;
  /** 是否启用淡入淡出 */
  enableFade: boolean;
  /** 淡入淡出时长（毫秒） */
  fadeDuration: number;
}

/**
 * 音乐加载结果接口
 */
export interface MusicLoadResult {
  /** 加载的音乐数量 */
  count: number;
  /** 加载耗时（毫秒） */
  loadTime: number;
}

/**
 * 场景音乐映射
 */
interface SceneMusicMapping {
  [scene: string]: string[];
}

/**
 * 音乐加载器类
 */
export class MusicLoader {
  private static instance: MusicLoader;

  /** 音乐信息缓存 */
  private musicInfoCache: Map<string, MusicInfo> = new Map();

  /** 场景音乐映射 */
  private sceneMapping: SceneMusicMapping = {};

  /** 当前播放的场景 */
  private currentScene: MusicScene | null = null;

  /** 配置 */
  private config: MusicLoaderConfig;

  /** 是否已初始化 */
  private initialized: boolean = false;

  /**
   * 私有构造函数
   */
  private constructor(config?: Partial<MusicLoaderConfig>) {
    this.config = {
      musicPath: '/assets/tuxemon/music/',
      defaultLoop: true,
      enableFade: true,
      fadeDuration: 1000,
      ...config,
    };
  }

  /**
   * 获取单例实例
   */
  static getInstance(config?: Partial<MusicLoaderConfig>): MusicLoader {
    if (!MusicLoader.instance) {
      MusicLoader.instance = new MusicLoader(config);
    }
    return MusicLoader.instance;
  }

  /**
   * 初始化音乐加载器
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('[MusicLoader] 初始化音乐加载器...');

    // 确保音频管理器已初始化
    await audioManager.initialize();

    // 加载音乐信息
    await this.loadMusicInfo();

    // 构建场景映射
    this.buildSceneMapping();

    this.initialized = true;
    console.log('[MusicLoader] 音乐加载器初始化完成');
  }

  /**
   * 加载音乐信息
   */
  private async loadMusicInfo(): Promise<void> {
    console.log('[MusicLoader] 加载音乐信息...');

    // Tuxemon 原版音乐列表
    const musicList = this.getMusicList();

    for (const music of musicList) {
      this.musicInfoCache.set(music.id, music);
    }

    console.log(`[MusicLoader] 音乐信息加载完成: ${musicList.length} 首音乐`);
  }

  /**
   * 构建场景音乐映射
   */
  private buildSceneMapping(): void {
    this.sceneMapping = {
      [MusicScene.TITLE]: ['title_theme'],
      [MusicScene.TOWN]: ['town_theme'],
      [MusicScene.BATTLE_NORMAL]: ['battle_normal'],
      [MusicScene.BATTLE_BOSS]: ['battle_boss'],
      [MusicScene.BATTLE_RARE]: ['battle_rare'],
      [MusicScene.BATTLE_ARENA]: ['battle_arena'],
      [MusicScene.BATTLE_FINAL]: ['battle_final'],
      [MusicScene.ROUTE]: ['route_theme'],
      [MusicScene.CAVE]: ['cave_theme'],
      [MusicScene.FOREST]: ['forest_theme'],
      [MusicScene.SHOP]: ['shop_theme'],
      [MusicScene.VICTORY]: ['victory_theme'],
      [MusicScene.DEFEAT]: ['defeat_theme'],
    };
  }

  /**
   * 获取音乐列表
   */
  private getMusicList(): MusicInfo[] {
    return [
      {
        id: 'title_theme',
        scene: MusicScene.TITLE,
        filename: 'title_theme',
        name: 'Title Theme',
        description: '标题画面背景音乐',
      },
      {
        id: 'town_theme',
        scene: MusicScene.TOWN,
        filename: 'town_theme',
        name: 'Town Theme',
        description: '城镇/村庄背景音乐',
      },
      {
        id: 'battle_normal',
        scene: MusicScene.BATTLE_NORMAL,
        filename: 'battle_normal',
        name: 'Normal Battle',
        description: '普通战斗背景音乐',
      },
      {
        id: 'battle_boss',
        scene: MusicScene.BATTLE_BOSS,
        filename: 'battle_boss',
        name: 'Boss Battle',
        description: 'BOSS 战斗背景音乐',
      },
      {
        id: 'battle_rare',
        scene: MusicScene.BATTLE_RARE,
        filename: 'battle_rare',
        name: 'Rare Battle',
        description: '稀有怪物战斗背景音乐',
      },
      {
        id: 'battle_arena',
        scene: MusicScene.BATTLE_ARENA,
        filename: 'battle_arena',
        name: 'Arena Battle',
        description: '竞技场战斗背景音乐',
      },
      {
        id: 'battle_final',
        scene: MusicScene.BATTLE_FINAL,
        filename: 'battle_final',
        name: 'Final Battle',
        description: '最终决战背景音乐',
      },
      {
        id: 'route_theme',
        scene: MusicScene.ROUTE,
        filename: 'route_theme',
        name: 'Route Theme',
        description: '道路/野外背景音乐',
      },
      {
        id: 'cave_theme',
        scene: MusicScene.CAVE,
        filename: 'cave_theme',
        name: 'Cave Theme',
        description: '洞穴背景音乐',
      },
      {
        id: 'forest_theme',
        scene: MusicScene.FOREST,
        filename: 'forest_theme',
        name: 'Forest Theme',
        description: '森林背景音乐',
      },
      {
        id: 'shop_theme',
        scene: MusicScene.SHOP,
        filename: 'shop_theme',
        name: 'Shop Theme',
        description: '商店背景音乐',
      },
      {
        id: 'victory_theme',
        scene: MusicScene.VICTORY,
        filename: 'victory_theme',
        name: 'Victory Theme',
        description: '战斗胜利音乐',
      },
      {
        id: 'defeat_theme',
        scene: MusicScene.DEFEAT,
        filename: 'defeat_theme',
        name: 'Defeat Theme',
        description: '战斗失败音乐',
      },
    ];
  }

  /**
   * 播放场景音乐
   * @param scene 场景类型
   * @param fadeIn 是否淡入
   */
  async playSceneMusic(scene: MusicScene, fadeIn: boolean = true): Promise<void> {
    if (!this.initialized) {
      console.warn('[MusicLoader] 加载器未初始化，请先调用 initialize()');
      return;
    }

    // 如果已经是当前场景，不重复播放
    if (this.currentScene === scene) {
      return;
    }

    this.currentScene = scene;
    const musicIds = this.sceneMapping[scene];

    if (!musicIds || musicIds.length === 0) {
      console.warn(`[MusicLoader] 场景 ${scene} 没有对应的音乐`);
      return;
    }

    // 随机选择一首音乐
    const musicId = musicIds[Math.floor(Math.random() * musicIds.length)];
    await this.playMusic(musicId, fadeIn);
  }

  /**
   * 播放指定音乐
   * @param musicId 音乐 ID
   * @param fadeIn 是否淡入
   * @param volume 播放音量
   */
  async playMusic(musicId: string, fadeIn: boolean = true, volume?: number): Promise<void> {
    if (!this.initialized) {
      console.warn('[MusicLoader] 加载器未初始化，请先调用 initialize()');
      return;
    }

    const musicInfo = this.musicInfoCache.get(musicId);
    if (!musicInfo) {
      console.warn(`[MusicLoader] 音乐 ${musicId} 不存在`);
      return;
    }

    console.log(`[MusicLoader] 播放音乐: ${musicInfo.name} (${musicId})`);

    await audioManager.playBGM(
      musicInfo.filename,
      this.config.defaultLoop,
      fadeIn && this.config.enableFade,
      volume
    );
  }

  /**
   * 停止音乐
   * @param fadeOut 是否淡出
   */
  stopMusic(fadeOut: boolean = true): void {
    console.log('[MusicLoader] 停止音乐');
    audioManager.stopBGM(fadeOut && this.config.enableFade);
    this.currentScene = null;
  }

  /**
   * 暂停音乐
   */
  pauseMusic(): void {
    console.log('[MusicLoader] 暂停音乐');
    audioManager.pauseBGM();
  }

  /**
   * 恢复音乐
   */
  async resumeMusic(): Promise<void> {
    console.log('[MusicLoader] 恢复音乐');
    await audioManager.resumeBGM();
  }

  /**
   * 切换音乐
   * @param musicId 新的音乐 ID
   */
  async switchMusic(musicId: string): Promise<void> {
    console.log(`[MusicLoader] 切换音乐到: ${musicId}`);
    await audioManager.switchBGM(musicId);
  }

  /**
   * 切换场景音乐
   * @param scene 新的场景类型
   */
  async switchScene(scene: MusicScene): Promise<void> {
    await this.playSceneMusic(scene, true);
  }

  /**
   * 设置音乐音量
   * @param volume 音量 (0-1)
   */
  setMusicVolume(volume: number): void {
    audioManager.setBGMVolume(volume);
  }

  /**
   * 获取音乐音量
   */
  getMusicVolume(): number {
    return audioManager.getBGMVolume();
  }

  /**
   * 设置静音
   * @param muted 是否静音
   */
  setMuted(muted: boolean): void {
    audioManager.setMuted(muted);
  }

  /**
   * 切换静音状态
   */
  toggleMuted(): void {
    audioManager.toggleMuted();
  }

  /**
   * 是否静音
   */
  isMuted(): boolean {
    return audioManager.isMuted();
  }

  /**
   * 获取当前场景
   */
  getCurrentScene(): MusicScene | null {
    return this.currentScene;
  }

  /**
   * 获取音乐信息
   * @param musicId 音乐 ID
   */
  getMusicInfo(musicId: string): MusicInfo | null {
    return this.musicInfoCache.get(musicId) || null;
  }

  /**
   * 获取所有音乐信息
   */
  getAllMusicInfo(): MusicInfo[] {
    return Array.from(this.musicInfoCache.values());
  }

  /**
   * 按场景获取音乐
   * @param scene 场景类型
   */
  getMusicByScene(scene: MusicScene): MusicInfo[] {
    return Array.from(this.musicInfoCache.values()).filter(music => music.scene === scene);
  }

  /**
   * 搜索音乐
   * @param keyword 搜索关键词
   */
  searchMusic(keyword: string): MusicInfo[] {
    const lowerKeyword = keyword.toLowerCase();
    return Array.from(this.musicInfoCache.values()).filter(
      music =>
        music.name.toLowerCase().includes(lowerKeyword) ||
        music.description.toLowerCase().includes(lowerKeyword)
    );
  }

  /**
   * 预加载音乐
   * @param musicIds 音乐 ID 列表
   */
  async preloadMusic(musicIds: string[]): Promise<void> {
    console.log(`[MusicLoader] 预加载 ${musicIds.length} 首音乐...`);

    const promises = musicIds.map(id => {
      const musicInfo = this.musicInfoCache.get(id);
      if (musicInfo) {
        return audioManager.preloadBGM(musicInfo.filename);
      }
      return Promise.resolve();
    });

    await Promise.all(promises);
    console.log('[MusicLoader] 音乐预加载完成');
  }

  /**
   * 预加载场景音乐
   * @param scenes 场景类型列表
   */
  async preloadSceneMusic(scenes: MusicScene[]): Promise<void> {
    const musicIds: string[] = [];

    for (const scene of scenes) {
      const sceneMusics = this.sceneMapping[scene];
      if (sceneMusics) {
        musicIds.push(...sceneMusics);
      }
    }

    await this.preloadMusic(musicIds);
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.musicInfoCache.clear();
    this.currentScene = null;
    this.initialized = false;
    console.log('[MusicLoader] 缓存已清除');
  }

  /**
   * 获取加载状态
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 更新音乐加载器（每帧调用）
   * @param deltaTime 帧间隔时间（秒）
   */
  update(deltaTime: number): void {
    // 委托给音频管理器更新（处理淡入淡出）
    audioManager.update(deltaTime * 1000);
  }
}

/**
 * 导出单例
 */
export const musicLoader = MusicLoader.getInstance();
