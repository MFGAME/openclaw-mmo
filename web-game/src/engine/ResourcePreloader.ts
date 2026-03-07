/**
 * 资源预加载系统
 * 负责预加载游戏资源，优化加载性能
 */

/**
 * 资源类型枚举
 */
export enum ResourceType {
    /** 图片 */
    IMAGE = 'image',

    /** 音频 */
    AUDIO = 'audio',

    /** 数据 (JSON) */
    DATA = 'data',

    /** 脚本 */
    SCRIPT = 'script',
}

/**
 * 资源加载状态
 */
export enum ResourceLoadState {
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
 * 资源信息
 */
export interface ResourceInfo {
    /** 资源 ID */
    id: string;

    /** 资源 URL */
    url: string;

    /** 资源类型 */
    type: ResourceType;

    /** 优先级（数字越小优先级越高） */
    priority: number;

    /** 加载状态 */
    state: ResourceLoadState;

    /** 加载进度 (0-1) */
    progress: number;

    /** 错误信息 */
    error?: string;

    /** 是否必需 */
    required: boolean;

    /** 加载的资源 */
    resource?: any;
}

/**
 * 资源预加载器配置
 */
export interface ResourcePreloaderConfig {
    /** 最大并发加载数 */
    maxConcurrentLoads: number;

    /** 超时时间（毫秒） */
    timeout: number;

    /** 重试次数 */
    retryCount: number;

    /** 是否启用缓存 */
    enableCache: boolean;

    /** 缓存大小（MB） */
    cacheSize: number;
}

/**
 * 资源加载进度回调
 */
export interface ResourceProgressCallback {
    /** 已加载资源数 */
    loaded: number;

    /** 总资源数 */
    total: number;

    /** 加载进度 (0-1) */
    percentage: number;

    /** 当前加载的资源 ID */
    currentResource?: string;
}

/**
 * 资源预加载器
 */
export class ResourcePreloader {
    private static instance: ResourcePreloader;

    /** 资源队列 */
    private resourceQueue: ResourceInfo[] = [];

    /** 资源映射表 */
    private resourceMap: Map<string, ResourceInfo> = new Map();

    /** 当前正在加载的资源 */
    private loadingResources: Set<string> = new Set();

    /** 加载器配置 */
    private config: ResourcePreloaderConfig = {
        maxConcurrentLoads: 4,
        timeout: 30000,
        retryCount: 3,
        enableCache: true,
        cacheSize: 100,
    };

    /** 缓存 */
    private cache: Map<string, any> = new Map();

    /** 加载回调 */
    private progressCallbacks: Set<((progress: ResourceProgressCallback) => void)> = new Set();

    /** 加载 Promise */
    private loadPromise: Map<string, Promise<any>> = new Map();

    /**
     * 私有构造函数，确保单例
     */
    private constructor() {}

    /**
     * 获取资源预加载器单例实例
     */
    static getInstance(): ResourcePreloader {
        if (!ResourcePreloader.instance) {
            ResourcePreloader.instance = new ResourcePreloader();
        }
        return ResourcePreloader.instance;
    }

    /**
     * 初始化资源预加载器
     * @param config 配置选项
     */
    initialize(config?: Partial<ResourcePreloaderConfig>): void {
        if (config) {
            this.config = { ...this.config, ...config };
        }
        console.log('[ResourcePreloader] 资源预加载器已初始化', this.config);
    }

    /**
     * 添加资源到加载队列
     * @param id 资源 ID
     * @param url 资源 URL
     * @param type 资源类型
     * @param priority 优先级
     * @param required 是否必需
     */
    addResource(id: string, url: string, type: ResourceType, priority: number = 0, required: boolean = false): void {
        if (this.resourceMap.has(id)) {
            console.warn(`[ResourcePreloader] 资源 ${id} 已存在`);
            return;
        }

        const resource: ResourceInfo = {
            id,
            url,
            type,
            priority,
            required,
            state: ResourceLoadState.UNLOADED,
            progress: 0,
        };

        this.resourceQueue.push(resource);
        this.resourceMap.set(id, resource);

        // 按优先级排序
        this.sortQueue();
    }

    /**
     * 批量添加资源
     * @param resources 资源数组
     */
    addResources(resources: Array<{ id: string; url: string; type: ResourceType; priority?: number; required?: boolean }>): void {
        resources.forEach(r => {
            this.addResource(r.id, r.url, r.type, r.priority ?? 0, r.required ?? false);
        });
    }

    /**
     * 排序资源队列（按优先级）
     */
    private sortQueue(): void {
        this.resourceQueue.sort((a, b) => a.priority - b.priority);
    }

    /**
     * 加载单个资源
     * @param resource 资源信息
     * @param retryCount 重试次数
     */
    private async loadResource(resource: ResourceInfo, retryCount: number = this.config.retryCount): Promise<void> {
        // 检查缓存
        if (this.config.enableCache && this.cache.has(resource.id)) {
            resource.state = ResourceLoadState.LOADED;
            resource.progress = 1;
            resource.resource = this.cache.get(resource.id);
            return;
        }

        resource.state = ResourceLoadState.LOADING;
        this.loadingResources.add(resource.id);

        try {
            let result: any;

            switch (resource.type) {
                case ResourceType.IMAGE:
                    result = await this.loadImage(resource.url);
                    break;

                case ResourceType.AUDIO:
                    result = await this.loadAudio(resource.url);
                    break;

                case ResourceType.DATA:
                    result = await this.loadData(resource.url);
                    break;

                case ResourceType.SCRIPT:
                    result = await this.loadScript(resource.url);
                    break;

                default:
                    throw new Error(`不支持的资源类型: ${resource.type}`);
            }

            resource.state = ResourceLoadState.LOADED;
            resource.progress = 1;
            resource.resource = result;

            // 缓存资源
            if (this.config.enableCache) {
                this.cache.set(resource.id, result);
            }

        } catch (error) {
            if (retryCount > 0) {
                console.warn(`[ResourcePreloader] 加载失败，重试中 (${retryCount} 次剩余): ${resource.id}`, error);
                await this.sleep(1000); // 等待 1 秒后重试
                return this.loadResource(resource, retryCount - 1);
            }

            resource.state = ResourceLoadState.FAILED;
            resource.error = (error as Error).message;

            console.error(`[ResourcePreloader] 加载失败: ${resource.id}`, error);

            if (resource.required) {
                throw error;
            }
        } finally {
            this.loadingResources.delete(resource.id);
        }
    }

