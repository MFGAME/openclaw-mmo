/**
 * 飞书小程序音频适配器
 * 负责将标准 Web Audio API 适配到飞书小程序音频 API
 */

/**
 * 音频播放状态
 */
export enum AudioPlayState {
    /** 未开始 */
    IDLE = 'idle',

    /** 播放中 */
    PLAYING = 'playing',

    /** 暂停 */
    PAUSED = 'paused',

    /** 已结束 */
    ENDED = 'ended',

    /** 错误 */
    ERROR = 'error',
}

/**
 * 音频加载状态
 */
export enum AudioLoadState {
    /** 未加载 */
    UNLOADED = 'unloaded',

    /** 加载中 */
    LOADING = 'loading',

    /** 已加载 */
    LOADED = 'loaded',

    /** 加载失败 */
    FAILED = 'failed',
}

/**
 * 音频选项
 */
export interface AudioOptions {
    /** 是否循环播放 */
    loop?: boolean;

    /** 音量（0-1） */
    volume?: number;

    /** 播放速率 */
    playbackRate?: number;

    /** 开始时间（秒） */
    startTime?: number;

    /** 自动播放 */
    autoplay?: boolean;
}

/**
 * 音频事件处理器
 */
export interface AudioEventHandlers {
    /** 加载完成 */
    onLoad?: () => void;

    /** 播放错误 */
    onError?: (error: Error) => void;

    /** 播放开始 */
    onPlay?: () => void;

    /** 暂停 */
    onPause?: () => void;

    /** 播放结束 */
    onEnded?: () => void;

    /** 播放进度更新 */
    onTimeUpdate?: (currentTime: number, duration: number) => void;
}

/**
 * 飞书小程序音频适配器接口
 */
export interface IAudioAdapter {
    /**
     * 加载音频
     * @param src 音频文件路径
     * @returns Promise<void>
     */
    load(src: string): Promise<void>;

    /**
     * 播放音频
     * @param options 播放选项
     */
    play(options?: AudioOptions): void;

    /**
     * 暂停音频
     */
    pause(): void;

    /**
     * 停止音频
     */
    stop(): void;

    /**
     * 跳转到指定时间
     * @param time 时间（秒）
     */
    seek(time: number): void;

    /**
     * 设置音量
     * @param volume 音量（0-1）
     */
    setVolume(volume: number): void;

    /**
     * 获取音量
     */
    getVolume(): number;

    /**
     * 设置播放速率
     * @param rate 播放速率
     */
    setPlaybackRate(rate: number): void;

    /**
     * 获取播放速率
     */
    getPlaybackRate(): number;

    /**
     * 设置循环播放
     * @param loop 是否循环
     */
    setLoop(loop: boolean): void;

    /**
     * 获取循环状态
     */
    isLooping(): boolean;

    /**
     * 获取当前播放时间（秒）
     */
    getCurrentTime(): number;

    /**
     * 获取音频总时长（秒）
     */
    getDuration(): number;

    /**
     * 获取播放状态
     */
    getPlayState(): AudioPlayState;

    /**
     * 获取加载状态
     */
    getLoadState(): AudioLoadState;

    /**
     * 销毁音频
     */
    destroy(): void;

    /**
     * 注册事件处理器
     * @param handlers 事件处理器
     */
    on(handlers: AudioEventHandlers): void;

    /**
     * 取消事件处理器
     * @param handlers 事件处理器
     */
    off(handlers: AudioEventHandlers): void;
}

/**
 * 标准 Web Audio 适配器（浏览器环境）
 */
class StandardAudioAdapter implements IAudioAdapter {
    private audio: HTMLAudioElement | null = null;
    private loadState: AudioLoadState = AudioLoadState.UNLOADED;
    private playState: AudioPlayState = AudioPlayState.IDLE;
    private handlers: AudioEventHandlers = {};

