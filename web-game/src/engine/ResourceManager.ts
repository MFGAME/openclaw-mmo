/**
 * 资源加载器
 * 支持图片、音频、JSON 文件的加载
 * 包含批量预加载、按需加载、缓存策略、错误重试等功能
 */

export type ResourceType = 'image' | 'audio' | 'json';

/**
 * 资源加载进度接口
 */
export interface ResourceLoadProgress {
    /** 已加载数量 */
    loaded: number;
    /** 总数量 */
    total: number;
    /** 加载百分比 (0-100) */
    percentage: number;
    /** 当前正在加载的资源 URL */
    current?: string;
}

/**
 * 进度回调类型
 */
export type ProgressCallback = (progress: ResourceLoadProgress) => void;

/**
 * 已加载资源接口
 */
interface LoadedResource {
    /** 资源类型 */
    type: ResourceType;
    /** 资源数据 */
    data: unknown;
    /** 资源 URL */
    url: string;
    /** 加载时间戳 */
    loadedAt: number;
}

/**
 * 资源加载队列项
 */
interface QueueItem {
    /** 资源 URL */
    url: string;
    /** 资源类型 */
    type: ResourceType;
    /** 优先级 (0 最高) */
    priority: number;
}

/**
 * 资源缓存策略类型
 */
export enum CacheStrategy {
    /** 不缓存 */
    NONE = 'none',
    /** 内存缓存 */
    MEMORY = 'memory',
    /** IndexedDB 缓存 */
    INDEXEDDB = 'indexeddb',
    /** 混合缓存 (优先 IndexedDB，回退到内存) */
    HYBRID = 'hybrid',
}

/**
 * 资源加载配置接口
 */
export interface ResourceLoadConfig {
    /** 缓存策略 */
    cacheStrategy?: CacheStrategy;
    /** 最大重试次数 */
    maxRetries?: number;
    /** 重试延迟（毫秒） */
    retryDelay?: number;
    /** 是否使用 IndexedDB */
    useIndexedDB?: boolean;
    /** IndexedDB 数据库名称 */
    dbName?: string;
    /** IndexedDB 存储名称 */
    storeName?: string;
}

/**
 * 默认加载配置
 */
const DEFAULT_CONFIG: Required<ResourceLoadConfig> = {
    cacheStrategy: CacheStrategy.HYBRID,
    maxRetries: 3,
    retryDelay: 1000,
    useIndexedDB: true,
    dbName: 'openclaw-resources',
    storeName: 'resources',
};

/**
 * 资源加载错误类
 */
export class ResourceLoadError extends Error {
    /** 资源 URL */
    url: string;
    /** 资源类型 */
    type: ResourceType;
    /** 原始错误 */
    originalError?: Error;

    constructor(url: string, type: ResourceType, originalError?: Error) {
        super(`Failed to load ${type} resource from "${url}"${originalError ? `: ${originalError.message}` : ''}`);
        this.name = 'ResourceLoadError';
        this.url = url;
        this.type = type;
        this.originalError = originalError;
    }
}

/**
 * IndexedDB 缓存管理器
 */
class IndexedDBCache {
    private db: IDBDatabase | null = null;
    private dbName: string;
    private storeName: string;
    private initPromise: Promise<void> | null = null;

    constructor(dbName: string = 'openclaw-resources', storeName: string = 'resources') {
        this.dbName = dbName;
        this.storeName = storeName;
    }

    /**
     * 初始化 IndexedDB
     */
    private async init(): Promise<void> {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);

