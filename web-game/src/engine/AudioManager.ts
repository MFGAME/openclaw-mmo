/**
 * 音频管理器
 *
 * 负责管理游戏中的所有音频播放，包括：
 * - BGM（背景音乐）播放、循环、切换、淡入淡出
 * - 音效播放（技能、脚步、UI等）
 * - 语音播放
 * - 音效优先级系统（避免音效重叠）
 * - 音量分组控制（BGM/SFX/Voice）
 * - 音频设置持久化（localStorage）
 * - Web Audio API 音频上下文管理
 */

/**
 * 音频类型
 */
export enum AudioType {
  /** 背景音乐 */
  BGM = 'BGM',
  /** 音效 */
  SFX = 'SFX',
  /** 语音 */
  VOICE = 'VOICE',
}

/**
 * 音效优先级枚举
 * 优先级数值越大，优先级越高
 */
export enum SFXPriority {
  /** 低优先级 - 背景音效、脚步声等 */
  LOW = 0,
  /** 中优先级 - 普通技能、UI音效等 */
  MEDIUM = 1,
  /** 高优先级 - 重要事件、特殊技能等 */
  HIGH = 2,
  /** 最高优先级 - 紧急警告、关键音效等 */
  CRITICAL = 3,
}

/**
 * BGM 播放状态
 */
enum BGMState {
  /** 停止 */
  STOPPED = 'stopped',
  /** 播放中 */
  PLAYING = 'playing',
  /** 淡出中 */
  FADING_OUT = 'fading_out',
  /** 淡入中 */
  FADING_IN = 'fading_in',
}

/**
 * BGM 信息接口
 */
interface BGMInfo {
  /** BGM ID */
  id: string;
  /** 音频元素 */
  element: HTMLAudioElement;
  /** 当前状态 */
  state: BGMState;
  /** 淡入/淡出目标音量 */
  targetVolume: number;
  /** 当前淡入/淡出音量 */
  currentFadeVolume: number;
  /** 是否循环 */
  loop: boolean;
  /** 回调函数 */
  onEnd?: () => void;
}

/**
 * 音效播放接口
 */
interface SFXInfo {
  /** 音效 ID */
  id: string;
  /** 音频元素 */
  element: HTMLAudioElement;
  /** 播放时间戳 */
  startTime: number;
  /** 音效优先级 */
  priority: SFXPriority;
  /** 音效类型 */
  type: AudioType;
  /** 音量倍率 */
  volumeMultiplier: number;
}

/**
 * 音频设置接口
 */
export interface AudioSettings {
  /** BGM 音量 (0-1) */
  bgmVolume: number;
  /** 音效音量 (0-1) */
  sfxVolume: number;
  /** 语音音量 (0-1) */
  voiceVolume: number;
  /** 是否静音 */
  muted: boolean;
}

/**
 * 音频管理器配置
 */
export interface AudioManagerConfig {
  /** 默认 BGM 音量 (0-1) */
  defaultBGMVolume: number;
  /** 默认音效音量 (0-1) */
  defaultSFXVolume: number;
  /** 默认语音音量 (0-1) */
  defaultVoiceVolume: number;
  /** 淡入/淡出时长（毫秒） */
  fadeDuration: number;
  /** 同时播放的最大音效数 */
  maxConcurrentSFX: number;
  /** 同时播放的最大语音数 */
  maxConcurrentVoice: number;
  /** 是否启用设置持久化 */
  enablePersistence: boolean;
  /** localStorage 存储键名 */
  storageKey: string;
}

/**
 * 音效播放选项
 */
export interface SFXOptions {
  /** 播放音量（覆盖默认值） */
  volume?: number;
  /** 音调（倍率，默认1.0） */
  pitch?: number;
  /** 音效优先级 */
  priority?: SFXPriority;
  /** 音效类型 */
  type?: AudioType;
}

/**
 * 音频管理器类
 */
export class AudioManager {
  private static instance: AudioManager;

  /** 当前播放的 BGM */
  private currentBGM: BGMInfo | null = null;

  /** 队列中的 BGM（淡出完成后播放） */
  private queuedBGM: string | null = null;

