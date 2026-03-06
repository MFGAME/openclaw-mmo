/**
 * 资源加载器
 * 支持图片、音频、JSON 文件的加载
 */
export type ResourceType = 'image' | 'audio' | 'json';

export interface ResourceLoadProgress {
    loaded: number;
    total: number;
    percentage: number;
    current?: string;
}

export type ProgressCallback = (progress: ResourceLoadProgress) => void;

interface LoadedResource {
    type: ResourceType;
    data: unknown;
    url: string;
}

/**
 * 资源加载错误
 */
export class ResourceLoadError extends Error {
    constructor(url: string, type: ResourceType, originalError?: Error) {
        super(`Failed to load ${type} resource from "${url}"${originalError ? `: ${originalError.message}` : ''}`);
        this.name = 'ResourceLoadError';
    }
}

/**
 * 资源管理器
 */
export class ResourceManager {
    private resources: Map<string, LoadedResource> = new Map();
    private loadingQueue: Array<{ url: string; type: ResourceType }> = [];
    private loadPromises: Map<string, Promise<unknown>> = new Map();
    private progressCallback: ProgressCallback | null = null;
    private loadedCount: number = 0;
    private totalToLoad: number = 0;

    /**
     * 添加资源到加载队列
     * @param url 资源 URL
     * @param type 资源类型
     */
    public add(url: string, type: ResourceType): void {
        if (this.resources.has(url)) {
            console.warn(`Resource "${url}" is already registered`);
            return;
        }

        this.loadingQueue.push({ url, type });
        this.totalToLoad++;
    }

    /**
     * 批量添加资源
     * @param resources 资源映射，键为 URL，值为资源类型
     */
    public addAll(resources: Map<string, ResourceType> | Record<string, ResourceType>): void {
        const entries = resources instanceof Map ? resources.entries() : Object.entries(resources);
        for (const [url, type] of entries) {
            this.add(url, type);
        }
    }

    /**
     * 加载所有队列中的资源
     * @param progressCallback 进度回调
     */
    public async loadAll(progressCallback?: ProgressCallback): Promise<void> {
        this.progressCallback = progressCallback || null;
        this.loadedCount = 0;

        const loadPromises: Array<Promise<void>> = [];

        for (const { url, type } of this.loadingQueue) {
            loadPromises.push(
                this.loadResource(url, type)
                    .then((data) => {
                        this.resources.set(url, { type, data, url });
                        this.loadedCount++;
                        this.updateProgress();
                    })
                    .catch((error) => {
                        console.error(`Failed to load resource "${url}":`, error);
                        throw new ResourceLoadError(url, type, error);
                    })
            );
        }

        await Promise.all(loadPromises);
        this.loadingQueue = [];
    }

    /**
     * 加载单个资源
     * @param url 资源 URL
     * @param type 资源类型
     */
    private async loadResource(url: string, type: ResourceType): Promise<unknown> {
        // 如果已经在加载中，返回现有的 Promise
        if (this.loadPromises.has(url)) {
            return this.loadPromises.get(url)!;
        }

        let promise: Promise<unknown>;

        switch (type) {
            case 'image':
                promise = this.loadImage(url);
                break;
            case 'audio':
                promise = this.loadAudio(url);
                break;
            case 'json':
                promise = this.loadJSON(url);
                break;
            default:
                throw new Error(`Unknown resource type: ${type}`);
        }

        this.loadPromises.set(url, promise);
        return promise;
    }

    /**
     * 加载图片
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
            percentage: (this.loadedCount / this.totalToLoad) * 100,
            current: this.loadingQueue[this.loadedCount]?.url
        };

        this.progressCallback(progress);
    }

    /**
     * 获取已加载的资源
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
     * @param url 图片 URL
     */
    public getImage(url: string): HTMLImageElement {
        return this.get<HTMLImageElement>(url);
    }

    /**
     * 获取音频资源
     * @param url 音频 URL
     */
    public getAudio(url: string): HTMLAudioElement {
        return this.get<HTMLAudioElement>(url);
    }

    /**
     * 获取 JSON 资源
     * @param url JSON URL
     */
    public getJSON<T = unknown>(url: string): T {
        return this.get<T>(url);
    }

    /**
     * 检查资源是否已加载
     * @param url 资源 URL
     */
    public isLoaded(url: string): boolean {
        return this.resources.has(url);
    }

    /**
     * 卸载资源
     * @param url 资源 URL
     */
    public unload(url: string): void {
        this.resources.delete(url);
        this.loadPromises.delete(url);
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
}
