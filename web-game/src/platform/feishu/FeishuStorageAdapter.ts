/**
 * 飞书小程序存储适配器
 * 负责将标准 Web Storage API 适配到飞书小程序存储 API
 */

/**
 * 存储键值对
 */
export interface StorageItem {
    /** 存储键 */
    key: string;

    /** 存储值 */
    value: string;

    /** 过期时间（毫秒时间戳），0 表示永不过期 */
    expireTime?: number;
}

/**
 * 存储适配器接口
 */
export interface IStorageAdapter {
    /**
     * 设置存储项
     * @param key 存储键
     * @param value 存储值
     */
    setItem(key: string, value: string): Promise<void>;

    /**
     * 获取存储项
     * @param key 存储键
     * @returns 存储值，不存在返回 null
     */
    getItem(key: string): Promise<string | null>;

    /**
     * 删除存储项
     * @param key 存储键
     */
    removeItem(key: string): Promise<void>;

    /**
     * 清空所有存储
     */
    clear(): Promise<void>;

    /**
     * 获取所有存储键
     * @returns 存储键数组
     */
    keys(): Promise<string[]>;

    /**
     * 获取存储大小
     * @returns 存储大小（字节）
     */
    size(): Promise<number>;

    /**
     * 检查键是否存在
     * @param key 存储键
     * @returns 是否存在
     */
    has(key: string): Promise<boolean>;

    /**
     * 设置带过期时间的存储项
     * @param key 存储键
     * @param value 存储值
     * @param ttl 过期时间（秒），0 表示永不过期
     */
    setItemWithExpire(key: string, value: string, ttl: number): Promise<void>;
}

/**
 * 标准 Web Storage 适配器（浏览器环境）
 */
class StandardStorageAdapter implements IStorageAdapter {
    private storage: Storage;

    constructor() {
        // 优先使用 localStorage，失败则使用 sessionStorage
        try {
            this.storage = window.localStorage;
            // 测试存储是否可用
            const testKey = '__storage_test__';
            this.storage.setItem(testKey, 'test');
            this.storage.removeItem(testKey);
        } catch (e) {
            console.warn('[StandardStorageAdapter] localStorage not available, using sessionStorage');
            this.storage = window.sessionStorage;
        }
    }

    async setItem(key: string, value: string): Promise<void> {
        try {
            this.storage.setItem(key, value);
        } catch (error) {
            console.error('[StandardStorageAdapter] setItem failed:', error);
            throw error;
        }
    }

    async getItem(key: string): Promise<string | null> {
        try {
            const value = this.storage.getItem(key);
            return value;
        } catch (error) {
            console.error('[StandardStorageAdapter] getItem failed:', error);
            return null;
        }
    }

    async removeItem(key: string): Promise<void> {
        try {
            this.storage.removeItem(key);
        } catch (error) {
            console.error('[StandardStorageAdapter] removeItem failed:', error);
            throw error;
        }
    }

    async clear(): Promise<void> {
        try {
            this.storage.clear();
        } catch (error) {
            console.error('[StandardStorageAdapter] clear failed:', error);
            throw error;
        }
    }

    async keys(): Promise<string[]> {
        try {
            const keys: string[] = [];
            for (let i = 0; i < this.storage.length; i++) {
                const key = this.storage.key(i);
                if (key) {
                    keys.push(key);
                }
            }
            return keys;
        } catch (error) {
            console.error('[StandardStorageAdapter] keys failed:', error);
            return [];
        }
    }

    async size(): Promise<number> {
        try {
            let size = 0;
            for (let i = 0; i < this.storage.length; i++) {
                const key = this.storage.key(i);
                if (key) {
                    const value = this.storage.getItem(key);
                    size += (key.length + (value?.length || 0)) * 2; // UTF-16 每个字符 2 字节
                }
            }
            return size;
        } catch (error) {
            console.error('[StandardStorageAdapter] size failed:', error);
            return 0;
        }
    }

    async has(key: string): Promise<boolean> {
        try {
            return this.storage.getItem(key) !== null;
        } catch (error) {
            console.error('[StandardStorageAdapter] has failed:', error);
            return false;
        }
    }

