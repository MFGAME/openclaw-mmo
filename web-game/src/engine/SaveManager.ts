/**
 * SaveManager - 存档管理器
 *
 * 提供完整的存档/读档功能，支持多槽位管理、版本兼容性、存档截图等
 *
 * 功能：
 * - 完整的存档数据序列化
 * - 存档文件管理（创建/删除/重命名/复制）
 * - 存档版本兼容性检查
 * - 存档截图功能
 * - 存档元数据显示（游戏时间、位置、怪物数量等）
 */

/**
 * 存档数据接口
 */
export interface SaveData {
  /** 存档时间戳 */
  timestamp: number;
  /** 存档版本 */
  version: string;
  /** 存档元数据 */
  metadata: SaveMetadata;
  /** 实际游戏数据 */
  data: GameSaveData;
}

/**
 * 存档元数据接口
 */
export interface SaveMetadata {
  /** 存档名称 */
  name: string;
  /** 游戏时间（秒） */
  gameTime: number;
  /** 地图 ID */
  mapId: string;
  /** 玩家位置 */
  playerPosition: { x: number; y: number };
  /** 怪物数量 */
  monsterCount: number;
  /** 金币数量 */
  gold: number;
  /** 玩家等级 */
  playerLevel: number;
  /** 存档截图（Base64） */
  screenshot?: string;
  /** 创建时间 */
  createdAt: number;
  /** 最后修改时间 */
  updatedAt: number;
}

/**
 * 游戏存档数据接口
 */
export interface GameSaveData {
  /** 玩家数据 */
  player: PlayerSaveData;
  /** 怪物队伍 */
  monsters: MonsterSaveData[];
  /** 背包物品 */
  inventory: ItemSaveData[];
  /** 当前地图数据 */
  currentMap: MapSaveData;
  /** 任务进度 */
  quests: QuestSaveData[];
  /** 其他自定义数据 */
  customData?: Record<string, any>;
}

/**
 * 玩家存档数据
 */
export interface PlayerSaveData {
  /** 玩家 ID */
  playerId: string;
  /** 玩家名称 */
  playerName: string;
  /** 玩家昵称 */
  name: string;
  /** 玩家等级 */
  level: number;
  /** 经验值 */
  exp: number;
  /** 当前 HP */
  currentHp: number;
  /** 最大 HP */
  maxHp: number;
  /** 金币数量 */
  gold: number;
  /** 已获得成就列表 */
  achievements: string[];
  /** 播放时间（秒） */
  playTime: number;
}

/**
 * 怪物存档数据
 */
export interface MonsterSaveData {
  /** 怪物 ID */
  monsterId: string;
  /** 怪物 Slug */
  slug: string;
  /** 怪物名称 */
  name: string;
  /** 当前等级 */
  level: number;
  /** 当前经验值 */
  exp: number;
  /** 当前 HP */
  currentHp: number;
  /** 最大 HP */
  maxHp: number;
  /** 当前技能 */
  techniques: string[];
  /** 状态效果 */
  statusEffects: string[];
  /** 个体值 */
  ivs: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
  };
  /** 努力值 */
  evs: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
  };
}

/**
 * 物品存档数据
 */
export interface ItemSaveData {
  /** 物品 ID */
  itemId: string;
  /** 物品 Slug */
  slug: string;
  /** 物品名称 */
  name: string;
  /** 物品数量 */
  quantity: number;
  /** 物品类型 */
  type: string;
}

/**
 * 地图存档数据
 */
export interface MapSaveData {
  /** 地图 ID */
  mapId: string;
  /** 地图名称 */
  mapName: string;
  /** 玩家位置 */
  playerPosition: { x: number; y: number };
  /** 已访问区域 */
  visitedAreas: string[];
  /** 触发的事件 */
  triggeredEvents: string[];
}

/**
 * 任务存档数据
 */
export interface QuestSaveData {
  /** 任务 ID */
  questId: string;
  /** 任务名称 */
  questName: string;
  /** 任务状态 */
  status: 'not_started' | 'in_progress' | 'completed';
  /** 任务进度 */
  progress: number;
  /** 已完成的步骤 */
  completedSteps: string[];
}