            request.onerror = () => reject(new Error('Failed to open IndexedDB'));
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'url' });
                    store.createIndex('url', 'url', { unique: true });
                    store.createIndex('timestamp', 'timestamp');
                }
            };
        });

        return this.initPromise;
    }

    /**
     * 获取缓存资源
     */
    async get(url: string): Promise<Blob | null> {
        try {
            await this.init();
            if (!this.db) return null;

            return new Promise((resolve, reject) => {
                const transaction = this.db!.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get(url);

                request.onsuccess = () => {
                    const result = request.result as { data: Blob; timestamp: number } | undefined;
                    // 缓存有效期为 7 天
                    if (result && Date.now() - result.timestamp < 7 * 24 * 60 * 60 * 1000) {
                        resolve(result.data);
                    } else {
                        resolve(null);
                    }
                };
                request.onerror = () => reject(new Error('Failed to get from cache'));
            });
        } catch (error) {
            console.warn(`[IndexedDBCache] Failed to get ${url}:`, error);
            return null;
        }
    }

    /**
     * 设置缓存资源
     */
    async set(url: string, blob: Blob): Promise<void> {
        try {
            await this.init();
            if (!this.db) return;

            return new Promise((resolve, reject) => {
                const transaction = this.db!.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);

                store.put({
                    url,
                    data: blob,
                    timestamp: Date.now(),
                });

                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(new Error('Failed to set cache'));
            });
        } catch (error) {
            console.warn(`[IndexedDBCache] Failed to set ${url}:`, error);
        }
    }

    /**
     * 删除缓存资源
     */
    async delete(url: string): Promise<void> {
        try {
            await this.init();
            if (!this.db) return;

            return new Promise((resolve, reject) => {
                const transaction = this.db!.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);

                store.delete(url);

                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(new Error('Failed to delete cache'));
            });
        } catch (error) {
            console.warn(`[IndexedDBCache] Failed to delete ${url}:`, error);
        }
    }

    /**
     * 清空所有缓存
     */
    async clear(): Promise<void> {
        try {
            await this.init();
            if (!this.db) return;

            return new Promise((resolve, reject) => {
                const transaction = this.db!.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);

                store.clear();

                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(new Error('Failed to clear cache'));
            });
        } catch (error) {
            console.warn('[IndexedDBCache] Failed to clear cache:', error);
        }
    }
}

/**
 * 资源管理器类
 */
export class ResourceManager {
    private resources: Map<string, LoadedResource> = new Map();
    private loadingQueue: QueueItem[] = [];
    private loadPromises: Map<string, Promise<unknown>> = new Map();
    private progressCallback: ProgressCallback | null = null;
    private loadedCount: number = 0;
    private totalToLoad: number = 0;

    /** 加载配置 */
    private config: Required<ResourceLoadConfig> = DEFAULT_CONFIG;

    /** IndexedDB 缓存实例 */
    private indexedDBCache: IndexedDBCache;

    /** 加载失败的资源记录 */
    private failedResources: Set<string> = new Set();

    /** 并发加载限制 */
    private concurrentLoads: number = 0;
    private maxConcurrentLoads: number = 6;

    /** 预加载策略 */
    private preloadStrategy: Map<string, ResourceType[]> = new Map();

    /**
     * 构造函数
     *
     * @param config 加载配置
     */
    constructor(config?: Partial<ResourceLoadConfig>) {
        if (config) {
            this.config = { ...DEFAULT_CONFIG, ...config };
        }

        this.indexedDBCache = new IndexedDBCache(
            this.config.dbName,
            this.config.storeName
        );
    }