    async load(src: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.loadState = AudioLoadState.LOADING;

            this.audio = new Audio(src);

            this.audio.addEventListener('canplaythrough', () => {
                this.loadState = AudioLoadState.LOADED;
                this.handlers.onLoad?.();
                resolve();
            }, { once: true });

            this.audio.addEventListener('error', () => {
                this.loadState = AudioLoadState.FAILED;
                this.playState = AudioPlayState.ERROR;
                this.handlers.onError?.(new Error(`Failed to load audio: ${src}`));
                reject(new Error(`Failed to load audio: ${src}`));
            });

            this.audio.addEventListener('ended', () => {
                this.playState = AudioPlayState.ENDED;
                this.handlers.onEnded?.();
            });

            this.audio.addEventListener('play', () => {
                this.playState = AudioPlayState.PLAYING;
                this.handlers.onPlay?.();
            });

            this.audio.addEventListener('pause', () => {
                if (this.playState !== AudioPlayState.ENDED) {
                    this.playState = AudioPlayState.PAUSED;
                    this.handlers.onPause?.();
                }
            });

            this.audio.addEventListener('timeupdate', () => {
                if (this.audio) {
                    this.handlers.onTimeUpdate?.(this.audio.currentTime, this.audio.duration);
                }
            });

            // 触发加载
            this.audio.load();
        });
    }

    play(options?: AudioOptions): void {
        if (!this.audio) {
            throw new Error('Audio not loaded');
        }

        if (options?.loop !== undefined) {
            this.audio.loop = options.loop;
        }
        if (options?.volume !== undefined) {
            this.audio.volume = options.volume;
        }
        if (options?.playbackRate !== undefined) {
            this.audio.playbackRate = options.playbackRate;
        }
        if (options?.startTime !== undefined) {
            this.audio.currentTime = options.startTime;
        }

        this.audio.play().catch((error) => {
            console.error('[StandardAudioAdapter] Play failed:', error);
            this.handlers.onError?.(error);
        });
    }

    pause(): void {
        if (this.audio) {
            this.audio.pause();
        }
    }

    stop(): void {
        if (this.audio) {
            this.audio.pause();
            this.audio.currentTime = 0;
        }
    }

    seek(time: number): void {
        if (this.audio) {
            this.audio.currentTime = time;
        }
    }

    setVolume(volume: number): void {
        if (this.audio) {
            this.audio.volume = Math.max(0, Math.min(1, volume));
        }
    }

    getVolume(): number {
        return this.audio?.volume ?? 1;
    }

    setPlaybackRate(rate: number): void {
        if (this.audio) {
            this.audio.playbackRate = rate;
        }
    }

    getPlaybackRate(): number {
        return this.audio?.playbackRate ?? 1;
    }

    setLoop(loop: boolean): void {
        if (this.audio) {
            this.audio.loop = loop;
        }
    }

    isLooping(): boolean {
        return this.audio?.loop ?? false;
    }

    getCurrentTime(): number {
        return this.audio?.currentTime ?? 0;
    }

    getDuration(): number {
        return this.audio?.duration ?? 0;
    }

    getPlayState(): AudioPlayState {
        return this.playState;
    }

    getLoadState(): AudioLoadState {
        return this.loadState;
    }

    destroy(): void {
        if (this.audio) {
            this.audio.pause();
            this.audio.src = '';
            this.audio.load();
            this.audio = null;
        }
        this.loadState = AudioLoadState.UNLOADED;
        this.playState = AudioPlayState.IDLE;
        this.handlers = {};
    }

    on(handlers: AudioEventHandlers): void {
        Object.assign(this.handlers, handlers);
    }

    off(handlers: AudioEventHandlers): void {
        Object.keys(handlers).forEach(key => {
            delete this.handlers[key as keyof AudioEventHandlers];
        });
    }
}

/**
 * 飞书小程序音频适配器
 */
class FeishuAudioAdapterImpl implements IAudioAdapter {
    private innerAudioContext: any; // 飞书小程序 InnerAudioContext
    private loadState: AudioLoadState = AudioLoadState.UNLOADED;
    private playState: AudioPlayState = AudioPlayState.IDLE;
    private handlers: AudioEventHandlers = {};
    private src: string = '';