/**
 * 存档槽位枚举
 */
export enum SaveSlot {
  SLOT_1 = 'slot1',
  SLOT_2 = 'slot2',
  SLOT_3 = 'slot3',
  SLOT_4 = 'slot4',
  SLOT_5 = 'slot5',
  SLOT_6 = 'slot6',
  AUTO = 'auto', // 自动存档槽位
  QUICK = 'quick', // 快速存档槽位
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
  /** 存档元数据 */
  metadata?: SaveMetadata;
}

/**
 * 版本兼容性结果
 */
export interface VersionCompatibility {
  /** 是否兼容 */
  compatible: boolean;
  /** 需要迁移 */
  needsMigration: boolean;
  /** 兼容性消息 */
  message: string;
  /** 目标版本 */
  targetVersion: string;
}

/**
 * 存档创建选项
 */
export interface SaveOptions {
  /** 存档名称 */
  name?: string;
  /** 是否创建截图 */
  includeScreenshot?: boolean;
  /** Canvas 元素（用于截图） */
  canvas?: HTMLCanvasElement;
  /** 是否压缩存档 */
  compress?: boolean;
}

/**
 * 存档迁移函数类型
 */
export type SaveMigrationFunction = (oldData: any, oldVersion: string) => any;

/**
 * SaveManager 类 - 单例模式
 */
class SaveManager {
  private static instance: SaveManager;
  private readonly storagePrefix: string = 'openclaw_save_';
  private readonly currentVersion: string = '1.2.0';
  private readonly maxScreenshotSize: number = 100 * 1024; // 100KB

  /** 版本迁移映射表 */
  private readonly migrationMap: Map<string, SaveMigrationFunction> = new Map();

  /** 存档统计信息 */
  private stats: {
    totalSaves: number;
    totalSize: number;
    lastSaveTime: number;
    lastLoadTime: number;
  } = {
    totalSaves: 0,
    totalSize: 0,
    lastSaveTime: 0,
    lastLoadTime: 0,
  };

  private constructor() {
    this.initializeMigrations();
  }

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
   * 初始化版本迁移函数
   */
  private initializeMigrations(): void {
    // 1.0.0 -> 1.1.0 迁移
    this.migrationMap.set('1.0.0', (data: any) => {
      return {
        ...data,
        metadata: {
          ...data.metadata,
          // 添加新字段
          playerLevel: data.data.player?.level || 1,
        },
      };
    });

    // 1.1.0 -> 1.2.0 迁移
    this.migrationMap.set('1.1.0', (data: any) => {
      return {
        ...data,
        version: '1.2.0',
        data: {
          ...data.data,
          // 添加新字段
          customData: {},
        },
      };
    });
  }

