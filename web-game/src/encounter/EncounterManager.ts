/**
 * 怪物遭遇管理器 - 处理草丛中的怪物遭遇和战斗触发
 *
 * 功能：
 * - 检测玩家是否在草丛区域
 * - 随机触发怪物遭遇
 * - 选择随机怪物并开始战斗
 */

import { monsterDataLoader, MonsterInstance } from '../engine/MonsterData.js';

/**
 * 遭遇区域类型
 */
export enum EncounterZoneType {
  /** 草丛 */
  GRASS = 'grass',
  /** 水域 */
  WATER = 'water',
  /** 山洞 */
  CAVE = 'cave',
  /** 森林 */
  FOREST = 'forest',
}

/**
 * 地图遭遇配置接口
 */
export interface MapEncounterConfig {
  /** 遭遇区域类型 */
  zoneType: EncounterZoneType;
  /** 遭遇概率 (0-1) */
  encounterChance: number;
  /** 最小等级 */
  minLevel: number;
  /** 最大等级 */
  maxLevel: number;
  /** 可遭遇的怪物 ID 列表 */
  possibleMonsters: string[];
}

/**
 * 遭遇结果接口
 */
export interface EncounterResult {
  /** 是否触发遭遇 */
  triggered: boolean;
  /** 遭遇的怪物 */
  monster?: MonsterInstance;
  /** 遭遇区域类型 */
  zoneType?: EncounterZoneType;
}

/**
 * 遭遇回调类型
 */
export type EncounterCallback = (result: EncounterResult) => void;

/**
 * 怪物遭遇管理器类
 */
export class EncounterManager {
  private static instance: EncounterManager;

  /** 默认遭遇概率 */
  private readonly DEFAULT_ENCOUNTER_CHANCE = 0.15; // 15%

  /** 地图遭遇配置映射 (地图名称 -> 遭遇配置) */
  private mapConfigs: Map<string, MapEncounterConfig[]> = new Map();

  /** 草丛瓦片 GID 集合 (根据地图瓦片集确定) */
  private grassTileGids: Set<number> = new Set([
    // Tuxemon 草丛瓦片 GID (需要根据实际瓦片集调整)
    1, 2, 3, 4, // 基础草丛
  ]);

  /** 遭遇回调 */
  private callbacks: EncounterCallback[] = [];

  /** 上次检查的瓦片位置（避免重复触发） */
  private lastCheckedTile: { x: number; y: number } | null = null;

  /** 遭遇冷却时间（毫秒） */
  private readonly COOLDOWN_TIME = 1000;

  /** 最后触发时间 */
  private lastTriggerTime: number = 0;

