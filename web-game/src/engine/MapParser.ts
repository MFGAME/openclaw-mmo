/**
 * TMX 地图数据接口
 */
export interface TMXTileLayer {
  /** 层名称 */
  name: string;
  /** 层宽度（瓦片数） */
  width: number;
  /** 层高度（瓦片数） */
  height: number;
  /** 瓦片数据 (GID 数组) */
  data: number[];
  /** 层属性 */
  properties: Record<string, string | number | boolean>;
  /** 是否可见 */
  visible: boolean;
  /** 透明度 */
  opacity: number;
  /** 偏移 X */
  offsetX: number;
  /** 偏移 Y */
  offsetY: number;
}

/**
 * TMX 对象接口
 */
export interface TMXObject {
  /** 对象 ID */
  id: number;
  /** 对象名称 */
  name: string;
  /** 对象类型 */
  type: string;
  /** X 坐标 */
  x: number;
  /** Y 坐标 */
  y: number;
  /** 宽度 */
  width: number;
  /** 高度 */
  height: number;
  /** 旋转角度 */
  rotation: number;
  /** 是否可见 */
  visible: boolean;
  /** 对象属性 */
  properties: Record<string, string | number | boolean>;
  /** 多边形点数据 */
  polygon?: { x: number; y: number }[];
  /** 折线点数据 */
  polyline?: { x: number; y: number }[];
}

/**
 * TMX 对象组接口
 */
export interface TMXObjectGroup {
  /** 组名称 */
  name: string;
  /** 对象列表 */
  objects: TMXObject[];
  /** 组属性 */
  properties: Record<string, string | number | boolean>;
  /** 是否可见 */
  visible: boolean;
  /** 透明度 */
  opacity: number;
  /** 偏移 X */
  offsetX: number;
  /** 偏移 Y */
  offsetY: number;
}

/**
 * TMX 瓦片集接口
 */
export interface TMXTileset {
  /** 瓦片集名称 */
  name: string;
  /** 第一个 GID */
  firstGid: number;
  /** 瓦片宽度 */
  tileWidth: number;
  /** 瓦片高度 */
  tileHeight: number;
  /** 瓦片数量 */
  tileCount: number;
  /** 列数 */
  columns: number;
  /** 图片路径 */
  image: string;
  /** 图片宽度 */
  imageWidth: number;
  /** 图片高度 */
  imageHeight: number;
  /** 边距 */
  margin: number;
  /** 间距 */
  spacing: number;
}

/**
 * TMX 地图数据接口
 */
export interface TMXMapData {
  /** 地图宽度（瓦片数） */
  width: number;
  /** 地图高度（瓦片数） */
  height: number;
  /** 瓦片宽度（像素） */
  tileWidth: number;
  /** 瓦片高度（像素） */
  tileHeight: number;
  /** 渲染顺序 */
  renderOrder: 'right-down' | 'right-up' | 'left-down' | 'left-up';
  /** 背景色 */
  backgroundColor?: string;
  /** 瓦片层列表 */
  tileLayers: TMXTileLayer[];
  /** 对象组列表 */
  objectGroups: TMXObjectGroup[];
  /** 瓦片集列表 */
  tilesets: TMXTileset[];
  /** 地图属性 */
  properties: Record<string, string | number | boolean>;
}

/**
 * 地图解析器
 * 解析 TMX XML 格式的地图数据
 * 单例模式
 */
export class MapParser {
  private static instance: MapParser;

  /** 解析缓存 */
  private cache: Map<string, TMXMapData> = new Map();

  /**
   * 私有构造函数，确保单例
   */
  private constructor() {}

  /**
   * 获取解析器单例实例
   */
  static getInstance(): MapParser {
    if (!MapParser.instance) {
      MapParser.instance = new MapParser();
    }
    return MapParser.instance;
  }

  /**
   * 从 URL 加载并解析 TMX 地图
   * @param url TMX 文件 URL
   * @param useCache 是否使用缓存
   */
  async loadFromUrl(url: string, useCache = true): Promise<TMXMapData> {
    // 检查缓存
    if (useCache && this.cache.has(url)) {
      return this.cache.get(url)!;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`[MapParser] 加载地图失败: ${response.statusText}`);
    }

    const xmlText = await response.text();
    const mapData = await this.parse(xmlText, url);

    // 缓存结果
    if (useCache) {
      this.cache.set(url, mapData);
    }