  /** BGM 音量 */
  private bgmVolume: number;

  /** 音效音量 */
  private sfxVolume: number;

  /** 语音音量 */
  private voiceVolume: number;

  /** 是否静音 */
  private muted: boolean;

  /** 淡入/淡出时长 */
  private fadeDuration: number;

  /** 同时播放的最大音效数 */
  private maxConcurrentSFX: number;

  /** 同时播放的最大语音数 */
  private maxConcurrentVoice: number;

  /** 当前播放的音效/语音列表 */
  private playingSFX: SFXInfo[] = [];

  /** 音效预加载缓存 */
  private sfxCache: Map<string, HTMLAudioElement> = new Map();

  /** 语音预加载缓存 */
  private voiceCache: Map<string, HTMLAudioElement> = new Map();

  /** 预加载的 BGM 缓存 */
  private bgmCache: Map<string, HTMLAudioElement> = new Map();

  /** 配置 */
  private config: AudioManagerConfig;

  /** Web Audio API 上下文 */
  private audioContext: AudioContext | null = null;

  /** 音频上下文是否已初始化 */
  private audioContextInitialized: boolean = false;

  /**
   * 私有构造函数，确保单例
   */
  private constructor(config: AudioManagerConfig = {
    defaultBGMVolume: 0.6,
    defaultSFXVolume: 0.8,
    defaultVoiceVolume: 0.9,
    fadeDuration: 1000,
    maxConcurrentSFX: 10,
    maxConcurrentVoice: 3,
    enablePersistence: true,
    storageKey: 'openclaw-audio-settings',
  }) {
    this.config = config;

    // 尝试从 localStorage 加载设置
    const savedSettings = this.loadSettings();
    if (savedSettings) {
      this.bgmVolume = savedSettings.bgmVolume;
      this.sfxVolume = savedSettings.sfxVolume;
      // 兼容旧版本设置
      this.voiceVolume = savedSettings.voiceVolume ?? config.defaultVoiceVolume;
      this.muted = savedSettings.muted;
      console.log('[AudioManager] 从 localStorage 加载音频设置');
    } else {
      this.bgmVolume = config.defaultBGMVolume;
      this.sfxVolume = config.defaultSFXVolume;
      this.voiceVolume = config.defaultVoiceVolume;
      this.muted = false;
    }

    this.fadeDuration = config.fadeDuration;
    this.maxConcurrentSFX = config.maxConcurrentSFX;
    this.maxConcurrentVoice = config.maxConcurrentVoice;
  }

