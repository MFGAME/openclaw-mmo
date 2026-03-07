import { TMXMapData, TMXTileLayer, TMXTileset } from './MapParser';

/**
 * 瓦片图像缓存接口
 */
interface TileImageCache {
  image: HTMLImageElement;
  tileWidth: number;
  tileHeight: number;
  columns: number;
  firstGid: number;
  margin: number;
  spacing: number;
}

/**
 * 瓦片渲染器配置
 */
export interface TileRendererConfig {
  /** 是否平滑缩放 */
  smoothScaling: boolean;
  /** 是否启用视口裁剪 */
  viewportCulling: boolean;
  /** 绘制调试边框 */
  debugDraw: boolean;
}

/**
 * 瓦片渲染器
 * 负责渲染 TMX 地图瓦片
 * 单例模式
 */
export class TileRenderer {
  private static instance: TileRenderer;

  /** 瓦片图像缓存 */
  private imageCache: Map<string, TileImageCache> = new Map();

  /** 加载中的图像 */
  private loadingImages: Set<string> = new Set();

  /** 渲染配置 */
  private config: TileRendererConfig = {
    smoothScaling: true,
    viewportCulling: true,
    debugDraw: false,
  };

  /** 视口 X 偏移 */
  private viewportX = 0;

  /** 视口 Y 偏移 */
  private viewportY = 0;

  /** 视口宽度 */
  private viewportWidth = 0;

  /** 视口高度 */
  private viewportHeight = 0;

  /**
   * 私有构造函数，确保单例
   */
  private constructor() {}

  /**
   * 获取渲染器单例实例
   */
  static getInstance(): TileRenderer {
    if (!TileRenderer.instance) {
      TileRenderer.instance = new TileRenderer();
    }
    return TileRenderer.instance;
  }

  /**
   * 设置视口
   */
  setViewport(x: number, y: number, width: number, height: number): void {
    this.viewportX = x;
    this.viewportY = y;
    this.viewportWidth = width;
    this.viewportHeight = height;
  }

  /**
   * 设置渲染配置
   */
  setConfig(config: Partial<TileRendererConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 预加载瓦片集图像
   * @param tilesets 瓦片集数组
   * @param basePath 图像基础路径
   */
  async preloadTilesets(tilesets: TMXTileset[], basePath = ''): Promise<void> {
    const loadPromises = tilesets.map(tileset => this.loadTilesetImage(tileset, basePath));
    await Promise.all(loadPromises);
    console.log(`[TileRenderer] 预加载 ${tilesets.length} 个瓦片集完成`);
  }

  /**
   * 加载单个瓦片集图像
   */
  private async loadTilesetImage(tileset: TMXTileset, basePath: string): Promise<void> {
    const imageUrl = basePath + tileset.image;

    // 已缓存或正在加载
    if (this.imageCache.has(imageUrl) || this.loadingImages.has(imageUrl)) {
      return;
    }

    this.loadingImages.add(imageUrl);

    return new Promise((resolve, reject) => {
      const image = new Image();
      image.src = imageUrl;

      image.onload = () => {
        this.imageCache.set(imageUrl, {
          image,
          tileWidth: tileset.tileWidth,
          tileHeight: tileset.tileHeight,
          columns: tileset.columns || Math.floor(image.width / tileset.tileWidth),
          firstGid: tileset.firstGid,
          margin: tileset.margin,
          spacing: tileset.spacing,
        });
        this.loadingImages.delete(imageUrl);
        resolve();
      };

      image.onerror = () => {
        console.error(`[TileRenderer] 加载瓦片集图像失败: ${imageUrl}`);
        this.loadingImages.delete(imageUrl);
        reject(new Error(`加载瓦片集图像失败: ${imageUrl}`));
      };
    });
  }

  /**
   * 渲染地图
   * @param ctx Canvas 2D 上下文
   * @param mapData 地图数据
   * @param basePath 瓦片集图像基础路径
   */
  render(ctx: CanvasRenderingContext2D, mapData: TMXMapData, basePath = ''): void {
    // 按顺序渲染所有可见的瓦片层
    for (const layer of mapData.tileLayers) {
      if (layer.visible) {
        this.renderLayer(ctx, layer, mapData.tilesets, mapData.tileWidth, mapData.tileHeight, basePath);
      }
    }
  }

  /**
   * 渲染单个瓦片层
   */
  renderLayer(
    ctx: CanvasRenderingContext2D,
    layer: TMXTileLayer,
    tilesets: TMXTileset[],
    tileWidth: number,
    tileHeight: number,
    basePath: string
  ): void {
    ctx.save();

    // 应用层透明度和偏移
    ctx.globalAlpha = layer.opacity;
    const offsetX = layer.offsetX;
    const offsetY = layer.offsetY;

    // 计算可见范围（视口裁剪）
    let startCol = 0;
    let startRow = 0;
    let endCol = layer.width;
    let endRow = layer.height;

    if (this.config.viewportCulling && this.viewportWidth > 0 && this.viewportHeight > 0) {
      startCol = Math.max(0, Math.floor((this.viewportX - offsetX) / tileWidth));
      startRow = Math.max(0, Math.floor((this.viewportY - offsetY) / tileHeight));
      endCol = Math.min(layer.width, Math.ceil((this.viewportX + this.viewportWidth - offsetX) / tileWidth));
      endRow = Math.min(layer.height, Math.ceil((this.viewportY + this.viewportHeight - offsetY) / tileHeight));
    }

    // 设置平滑缩放
    ctx.imageSmoothingEnabled = this.config.smoothScaling;

    // 遍历瓦片
    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        const index = row * layer.width + col;
        const gid = layer.data[index];

        // GID 为 0 表示空瓦片
        if (gid === 0) continue;

        // 查找对应的瓦片集和瓦片
        const tileInfo = this.findTile(gid, tilesets, basePath);
        if (!tileInfo) continue;

        const { cache, tileCol, tileRow } = tileInfo;

        // 计算屏幕坐标
        const screenX = col * tileWidth + offsetX - this.viewportX;
        const screenY = row * tileHeight + offsetY - this.viewportY;

        // 计算源图像坐标
        const srcX = cache.margin + tileCol * (cache.tileWidth + cache.spacing);
        const srcY = cache.margin + tileRow * (cache.tileHeight + cache.spacing);

        // 绘制瓦片
        ctx.drawImage(
          cache.image,
          srcX,
          srcY,
          cache.tileWidth,
          cache.tileHeight,
          screenX,
          screenY,
          tileWidth,
          tileHeight
        );

        // 调试绘制
        if (this.config.debugDraw) {
          ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
          ctx.lineWidth = 1;
          ctx.strokeRect(screenX, screenY, tileWidth, tileHeight);
        }
      }
    }