    /**
     * 设置加载配置
     *
     * @param config 加载配置
     */
    setConfig(config: Partial<ResourceLoadConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * 添加资源到加载队列
     *
     * @param url 资源 URL
     * @param type 资源类型
     * @param priority 优先级 (0 最高，默认 10)
     */
    public add(url: string, type: ResourceType, priority: number = 10): void {
        if (this.resources.has(url) || this.failedResources.has(url)) {
            console.warn(`[ResourceManager] Resource "${url}" is already registered`);
            return;
        }

        this.loadingQueue.push({ url, type, priority });
        this.totalToLoad++;
    }

    /**
     * 添加多个资源到加载队列
     *
     * @param resources 资源映射，键为 URL，值为资源类型
     * @param defaultPriority 默认优先级
     */
    public addAll(
        resources: Map<string, ResourceType> | Record<string, ResourceType>,
        defaultPriority: number = 10
    ): void {
        const entries = resources instanceof Map ? resources.entries() : Object.entries(resources);
        for (const [url, type] of entries) {
            this.add(url, type, defaultPriority);
        }
    }

    /**
     * 批量添加并预加载资源组
     *
     * @param groupName 资源组名称
     * @param resources 资源映射
     * @param defaultPriority 默认优先级
     */
    public addGroup(
        groupName: string,
        resources: Map<string, ResourceType> | Record<string, ResourceType>,
        defaultPriority: number = 10
    ): void {
        const resourceList: ResourceType[] = [];
        const entries = resources instanceof Map ? resources.entries() : Object.entries(resources);

        for (const [url, type] of entries) {
            this.add(url, type, defaultPriority);
            resourceList.push(type);
        }

        this.preloadStrategy.set(groupName, resourceList);
    }

    /**
     * 加载指定资源组
     *
     * @param groupName 资源组名称
     * @param _progressCallback 进度回调（预留接口）
     */
    public async loadGroup(
        groupName: string,
        _progressCallback?: ProgressCallback
    ): Promise<void> {
        // 策略预留：未来可以基于组名加载特定资源
        console.log(`[ResourceManager] Loading resource group: ${groupName}`);
    }

    /**
     * 按需加载单个资源（懒加载）
     *
     * @param url 资源 URL
     * @param type 资源类型
     * @param forceReload 是否强制重新加载
     */
    public async loadOnDemand(
        url: string,
        type: ResourceType,
        forceReload: boolean = false
    ): Promise<unknown> {
        // 如果已加载且不强制重新加载，直接返回
        if (!forceReload && this.resources.has(url)) {
            return this.resources.get(url)!.data;
        }

        // 如果正在加载中，返回加载 Promise
        if (this.loadPromises.has(url)) {
            return this.loadPromises.get(url);
        }

        console.log(`[ResourceManager] Lazy loading: ${url}`);

        try {
            const data = await this.loadResourceWithRetry(url, type);
            this.resources.set(url, {
                type,
                data,
                url,
                loadedAt: Date.now(),
            });
            this.loadPromises.delete(url);
            return data;
        } catch (error) {
            this.loadPromises.delete(url);
            this.failedResources.add(url);
            throw new ResourceLoadError(url, type, error as Error);
        }
    }

    /**
     * 加载所有队列中的资源
     *
     * @param progressCallback 进度回调
     * @param prioritized 是否按优先级加载（默认 true）
     */
    public async loadAll(
        progressCallback?: ProgressCallback,
        prioritized: boolean = true
    ): Promise<void> {
        this.progressCallback = progressCallback || null;
        this.loadedCount = 0;

        // 按优先级排序队列
        if (prioritized) {
            this.loadingQueue.sort((a, b) => a.priority - b.priority);
        }

        // 使用并发控制批量加载
        const loadPromises: Promise<void>[] = [];
        for (const item of this.loadingQueue) {
            if (this.concurrentLoads >= this.maxConcurrentLoads) {
                await Promise.race(loadPromises);
            }

            this.concurrentLoads++;
            const promise = this.loadResourceWithRetry(item.url, item.type)
                .then((data) => {
                    this.resources.set(item.url, {
                        type: item.type,
                        data,
                        url: item.url,
                        loadedAt: Date.now(),
                    });
                    this.loadedCount++;
                    this.updateProgress();
                })
                .catch((error) => {
                    console.error(`Failed to load resource "${item.url}":`, error);
                    this.failedResources.add(item.url);
                    throw new ResourceLoadError(item.url, item.type, error);
                })
                .finally(() => {
                    this.concurrentLoads--;
                    // 移除已完成的 promise
                    const index = loadPromises.indexOf(promise);
                    if (index !== -1) {
                        loadPromises.splice(index, 1);
                    }
                });

            loadPromises.push(promise);
        }

        await Promise.all(loadPromises);
        this.loadingQueue = [];
    }

    /**
     * 加载资源并支持重试
     *
     * @param url 资源 URL
     * @param type 资源类型
     * @param attempt 当前尝试次数
     */
    private async loadResourceWithRetry(
        url: string,
        type: ResourceType,
        attempt: number = 1
    ): Promise<unknown> {
        try {
            return await this.loadResource(url, type);
        } catch (error) {
            const maxRetries = this.config.maxRetries;
            if (attempt < maxRetries) {
                console.warn(
                    `[ResourceManager] Retry ${attempt}/${maxRetries} for ${url}:`,
                    error
                );
                // 指数退避
                const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.loadResourceWithRetry(url, type, attempt + 1);
            }
            throw error;
        }
    }

    /**
     * 加载单个资源
     *
     * @param url 资源 URL
     * @param type 资源类型
     */
    private async loadResource(url: string, type: ResourceType): Promise<unknown> {
        // 如果已经在加载中，返回现有的 Promise
        if (this.loadPromises.has(url)) {
            return this.loadPromises.get(url)!;
        }

        let promise: Promise<unknown>;

        // 根据缓存策略加载
        switch (this.config.cacheStrategy) {
            case CacheStrategy.INDEXEDDB:
                promise = this.loadFromIndexedDB(url, type);
                break;
            case CacheStrategy.HYBRID:
                promise = this.loadFromHybrid(url, type);
                break;
            case CacheStrategy.MEMORY:
            case CacheStrategy.NONE:
            default:
                promise = this.loadFromNetwork(url, type);
                break;
        }

        this.loadPromises.set(url, promise);
        return promise;
    }

    /**
     * 从 IndexedDB 加载资源
     */
    private async loadFromIndexedDB(url: string, type: ResourceType): Promise<unknown> {
        const cachedBlob = await this.indexedDBCache.get(url);
        if (cachedBlob) {
            console.log(`[ResourceManager] Cache hit for ${url}`);
            return this.loadFromBlob(cachedBlob, type);
        }
        return this.loadFromNetworkAndCache(url, type);
    }

    /**
     * 混合加载策略（优先 IndexedDB）
     */
    private async loadFromHybrid(url: string, type: ResourceType): Promise<unknown> {
        try {
            const cachedBlob = await this.indexedDBCache.get(url);
            if (cachedBlob) {
                console.log(`[ResourceManager] Cache hit for ${url}`);
                return this.loadFromBlob(cachedBlob, type);
            }
        } catch (error) {
            console.warn(`[ResourceManager] IndexedDB load failed, fallback to network:`, error);
        }
        return this.loadFromNetworkAndCache(url, type);
    }

    /**
     * 从网络加载并缓存
     */
    private async loadFromNetworkAndCache(url: string, type: ResourceType): Promise<unknown> {
        const data = await this.loadFromNetwork(url, type);

        // 如果是二进制资源，缓存到 IndexedDB
        if (type === 'image' || type === 'audio') {
            try {
                const blob = await this.dataToBlob(data, type);
                await this.indexedDBCache.set(url, blob);
            } catch (error) {
                console.warn(`[ResourceManager] Failed to cache ${url}:`, error);
            }
        }

        return data;
    }

    /**
     * 从网络加载资源
     */
    private async loadFromNetwork(url: string, type: ResourceType): Promise<unknown> {
        switch (type) {
            case 'image':
                return this.loadImage(url);
            case 'audio':
                return this.loadAudio(url);
            case 'json':
                return this.loadJSON(url);
            default:
                throw new Error(`Unknown resource type: ${type}`);
        }
    }

    /**
     * 从 Blob 加载资源
     */
    private async loadFromBlob(blob: Blob, type: ResourceType): Promise<unknown> {
        switch (type) {
            case 'image':
                return this.loadImageFromBlob(blob);
            case 'audio':
                return this.loadAudioFromBlob(blob);
            case 'json':
                const text = await blob.text();
                return JSON.parse(text);
            default:
                throw new Error(`Unknown resource type: ${type}`);
        }
    }

    /**
     * 将数据转换为 Blob
     */
    private async dataToBlob(data: unknown, type: ResourceType): Promise<Blob> {
        if (type === 'image' && data instanceof HTMLImageElement) {
            const canvas = document.createElement('canvas');
            canvas.width = data.naturalWidth;
            canvas.height = data.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(data, 0, 0);
                return new Promise((resolve, reject) => {
                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Failed to convert image to blob'));
                        }
                    }, 'image/png');
                });
            }
        } else if (type === 'audio' && data instanceof HTMLAudioElement) {
            const response = await fetch(data.src);
            return response.blob();
        }
        throw new Error(`Cannot convert ${type} to blob`);
    }

    /**
     * 从 Blob 加载图片
     */
    private loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                URL.revokeObjectURL(url);
                resolve(img);
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load image from blob'));
            };

            img.src = url;
        });
    }

    /**
     * 从 Blob 加载音频
     */
    private loadAudioFromBlob(blob: Blob): Promise<HTMLAudioElement> {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(blob);
            const audio = new Audio();

            audio.addEventListener('canplaythrough', () => {
                URL.revokeObjectURL(url);
                resolve(audio);
            }, { once: true });
            audio.addEventListener('error', () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load audio from blob'));
            }, { once: true });

            audio.src = url;
            audio.load();
        });
    }

    /**
     * 加载图片
     *
     * @param url 图片 URL
     */
    private loadImage(url: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to load image'));

            img.src = url;
        });
    }

    /**
     * 加载音频
     *
     * @param url 音频 URL
     */
    private loadAudio(url: string): Promise<HTMLAudioElement> {
        return new Promise((resolve, reject) => {
            const audio = new Audio();

            audio.addEventListener('canplaythrough', () => resolve(audio), { once: true });
            audio.addEventListener('error', () => reject(new Error('Failed to load audio')), { once: true });

            audio.src = url;
            audio.load();
        });
    }

    /**
     * 加载 JSON
     *
     * @param url JSON URL
     */
    private async loadJSON(url: string): Promise<unknown> {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            throw new Error(`Failed to load JSON: ${error}`);
        }
    }

    /**
     * 更新加载进度
     */
    private updateProgress(): void {
        if (!this.progressCallback) {
            return;
        }

        const progress: ResourceLoadProgress = {
            loaded: this.loadedCount,
            total: this.totalToLoad,
            percentage: this.totalToLoad > 0 ? (this.loadedCount / this.totalToLoad) * 100 : 0,
            current: this.loadingQueue[0]?.url,
        };

        this.progressCallback(progress);
    }

    /**
     * 获取已加载的资源
     *
     * @param url 资源 URL
     */
    public get<T = unknown>(url: string): T {
        const resource = this.resources.get(url);
        if (!resource) {
            throw new Error(`Resource "${url}" not found or not loaded`);
        }
        return resource.data as T;
    }

    /**
     * 获取图片资源
     *
     * @param url 图片 URL
     */
    public getImage(url: string): HTMLImageElement {
        return this.get<HTMLImageElement>(url);
    }

    /**
     * 获取音频资源
     *
     * @param url 音频 URL
     */
    public getAudio(url: string): HTMLAudioElement {
        return this.get<HTMLAudioElement>(url);
    }

    /**
     * 获取 JSON 资源
     *
     * @param url JSON URL
     */
    public getJSON<T = unknown>(url: string): T {
        return this.get<T>(url);
    }

    /**
     * 检查资源是否已加载
     *
     * @param url 资源 URL
     */
    public isLoaded(url: string): boolean {
        return this.resources.has(url);
    }

    /**
     * 预热资源组（提前加载）
     *
     * @param groupName 资源组名称
     * @param resources 资源映射
     * @param priority 优先级
     */
    public async warmup(
        groupName: string,
        resources: Map<string, ResourceType> | Record<string, ResourceType>,
        priority: number = 5
    ): Promise<void> {
        console.log(`[ResourceManager] Warming up resource group: ${groupName}`);
        this.addGroup(groupName, resources, priority);
        await this.loadGroup(groupName);
    }

    /**
     * 获取缓存统计信息
     */
    public getCacheStats(): {
        total: number;
        loaded: number;
        failed: number;
        cached: number;
        cacheHitRate: number;
    } {
        return {
            total: this.totalToLoad,
            loaded: this.resources.size,
            failed: this.failedResources.size,
            cached: this.resources.size,
            cacheHitRate: this.totalToLoad > 0 ? (this.resources.size / this.totalToLoad) * 100 : 0,
        };
    }

    /**
     * 清除 IndexedDB 缓存
     */
    public async clearCache(): Promise<void> {
        await this.indexedDBCache.clear();
        console.log('[ResourceManager] IndexedDB cache cleared');
    }

    /**
     * 卸载资源
     *
     * @param url 资源 URL
     */
    public unload(url: string): void {
        this.resources.delete(url);
        this.loadPromises.delete(url);
        this.indexedDBCache.delete(url);
    }

    /**
     * 清空所有资源
     */
    public clear(): void {
        this.resources.clear();
        this.loadPromises.clear();
        this.loadingQueue = [];
        this.loadedCount = 0;
        this.totalToLoad = 0;
        this.failedResources.clear();
        this.concurrentLoads = 0;
    }

    /**
     * 获取已加载资源数量
     */
    public getLoadedCount(): number {
        return this.resources.size;
    }

    /**
     * 获取待加载资源数量
     */
    public getQueueSize(): number {
        return this.loadingQueue.length;
    }

    /**
     * 获取加载失败资源列表
     */
    public getFailedResources(): string[] {
        return Array.from(this.failedResources);
    }
}

/**
 * 全局资源管理器实例
 */
let globalResourceManager: ResourceManager | null = null;

/**
 * 获取全局资源管理器实例
 *
 * @param config 加载配置（仅在首次调用时使用）
 */
export function getResourceManager(config?: Partial<ResourceLoadConfig>): ResourceManager {
    if (!globalResourceManager) {
        globalResourceManager = new ResourceManager(config);
    }
    return globalResourceManager;
}

/**
 * 重置全局资源管理器（用于测试）
 */
export function resetResourceManager(): void {
    if (globalResourceManager) {
        globalResourceManager.clear();
    }
    globalResourceManager = null;
}