    return mapData;
  }

  /**
   * 从字符串解析 TMX 地图
   * @param xmlText TMX XML 字符串
   * @param tmxPath TMX 文件路径（用于解析外部 tileset）
   */
  async parse(xmlText: string, tmxPath?: string): Promise<TMXMapData> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');

    // 检查解析错误
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      throw new Error(`[MapParser] XML 解析错误: ${parseError.textContent}`);
    }

    const mapElement = doc.querySelector('map');
    if (!mapElement) {
      throw new Error('[MapParser] 未找到 map 元素');
    }

    // 解析地图基本属性
    const mapData: TMXMapData = {
      width: parseInt(mapElement.getAttribute('width') || '0', 10),
      height: parseInt(mapElement.getAttribute('height') || '0', 10),
      tileWidth: parseInt(mapElement.getAttribute('tilewidth') || '32', 10),
      tileHeight: parseInt(mapElement.getAttribute('tileheight') || '32', 10),
      renderOrder: (mapElement.getAttribute('renderorder') as TMXMapData['renderOrder']) || 'right-down',
      backgroundColor: mapElement.getAttribute('backgroundcolor') || undefined,
      tileLayers: [],
      objectGroups: [],
      tilesets: [],
      properties: {},
    };

    // 解析地图属性
    mapData.properties = this.parseProperties(mapElement);

    // 解析瓦片集
    const tilesetElements = mapElement.querySelectorAll(':scope > tileset');
    for (let i = 0; i < tilesetElements.length; i++) {
      const tileset = await this.parseTileset(tilesetElements[i], tmxPath);
      mapData.tilesets.push(tileset);
    }

    // 解析瓦片层
    const layerElements = mapElement.querySelectorAll(':scope > layer');
    for (let i = 0; i < layerElements.length; i++) {
      mapData.tileLayers.push(this.parseTileLayer(layerElements[i]));
    }

    // 解析对象组
    const objectGroupElements = mapElement.querySelectorAll(':scope > objectgroup');
    for (let i = 0; i < objectGroupElements.length; i++) {
      mapData.objectGroups.push(this.parseObjectGroup(objectGroupElements[i]));
    }

    console.log(`[MapParser] 解析完成: ${mapData.width}x${mapData.height}, ${mapData.tileLayers.length} 层, ${mapData.objectGroups.length} 对象组`);
    return mapData;
  }

  /**
   * 解析瓦片集
   */
  private async parseTileset(element: Element, tmxPath?: string): Promise<TMXTileset> {
    // 检查是否是外部 tileset 引用
    const source = element.getAttribute('source');
    if (source && tmxPath) {
      // 解析外部 TSX 文件路径
      const baseUrl = tmxPath.substring(0, tmxPath.lastIndexOf('/'));
      let tsxPath = source;

      // 处理相对路径
      if (source.startsWith('../')) {
        tsxPath = baseUrl + '/' + source;
      } else if (source.startsWith('./')) {
        tsxPath = baseUrl + source.substring(1);
      }

      console.log(`[MapParser] 加载外部 tileset: ${tsxPath}`);

      try {
        const response = await fetch(tsxPath);
        if (!response.ok) {
          throw new Error(`[MapParser] 加载 TSX 失败: ${response.statusText}`);
        }

        const tsxText = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(tsxText, 'application/xml');

        const tsxElement = doc.querySelector('tileset');
        if (!tsxElement) {
          throw new Error('[MapParser] TSX 文件未找到 tileset 元素');
        }

        // 修正图片路径：从 gfx/tilesets/xxx.png 改为 tilesets/xxx.png
        const imageEl = tsxElement.querySelector('image');
        let imagePath = imageEl?.getAttribute('source') || '';

        // 修正路径：将 ../gfx/tilesets/ 替换为 tilesets/
        imagePath = imagePath.replace('../gfx/tilesets/', 'tilesets/');
        imagePath = imagePath.replace('../tilesets/', 'tilesets/');

        const firstGid = parseInt(element.getAttribute('firstgid') || '1', 10);

        console.log(`[MapParser] TSX 图片路径: ${imagePath}, firstGid: ${firstGid}`);

        return {
          name: tsxElement.getAttribute('name') || '',
          firstGid,
          tileWidth: parseInt(tsxElement.getAttribute('tilewidth') || '32', 10),
          tileHeight: parseInt(tsxElement.getAttribute('tileheight') || '32', 10),
          tileCount: parseInt(tsxElement.getAttribute('tilecount') || '0', 10),
          columns: parseInt(tsxElement.getAttribute('columns') || '0', 10),
          image: imagePath,
          imageWidth: parseInt(imageEl?.getAttribute('width') || '0', 10),
          imageHeight: parseInt(imageEl?.getAttribute('height') || '0', 10),
          margin: parseInt(tsxElement.getAttribute('margin') || '0', 10),
          spacing: parseInt(tsxElement.getAttribute('spacing') || '0', 10),
        };
      } catch (error) {
        console.error('[MapParser] 加载外部 tileset 失败:', error);
        // 返回一个空的 tileset 以避免崩溃
        return {
          name: '',
          firstGid: parseInt(element.getAttribute('firstgid') || '1', 10),
          tileWidth: 16,
          tileHeight: 16,
          tileCount: 0,
          columns: 0,
          image: '',
          imageWidth: 0,
          imageHeight: 0,
          margin: 0,
          spacing: 0,
        };
      }
    }

    // 内嵌 tileset
    const imageEl = element.querySelector('image');

    return {
      name: element.getAttribute('name') || '',
      firstGid: parseInt(element.getAttribute('firstgid') || '1', 10),
      tileWidth: parseInt(element.getAttribute('tilewidth') || '32', 10),
      tileHeight: parseInt(element.getAttribute('tileheight') || '32', 10),
      tileCount: parseInt(element.getAttribute('tilecount') || '0', 10),
      columns: parseInt(element.getAttribute('columns') || '0', 10),
      image: imageEl?.getAttribute('source') || '',
      imageWidth: parseInt(imageEl?.getAttribute('width') || '0', 10),
      imageHeight: parseInt(imageEl?.getAttribute('height') || '0', 10),
      margin: parseInt(element.getAttribute('margin') || '0', 10),
      spacing: parseInt(element.getAttribute('spacing') || '0', 10),
    };
  }

  /**
   * 解析瓦片层
   */
  private parseTileLayer(element: Element): TMXTileLayer {
    const dataEl = element.querySelector('data');
    let data: number[] = [];

    if (dataEl) {
      const encoding = dataEl.getAttribute('encoding');
      const dataText = dataEl.textContent?.trim() || '';

      if (encoding === 'csv') {
        // CSV 编码
        data = dataText.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
      } else if (encoding === 'base64') {
        // Base64 编码（简化处理，实际需要解码）
        console.warn('[MapParser] Base64 编码暂不完全支持，请使用 CSV 编码');
      } else {
        // XML 格式（子 tile 元素）
        const tileElements = dataEl.querySelectorAll('tile');
        data = Array.from(tileElements).map(tile => parseInt(tile.getAttribute('gid') || '0', 10));
      }
    }

    return {
      name: element.getAttribute('name') || '',
      width: parseInt(element.getAttribute('width') || '0', 10),
      height: parseInt(element.getAttribute('height') || '0', 10),
      data,
      properties: this.parseProperties(element),
      visible: element.getAttribute('visible') !== '0',
      opacity: parseFloat(element.getAttribute('opacity') || '1'),
      offsetX: parseFloat(element.getAttribute('offsetx') || '0'),
      offsetY: parseFloat(element.getAttribute('offsety') || '0'),
    };
  }

  /**
   * 解析对象组
   */
  private parseObjectGroup(element: Element): TMXObjectGroup {
    const objects: TMXObject[] = [];
    const objectElements = element.querySelectorAll('object');

    for (let i = 0; i < objectElements.length; i++) {
      const objEl = objectElements[i];
      const obj: TMXObject = {
        id: parseInt(objEl.getAttribute('id') || '0', 10),
        name: objEl.getAttribute('name') || '',
        type: objEl.getAttribute('type') || '',
        x: parseFloat(objEl.getAttribute('x') || '0'),
        y: parseFloat(objEl.getAttribute('y') || '0'),
        width: parseFloat(objEl.getAttribute('width') || '0'),
        height: parseFloat(objEl.getAttribute('height') || '0'),
        rotation: parseFloat(objEl.getAttribute('rotation') || '0'),
        visible: objEl.getAttribute('visible') !== '0',
        properties: this.parseProperties(objEl),
      };

      // 解析多边形
      const polygonEl = objEl.querySelector('polygon');
      if (polygonEl) {
        obj.polygon = this.parsePoints(polygonEl.getAttribute('points') || '');
      }

      // 解析折线
      const polylineEl = objEl.querySelector('polyline');
      if (polylineEl) {
        obj.polyline = this.parsePoints(polylineEl.getAttribute('points') || '');
      }

      objects.push(obj);
    }

    return {
      name: element.getAttribute('name') || '',
      objects,
      properties: this.parseProperties(element),
      visible: element.getAttribute('visible') !== '0',
      opacity: parseFloat(element.getAttribute('opacity') || '1'),
      offsetX: parseFloat(element.getAttribute('offsetx') || '0'),
      offsetY: parseFloat(element.getAttribute('offsety') || '0'),
    };
  }

  /**
   * 解析属性
   */
  private parseProperties(element: Element): Record<string, string | number | boolean> {
    const properties: Record<string, string | number | boolean> = {};
    const propertyElements = element.querySelectorAll('properties > property');

    for (let i = 0; i < propertyElements.length; i++) {
      const propEl = propertyElements[i];
      const name = propEl.getAttribute('name') || '';
      const type = propEl.getAttribute('type') || 'string';
      const value = propEl.getAttribute('value') || propEl.textContent || '';

      switch (type) {
        case 'int':
          properties[name] = parseInt(value, 10);
          break;
        case 'float':
          properties[name] = parseFloat(value);
          break;
        case 'bool':
          properties[name] = value === 'true';
          break;
        default:
          properties[name] = value;
      }
    }

    return properties;
  }

  /**
   * 解析点数据
   */
  private parsePoints(pointsStr: string): { x: number; y: number }[] {
    return pointsStr.split(' ').map(point => {
      const [x, y] = point.split(',').map(n => parseFloat(n));
      return { x, y };
    });
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * 导出地图解析器单例
 */
export const mapParser = MapParser.getInstance();