    ctx.restore();
  }

  /**
   * 查找瓦片对应的瓦片集和位置
   */
  private findTile(
    gid: number,
    tilesets: TMXTileset[],
    basePath: string
  ): { cache: TileImageCache; tileCol: number; tileRow: number } | null {
    // 翻转标志（高位）
    const flippedHorizontally = !!(gid & 0x80000000);
    const flippedVertically = !!(gid & 0x40000000);
    const flippedDiagonally = !!(gid & 0x20000000);

    // 清除翻转标志得到真实的 GID
    const realGid = gid & 0x0fffffff;

    // 从后向前查找（因为瓦片集按 firstGid 排序）
    for (let i = tilesets.length - 1; i >= 0; i--) {
      const tileset = tilesets[i];
      if (realGid >= tileset.firstGid) {
        const localId = realGid - tileset.firstGid;
        const imageUrl = basePath + tileset.image;

        const cache = this.imageCache.get(imageUrl);
        if (!cache) {
          console.warn(`[TileRenderer] 瓦片集图像未加载: ${imageUrl}`);
          return null;
        }

        const tileCol = localId % cache.columns;
        const tileRow = Math.floor(localId / cache.columns);

        // 注意：翻转处理需要更复杂的逻辑，这里简化处理
        if (flippedHorizontally || flippedVertically || flippedDiagonally) {
          console.debug('[TileRenderer] 瓦片翻转暂不完全支持');
        }

        return { cache, tileCol, tileRow };
      }
    }

    return null;
  }

  /**
   * 渲染单个瓦片到指定位置（用于 UI 显示）
   */
  renderTile(
    ctx: CanvasRenderingContext2D,
    gid: number,
    tilesets: TMXTileset[],
    x: number,
    y: number,
    width: number,
    height: number,
    basePath = ''
  ): void {
    const tileInfo = this.findTile(gid, tilesets, basePath);
    if (!tileInfo) return;

    const { cache, tileCol, tileRow } = tileInfo;
    const srcX = cache.margin + tileCol * (cache.tileWidth + cache.spacing);
    const srcY = cache.margin + tileRow * (cache.tileHeight + cache.spacing);

    ctx.drawImage(
      cache.image,
      srcX,
      srcY,
      cache.tileWidth,
      cache.tileHeight,
      x,
      y,
      width,
      height
    );
  }

  /**
   * 获取瓦片在屏幕上的坐标
   */
  getTileScreenCoords(
    tileCol: number,
    tileRow: number,
    tileWidth: number,
    tileHeight: number,
    offsetX = 0,
    offsetY = 0
  ): { x: number; y: number } {
    return {
      x: tileCol * tileWidth + offsetX - this.viewportX,
      y: tileRow * tileHeight + offsetY - this.viewportY,
    };
  }

  /**
   * 从屏幕坐标获取瓦片坐标
   */
  getTileCoordsFromScreen(
    screenX: number,
    screenY: number,
    tileWidth: number,
    tileHeight: number,
    offsetX = 0,
    offsetY = 0
  ): { col: number; row: number } {
    return {
      col: Math.floor((screenX + this.viewportX - offsetX) / tileWidth),
      row: Math.floor((screenY + this.viewportY - offsetY) / tileHeight),
    };
  }

  /**
   * 清除图像缓存
   */
  clearCache(): void {
    this.imageCache.clear();
    this.loadingImages.clear();
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { loaded: number; loading: number } {
    return {
      loaded: this.imageCache.size,
      loading: this.loadingImages.size,
    };
  }
}

/**
 * 导出瓦片渲染器单例
 */
export const tileRenderer = TileRenderer.getInstance();