    /**
     * 加载图片
     */
    private loadImage(url: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
            img.src = url;
        });
    }

    /**
     * 加载音频
     */
    private async loadAudio(url: string): Promise<AudioBuffer> {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load audio: ${url}, status: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();

        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        return await audioContext.decodeAudioData(arrayBuffer);
    }

    /**
     * 加载数据 (JSON)
     */
    private async loadData(url: string): Promise<any> {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load data: ${url}, status: ${response.status}`);
        }
        return await response.json();
    }

    /**
     * 加载脚本
     */
    private loadScript(url: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
            script.src = url;
            document.head.appendChild(script);
        });
    }

    /**
     * 加载所有资源
     * @param progressCallback 进度回调
     */
    async loadAll(progressCallback?: (progress: ResourceProgressCallback) => void): Promise<void> {
        if (progressCallback) {
            this.progressCallbacks.add(progressCallback);
        }

        const total = this.resourceQueue.length;
        let loaded = 0;

        while (this.resourceQueue.length > 0) {
            // 检查并发限制
            if (this.loadingResources.size >= this.config.maxConcurrentLoads) {
                await this.sleep(100);
                continue;
            }

            const resource = this.resourceQueue.shift()!;
            if (!resource) continue;

            try {
                await this.loadResource(resource);
                loaded++;

                // 更新进度
                const progress: ResourceProgressCallback = {
                    loaded,
                    total,
                    percentage: loaded / total,
                    currentResource: resource.id,
                };

                this.progressCallbacks.forEach(cb => cb(progress));

            } catch (error) {
                if (resource.required) {
                    throw error;
                }
                loaded++;
            }
        }

        this.progressCallbacks.delete(progressCallback!);
    }

    /**
     * 预加载指定资源
     * @param ids 资源 ID 数组
     * @param progressCallback 进度回调
     */
    async preload(ids: string[], progressCallback?: (progress: ResourceProgressCallback) => void): Promise<void> {
        const resources = ids
            .map(id => this.resourceMap.get(id))
            .filter((r): r is ResourceInfo => r !== undefined);

        const total = resources.length;
        let loaded = 0;

        for (const resource of resources) {
            if (resource.state === ResourceLoadState.LOADED) {
                loaded++;
                continue;
            }

            try {
                await this.loadResource(resource);
            } catch (error) {
                console.error(`[ResourcePreloader] 预加载失败: ${resource.id}`, error);
            }

            loaded++;

            if (progressCallback) {
                progressCallback({
                    loaded,
                    total,
                    percentage: loaded / total,
                    currentResource: resource.id,
                });
            }
        }
    }

    /**
     * 获取资源
     * @param id 资源 ID
     */
    getResource<T = any>(id: string): T | null {
        const resource = this.resourceMap.get(id);
        return resource?.resource ?? null;
    }

    /**
     * 检查资源是否已加载
     * @param id 资源 ID
     */
    isLoaded(id: string): boolean {
        const resource = this.resourceMap.get(id);
        return resource?.state === ResourceLoadState.LOADED;
    }

    /**
     * 获取资源状态
     * @param id 资源 ID
     */
    getResourceState(id: string): ResourceLoadState {
        const resource = this.resourceMap.get(id);
        return resource?.state ?? ResourceLoadState.UNLOADED;
    }

    /**
     * 卸载资源
     * @param id 资源 ID
     */
    unloadResource(id: string): void {
        const resource = this.resourceMap.get(id);
        if (!resource) return;

        resource.state = ResourceLoadState.UNLOADED;
        resource.progress = 0;
        resource.resource = undefined;

        this.cache.delete(id);
    }

    /**
     * 清空所有资源
     */
    clear(): void {
        this.resourceQueue = [];
        this.resourceMap.clear();
        this.loadingResources.clear();
        this.cache.clear();
        this.loadPromise.clear();
    }

    /**
     * 清空缓存
     */
    clearCache(): void {
        this.cache.clear();
    }

    /**
     * 获取队列大小
     */
    getQueueSize(): number {
        return this.resourceQueue.length;
    }

    /**
     * 获取加载进度
     */
    getProgress(): ResourceProgressCallback {
        const total = this.resourceQueue.length + [...this.resourceMap.values()].filter(
            r => r.state === ResourceLoadState.LOADED
        ).length;

        const loaded = [...this.resourceMap.values()].filter(
            r => r.state === ResourceLoadState.LOADED
        ).length;

        return {
            loaded,
            total,
            percentage: total > 0 ? loaded / total : 0,
        };
    }

    /**
     * 睡眠函数
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * 导出资源预加载器单例
 */
export const resourcePreloader = ResourcePreloader.getInstance();