  /**
   * 保存数据到指定槽位
   *
   * @param slot 存档槽位
   * @param data 游戏存档数据
   * @param options 存档选项
   * @returns 是否保存成功
   */
  async saveToSlot(
    slot: SaveSlot,
    data: GameSaveData,
    options: SaveOptions = {}
  ): Promise<boolean> {
    try {
      // 生成截图
      let screenshot: string | undefined;
      if (options.includeScreenshot && options.canvas) {
        screenshot = await this.captureScreenshot(options.canvas);
      }

      // 生成元数据
      const metadata: SaveMetadata = {
        name: options.name || this.generateSaveName(data),
        gameTime: data.player.playTime,
        mapId: data.currentMap.mapId,
        playerPosition: data.currentMap.playerPosition,
        monsterCount: data.monsters.length,
        gold: data.player.gold,
        playerLevel: data.player.level,
        screenshot,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const saveData: SaveData = {
        timestamp: Date.now(),
        version: this.currentVersion,
        metadata,
        data,
      };

      const success = this.save(this.getSlotKey(slot), saveData);

      if (success) {
        this.stats.totalSaves++;
        this.stats.lastSaveTime = Date.now();
        console.log(`[SaveManager] 存档成功: ${slot}`);
      }

      return success;
    } catch (error) {
      console.error(`[SaveManager] 保存槽位 ${slot} 失败:`, error);
      return false;
    }
  }

  /**
   * 从指定槽位加载数据
   *
   * @param slot 存档槽位
   * @returns 存档数据，不存在返回 null
   */
  async loadFromSlot(slot: SaveSlot): Promise<GameSaveData | null> {
    try {
      const saveData = this.load<SaveData>(this.getSlotKey(slot));
      if (!saveData) {
        return null;
      }

      // 检查版本兼容性
      const compatibility = this.checkVersionCompatibility(saveData.version);

      if (!compatibility.compatible) {
        console.warn(`[SaveManager] 存档版本不兼容: ${saveData.version}`);
        return null;
      }

      // 执行版本迁移
      let data = saveData.data;
      if (compatibility.needsMigration) {
        data = await this.migrateData(data, saveData.version);
        console.log(`[SaveManager] 存档迁移完成: ${saveData.version} -> ${this.currentVersion}`);
      }

      this.stats.lastLoadTime = Date.now();
      console.log(`[SaveManager] 读档成功: ${slot}`);

      return data;
    } catch (error) {
      console.error(`[SaveManager] 加载槽位 ${slot} 失败:`, error);
      return null;
    }
  }

  /**
   * 删除指定槽位的存档
   *
   * @param slot 存档槽位
   * @returns 是否删除成功
   */
  deleteSlot(slot: SaveSlot): boolean {
    const success = this.delete(this.getSlotKey(slot));
    if (success) {
      console.log(`[SaveManager] 删除存档: ${slot}`);
    }
    return success;
  }

  /**
   * 重命名存档
   *
   * @param slot 存档槽位
   * @param newName 新名称
   * @returns 是否重命名成功
   */
  renameSlot(slot: SaveSlot, newName: string): boolean {
    try {
      const key = this.getSlotKey(slot);
      const saveData = this.load<SaveData>(key);

      if (!saveData) {
        return false;
      }

      saveData.metadata.name = newName;
      saveData.metadata.updatedAt = Date.now();

      return this.save(key, saveData);
    } catch (error) {
      console.error(`[SaveManager] 重命名存档 ${slot} 失败:`, error);
      return false;
    }
  }

  /**
   * 复制存档到另一个槽位
   *
   * @param sourceSlot 源槽位
   * @param targetSlot 目标槽位
   * @returns 是否复制成功
   */
  copySlot(sourceSlot: SaveSlot, targetSlot: SaveSlot): boolean {
    try {
      const sourceKey = this.getSlotKey(sourceSlot);
      const targetKey = this.getSlotKey(targetSlot);

      const saveData = this.load<SaveData>(sourceKey);
      if (!saveData) {
        return false;
      }

      // 创建副本并更新时间戳
      const copyData: SaveData = {
        ...saveData,
        timestamp: Date.now(),
        metadata: {
          ...saveData.metadata,
          updatedAt: Date.now(),
        },
      };

      return this.save(targetKey, copyData);
    } catch (error) {
      console.error(`[SaveManager] 复制存档 ${sourceSlot} -> ${targetSlot} 失败:`, error);
      return false;
    }
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
      let metadata: SaveMetadata | undefined;

      if (hasData && rawData) {
        try {
          const saveData = JSON.parse(rawData) as SaveData;
          timestamp = saveData.timestamp || 0;
          size = new Blob([rawData]).size;
          metadata = saveData.metadata;

          // 更新统计
          this.stats.totalSize += size;
        } catch {
          // JSON 解析失败，忽略
        }
      }

      return {
        name: slot as SaveSlot,
        hasData,
        timestamp,
        size,
        metadata,
      };
    });
  }

  /**
   * 获取存档统计信息
   *
   * @returns 统计信息
   */
  getStats(): Readonly<typeof this.stats> {
    return { ...this.stats };
  }

  /**
   * 检查版本兼容性
   *
   * @param version 存档版本
   * @returns 兼容性结果
   */
  checkVersionCompatibility(version: string): VersionCompatibility {
    const currentParts = this.currentVersion.split('.').map(Number);
    const saveParts = version.split('.').map(Number);

    // 主版本号不兼容
    if (saveParts[0] !== currentParts[0]) {
      return {
        compatible: false,
        needsMigration: false,
        message: `存档版本 ${version} 与当前版本 ${this.currentVersion} 不兼容（主版本号不同）`,
        targetVersion: this.currentVersion,
      };
    }

    // 次版本号相同，完全兼容
    if (saveParts[1] === currentParts[1]) {
      return {
        compatible: true,
        needsMigration: false,
        message: '存档版本完全兼容',
        targetVersion: this.currentVersion,
      };
    }

    // 次版本号较低，需要迁移
    if (saveParts[1] < currentParts[1]) {
      return {
        compatible: true,
        needsMigration: true,
        message: `存档版本 ${version} 需要迁移到 ${this.currentVersion}`,
        targetVersion: this.currentVersion,
      };
    }

    // 次版本号较高，可能不兼容
    return {
      compatible: false,
      needsMigration: false,
      message: `存档版本 ${version} 比当前版本 ${this.currentVersion} 更新，可能不兼容`,
      targetVersion: this.currentVersion,
    };
  }

  /**
   * 迁移存档数据
   *
   * @param data 存档数据
   * @param fromVersion 源版本
   * @returns 迁移后的数据
   */
  private async migrateData(data: any, fromVersion: string): Promise<any> {
    let currentData = data;
    let currentVersion = fromVersion;

    // 逐步迁移到当前版本
    while (currentVersion !== this.currentVersion) {
      const migration = this.migrationMap.get(currentVersion);

      if (!migration) {
        console.warn(`[SaveManager] 没有找到版本 ${currentVersion} 的迁移函数`);
        break;
      }

      currentData = migration(currentData, currentVersion);

      // 更新版本号
      const parts = currentVersion.split('.').map(Number);
      parts[1]++; // 增加次版本号
      currentVersion = parts.join('.');

      console.log(`[SaveManager] 数据迁移: ${fromVersion} -> ${currentVersion}`);
    }

    return currentData;
  }

  /**
   * 捕获存档截图
   *
   * @param canvas Canvas 元素
   * @returns Base64 截图字符串
   */
  private async captureScreenshot(canvas: HTMLCanvasElement): Promise<string | undefined> {
    try {
      // 将 canvas 转换为 JPEG 格式（压缩）
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);

      // 检查大小
      const size = this.getDataUrlSize(dataUrl);
      if (size > this.maxScreenshotSize) {
        console.warn(`[SaveManager] 截图过大 (${this.formatSize(size)})，已跳过`);
        return undefined;
      }

      return dataUrl;
    } catch (error) {
      console.error('[SaveManager] 捕获截图失败:', error);
      return undefined;
    }
  }

  /**
   * 获取 Data URL 的大小
   *
   * @param dataUrl Data URL 字符串
   * @returns 大小（字节）
   */
  private getDataUrlSize(dataUrl: string): number {
    const base64Length = dataUrl.length - (dataUrl.indexOf(',') + 1);
    const padding = (dataUrl.charAt(dataUrl.length - 2) === '=') ? 2 : ((dataUrl.charAt(dataUrl.length - 1) === '=') ? 1 : 0);
    return (base64Length * 0.75) - padding;
  }

  /**
   * 生成存档名称
   *
   * @param data 游戏存档数据
   * @returns 存档名称
   */
  private generateSaveName(data: GameSaveData): string {
    const date = new Date();
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    return `${data.player.name} - ${dateStr} ${timeStr}`;
  }

  /**
   * 保存数据到指定键
   *
   * @param key 存储键名
   * @param data 要保存的数据
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

      try {
        localStorage.setItem(fullKey, serialized);
      } catch (error) {
        // 可能是存储空间不足
        console.error('[SaveManager] 存储空间不足:', error);

        // 尝试清理旧存档
        this.cleanupOldSaves();

        // 重试保存
        try {
          localStorage.setItem(fullKey, serialized);
        } catch (retryError) {
          console.error('[SaveManager] 清理后仍然无法保存:', retryError);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error(`[SaveManager] 保存失败 (key: ${key}):`, error);
      return false;
    }
  }

  /**
   * 从指定键加载数据
   *
   * @param key 存储键名
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
   * @param key 存储键名
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

      // 重置统计
      this.stats = {
        totalSaves: 0,
        totalSize: 0,
        lastSaveTime: 0,
        lastLoadTime: 0,
      };

      return true;
    } catch (error) {
      console.error('[SaveManager] 清空所有存档失败:', error);
      return false;
    }
  }

  /**
   * 清理旧存档（删除最旧的存档以释放空间）
   */
  private cleanupOldSaves(): void {
    console.log('[SaveManager] 清理旧存档...');

    // 获取所有存档并按时间排序
    const slots = this.getSlotInfo()
      .filter(slot => slot.hasData)
      .sort((a, b) => a.timestamp - b.timestamp);

    // 删除最旧的 1-2 个存档
    const toDelete = Math.min(slots.length, 2);
    for (let i = 0; i < toDelete; i++) {
      this.deleteSlot(slots[i].name);
      console.log(`[SaveManager] 已删除旧存档: ${slots[i].name}`);
    }
  }

  /**
   * 检查指定键的数据是否存在
   *
   * @param key 存储键名
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
   * 导出存档到文件
   *
   * @param slot 存档槽位
   */
  exportSave(slot: SaveSlot): void {
    const key = this.getSlotKey(slot);
    const saveData = this.load<SaveData>(key);

    if (!saveData) {
      console.warn(`[SaveManager] 存档 ${slot} 不存在`);
      return;
    }

    try {
      const dataStr = JSON.stringify(saveData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `openclaw_save_${slot}_${Date.now()}.json`;
      link.click();

      URL.revokeObjectURL(url);
      console.log(`[SaveManager] 存档 ${slot} 已导出`);
    } catch (error) {
      console.error(`[SaveManager] 导出存档 ${slot} 失败:`, error);
    }
  }

  /**
   * 从文件导入存档
   *
   * @param file 文件对象
   * @param targetSlot 目标槽位
   * @returns 是否导入成功
   */
  async importSave(file: File, targetSlot: SaveSlot): Promise<boolean> {
    try {
      const text = await file.text();
      const saveData = JSON.parse(text) as SaveData;

      // 验证存档格式
      if (!saveData.version || !saveData.data) {
        throw new Error('无效的存档格式');
      }

      // 检查版本兼容性
      const compatibility = this.checkVersionCompatibility(saveData.version);
      if (!compatibility.compatible) {
        console.warn(`[SaveManager] 存档版本不兼容: ${saveData.version}`);
        return false;
      }

      // 保存到目标槽位
      const key = this.getSlotKey(targetSlot);
      return this.save(key, saveData);
    } catch (error) {
      console.error('[SaveManager] 导入存档失败:', error);
      return false;
    }
  }

  /**
   * 获取完整的存储键名
   *
   * @param key 原始键名
   * @returns 带前缀的完整键名
   */
  private getFullKey(key: string): string {
    return `${this.storagePrefix}${key}`;
  }

  /**
   * 获取槽位对应的存储键名
   *
   * @param slot 存档槽位
   * @returns 存储键名
   */
  private getSlotKey(slot: SaveSlot): string {
    return slot;
  }

  /**
   * 格式化文件大小显示
   *
   * @param bytes 字节数
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
   * @param timestamp 时间戳
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

  /**
   * 格式化游戏时间显示
   *
   * @param seconds 秒数
   * @returns 格式化后的字符串（如 "2:30:15"）
   */
  formatGameTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  /**
   * 获取当前存档版本
   *
   * @returns 当前版本号
   */
  getCurrentVersion(): string {
    return this.currentVersion;
  }
}

/**
 * 导出 SaveManager 单例
 */
export const saveManager = SaveManager.getInstance();
