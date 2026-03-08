/**
 * 战斗音效管理器
 *
 * 基于 Web Audio API 的音效播放系统
 * 支持技能音效、状态效果音效、环境音效等
 *
 * 功能：
 * - 音效预加载和缓存
 * - 音效播放控制（音量、音调、立体声）
 * - 音效队列和优先级
 * - 战斗背景音乐管理
 * - 音效淡入淡出
 */

/**
 * 音效类型枚举
 */
export enum BattleSoundType {
    /** 技能释放音效 */
    TECHNIQUE = 'technique',
    /** 普通攻击音效 */
    ATTACK = 'attack',
    /** 伤害音效 */
    DAMAGE = 'damage',
    /** 治疗音效 */
    HEAL = 'heal',
    /** 状态效果音效 */
    STATUS = 'status',
    /** 升级音效 */
    LEVEL_UP = 'level_up',
    /** 战斗胜利音效 */
    VICTORY = 'victory',
    /** 战斗失败音效 */
    DEFEAT = 'defeat',
    /** 怪物出现音效 */
    MONSTER_APPEAR = 'monster_appear',
    /** 怪物倒下音效 */
    MONSTER_FAINT = 'monster_faint',
    /** 菜单选择音效 */
    MENU_SELECT = 'menu_select',
    /** 菜单确认音效 */
    MENU_CONFIRM = 'menu_confirm',
    /** 菜单取消音效 */
    MENU_CANCEL = 'menu_cancel',
    /** 错误音效 */
    ERROR = 'error',
}

/**
 * 音效元素类型
 */
export enum SoundElement {
    /** 火属性 */
    FIRE = 'fire',
    /** 水属性 */
    WATER = 'water',
    /** 草属性 */
    GRASS = 'grass',
    /** 电属性 */
    ELECTRIC = 'electric',
    /** 冰属性 */
    ICE = 'ice',
    /** 飞行属性 */
    FLYING = 'flying',
    /** 格斗属性 */
    FIGHTING = 'fighting',
    /** 毒属性 */
    POISON = 'poison',
    /** 地面属性 */
    GROUND = 'ground',
    /** 岩石属性 */
    ROCK = 'rock',
    /** 虫属性 */
    BUG = 'bug',
    /** 幽灵属性 */
    GHOST = 'ghost',
    /** 钢属性 */
    STEEL = 'steel',
    /** 龙属性 */
    DRAGON = 'dragon',
    /** 恶属性 */
    DARK = 'dark',
    /** 妖精属性 */
    FAIRY = 'fairy',
    /** 一般属性 */
    NORMAL = 'normal',
}

/**
 * 战斗背景音乐类型
 */
export enum BattleMusicType {
    /** 普通战斗 */
    NORMAL = 'normal',
    /** BOSS 战斗 */
    BOSS = 'boss',
    /** 稀有怪物战斗 */
    RARE = 'rare',
    /** 竞技场战斗 */
    ARENA = 'arena',
    /** 决战 */
    FINAL = 'final',
}

/**
 * 音效播放配置接口
 */
export interface SoundPlayConfig {
    /** 音量 (0-1) */
    volume?: number;
    /** 音调倍率 (0.5-2) */
    pitch?: number;
    /** 左声道平衡 (-1 到 1) */
    pan?: number;
    /** 淡入时间（秒） */
    fadeIn?: number;
    /** 淡出时间（秒） */
    fadeOut?: number;
    /** 循环播放 */
    loop?: boolean;
}

/**
 * 音频源节点包装类
 */
class AudioSource {
    /** 音频缓冲 */
    buffer: AudioBuffer;
    /** 音源节点 */
    source: AudioBufferSourceNode;
    /** 增益节点（音量） */
    gain: GainNode;
    /** 立体声平移节点 */
    panner?: StereoPannerNode;
    /** 开始时间 */
    startTime: number;
    /** 配置 */
    config: SoundPlayConfig;
    /** 是否停止 */
    stopped: boolean = false;