    async setItemWithExpire(key: string, value: string, ttl: number): Promise<void> {
        const expireTime = ttl > 0 ? Date.now() + ttl * 1000 : 0;
        const item: StorageItem = { key, value, expireTime };
        await this.setItem(key, JSON.stringify(item));
    }
}

/**
 * 飞书小程序存储适配器
 */
class FeishuStorageAdapterImpl implements IStorageAdapter {
    private cacheKey = '__openclaw_cache__';

    /**
     * 获取缓存数据
     */
    private getCache(): Map<string, StorageItem> {
        const uni = (globalThis as any).uni;
        if (typeof uni === 'undefined') {
            return new Map();
        }

        try {
            const data = uni.getStorageSync(this.cacheKey);
            if (data) {
                return new Map(JSON.parse(data));
            }
        } catch (e) {
            console.warn('[FeishuStorageAdapter] Failed to get cache:', e);
        }
        return new Map();
    }

    /**
     * 设置缓存数据
     */
    private setCache(cache: Map<string, StorageItem>): void {
        const uni = (globalThis as any).uni;
        if (typeof uni === 'undefined') {
            return;
        }

        try {
            uni.setStorageSync(this.cacheKey, JSON.stringify([...cache]));
        } catch (e) {
            console.warn('[FeishuStorageAdapter] Failed to set cache:', e);
        }
    }

    /**
     * 清理过期数据
     */
    private cleanExpired(cache: Map<string, StorageItem>): void {
        const now = Date.now();
        for (const [key, item] of cache) {
            if (item.expireTime && item.expireTime > 0 && item.expireTime < now) {
                cache.delete(key);
            }
        }
    }

    async setItem(key: string, value: string): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const cache = this.getCache();
                cache.set(key, { key, value, expireTime: 0 });
                this.setCache(cache);
                resolve();
            } catch (error) {
                console.error('[FeishuStorageAdapter] setItem failed:', error);
                reject(error);
            }
        });
    }

    async getItem(key: string): Promise<string | null> {
        return new Promise((resolve) => {
            try {
                const cache = this.getCache();
                this.cleanExpired(cache);
                const item = cache.get(key);
                if (!item) {
                    resolve(null);
                    return;
                }
                // 检查是否过期
                if (item.expireTime && item.expireTime > 0 && item.expireTime < Date.now()) {
                    cache.delete(key);
                    this.setCache(cache);
                    resolve(null);
                    return;
                }
                resolve(item.value);
            } catch (error) {
                console.error('[FeishuStorageAdapter] getItem failed:', error);
                resolve(null);
            }
        });
    }

    async removeItem(key: string): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const cache = this.getCache();
                cache.delete(key);
                this.setCache(cache);
                resolve();
            } catch (error) {
                console.error('[FeishuStorageAdapter] removeItem failed:', error);
                reject(error);
            }
        });
    }

    async clear(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const uni = (globalThis as any).uni;
                if (typeof uni !== 'undefined') {
                    uni.removeStorageSync(this.cacheKey);
                }
                resolve();
            } catch (error) {
                console.error('[FeishuStorageAdapter] clear failed:', error);
                reject(error);
            }
        });
    }

    async keys(): Promise<string[]> {
        return new Promise((resolve) => {
            try {
                const cache = this.getCache();
                this.cleanExpired(cache);
                resolve([...cache.keys()]);
            } catch (error) {
                console.error('[FeishuStorageAdapter] keys failed:', error);
                resolve([]);
            }
        });
    }

    async size(): Promise<number> {
        return new Promise((resolve) => {
            try {
                const cache = this.getCache();
                this.cleanExpired(cache);
                let size = 0;
                for (const item of cache.values()) {
                    size += (item.key.length + item.value.length) * 2;
                }
                resolve(size);
            } catch (error) {
                console.error('[FeishuStorageAdapter] size failed:', error);
                resolve(0);
            }
        });
    }

    async has(key: string): Promise<boolean> {
        return new Promise((resolve) => {
            try {
                const cache = this.getCache();
                this.cleanExpired(cache);
                const item = cache.get(key);
                if (!item) {
                    resolve(false);
                    return;
                }
                if (item.expireTime && item.expireTime > 0 && item.expireTime < Date.now()) {
                    resolve(false);
                    return;
                }
                resolve(true);
            } catch (error) {
                console.error('[FeishuStorageAdapter] has failed:', error);
                resolve(false);
            }
        });
    }

    async setItemWithExpire(key: string, value: string, ttl: number): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                const cache = this.getCache();
                const expireTime = ttl > 0 ? Date.now() + ttl * 1000 : 0;
                cache.set(key, { key, value, expireTime });
                this.setCache(cache);
                resolve();
            } catch (error) {
                console.error('[FeishuStorageAdapter] setItemWithExpire failed:', error);
                reject(error);
            }
        });
    }
}

