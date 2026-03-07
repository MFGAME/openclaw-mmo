import { TMXMapData } from './MapParser';

/**
 * 碰撞层配置接口
 */
export interface CollisionLayerConfig {
  /** 碰撞层名称 */
  layerName: string;
  /** 是否碰撞（属性名） */
  collisionProperty?: string;
  /** 固体瓦片 GID 列表 */
  solidTiles?: number[];
}

/**
 * 点坐标接口
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * 矩形接口
 */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 圆形接口
 */
export interface Circle {
  x: number;
  y: number;
  radius: number;
}

/**
 * 碰撞结果接口
 */
export interface CollisionResult {
  /** 是否发生碰撞 */
  collided: boolean;
  /** 碰撞的瓦片坐标 */
  tileX?: number;
  /** 碰撞的瓦片坐标 */
  tileY?: number;
  /** 碰撞的 GID */
  gid?: number;
  /** 碰撞深度（用于穿透检测） */
  depth?: number;
}

/**
 * 碰撞类型枚举
 */
export enum CollisionType {
  /** 无碰撞 */
  NONE = 'none',
  /** 墙壁（完全阻挡） */
  WALL = 'wall',
  /** 水面（可游泳） */
  WATER = 'water',
  /** 悬崖（可跳跃） */
  CLIFF = 'cliff',
  /** 草地（有随机遭遇） */
  GRASS = 'grass',
  /** 门（可进入） */
  DOOR = 'door',
}

/**
 * 碰撞管理器
 * 基于瓦片地图的碰撞检测系统
 * 单例模式
 */
export class CollisionManager {
  private static instance: CollisionManager;

  /** 当前地图数据 */
  private mapData: TMXMapData | null = null;

  /** 碰撞层配置列表 */
  private collisionLayers: CollisionLayerConfig[] = [];

  /** 固体瓦片集合（用于快速查找） */
  private solidTileSet: Set<number> = new Set();

  /** 瓦片宽度 */
  private tileWidth = 32;

  /** 瓦片高度 */
  private tileHeight = 32;

  /** 缓存的碰撞检测结果 */
  private collisionCache: Map<string, boolean> = new Map();

  /** 缓存大小限制 */
  private readonly CACHE_SIZE = 1000;

  /** 调试模式 */
  private debugMode = false;

  /**
   * 私有构造函数，确保单例
   */
  private constructor() {}

  /**
   * 获取碰撞管理器单例实例
   */
  static getInstance(): CollisionManager {
    if (!CollisionManager.instance) {
      CollisionManager.instance = new CollisionManager();
    }
    return CollisionManager.instance;
  }

  /**
   * 设置地图数据
   * @param mapData 地图数据
   */
  setMap(mapData: TMXMapData): void {
    this.mapData = mapData;
    this.tileWidth = mapData.tileWidth;
    this.tileHeight = mapData.tileHeight;
    this.collisionCache.clear();
    console.log(`[CollisionManager] 地图已加载: ${mapData.width}x${mapData.height}`);
  }

  /**
   * 添加碰撞层配置
   * @param config 碰撞层配置
   */
  addCollisionLayer(config: CollisionLayerConfig): void {
    this.collisionLayers.push(config);

    // 更新固体瓦片集合
    if (config.solidTiles) {
      for (const gid of config.solidTiles) {
        this.solidTileSet.add(gid);
      }
    }
  }

  /**
   * 设置碰撞层配置列表
   * @param configs 碰撞层配置列表
   */
  setCollisionLayers(configs: CollisionLayerConfig[]): void {
    this.collisionLayers = [...configs];
    this.solidTileSet.clear();

    for (const config of configs) {
      if (config.solidTiles) {
        for (const gid of config.solidTiles) {
          this.solidTileSet.add(gid);
        }
      }
    }
  }

  /**
   * 清除碰撞层配置
   */
  clearCollisionLayers(): void {
    this.collisionLayers = [];
    this.solidTileSet.clear();
  }