    constructor(
        audioContext: AudioContext,
        buffer: AudioBuffer,
        config: SoundPlayConfig
    ) {
        this.buffer = buffer;
        this.config = config;
        this.startTime = audioContext.currentTime;

        // 创建音频源节点
        this.source = audioContext.createBufferSource();
        this.source.buffer = buffer;
        this.source.loop = config.loop || false;

        // 创建增益节点
        this.gain = audioContext.createGain();
        this.gain.gain.value = config.volume ?? 0.5;

        // 创建立体声平移节点
        if (config.pan !== undefined) {
            this.panner = audioContext.createStereoPanner();
            this.panner.pan.value = config.pan;
        }

        // 连接节点
        this.source.connect(this.gain);
        if (this.panner) {
            this.gain.connect(this.panner);
            this.panner.connect(audioContext.destination);
        } else {
            this.gain.connect(audioContext.destination);
        }

        // 处理淡入
        if (config.fadeIn) {
            this.gain.gain.setValueAtTime(0, audioContext.currentTime);
            this.gain.gain.linearRampToValueAtTime(
                config.volume ?? 0.5,
                audioContext.currentTime + config.fadeIn
            );
        }

        // 处理淡出
        if (config.fadeOut) {
            this.gain.gain.setValueAtTime(
                config.volume ?? 0.5,
                audioContext.currentTime + buffer.duration - config.fadeOut
            );
            this.gain.gain.linearRampToValueAtTime(
                0,
                audioContext.currentTime + buffer.duration
            );
        }

        // 调整音调
        if (config.pitch && config.pitch !== 1) {
            this.source.playbackRate.value = config.pitch;
        }
    }

    /**
     * 停止播放
     */
    stop(): void {
        if (this.stopped) return;
        this.stopped = true;

        // 渐出停止
        if (this.config.fadeOut) {
            this.gain.gain.linearRampToValueAtTime(0, this.gain.context.currentTime + this.config.fadeOut);
            setTimeout(() => {
                this.source.stop();
            }, this.config.fadeOut * 1000);
        } else {
            this.source.stop();
        }
    }

    /**
     * 设置音量
     */
    setVolume(volume: number): void {
        this.gain.gain.setValueAtTime(volume, this.gain.context.currentTime);
    }
}

/**
 * 战斗音效管理器类
 */
export class BattleSoundManager {
    private static instance: BattleSoundManager;

    /** 音频上下文 */
    private audioContext: AudioContext | null = null;

    /** 音频缓冲缓存 */
    private audioBuffers: Map<string, AudioBuffer> = new Map();

    /** 正在播放的音源 */
    private playingSources: Map<string, AudioSource> = new Map();

    /** 背景音乐源 */
    private bgmSource: AudioSource | null = null;

    /** 主音量 */
    private masterVolume: number = 0.7;

    /** 音效音量 */
    private sfxVolume: number = 0.8;

    /** 背景音乐音量 */
    private bgmVolume: number = 0.6;

    /** 音效路径映射 */
    private soundPaths: Map<BattleSoundType | SoundElement, string> = new Map();

    /** BGM 路径映射 */
    private bgmPaths: Map<BattleMusicType, string> = new Map();

    /**
     * 私有构造函数，确保单例
     */
    private constructor() {
        this.initializeSoundPaths();
        this.initializeBGMPaths();
    }

    /**
     * 获取单例实例
     */
    static getInstance(): BattleSoundManager {
        if (!BattleSoundManager.instance) {
            BattleSoundManager.instance = new BattleSoundManager();
        }
        return BattleSoundManager.instance;
    }