    async load(src: string): Promise<void> {
        return new Promise((resolve, reject) => {
            // 飞书小程序环境检测
            const uni = (globalThis as any).uni;
            if (typeof uni === 'undefined') {
                reject(new Error('Not in Feishu environment'));
                return;
            }

            this.src = src;
            this.loadState = AudioLoadState.LOADING;

            // 创建飞书小程序音频上下文
            this.innerAudioContext = uni.createInnerAudioContext();
            this.innerAudioContext.src = src;

            this.innerAudioContext.onCanplay(() => {
                this.loadState = AudioLoadState.LOADED;
                this.handlers.onLoad?.();
                resolve();
            });

            this.innerAudioContext.onError((error: any) => {
                this.loadState = AudioLoadState.FAILED;
                this.playState = AudioPlayState.ERROR;
                this.handlers.onError?.(new Error(`Failed to load audio: ${this.src}, ${error.errMsg}`));
                reject(new Error(`Failed to load audio: ${this.src}, ${error.errMsg}`));
            });

            this.innerAudioContext.onEnded(() => {
                this.playState = AudioPlayState.ENDED;
                this.handlers.onEnded?.();
            });

            this.innerAudioContext.onPlay(() => {
                this.playState = AudioPlayState.PLAYING;
                this.handlers.onPlay?.();
            });

            this.innerAudioContext.onPause(() => {
                if (this.playState !== AudioPlayState.ENDED) {
                    this.playState = AudioPlayState.PAUSED;
                    this.handlers.onPause?.();
                }
            });

            this.innerAudioContext.onTimeUpdate(() => {
                this.handlers.onTimeUpdate?.(this.innerAudioContext.currentTime, this.innerAudioContext.duration);
            });
        });
    }

    play(options?: AudioOptions): void {
        const uni = (globalThis as any).uni;
        if (typeof uni === 'undefined' || !this.innerAudioContext) {
            throw new Error('Audio not loaded');
        }

        if (options?.loop !== undefined) {
            this.innerAudioContext.loop = options.loop;
        }
        if (options?.volume !== undefined) {
            this.innerAudioContext.volume = Math.max(0, Math.min(1, options.volume));
        }
        if (options?.playbackRate !== undefined) {
            this.innerAudioContext.playbackRate = options.playbackRate;
        }
        if (options?.startTime !== undefined) {
            this.innerAudioContext.startTime = options.startTime;
        }

        this.innerAudioContext.play();
    }

    pause(): void {
        if (this.innerAudioContext) {
            this.innerAudioContext.pause();
        }
    }

    stop(): void {
        if (this.innerAudioContext) {
            this.innerAudioContext.stop();
        }
    }

    seek(time: number): void {
        if (this.innerAudioContext) {
            this.innerAudioContext.seek(time);
        }
    }

    setVolume(volume: number): void {
        if (this.innerAudioContext) {
            this.innerAudioContext.volume = Math.max(0, Math.min(1, volume));
        }
    }

    getVolume(): number {
        return this.innerAudioContext?.volume ?? 1;
    }

    setPlaybackRate(rate: number): void {
        if (this.innerAudioContext) {
            this.innerAudioContext.playbackRate = rate;
        }
    }

    getPlaybackRate(): number {
        return this.innerAudioContext?.playbackRate ?? 1;
    }

    setLoop(loop: boolean): void {
        if (this.innerAudioContext) {
            this.innerAudioContext.loop = loop;
        }
    }

    isLooping(): boolean {
        return this.innerAudioContext?.loop ?? false;
    }

    getCurrentTime(): number {
        return this.innerAudioContext?.currentTime ?? 0;
    }

    getDuration(): number {
        return this.innerAudioContext?.duration ?? 0;
    }

    getPlayState(): AudioPlayState {
        return this.playState;
    }

    getLoadState(): AudioLoadState {
        return this.loadState;
    }

    destroy(): void {
        if (this.innerAudioContext) {
            this.innerAudioContext.destroy();
            this.innerAudioContext = null;
        }
        this.loadState = AudioLoadState.UNLOADED;
        this.playState = AudioPlayState.IDLE;
        this.handlers = {};
    }

    on(handlers: AudioEventHandlers): void {
        Object.assign(this.handlers, handlers);
    }

    off(handlers: AudioEventHandlers): void {
        Object.keys(handlers).forEach(key => {
            delete this.handlers[key as keyof AudioEventHandlers];
        });
    }
}

/**
 * 音频适配器工厂
 */