  /**
   * 私有构造函数，确保单例
   */
  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): EncounterManager {
    if (!EncounterManager.instance) {
      EncounterManager.instance = new EncounterManager();
    }
    return EncounterManager.instance;
  }

  /**
   * 设置草丛瓦片 GID
   * @param gids 草丛瓦片的 GID 集合
   */
  setGrassTiles(gids: number[]): void {
    this.grassTileGids = new Set(gids);
    console.log('[EncounterManager] 草丛瓦片 GID 设置:', this.grassTileGids);
  }

  /**
   * 添加草丛瓦片 GID
   * @param gids 要添加的 GID 列表
   */
  addGrassTiles(gids: number[]): void {
    gids.forEach(gid => this.grassTileGids.add(gid));
  }

  /**
   * 注册地图遭遇配置
   * @param mapName 地图名称
   * @param config 遭遇配置
   */
  registerMapConfig(mapName: string, config: MapEncounterConfig[]): void {
    this.mapConfigs.set(mapName, config);
    console.log(`[EncounterManager] 地图 ${mapName} 遭遇配置已注册`, config);
  }

  /**
   * 获取地图遭遇配置
   * @param mapName 地图名称
   * @returns 遭遇配置数组，如果不存在返回默认配置
   */
  private getMapConfig(mapName: string): MapEncounterConfig[] {
    return this.mapConfigs.get(mapName) || this.getDefaultConfig();
  }

  /**
   * 获取默认遭遇配置
   */
  private getDefaultConfig(): MapEncounterConfig[] {
    return [
      {
        zoneType: EncounterZoneType.GRASS,
        encounterChance: 0.15,
        minLevel: 1,
        maxLevel: 5,
        possibleMonsters: this.getAvailableMonsters(),
      },
    ];
  }

  /**
   * 获取所有可用的怪物 ID
   */
  private getAvailableMonsters(): string[] {
    const allMonsters = monsterDataLoader.getAllMonsters();
    return allMonsters.map(m => m.slug);
  }

  /**
   * 检查瓦片是否为草丛
   * @param tileGid 瓦片 GID
   * @returns 是否为草丛瓦片
   */
  isGrassTile(tileGid: number): boolean {
    return this.grassTileGids.has(tileGid);
  }

  /**
   * 检查位置是否在草丛中
   * @param tileX 瓦片 X 坐标
   * @param tileY 瓦片 Y 坐标
   * @param tileGid 当前位置的瓦片 GID
   * @param mapName 当前地图名称
   * @returns 遭遇结果
   */
  checkEncounter(
    tileX: number,
    tileY: number,
    tileGid: number,
    mapName: string = 'default'
  ): EncounterResult {
    // 检查冷却时间
    const now = Date.now();
    if (now - this.lastTriggerTime < this.COOLDOWN_TIME) {
      return { triggered: false };
    }

    // 检查是否在同一瓦片（避免重复触发）
    if (this.lastCheckedTile &&
        this.lastCheckedTile.x === tileX &&
        this.lastCheckedTile.y === tileY) {
      return { triggered: false };
    }

    // 检查是否在草丛中
    if (!this.isGrassTile(tileGid)) {
      return { triggered: false };
    }

    // 获取地图遭遇配置
    const configs = this.getMapConfig(mapName);

    // 尝试触发遭遇
    for (const config of configs) {
      if (this.triggerRandomEncounter(config)) {
        this.lastCheckedTile = { x: tileX, y: tileY };
        this.lastTriggerTime = now;

        // 创建怪物实例
        const monster = this.createRandomMonster(config);

        const result: EncounterResult = {
          triggered: true,
          monster,
          zoneType: config.zoneType,
        };

        // 触发回调
        this.notifyCallbacks(result);

        // 获取怪物名称用于日志
        const monsterData = monsterDataLoader.getMonster(monster.monsterId);
        const monsterName = monsterData?.name || monster.monsterId;

        console.log(
          `[EncounterManager] 遭遇触发! ${mapName} (${tileX}, ${tileY}) - ` +
          `${monsterName} Lv.${monster.level}`
        );

        return result;
      }
    }

    return { triggered: false };
  }

  /**
   * 触发随机遭遇
   * @param config 遭遇配置
   * @returns 是否触发遭遇
   */
  private triggerRandomEncounter(config: MapEncounterConfig): boolean {
    const roll = Math.random();
    return roll < config.encounterChance;
  }

  /**
   * 创建随机怪物
   * @param config 遭遇配置
   * @returns 怪物实例
   */
  private createRandomMonster(config: MapEncounterConfig): MonsterInstance {
    // 随机选择怪物
    const monsterId = config.possibleMonsters[
      Math.floor(Math.random() * config.possibleMonsters.length)
    ];

    // 随机等级
    const level = Math.floor(
      Math.random() * (config.maxLevel - config.minLevel + 1) + config.minLevel
    );

    // 创建怪物实例
    const monster = monsterDataLoader.createMonsterInstance(monsterId, level);
    if (!monster) {
      // 如果创建失败，使用默认怪物
      console.warn(`[EncounterManager] 无法创建怪物 ${monsterId}，使用默认怪物`);
      return monsterDataLoader.createMonsterInstance('txmn_cardiling', level)!;
    }

    return monster;
  }

  /**
   * 创建指定怪物的实例
   * @param monsterId 怪物 ID
   * @param level 等级
   * @returns 怪物实例，创建失败返回 null
   */
  createMonster(monsterId: string, level: number): MonsterInstance | null {
    return monsterDataLoader.createMonsterInstance(monsterId, level);
  }

  /**
   * 注册遭遇回调
   * @param callback 回调函数
   */
  onEncounter(callback: EncounterCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * 移除遭遇回调
   * @param callback 回调函数
   */
  offEncounter(callback: EncounterCallback): void {
    const index = this.callbacks.indexOf(callback);
    if (index !== -1) {
      this.callbacks.splice(index, 1);
    }
  }

  /**
   * 通知所有回调
   * @param result 遭遇结果
   */
  private notifyCallbacks(result: EncounterResult): void {
    for (const callback of this.callbacks) {
      try {
        callback(result);
      } catch (error) {
        console.error('[EncounterManager] 回调执行失败:', error);
      }
    }
  }

  /**
   * 重置遭遇状态
   */
  reset(): void {
    this.lastCheckedTile = null;
    this.lastTriggerTime = 0;
  }

  /**
   * 设置全局遭遇概率
   * @param chance 遭遇概率 (0-1)
   */
  setGlobalEncounterChance(chance: number): void {
    // 更新所有地图配置的遭遇概率
    for (const config of this.mapConfigs.values()) {
      config.forEach(c => {
        c.encounterChance = chance;
      });
    }
    console.log(`[EncounterManager] 全局遭遇概率设置为: ${(chance * 100).toFixed(0)}%`);
  }

  /**
   * 获取遭遇概率
   * @param mapName 地图名称
   * @returns 遭遇概率
   */
  getEncounterChance(mapName: string = 'default'): number {
    const configs = this.getMapConfig(mapName);
    return configs[0]?.encounterChance ?? this.DEFAULT_ENCOUNTER_CHANCE;
  }

  /**
   * 启用遭遇系统
   */
  enable(): void {
    console.log('[EncounterManager] 遭遇系统已启用');
  }

  /**
   * 禁用遭遇系统
   */
  disable(): void {
    console.log('[EncounterManager] 遭遇系统已禁用');
  }
}

/**
 * 导出单例
 */
export const encounterManager = EncounterManager.getInstance();