    /**
     * 初始化音效路径映射
     */
    private initializeSoundPaths(): void {
        // 战斗音效路径
        this.soundPaths.set(BattleSoundType.ATTACK, '/assets/tuxemon/sounds/attack.ogg');
        this.soundPaths.set(BattleSoundType.DAMAGE, '/assets/tuxemon/sounds/damage.ogg');
        this.soundPaths.set(BattleSoundType.HEAL, '/assets/tuxemon/sounds/heal.ogg');
        this.soundPaths.set(BattleSoundType.STATUS, '/assets/tuxemon/sounds/status.ogg');
        this.soundPaths.set(BattleSoundType.LEVEL_UP, '/assets/tuxemon/sounds/level_up.ogg');
        this.soundPaths.set(BattleSoundType.VICTORY, '/assets/tuxemon/sounds/victory.ogg');
        this.soundPaths.set(BattleSoundType.DEFEAT, '/assets/tuxemon/sounds/defeat.ogg');
        this.soundPaths.set(BattleSoundType.MONSTER_APPEAR, '/assets/tuxemon/sounds/monster_appear.ogg');
        this.soundPaths.set(BattleSoundType.MONSTER_FAINT, '/assets/tuxemon/sounds/monster_faint.ogg');
        this.soundPaths.set(BattleSoundType.MENU_SELECT, '/assets/tuxemon/sounds/menu_select.ogg');
        this.soundPaths.set(BattleSoundType.MENU_CONFIRM, '/assets/tuxemon/sounds/menu_confirm.ogg');
        this.soundPaths.set(BattleSoundType.MENU_CANCEL, '/assets/tuxemon/sounds/menu_cancel.ogg');
        this.soundPaths.set(BattleSoundType.ERROR, '/assets/tuxemon/sounds/error.ogg');

        // 属性音效路径
        this.soundPaths.set(SoundElement.FIRE, '/assets/tuxemon/sounds/element_fire.ogg');
        this.soundPaths.set(SoundElement.WATER, '/assets/tuxemon/sounds/element_water.ogg');
        this.soundPaths.set(SoundElement.GRASS, '/assets/tuxemon/sounds/element_grass.ogg');
        this.soundPaths.set(SoundElement.ELECTRIC, '/assets/tuxemon/sounds/element_electric.ogg');
        this.soundPaths.set(SoundElement.ICE, '/assets/tuxemon/sounds/element_ice.ogg');
        this.soundPaths.set(SoundElement.FLYING, '/assets/tuxemon/sounds/element_flying.ogg');
        this.soundPaths.set(SoundElement.FIGHTING, '/assets/tuxemon/sounds/element_fighting.ogg');
        this.soundPaths.set(SoundElement.POISON, '/assets/tuxemon/sounds/element_poison.ogg');
        this.soundPaths.set(SoundElement.GROUND, '/assets/tuxemon/sounds/element_ground.ogg');
        this.soundPaths.set(SoundElement.ROCK, '/assets/tuxemon/sounds/element_rock.ogg');
        this.soundPaths.set(SoundElement.BUG, '/assets/tuxemon/sounds/element_bug.ogg');
        this.soundPaths.set(SoundElement.GHOST, '/assets/tuxemon/sounds/element_ghost.ogg');
        this.soundPaths.set(SoundElement.STEEL, '/assets/tuxemon/sounds/element_steel.ogg');
        this.soundPaths.set(SoundElement.DRAGON, '/assets/tuxemon/sounds/element_dragon.ogg');
        this.soundPaths.set(SoundElement.DARK, '/assets/tuxemon/sounds/element_dark.ogg');
        this.soundPaths.set(SoundElement.FAIRY, '/assets/tuxemon/sounds/element_fairy.ogg');
        this.soundPaths.set(SoundElement.NORMAL, '/assets/tuxemon/sounds/element_normal.ogg');
    }

    /**
     * 初始化 BGM 路径映射
     */
    private initializeBGMPaths(): void {
        this.bgmPaths.set(BattleMusicType.NORMAL, '/assets/tuxemon/music/battle_normal.ogg');
        this.bgmPaths.set(BattleMusicType.BOSS, '/assets/tuxemon/music/battle_boss.ogg');
        this.bgmPaths.set(BattleMusicType.RARE, '/assets/tuxemon/music/battle_rare.ogg');
        this.bgmPaths.set(BattleMusicType.ARENA, '/assets/tuxemon/music/battle_arena.ogg');
        this.bgmPaths.set(BattleMusicType.FINAL, '/assets/tuxemon/music/battle_final.ogg');
    }