export class AudioAdapterFactory {
    /**
     * 检测当前运行环境
     */
    private static detectEnvironment(): 'feishu' | 'standard' {
        // 检测是否为飞书小程序环境
        const uni = (globalThis as any).uni;
        if (typeof uni !== 'undefined' && uni.getSystemInfoSync) {
            const systemInfo = uni.getSystemInfoSync();
            if (systemInfo.platform === 'ios' || systemInfo.platform === 'android') {
                return 'feishu';
            }
        }
        return 'standard';
    }

    /**
     * 创建音频适配器
     * @returns 音频适配器实例
     */
    public static create(): IAudioAdapter {
        const env = this.detectEnvironment();

        console.log(`[AudioAdapterFactory] Detected environment: ${env}`);

        switch (env) {
            case 'feishu':
                return new FeishuAudioAdapterImpl();
            case 'standard':
            default:
                return new StandardAudioAdapter();
        }
    }

    /**
     * 检查是否在飞书小程序环境中
     */
    public static isFeishuEnvironment(): boolean {
        return this.detectEnvironment() === 'feishu';
    }
}

/**
 * 音频管理器
 * 管理多个音频实例，支持背景音乐和音效
 */
export class AudioManager {
    private static instance: AudioManager;
    private adapters: Map<string, IAudioAdapter> = new Map();
    private bgmAdapter: IAudioAdapter | null = null;

    private constructor() {}

    /**
     * 获取单例实例
     */
    public static getInstance(): AudioManager {
        if (!AudioManager.instance) {
            AudioManager.instance = new AudioManager();
        }
        return AudioManager.instance;
    }

    /**
     * 创建音频实例
     * @param key 音频键名
     * @returns 音频适配器
     */
    public createAudio(key: string): IAudioAdapter {
        const adapter = AudioAdapterFactory.create();
        this.adapters.set(key, adapter);
        return adapter;
    }

    /**
     * 获取音频实例
     * @param key 音频键名
     * @returns 音频适配器
     */
    public getAudio(key: string): IAudioAdapter | undefined {
        return this.adapters.get(key);
    }

    /**
     * 销毁音频实例
     * @param key 音频键名
     */
    public destroyAudio(key: string): void {
        const adapter = this.adapters.get(key);
        if (adapter) {
            adapter.destroy();
            this.adapters.delete(key);
        }
    }

    /**
     * 播放背景音乐
     * @param src 音乐文件路径
     * @param options 播放选项
     */
    public async playBGM(src: string, options?: AudioOptions): Promise<void> {
        if (this.bgmAdapter) {
            this.bgmAdapter.stop();
        }

        this.bgmAdapter = AudioAdapterFactory.create();
        await this.bgmAdapter.load(src);
        this.bgmAdapter.play({ ...options, loop: true });
    }

    /**
     * 停止背景音乐
     */
    public stopBGM(): void {
        if (this.bgmAdapter) {
            this.bgmAdapter.stop();
        }
    }

    /**
     * 暂停背景音乐
     */
    public pauseBGM(): void {
        if (this.bgmAdapter) {
            this.bgmAdapter.pause();
        }
    }

    /**
     * 恢复背景音乐
     */
    public resumeBGM(): void {
        if (this.bgmAdapter) {
            this.bgmAdapter.play();
        }
    }

    /**
     * 设置背景音乐音量
     * @param volume 音量（0-1）
     */
    public setBGMVolume(volume: number): void {
        if (this.bgmAdapter) {
            this.bgmAdapter.setVolume(volume);
        }
    }

    /**
     * 播放音效
     * @param src 音效文件路径
     * @param options 播放选项
     */
    public async playSFX(src: string, options?: AudioOptions): Promise<void> {
        const sfxAdapter = AudioAdapterFactory.create();
        await sfxAdapter.load(src);
        sfxAdapter.play(options);

        // 音效播放完成后自动销毁
        sfxAdapter.on({
            onEnded: () => sfxAdapter.destroy(),
            onError: () => sfxAdapter.destroy(),
        });
    }

    /**
     * 销毁所有音频
     */
    public destroyAll(): void {
        this.adapters.forEach((adapter) => adapter.destroy());
        this.adapters.clear();

        if (this.bgmAdapter) {
            this.bgmAdapter.destroy();
            this.bgmAdapter = null;
        }
    }
}

// 导出单例实例
export const audioManager = AudioManager.getInstance();