  /**
   * 获取单例实例
   */
  static getInstance(config?: AudioManagerConfig): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager(config);
    }
    return AudioManager.instance;
  }

  /**
   * 初始化音频管理器
   */
  async initialize(): Promise<void> {
    console.log('[AudioManager] Initializing...');

    // 初始化 Web Audio API 上下文
    await this.initAudioContext();

    console.log('[AudioManager] Initialized');
  }

  /**
   * 初始化 Web Audio API 上下文
   */
  async initAudioContext(): Promise<void> {
    if (this.audioContextInitialized) {
      return;
    }

    try {
      // 创建 AudioContext
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        console.warn('[AudioManager] Web Audio API 不支持');
        return;
      }

      this.audioContext = new AudioContextClass();

      // 尝试恢复音频上下文（浏览器需要用户交互才能播放音频）
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.audioContextInitialized = true;
      console.log('[AudioManager] Web Audio API 上下文已初始化');
    } catch (e) {
      console.error('[AudioManager] Web Audio API 初始化失败:', e);
    }
  }

  /**
   * 获取音频上下文
   */
  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  /**
   * 确保 Web Audio API 上下文已恢复
   */
  async ensureAudioContextResumed(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
      console.log('[AudioManager] 音频上下文已恢复');
    }
  }

  /**
   * 从 localStorage 加载音频设置
   */
  private loadSettings(): AudioSettings | null {
    if (!this.config.enablePersistence) {
      return null;
    }

    try {
      const data = localStorage.getItem(this.config.storageKey);
      if (data) {
        return JSON.parse(data) as AudioSettings;
      }
    } catch (e) {
      console.warn('[AudioManager] 加载音频设置失败:', e);
    }

    return null;
  }

  /**
   * 保存音频设置到 localStorage
   */
  private saveSettings(): void {
    if (!this.config.enablePersistence) {
      return;
    }

    try {
      const settings: AudioSettings = {
        bgmVolume: this.bgmVolume,
        sfxVolume: this.sfxVolume,
        voiceVolume: this.voiceVolume,
        muted: this.muted,
      };

      localStorage.setItem(this.config.storageKey, JSON.stringify(settings));
      console.log('[AudioManager] 音频设置已保存');
    } catch (e) {
      console.warn('[AudioManager] 保存音频设置失败:', e);
    }
  }

  /**
   * 获取当前音频设置
   */
  getSettings(): AudioSettings {
    return {
      bgmVolume: this.bgmVolume,
      sfxVolume: this.sfxVolume,
      voiceVolume: this.voiceVolume,
      muted: this.muted,
    };
  }

  /**
   * 设置音频设置
   */
  setSettings(settings: Partial<AudioSettings>): void {
    if (settings.bgmVolume !== undefined) {
      this.setBGMVolume(settings.bgmVolume);
    }
    if (settings.sfxVolume !== undefined) {
      this.setSFXVolume(settings.sfxVolume);
    }
    if (settings.voiceVolume !== undefined) {
      this.setVoiceVolume(settings.voiceVolume);
    }
    if (settings.muted !== undefined) {
      this.setMuted(settings.muted);
    }

    this.saveSettings();
  }

  /**
   * 重置音频设置为默认值
   */
  resetSettings(): void {
    this.bgmVolume = this.config.defaultBGMVolume;
    this.sfxVolume = this.config.defaultSFXVolume;
    this.voiceVolume = this.config.defaultVoiceVolume;
    this.muted = false;

    // 更新当前播放的音频音量
    if (this.currentBGM && this.currentBGM.state === BGMState.PLAYING) {
      this.currentBGM.element.volume = this.getActualVolume(this.bgmVolume);
    }

    for (const sfx of this.playingSFX) {
      const baseVolume = sfx.type === AudioType.VOICE ? this.voiceVolume : this.sfxVolume;
      sfx.element.volume = this.getActualVolume(baseVolume * sfx.volumeMultiplier);
    }

    this.saveSettings();
    console.log('[AudioManager] 音频设置已重置');
  }

  /**
   * 播放 BGM
   * @param id BGM ID（文件名不含扩展名）
   * @param loop 是否循环
   * @param fadeIn 是否淡入
   * @param volume 播放音量（覆盖默认值）
   */
  async playBGM(
    id: string,
    loop: boolean = true,
    fadeIn: boolean = true,
    volume?: number
  ): Promise<void> {
    // 确保 Web Audio API 上下文已恢复
    await this.ensureAudioContextResumed();

    // 如果已经是同一首 BGM，不重新播放
    if (this.currentBGM && this.currentBGM.id === id) {
      return;
    }

    // 如果有正在播放的 BGM，先淡出
    if (this.currentBGM && this.currentBGM.state === BGMState.PLAYING) {
      this.queuedBGM = id;
      this.stopBGM(true);
      return;
    }

    // 获取或创建 BGM 元素
    let audioElement = this.bgmCache.get(id);
    if (!audioElement) {
      audioElement = await this.loadBGM(id);
      if (!audioElement) {
        console.error(`[AudioManager] Failed to load BGM: ${id}`);
        return;
      }
      this.bgmCache.set(id, audioElement);
    }

    // 重置播放位置
    audioElement.currentTime = 0;

    // 设置循环
    audioElement.loop = loop;

    // 创建 BGM 信息
    const playVolume = volume ?? this.bgmVolume;
    this.currentBGM = {
      id,
      element: audioElement,
      state: fadeIn ? BGMState.FADING_IN : BGMState.PLAYING,
      targetVolume: playVolume,
      currentFadeVolume: fadeIn ? 0 : playVolume,
      loop,
    };

    // 设置初始音量
    audioElement.volume = this.getActualVolume(this.currentBGM.currentFadeVolume);

    // 播放
    try {
      await audioElement.play();
      console.log(`[AudioManager] Playing BGM: ${id}`);
    } catch (e) {
      console.error(`[AudioManager] Failed to play BGM: ${id}`, e);
      this.currentBGM = null;
    }
  }

  /**
   * 停止 BGM
   * @param fadeOut 是否淡出
   */
  stopBGM(fadeOut: boolean = false): void {
    if (!this.currentBGM) return;

    if (fadeOut) {
      this.currentBGM.state = BGMState.FADING_OUT;
    } else {
      this.currentBGM.element.pause();
      this.currentBGM = null;
      this.playQueuedBGM();
    }
  }

  /**
   * 暂停 BGM
   */
  pauseBGM(): void {
    if (!this.currentBGM) return;

    this.currentBGM.element.pause();
    console.log('[AudioManager] BGM paused');
  }

  /**
   * 恢复 BGM
   */
  async resumeBGM(): Promise<void> {
    if (!this.currentBGM) return;

    // 确保 Web Audio API 上下文已恢复
    await this.ensureAudioContextResumed();

    try {
      await this.currentBGM.element.play();
      console.log('[AudioManager] BGM resumed');
    } catch (e) {
      console.error('[AudioManager] Failed to resume BGM:', e);
    }
  }

  /**
   * 切换 BGM
   * @param id 新的 BGM ID
   */
  async switchBGM(id: string): Promise<void> {
    await this.playBGM(id, true, true);
  }

  /**
   * 设置 BGM 音量
   * @param volume 音量 (0-1)
   */
  setBGMVolume(volume: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, volume));

    // 如果有正在播放的 BGM，立即更新音量
    if (this.currentBGM && this.currentBGM.state === BGMState.PLAYING) {
      this.currentBGM.element.volume = this.getActualVolume(this.bgmVolume);
    }

    // 保存设置
    this.saveSettings();
  }

  /**
   * 获取 BGM 音量
   */
  getBGMVolume(): number {
    return this.bgmVolume;
  }

  /**
   * 播放音效（增强版 - 支持优先级和类型）
   * @param id 音效 ID（文件名不含扩展名）
   * @param options 播放选项
   */
  async playSFX(id: string, options: SFXOptions = {}): Promise<void> {
    // 确保 Web Audio API 上下文已恢复
    await this.ensureAudioContextResumed();

    const {
      volume,
      pitch = 1.0,
      priority = SFXPriority.MEDIUM,
      type = AudioType.SFX,
    } = options;

    // 根据类型确定最大并发数
    const maxConcurrent = type === AudioType.VOICE ? this.maxConcurrentVoice : this.maxConcurrentSFX;

    // 检查该类型的并发数量
    const sameTypeCount = this.playingSFX.filter(s => s.type === type).length;
    if (sameTypeCount >= maxConcurrent) {
      // 尝试移除优先级更低的音效
      const lowerPrioritySFX = this.playingSFX
        .filter(s => s.type === type && s.priority < priority)
        .sort((a, b) => a.priority - b.priority);

      if (lowerPrioritySFX.length > 0) {
        // 移除最低优先级的音效
        const toRemove = lowerPrioritySFX[0];
        this.stopSFXInfo(toRemove);
        console.log(`[AudioManager] 移除低优先级音效: ${toRemove.id} (优先级: ${toRemove.priority})`);
      } else {
        // 没有可移除的低优先级音效，跳过
        console.warn(`[AudioManager] Max concurrent ${type} reached, skipping: ${id}`);
        return;
      }
    }

    // 获取或创建音效元素
    const cache = type === AudioType.VOICE ? this.voiceCache : this.sfxCache;
    let audioElement = cache.get(id);
    if (!audioElement) {
      if (type === AudioType.VOICE) {
        audioElement = await this.loadVoice(id);
      } else {
        audioElement = await this.loadSFX(id);
      }
      if (!audioElement) {
        console.error(`[AudioManager] Failed to load ${type}: ${id}`);
        return;
      }
      cache.set(id, audioElement);
    }

    // 克隆音频元素以支持同时播放多次
    const cloneElement = audioElement.cloneNode(true) as HTMLAudioElement;
    const baseVolume = type === AudioType.VOICE ? this.voiceVolume : this.sfxVolume;
    const playVolume = volume ?? baseVolume;
    const volumeMultiplier = playVolume / baseVolume;

    cloneElement.volume = this.getActualVolume(playVolume);
    cloneElement.preservesPitch = false; // 允许音调变化
    cloneElement.playbackRate = pitch;

    // 播放
    try {
      await cloneElement.play();

      // 添加到播放列表
      const sfxInfo: SFXInfo = {
        id,
        element: cloneElement,
        startTime: Date.now(),
        priority,
        type,
        volumeMultiplier,
      };
      this.playingSFX.push(sfxInfo);

      // 播放完成后清理
      cloneElement.onended = () => {
        this.cleanupSFX(sfxInfo);
      };

      console.log(`[AudioManager] Playing ${type}: ${id} (优先级: ${priority})`);
    } catch (e) {
      console.error(`[AudioManager] Failed to play ${type}: ${id}`, e);
    }
  }

  /**
   * 播放音效（兼容旧版接口）
   * @param id 音效 ID（文件名不含扩展名）
   * @param volume 播放音量（覆盖默认值）
   * @param pitch 音调（倍率，默认1.0）
   */
  async playSFXLegacy(id: string, volume?: number, pitch: number = 1.0): Promise<void> {
    return this.playSFX(id, { volume, pitch });
  }

  /**
   * 播放语音
   * @param id 语音 ID（文件名不含扩展名）
   * @param options 播放选项
   */
  async playVoice(id: string, options: SFXOptions = {}): Promise<void> {
    return this.playSFX(id, { ...options, type: AudioType.VOICE });
  }

  /**
   * 停止指定音效
   * @param id 音效 ID
   * @param type 音效类型（可选）
   */
  stopSFX(id: string, type?: AudioType): void {
    for (const sfx of this.playingSFX) {
      if (sfx.id === id && (!type || sfx.type === type)) {
        this.stopSFXInfo(sfx);
      }
    }
  }

  /**
   * 停止指定类型的所有音效
   * @param type 音效类型
   */
  stopByType(type: AudioType): void {
    for (const sfx of [...this.playingSFX]) {
      if (sfx.type === type) {
        this.stopSFXInfo(sfx);
      }
    }
  }

  /**
   * 停止所有音效和语音
   */
  stopAllSFX(): void {
    for (const sfx of [...this.playingSFX]) {
      this.stopSFXInfo(sfx);
    }
  }

  /**
   * 停止指定音效信息
   */
  private stopSFXInfo(sfx: SFXInfo): void {
    sfx.element.pause();
    this.cleanupSFX(sfx);
  }

  /**
   * 设置音效音量
   * @param volume 音量 (0-1)
   */
  setSFXVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));

    // 更新当前播放的 SFX 音效音量
    for (const sfx of this.playingSFX) {
      if (sfx.type === AudioType.SFX) {
        sfx.element.volume = this.getActualVolume(this.sfxVolume * sfx.volumeMultiplier);
      }
    }

    // 保存设置
    this.saveSettings();
  }

  /**
   * 获取音效音量
   */
  getSFXVolume(): number {
    return this.sfxVolume;
  }

  /**
   * 设置语音音量
   * @param volume 音量 (0-1)
   */
  setVoiceVolume(volume: number): void {
    this.voiceVolume = Math.max(0, Math.min(1, volume));

    // 更新当前播放的语音音量
    for (const sfx of this.playingSFX) {
      if (sfx.type === AudioType.VOICE) {
        sfx.element.volume = this.getActualVolume(this.voiceVolume * sfx.volumeMultiplier);
      }
    }

    // 保存设置
    this.saveSettings();
  }

  /**
   * 获取语音音量
   */
  getVoiceVolume(): number {
    return this.voiceVolume;
  }

  /**
   * 设置主音量（同时设置 BGM、SFX 和 Voice）
   * @param volume 音量 (0-1)
   */
  setMasterVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.setBGMVolume(clampedVolume);
    this.setSFXVolume(clampedVolume);
    this.setVoiceVolume(clampedVolume);
  }

  /**
   * 获取主音量（取 BGM、SFX 和 Voice 的平均值）
   */
  getMasterVolume(): number {
    return (this.bgmVolume + this.sfxVolume + this.voiceVolume) / 3;
  }

  /**
   * 设置静音
   * @param muted 是否静音
   */
  setMuted(muted: boolean): void {
    this.muted = muted;

    // 更新所有音频音量
    if (this.currentBGM) {
      this.currentBGM.element.volume = this.getActualVolume(
        this.currentBGM.currentFadeVolume
      );
    }

    for (const sfx of this.playingSFX) {
      const baseVolume = sfx.type === AudioType.VOICE ? this.voiceVolume : this.sfxVolume;
      sfx.element.volume = this.getActualVolume(baseVolume * sfx.volumeMultiplier);
    }

    // 保存设置
    this.saveSettings();
  }

  /**
   * 切换静音状态
   */
  toggleMuted(): void {
    this.setMuted(!this.muted);
  }

  /**
   * 是否静音
   */
  isMuted(): boolean {
    return this.muted;
  }

  /**
   * 获取当前播放的音效数量
   * @param type 音效类型（可选）
   */
  getPlayingSFXCount(type?: AudioType): number {
    if (!type) {
      return this.playingSFX.length;
    }
    return this.playingSFX.filter(s => s.type === type).length;
  }

  /**
   * 预加载 BGM
   * @param id BGM ID
   */
  async preloadBGM(id: string): Promise<void> {
    if (this.bgmCache.has(id)) {
      return;
    }

    const audioElement = await this.loadBGM(id);
    if (audioElement) {
      this.bgmCache.set(id, audioElement);
    }
  }

  /**
   * 预加载音效
   * @param id 音效 ID
   */
  async preloadSFX(id: string): Promise<void> {
    if (this.sfxCache.has(id)) {
      return;
    }

    const audioElement = await this.loadSFX(id);
    if (audioElement) {
      this.sfxCache.set(id, audioElement);
    }
  }

  /**
   * 预加载语音
   * @param id 语音 ID
   */
  async preloadVoice(id: string): Promise<void> {
    if (this.voiceCache.has(id)) {
      return;
    }

    const audioElement = await this.loadVoice(id);
    if (audioElement) {
      this.voiceCache.set(id, audioElement);
    }
  }

  /**
   * 预加载多个音频
   * @param bgmList BGM 列表
   * @param sfxList 音效列表
   * @param voiceList 语音列表
   */
  async preloadAudio(bgmList: string[], sfxList: string[], voiceList: string[] = []): Promise<void> {
    console.log('[AudioManager] Preloading audio...');

    const promises: Promise<void>[] = [];

    for (const bgm of bgmList) {
      promises.push(this.preloadBGM(bgm));
    }

    for (const sfx of sfxList) {
      promises.push(this.preloadSFX(sfx));
    }

    for (const voice of voiceList) {
      promises.push(this.preloadVoice(voice));
    }

    await Promise.all(promises);

    console.log(`[AudioManager] Preloaded ${bgmList.length} BGMs, ${sfxList.length} SFXs and ${voiceList.length} voices`);
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    // 停止所有音频
    this.stopBGM(false);
    this.stopAllSFX();

    // 清除缓存
    this.bgmCache.clear();
    this.sfxCache.clear();
    this.voiceCache.clear();

    console.log('[AudioManager] Cache cleared');
  }

  /**
   * 更新音频管理器（处理淡入/淡出）
   */
  update(deltaTime: number): void {
    // 更新 BGM 淡入/淡出
    if (this.currentBGM) {
      this.updateBGMFade(deltaTime);
    }

    // 清理已完成的音效
    this.cleanupFinishedSFX();
  }

  /**
   * 更新 BGM 淡入/淡出
   */
  private updateBGMFade(deltaTime: number): void {
    if (!this.currentBGM) return;

    const bgm = this.currentBGM;
    const fadeSpeed = bgm.targetVolume / (this.fadeDuration / deltaTime);

    switch (bgm.state) {
      case BGMState.FADING_IN:
        bgm.currentFadeVolume += fadeSpeed;
        if (bgm.currentFadeVolume >= bgm.targetVolume) {
          bgm.currentFadeVolume = bgm.targetVolume;
          bgm.state = BGMState.PLAYING;
        }
        break;

      case BGMState.FADING_OUT:
        bgm.currentFadeVolume -= fadeSpeed;
        if (bgm.currentFadeVolume <= 0) {
          bgm.currentFadeVolume = 0;
          bgm.state = BGMState.STOPPED;
          bgm.element.pause();
          this.currentBGM = null;
          this.playQueuedBGM();
          return;
        }
        break;
    }

    // 更新实际音量
    bgm.element.volume = this.getActualVolume(bgm.currentFadeVolume);
  }

  /**
   * 清理已完成的音效
   */
  private cleanupFinishedSFX(): void {
    const now = Date.now();
    const expired: SFXInfo[] = [];

    for (const sfx of this.playingSFX) {
      if (sfx.element.ended || now - sfx.startTime > 10000) {
        expired.push(sfx);
      }
    }

    for (const sfx of expired) {
      this.cleanupSFX(sfx);
    }
  }

  /**
   * 清理单个音效
   */
  private cleanupSFX(sfx: SFXInfo): void {
    const index = this.playingSFX.indexOf(sfx);
    if (index !== -1) {
      this.playingSFX.splice(index, 1);
    }
    sfx.element.onended = null;
    sfx.element.pause();
    sfx.element.src = '';
  }

  /**
   * 播放队列中的 BGM
   */
  private async playQueuedBGM(): Promise<void> {
    if (this.queuedBGM) {
      const id = this.queuedBGM;
      this.queuedBGM = null;
      await this.playBGM(id, true, true);
    }
  }

  /**
   * 获取实际音量（考虑静音）
   */
  private getActualVolume(volume: number): number {
    return this.muted ? 0 : volume;
  }

  /**
   * 加载 BGM
   */
  private async loadBGM(id: string): Promise<HTMLAudioElement | undefined> {
    const path = `/assets/tuxemon/music/${id}.ogg`;
    return this.loadAudio(path);
  }

  /**
   * 加载音效
   */
  private async loadSFX(id: string): Promise<HTMLAudioElement | undefined> {
    // 尝试多个格式
    const formats = ['.ogg', '.wav', '.mp3'];
    for (const ext of formats) {
      const path = `/assets/tuxemon/sounds/${id}${ext}`;
      const element = await this.loadAudio(path);
      if (element) return element;
    }
    return undefined;
  }

  /**
   * 加载语音
   */
  private async loadVoice(id: string): Promise<HTMLAudioElement | undefined> {
    // 尝试多个格式
    const formats = ['.ogg', '.wav', '.mp3'];
    for (const ext of formats) {
      const path = `/assets/tuxemon/voice/${id}${ext}`;
      const element = await this.loadAudio(path);
      if (element) return element;
    }
    return undefined;
  }

  /**
   * 加载音频文件
   */
  private loadAudio(path: string): Promise<HTMLAudioElement | undefined> {
    return new Promise((resolve) => {
      const audio = new Audio(path);

      audio.addEventListener('canplaythrough', () => {
        console.log(`[AudioManager] Loaded: ${path}`);
        resolve(audio);
      }, { once: true });

      audio.addEventListener('error', () => {
        console.warn(`[AudioManager] Failed to load: ${path}`);
        resolve(undefined);
      }, { once: true });

      // 超时处理
      setTimeout(() => {
        console.warn(`[AudioManager] Timeout loading: ${path}`);
        resolve(undefined);
      }, 10000);
    });
  }

  /**
   * 销毁音频管理器
   */
  destroy(): void {
    // 停止所有音频
    this.stopBGM(false);
    this.stopAllSFX();

    // 清除缓存
    this.clearCache();

    // 关闭 Web Audio API 上下文
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    console.log('[AudioManager] 已销毁');
  }
}

/**
 * 导出音频管理器单例
 */
export const audioManager = AudioManager.getInstance();