    /**
     * 初始化音频上下文
     *
     * 必须在用户交互后调用（浏览器策略）
     */
    async initialize(): Promise<void> {
        if (this.audioContext) {
            return;
        }

        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            this.audioContext = new AudioContextClass();

            // 恢复音频上下文（如果被挂起）
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            console.log('[BattleSoundManager] Audio context initialized');
        } catch (error) {
            console.error('[BattleSoundManager] Failed to initialize audio context:', error);
        }
    }

    /**
     * 加载音频缓冲
     *
     * @param url 音频 URL
     */
    private async loadAudioBuffer(url: string): Promise<AudioBuffer> {
        // 检查缓存
        if (this.audioBuffers.has(url)) {
            return this.audioBuffers.get(url)!;
        }

        // 从网络加载
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();

            if (!this.audioContext) {
                throw new Error('Audio context not initialized');
            }

            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.audioBuffers.set(url, audioBuffer);

            console.log(`[BattleSoundManager] Loaded audio: ${url}`);
            return audioBuffer;
        } catch (error) {
            console.error(`[BattleSoundManager] Failed to load audio ${url}:`, error);
            throw error;
        }
    }

    /**
     * 播放音效
     *
     * @param type 音效类型
     * @param config 播放配置
     */
    async playSound(
        type: BattleSoundType | SoundElement,
        config: SoundPlayConfig = {}
    ): Promise<void> {
        if (!this.audioContext) {
            console.warn('[BattleSoundManager] Audio context not initialized');
            return;
        }

        const path = this.soundPaths.get(type);
        if (!path) {
            console.warn(`[BattleSoundManager] No path found for sound type: ${type}`);
            return;
        }

        try {
            const buffer = await this.loadAudioBuffer(path);
            this.playBuffer(buffer, {
                ...config,
                volume: (config.volume ?? 0.5) * this.sfxVolume * this.masterVolume,
            });
        } catch (error) {
            console.error(`[BattleSoundManager] Failed to play sound ${type}:`, error);
        }
    }

    /**
     * 播放音频缓冲
     *
     * @param buffer 音频缓冲
     * @param config 播放配置
     */
    private playBuffer(buffer: AudioBuffer, config: SoundPlayConfig): AudioSource {
        const source = new AudioSource(this.audioContext!, buffer, config);

        // 开始播放
        source.source.start(0);

        // 记录播放中的音源
        const sourceId = `sound_${Date.now()}_${Math.random()}`;
        this.playingSources.set(sourceId, source);

        // 播放完成后清理
        source.source.onended = () => {
            this.playingSources.delete(sourceId);
        };

        return source;
    }

    /**
     * 播放技能音效
     *
     * @param _techniqueId 技能 ID
     * @param element 属性类型
     * @param power 威力（影响音效强度）
     */
    async playTechniqueSound(
        _techniqueId: string,
        element?: SoundElement,
        power?: number
    ): Promise<void> {
        const config: SoundPlayConfig = {
            volume: 0.6,
            pitch: power ? 1 + (power - 50) / 200 : 1,
        };

        // 如果有属性，播放属性音效
        if (element) {
            await this.playSound(element, config);
        } else {
            // 默认普通攻击音效
            await this.playSound(BattleSoundType.ATTACK, config);
        }
    }

    /**
     * 播放伤害音效
     *
     * @param damage 伤害值（影响音量）
     * @param isCritical 是否暴击
     */
    async playDamageSound(damage: number, isCritical: boolean = false): Promise<void> {
        const volume = Math.min(damage / 100, 1) * 0.7;
        const pitch = isCritical ? 1.2 : 1;

        await this.playSound(BattleSoundType.DAMAGE, { volume, pitch });
    }

    /**
     * 播放治疗音效
     *
     * @param healAmount 治疗量
     */
    async playHealSound(healAmount: number): Promise<void> {
        const volume = Math.min(healAmount / 100, 1) * 0.6;

        await this.playSound(BattleSoundType.HEAL, { volume });
    }

    /**
     * 播放状态效果音效
     *
     * @param _statusEffect 状态效果类型
     */
    async playStatusSound(_statusEffect: string): Promise<void> {
        await this.playSound(BattleSoundType.STATUS, { volume: 0.5 });
    }

    /**
     * 播放升级音效
     */
    async playLevelUpSound(): Promise<void> {
        await this.playSound(BattleSoundType.LEVEL_UP, { volume: 0.7 });
    }

    /**
     * 播放战斗胜利音效
     */
    async playVictorySound(): Promise<void> {
        await this.playSound(BattleSoundType.VICTORY, { volume: 0.7 });
    }

    /**
     * 播放战斗失败音效
     */
    async playDefeatSound(): Promise<void> {
        await this.playSound(BattleSoundType.DEFEAT, { volume: 0.7 });
    }

    /**
     * 播放怪物出现音效
     */
    async playMonsterAppearSound(): Promise<void> {
        await this.playSound(BattleSoundType.MONSTER_APPEAR, { volume: 0.6 });
    }

    /**
     * 播放怪物倒下音效
     */
    async playMonsterFaintSound(): Promise<void> {
        await this.playSound(BattleSoundType.MONSTER_FAINT, { volume: 0.6 });
    }

    /**
     * 播放背景音乐
     *
     * @param type BGM 类型
     */
    async playBGM(type: BattleMusicType = BattleMusicType.NORMAL): Promise<void> {
        if (!this.audioContext) {
            console.warn('[BattleSoundManager] Audio context not initialized');
            return;
        }

        // 停止当前 BGM
        this.stopBGM();

        const path = this.bgmPaths.get(type);
        if (!path) {
            console.warn(`[BattleSoundManager] No BGM found for type: ${type}`);
            return;
        }

        try {
            const buffer = await this.loadAudioBuffer(path);
            this.bgmSource = this.playBuffer(buffer, {
                volume: this.bgmVolume * this.masterVolume,
                loop: true,
            });

            console.log(`[BattleSoundManager] Playing BGM: ${type}`);
        } catch (error) {
            console.error(`[BattleSoundManager] Failed to play BGM ${type}:`, error);
        }
    }

    /**
     * 停止背景音乐
     */
    stopBGM(): void {
        if (this.bgmSource) {
            this.bgmSource.stop();
            this.bgmSource = null;
        }
    }

    /**
     * 暂停背景音乐
     */
    pauseBGM(): void {
        if (this.audioContext && this.audioContext.state === 'running') {
            this.audioContext.suspend();
        }
    }

    /**
     * 恢复背景音乐
     */
    resumeBGM(): void {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    /**
     * 设置主音量
     *
     * @param volume 音量 (0-1)
     */
    setMasterVolume(volume: number): void {
        this.masterVolume = Math.max(0, Math.min(1, volume));
    }

    /**
     * 设置音效音量
     *
     * @param volume 音量 (0-1)
     */
    setSFXVolume(volume: number): void {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
    }

    /**
     * 设置背景音乐音量
     *
     * @param volume 音量 (0-1)
     */
    setBGMVolume(volume: number): void {
        this.bgmVolume = Math.max(0, Math.min(1, volume));

        // 实时更新当前 BGM 音量
        if (this.bgmSource) {
            this.bgmSource.setVolume(this.bgmVolume * this.masterVolume);
        }
    }

    /**
     * 预加载音效
     *
     * @param types 要预加载的音效类型列表
     */
    async preloadSounds(types: (BattleSoundType | SoundElement)[]): Promise<void> {
        if (!this.audioContext) {
            await this.initialize();
        }

        const loadPromises = types.map(type => {
            const path = this.soundPaths.get(type);
            if (path) {
                return this.loadAudioBuffer(path);
            }
            return Promise.resolve();
        });

        await Promise.all(loadPromises);
        console.log('[BattleSoundManager] Preloaded sounds:', types.length);
    }

    /**
     * 预加载 BGM
     *
     * @param types 要预加载的 BGM 类型列表
     */
    async preloadBGMs(types: BattleMusicType[]): Promise<void> {
        if (!this.audioContext) {
            await this.initialize();
        }

        const loadPromises = types.map(type => {
            const path = this.bgmPaths.get(type);
            if (path) {
                return this.loadAudioBuffer(path);
            }
            return Promise.resolve();
        });

        await Promise.all(loadPromises);
        console.log('[BattleSoundManager] Preloaded BGMs:', types.length);
    }

    /**
     * 获取当前音量设置
     */
    getVolumeSettings(): {
        master: number;
        sfx: number;
        bgm: number;
    } {
        return {
            master: this.masterVolume,
            sfx: this.sfxVolume,
            bgm: this.bgmVolume,
        };
    }

    /**
     * 清空音频缓存
     */
    clearCache(): void {
        this.audioBuffers.clear();
        console.log('[BattleSoundManager] Audio cache cleared');
    }

    /**
     * 停止所有音效
     */
    stopAllSounds(): void {
        for (const source of this.playingSources.values()) {
            source.stop();
        }
        this.playingSources.clear();
    }

    /**
     * 销毁音频管理器
     */
    destroy(): void {
        this.stopBGM();
        this.stopAllSounds();

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        this.audioBuffers.clear();
        this.playingSources.clear();
        console.log('[BattleSoundManager] Destroyed');
    }
}

/**
 * 导出战斗音效管理器单例
 */
export const battleSoundManager = BattleSoundManager.getInstance();