  /**
   * 获取指定位置的瓦片 GID
   * @param tileX 瓦片 X 坐标
   * @param tileY 瓦片 Y 坐标
   * @returns 瓦片 GID，如果位置无效返回 0
   */
  getTileGid(tileX: number, tileY: number): number {
    if (!this.mapData) {
      return 0;
    }

    // 检查边界
    if (tileX < 0 || tileX >= this.mapData.width || tileY < 0 || tileY >= this.mapData.height) {
      return 0;
    }

    // 检查所有碰撞层
    for (const config of this.collisionLayers) {
      const layer = this.mapData.tileLayers.find(l => l.name === config.layerName);
      if (layer && layer.visible) {
        const index = tileY * layer.width + tileX;
        if (index >= 0 && index < layer.data.length) {
          const gid = layer.data[index];
          if (gid > 0) {
            return gid;
          }
        }
      }
    }

    return 0;
  }

  /**
   * 检查瓦片是否为固体
   * @param tileX 瓦片 X 坐标
   * @param tileY 瓦片 Y 坐标
   * @returns 是否为固体
   */
  isTileSolid(tileX: number, tileY: number): boolean {
    const gid = this.getTileGid(tileX, tileY);
    if (gid === 0) return false;

    // 检查固体瓦片集合
    if (this.solidTileSet.has(gid)) {
      return true;
    }

    // 检查层属性
    for (const config of this.collisionLayers) {
      const layer = this.mapData?.tileLayers.find(l => l.name === config.layerName);
      if (layer) {
        // 检查瓦片属性
        if (config.collisionProperty && layer.properties[config.collisionProperty] === true) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 获取碰撞类型
   * @param tileX 瓦片 X 坐标
   * @param tileY 瓦片 Y 坐标
   * @returns 碰撞类型
   */
  getCollisionType(tileX: number, tileY: number): CollisionType {
    const gid = this.getTileGid(tileX, tileY);
    if (gid === 0) return CollisionType.NONE;

    for (const config of this.collisionLayers) {
      const layer = this.mapData?.tileLayers.find(l => l.name === config.layerName);
      if (layer) {
        // 检查瓦片属性
        const collisionType = layer.properties[`collision_type_${gid}`] as CollisionType;
        if (collisionType) {
          return collisionType;
        }

        // 检查层属性
        if (layer.properties.collision_type) {
          return layer.properties.collision_type as CollisionType;
        }
      }
    }

    // 默认为墙壁
    return CollisionType.WALL;
  }

  /**
   * 点碰撞检测
   * @param x 世界坐标 X
   * @param y 世界坐标 Y
   * @returns 碰撞结果
   */
  checkPointCollision(x: number, y: number): CollisionResult {
    const tileX = Math.floor(x / this.tileWidth);
    const tileY = Math.floor(y / this.tileHeight);

    if (!this.mapData) {
      return { collided: false };
    }

    // 边界检查
    if (tileX < 0 || tileX >= this.mapData.width || tileY < 0 || tileY >= this.mapData.height) {
      return { collided: false };
    }

    // 检查缓存
    const cacheKey = `p_${tileX}_${tileY}`;
    if (this.collisionCache.has(cacheKey)) {
      return {
        collided: this.collisionCache.get(cacheKey)!,
        tileX,
        tileY,
        gid: this.getTileGid(tileX, tileY),
      };
    }

    const isSolid = this.isTileSolid(tileX, tileY);

    // 更新缓存
    this.updateCache(cacheKey, isSolid);

    return {
      collided: isSolid,
      tileX,
      tileY,
      gid: this.getTileGid(tileX, tileY),
    };
  }

  /**
   * 矩形碰撞检测
   * @param rect 矩形
   * @returns 碰撞结果
   */
  checkRectCollision(rect: Rect): CollisionResult {
    if (!this.mapData) {
      return { collided: false };
    }

    // 计算矩形覆盖的瓦片范围
    const startTileX = Math.floor(rect.x / this.tileWidth);
    const startTileY = Math.floor(rect.y / this.tileHeight);
    const endTileX = Math.floor((rect.x + rect.width - 1) / this.tileWidth);
    const endTileY = Math.floor((rect.y + rect.height - 1) / this.tileHeight);

    // 边界检查
    if (startTileX >= this.mapData.width || startTileY >= this.mapData.height ||
        endTileX < 0 || endTileY < 0) {
      return { collided: false };
    }

    // 检查每个覆盖的瓦片
    for (let ty = Math.max(0, startTileY); ty <= Math.min(this.mapData.height - 1, endTileY); ty++) {
      for (let tx = Math.max(0, startTileX); tx <= Math.min(this.mapData.width - 1, endTileX); tx++) {
        if (this.isTileSolid(tx, ty)) {
          return {
            collided: true,
            tileX: tx,
            tileY: ty,
            gid: this.getTileGid(tx, ty),
          };
        }
      }
    }

    return { collided: false };
  }

  /**
   * 圆形碰撞检测
   * @param circle 圆形
   * @returns 碰撞结果
   */
  checkCircleCollision(circle: Circle): CollisionResult {
    if (!this.mapData) {
      return { collided: false };
    }

    // 计算圆形覆盖的瓦片范围
    const startTileX = Math.floor((circle.x - circle.radius) / this.tileWidth);
    const startTileY = Math.floor((circle.y - circle.radius) / this.tileHeight);
    const endTileX = Math.floor((circle.x + circle.radius) / this.tileWidth);
    const endTileY = Math.floor((circle.y + circle.radius) / this.tileHeight);

    // 边界检查
    if (startTileX >= this.mapData.width || startTileY >= this.mapData.height ||
        endTileX < 0 || endTileY < 0) {
      return { collided: false };
    }

    // 检查每个覆盖的瓦片
    for (let ty = Math.max(0, startTileY); ty <= Math.min(this.mapData.height - 1, endTileY); ty++) {
      for (let tx = Math.max(0, startTileX); tx <= Math.min(this.mapData.width - 1, endTileX); tx++) {
        if (this.isTileSolid(tx, ty)) {
          // 精确检测：检查圆形是否与瓦片矩形相交
          const tileRect = {
            x: tx * this.tileWidth,
            y: ty * this.tileHeight,
            width: this.tileWidth,
            height: this.tileHeight,
          };

          if (this.circleRectIntersect(circle, tileRect)) {
            return {
              collided: true,
              tileX: tx,
              tileY: ty,
              gid: this.getTileGid(tx, ty),
            };
          }
        }
      }
    }

    return { collided: false };
  }

  /**
   * 路径检测（检查从起点到终点的路径是否可行）
   * @param startX 起点 X（世界坐标）
   * @param startY 起点 Y（世界坐标）
   * @param endX 终点 X（世界坐标）
   * @param endY 终点 Y（世界坐标）
   * @param radius 检测半径（用于圆形碰撞）
   * @returns 是否可行
   */
  checkPath(startX: number, startY: number, endX: number, endY: number, radius = 0): boolean {
    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) {
      return !this.checkPointCollision(startX, startY).collided;
    }

    const steps = Math.ceil(distance / Math.min(this.tileWidth, this.tileHeight) / 2);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = startX + dx * t;
      const y = startY + dy * t;

      if (radius > 0) {
        if (this.checkCircleCollision({ x, y, radius }).collided) {
          return false;
        }
      } else {
        if (this.checkPointCollision(x, y).collided) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 圆形与矩形相交检测
   */
  private circleRectIntersect(circle: Circle, rect: Rect): boolean {
    // 找到矩形上距离圆心最近的点
    const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));

    // 计算距离
    const dx = circle.x - closestX;
    const dy = circle.y - closestY;
    const distanceSquared = dx * dx + dy * dy;

    return distanceSquared <= circle.radius * circle.radius;
  }

  /**
   * 更新缓存
   */
  private updateCache(key: string, value: boolean): void {
    // 如果缓存已满，清除最早的条目
    if (this.collisionCache.size >= this.CACHE_SIZE) {
      const firstKey = this.collisionCache.keys().next().value;
      if (firstKey) {
        this.collisionCache.delete(firstKey);
      }
    }

    this.collisionCache.set(key, value);
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.collisionCache.clear();
  }

  /**
   * 设置调试模式
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  /**
   * 获取调试模式状态
   */
  getDebugMode(): boolean {
    return this.debugMode;
  }

  /**
   * 获取碰撞统计信息
   */
  getStats(): {
    hasMap: boolean;
    collisionLayers: number;
    solidTiles: number;
    cacheSize: number;
  } {
    return {
      hasMap: this.mapData !== null,
      collisionLayers: this.collisionLayers.length,
      solidTiles: this.solidTileSet.size,
      cacheSize: this.collisionCache.size,
    };
  }
}

/**
 * 导出碰撞管理器单例
 */
export const collisionManager = CollisionManager.getInstance();