/**
 * 存储适配器工厂
 */
export class StorageAdapterFactory {
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
     * 创建存储适配器
     * @returns 存储适配器实例
     */
    public static create(): IStorageAdapter {
        const env = this.detectEnvironment();

        console.log(`[StorageAdapterFactory] Detected environment: ${env}`);

        switch (env) {
            case 'feishu':
                return new FeishuStorageAdapterImpl();
            case 'standard':
            default:
                return new StandardStorageAdapter();
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
 * 存储管理器
 * 提供类型安全的存储操作
 */
export class StorageManager<T = any> {
    private adapter: IStorageAdapter;
    private keyPrefix: string;

    /**
     * 创建存储管理器
     * @param keyPrefix 键前缀，用于命名空间隔离
     */
    constructor(keyPrefix: string = 'openclaw') {
        this.adapter = StorageAdapterFactory.create();
        this.keyPrefix = keyPrefix;
    }

    /**
     * 获取完整键名
     */
    private getFullKey(key: string): string {
        return `${this.keyPrefix}:${key}`;
    }

    /**
     * 存储对象
     * @param key 存储键
     * @param value 存储值（将序列化为 JSON）
     */
    async set(key: string, value: T): Promise<void> {
        const fullKey = this.getFullKey(key);
        const jsonValue = JSON.stringify(value);
        await this.adapter.setItem(fullKey, jsonValue);
    }

    /**
     * 获取对象
     * @param key 存储键
     * @returns 存储值（反序列化后的对象）
     */
    async get(key: string): Promise<T | null> {
        const fullKey = this.getFullKey(key);
        const jsonValue = await this.adapter.getItem(fullKey);
        if (!jsonValue) {
            return null;
        }
        try {
            return JSON.parse(jsonValue) as T;
        } catch (e) {
            console.error('[StorageManager] Failed to parse JSON:', e);
            return null;
        }
    }

    /**
     * 删除对象
     * @param key 存储键
     */
    async delete(key: string): Promise<void> {
        const fullKey = this.getFullKey(key);
        await this.adapter.removeItem(fullKey);
    }

    /**
     * 清空所有存储
     */
    async clear(): Promise<void> {
        const keys = await this.adapter.keys();
        for (const key of keys) {
            if (key.startsWith(`${this.keyPrefix}:`)) {
                await this.adapter.removeItem(key);
            }
        }
    }

    /**
     * 检查键是否存在
     * @param key 存储键
     * @returns 是否存在
     */
    async has(key: string): Promise<boolean> {
        const fullKey = this.getFullKey(key);
        return await this.adapter.has(fullKey);
    }

    /**
     * 存储带过期时间的对象
     * @param key 存储键
     * @param value 存储值
     * @param ttl 过期时间（秒）
     */
    async setWithExpire(key: string, value: T, ttl: number): Promise<void> {
        const fullKey = this.getFullKey(key);
        const jsonValue = JSON.stringify(value);
        await this.adapter.setItemWithExpire(fullKey, jsonValue, ttl);
    }

    /**
     * 获取所有键
     * @returns 存储键数组（不含前缀）
     */
    async keys(): Promise<string[]> {
        const allKeys = await this.adapter.keys();
        const prefix = `${this.keyPrefix}:`;
        return allKeys
            .filter(key => key.startsWith(prefix))
            .map(key => key.slice(prefix.length));
    }

    /**
     * 获取存储大小
     * @returns 存储大小（字节）
     */
    async size(): Promise<number> {
        return await this.adapter.size();
    }
}

// 导出默认存储管理器实例
export const defaultStorage = new StorageManager();
