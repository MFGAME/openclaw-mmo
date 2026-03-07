/**
 * SaveManager - 存档管理器
 *
 * 提供 LocalStorage 封装，支持多槽位存档管理
 */

/**
 * 存档数据接口
 */
export interface SaveData {
  /** 存档时间戳 */
  timestamp: number;
  /** 存档版本 */
  version: string;
  /** 实际游戏数据 */
  data: unknown;
}

/**
 * 存档槽位枚举
 */
export enum SaveSlot {
  SLOT_1 = 'slot1',
  SLOT_2 = 'slot2',
  SLOT_3 = 'slot3',
}

/**
 * 存档槽位信息
 */
export interface SlotInfo {
  /** 槽位名称 */
  name: SaveSlot;
  /** 是否有存档 */
  hasData: boolean;
  /** 存档时间 */
  timestamp: number;
  /** 存档数据大小（字节） */
  size: number;
}

/**
 * SaveManager 类 - 单例模式
 */
class SaveManager {
  private static instance: SaveManager;
  private readonly storagePrefix: string = 'openclaw_save_';
  private readonly currentVersion: string = '1.0.0';

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): SaveManager {
    if (!SaveManager.instance) {
      SaveManager.instance = new SaveManager();
    }
    return SaveManager.instance;
  }

  /**
   * 保存数据到指定槽位
   *
   * @param slot - 存档槽位
   * @param data - 要保存的数据
   * @returns 是否保存成功
   */
  saveToSlot(slot: SaveSlot, data: unknown): boolean {
    try {
      const saveData: SaveData = {
        timestamp: Date.now(),
        version: this.currentVersion,
        data,
      };
      return this.save(this.getSlotKey(slot), saveData);
    } catch (error) {
      console.error(`[SaveManager] 保存槽位 ${slot} 失败:`, error);
      return false;
    }
  }

  /**
   * 从指定槽位加载数据
   *
   * @param slot - 存档槽位
   * @returns 存档数据，不存在返回 null
   */
  loadFromSlot(slot: SaveSlot): unknown | null {
    try {
      const saveData = this.load<SaveData>(this.getSlotKey(slot));
      if (saveData) {
        return saveData.data;
      }
      return null;
    } catch (error) {
      console.error(`[SaveManager] 加载槽位 ${slot} 失败:`, error);
      return null;
    }
  }

  /**
   * 删除指定槽位的存档
   *
   * @param slot - 存档槽位
   * @returns 是否删除成功
   */
  deleteSlot(slot: SaveSlot): boolean {
    return this.delete(this.getSlotKey(slot));
  }

  /**
   * 获取所有存档槽位信息
   *
   * @returns 槽位信息数组
   */
  getSlotInfo(): SlotInfo[] {
    return Object.values(SaveSlot).map((slot) => {
      const key = this.getSlotKey(slot);
      const rawData = localStorage.getItem(key);
      const hasData = rawData !== null;

      let timestamp = 0;
      let size = 0;

      if (hasData && rawData) {
        try {
          const saveData = JSON.parse(rawData) as SaveData;
          timestamp = saveData.timestamp || 0;
          size = new Blob([rawData]).size;
        } catch {
          // JSON 解析失败，忽略
        }
      }

      return {
        name: slot as SaveSlot,
        hasData,
        timestamp,
        size,
      };
    });
  }

  /**
   * 保存数据到指定键
   *
   * @param key - 存储键名
   * @param data - 要保存的数据
   * @returns 是否保存成功
   */
  save<T>(key: string, data: T): boolean {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        console.warn('[SaveManager] localStorage 不可用');
        return false;
      }

      const fullKey = this.getFullKey(key);
      const serialized = JSON.stringify(data);
      localStorage.setItem(fullKey, serialized);
      return true;
    } catch (error) {
      console.error(`[SaveManager] 保存失败 (key: ${key}):`, error);
      return false;
    }
  }

  /**
   * 从指定键加载数据
   *
   * @param key - 存储键名
   * @returns 加载的数据，不存在返回 null
   */
  load<T>(key: string): T | null {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        console.warn('[SaveManager] localStorage 不可用');
        return null;
      }

      const fullKey = this.getFullKey(key);
      const serialized = localStorage.getItem(fullKey);

      if (serialized === null) {
        return null;
      }

      return JSON.parse(serialized) as T;
    } catch (error) {
      console.error(`[SaveManager] 加载失败 (key: ${key}):`, error);
      return null;
    }
  }

  /**
   * 删除指定键的数据
   *
   * @param key - 存储键名
   * @returns 是否删除成功
   */
  delete(key: string): boolean {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        console.warn('[SaveManager] localStorage 不可用');
        return false;
      }

      const fullKey = this.getFullKey(key);
      localStorage.removeItem(fullKey);
      return true;
    } catch (error) {
      console.error(`[SaveManager] 删除失败 (key: ${key}):`, error);
      return false;
    }
  }

  /**
   * 清空所有存档数据
   *
   * @returns 是否清空成功
   */
  clearAll(): boolean {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        console.warn('[SaveManager] localStorage 不可用');
        return false;
      }

      // 获取所有以 prefix 开头的键
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.storagePrefix)) {
          keysToRemove.push(key);
        }
      }

      // 删除所有匹配的键
      keysToRemove.forEach((key) => localStorage.removeItem(key));

      console.log(`[SaveManager] 已清空 ${keysToRemove.length} 个存档`);
      return true;
    } catch (error) {
      console.error('[SaveManager] 清空所有存档失败:', error);
      return false;
    }
  }

  /**
   * 检查指定键的数据是否存在
   *
   * @param key - 存储键名
   * @returns 是否存在
   */
  exists(key: string): boolean {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return false;
    }

    const fullKey = this.getFullKey(key);
    return localStorage.getItem(fullKey) !== null;
  }

  /**
   * 获取完整的存储键名
   *
   * @param key - 原始键名
   * @returns 带前缀的完整键名
   */
  private getFullKey(key: string): string {
    return `${this.storagePrefix}${key}`;
  }

  /**
   * 获取槽位对应的存储键名
   *
   * @param slot - 存档槽位
   * @returns 存储键名
   */
  private getSlotKey(slot: SaveSlot): string {
    return slot;
  }

  /**
   * 格式化文件大小显示
   *
   * @param bytes - 字节数
   * @returns 格式化后的字符串
   */
  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  /**
   * 格式化时间戳显示
   *
   * @param timestamp - 时间戳
   * @returns 格式化后的字符串
   */
  formatTimestamp(timestamp: number): string {
    if (timestamp === 0) return '无存档';
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

/**
 * 导出 SaveManager 单例
 */
export const saveManager = SaveManager.getInstance();
