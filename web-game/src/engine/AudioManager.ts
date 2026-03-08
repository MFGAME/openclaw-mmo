/**
 * 音频管理器
 *
 * 负责管理游戏中的所有音频播放，包括：
 * - BGM（背景音乐）播放、循环、切换、淡入淡出
 * - 音效播放（技能、脚步、UI等）
 * - 音量控制和静音功能
 */

/**
 * 音频类型
 */
export enum AudioType {
  /** 背景音乐 */
  BGM = 'BGM',
  /** 音效 */
  SFX = 'SFX',
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
}

/**
 * 音频管理器配置
 */
export interface AudioManagerConfig {
  /** 默认 BGM 音量 (0-1) */
  defaultBGMVolume: number;
  /** 默认音效音量 (0-1) */
  defaultSFXVolume: number;
  /** 淡入/淡出时长（毫秒） */
  fadeDuration: number;
  /** 同时播放的最大音效数 */
  maxConcurrentSFX: number;
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

  /** 是否静音 */
  private muted: boolean;

  /** 淡入/淡出时长 */
  private fadeDuration: number;

  /** 同时播放的最大音效数 */
  private maxConcurrentSFX: number;

  /** 当前播放的音效列表 */
  private playingSFX: SFXInfo[] = [];

  /** 音效预加载缓存 */
  private sfxCache: Map<string, HTMLAudioElement> = new Map();

  /** 预加载的 BGM 缓存 */
  private bgmCache: Map<string, HTMLAudioElement> = new Map();

  /** 上次更新时间 */
  // private lastUpdateTime: number = 0;

  /**
   * 私有构造函数，确保单例
   */
  private constructor(config: AudioManagerConfig = {
    defaultBGMVolume: 0.6,
    defaultSFXVolume: 0.8,
    fadeDuration: 1000,
    maxConcurrentSFX: 10,
  }) {
    this.bgmVolume = config.defaultBGMVolume;
    this.sfxVolume = config.defaultSFXVolume;
    this.muted = false;
    this.fadeDuration = config.fadeDuration;
    this.maxConcurrentSFX = config.maxConcurrentSFX;
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

    // 尝试解锁音频上下文（浏览器需要用户交互才能播放音频）
    try {
      if (typeof (window as any).AudioContext !== 'undefined') {
        const audioContext = new (window as any).AudioContext();
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
      }
    } catch (e) {
      console.warn('[AudioManager] AudioContext setup failed:', e);
    }

    console.log('[AudioManager] Initialized');
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
      this.bgmCache.set(id, audioElement!);
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
  resumeBGM(): void {
    if (!this.currentBGM) return;

    this.currentBGM.element.play();
    console.log('[AudioManager] BGM resumed');
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
  }

  /**
   * 获取 BGM 音量
   */
  getBGMVolume(): number {
    return this.bgmVolume;
  }

  /**
   * 播放音效
   * @param id 音效 ID（文件名不含扩展名）
   * @param volume 播放音量（覆盖默认值）
   * @param pitch 音调（倍率，默认1.0）
   */
  async playSFX(id: string, volume?: number, pitch: number = 1.0): Promise<void> {
    // 检查并发音效数量限制
    if (this.playingSFX.length >= this.maxConcurrentSFX) {
      console.warn('[AudioManager] Max concurrent SFX reached, skipping:', id);
      return;
    }

    // 获取或创建音效元素
    let audioElement = this.sfxCache.get(id);
    if (!audioElement) {
      audioElement = await this.loadSFX(id);
      if (!audioElement) {
        console.error(`[AudioManager] Failed to load SFX: ${id}`);
        return;
      }
      this.sfxCache.set(id, audioElement!);
    }

    // 克隆音频元素以支持同时播放多次
    const cloneElement = audioElement.cloneNode(true) as HTMLAudioElement;
    const playVolume = volume ?? this.sfxVolume;
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
      };
      this.playingSFX.push(sfxInfo);

      // 播放完成后清理
      cloneElement.onended = () => {
        this.cleanupSFX(sfxInfo);
      };

      console.log(`[AudioManager] Playing SFX: ${id}`);
    } catch (e) {
      console.error(`[AudioManager] Failed to play SFX: ${id}`, e);
    }
  }

  /**
   * 停止指定音效
   * @param id 音效 ID
   */
  stopSFX(id: string): void {
    for (const sfx of this.playingSFX) {
      if (sfx.id === id) {
        sfx.element.pause();
        this.cleanupSFX(sfx);
      }
    }
  }

  /**
   * 停止所有音效
   */
  stopAllSFX(): void {
    for (const sfx of [...this.playingSFX]) {
      sfx.element.pause();
      this.cleanupSFX(sfx);
    }
  }

  /**
   * 设置音效音量
   * @param volume 音量 (0-1)
   */
  setSFXVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));

    // 更新当前播放的音效音量
    for (const sfx of this.playingSFX) {
      sfx.element.volume = this.getActualVolume(this.sfxVolume);
    }
  }

  /**
   * 获取音效音量
   */
  getSFXVolume(): number {
    return this.sfxVolume;
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
      sfx.element.volume = this.getActualVolume(this.sfxVolume);
    }
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
   * 预加载 BGM
   * @param id BGM ID
   */
  async preloadBGM(id: string): Promise<void> {
    if (this.bgmCache.has(id)) {
      return;
    }

    const audioElement = await this.loadBGM(id);
    if (audioElement) {
      this.bgmCache.set(id, audioElement!);
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
      this.sfxCache.set(id, audioElement!);
    }
  }

  /**
   * 预加载多个音频
   * @param bgmList BGM 列表
   * @param sfxList 音效列表
   */
  async preloadAudio(bgmList: string[], sfxList: string[]): Promise<void> {
    console.log('[AudioManager] Preloading audio...');

    const promises: Promise<void>[] = [];

    for (const bgm of bgmList) {
      promises.push(this.preloadBGM(bgm));
    }

    for (const sfx of sfxList) {
      promises.push(this.preloadSFX(sfx));
    }

    await Promise.all(promises);

    console.log(`[AudioManager] Preloaded ${bgmList.length} BGMs and ${sfxList.length} SFXs`);
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

    console.log('[AudioManager] Cache cleared');
  }

  /**
   * 更新音频管理器（处理淡入/淡出）
   */
  update(deltaTime: number): void {
    // lastUpdateTime removed

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
}

/**
 * 导出音频管理器单例
 */
export const audioManager = AudioManager.getInstance();
