/**
 * LOD (Level of Detail) 管理器
 * 根据距离调整渲染细节，优化性能
 */

/**
 * LOD 级别枚举
 */
export enum LODLevel {
    /** 高细节（近距离） */
    HIGH = 'high',

    /** 中细节（中距离） */
    MEDIUM = 'medium',

    /** 低细节（远距离） */
    LOW = 'low',

    /** 不渲染（超远距离） */
    NONE = 'none',
}

/**
 * LOD 区域配置
 */
export interface LODRegion {
    /** 区域名称 */
    name: string;

    /** LOD 级别 */
    level: LODLevel;

    /** 距离阈值 */
    distance: number;
}

/**
 * LOD 对象配置
 */
export interface LODObject {
    /** 对象 ID */
    id: string;

    /** 对象位置 X */
    x: number;

    /** 对象位置 Y */
    y: number;

    /** 当前 LOD 级别 */
    currentLevel: LODLevel;

    /** 是否可见 */
    visible: boolean;

    /** 自定义数据 */
    data?: any;
}

/**
 * LOD 管理器配置
 */
export interface LODManagerConfig {
    /** 相机位置 X */
    cameraX: number;

    /** 相机位置 Y */
    cameraY: number;

    /** LOD 区域配置 */
    regions: LODRegion[];

    /** 是否启用视锥剔除 */
    enableFrustumCulling: boolean;

    /** 视口宽度 */
    viewportWidth: number;

    /** 视口高度 */
    viewportHeight: number;

    /** 扩展区域（像素），用于平滑过渡 */
    extendedArea: number;
}

/**
 * LOD 管理器
 */
export class LODManager {
    private static instance: LODManager;

    /** 配置 */
    private config: LODManagerConfig = {
        cameraX: 0,
        cameraY: 0,
        regions: [
            { name: 'high', level: LODLevel.HIGH, distance: 300 },
            { name: 'medium', level: LODLevel.MEDIUM, distance: 600 },
            { name: 'low', level: LODLevel.LOW, distance: 1200 },
        ],
        enableFrustumCulling: true,
        viewportWidth: 800,
        viewportHeight: 600,
        extendedArea: 100,
    };

    /** LOD 对象集合 */
    private objects: Map<string, LODObject> = new Map();

    /** 可见对象集合 */
    private visibleObjects: Set<string> = new Set();

    /** 统计信息 */
    private stats = {
        total: 0,
        visible: 0,
        highDetail: 0,
        mediumDetail: 0,
        lowDetail: 0,
        culled: 0,
    };

    /**
     * 私有构造函数，确保单例
     */
    private constructor() {}

    /**
     * 获取 LOD 管理器单例实例
     */
    static getInstance(): LODManager {
        if (!LODManager.instance) {
            LODManager.instance = new LODManager();
        }
        return LODManager.instance;
    }

    /**
     * 初始化 LOD 管理器
     * @param config 配置选项
     */
    initialize(config?: Partial<LODManagerConfig>): void {
        if (config) {
            this.config = { ...this.config, ...config };
        }
        console.log('[LODManager] LOD 管理器已初始化', this.config);
    }

    /**
     * 更新相机位置
     * @param x 相机 X 位置
     * @param y 相机 Y 位置
     */
    updateCamera(x: number, y: number): void {
        this.config.cameraX = x;
        this.config.cameraY = y;
    }

    /**
     * 更新视口大小
     * @param width 视口宽度
     * @param height 视口高度
     */
    updateViewport(width: number, height: number): void {
        this.config.viewportWidth = width;
        this.config.viewportHeight = height;
    }

    /**
     * 添加 LOD 对象
     * @param id 对象 ID
     * @param x 对象 X 位置
     * @param y 对象 Y 位置
     * @param data 自定义数据
     */
    addObject(id: string, x: number, y: number, data?: any): void {
        if (this.objects.has(id)) {
            console.warn(`[LODManager] 对象 ${id} 已存在`);
            return;
        }

        const obj: LODObject = {
            id,
            x,
            y,
            currentLevel: LODLevel.NONE,
            visible: false,
            data,
        };

        this.objects.set(id, obj);
        this.stats.total++;
    }

    /**
     * 批量添加 LOD 对象
     * @param objects 对象数组
     */
    addObjects(objects: Array<{ id: string; x: number; y: number; data?: any }>): void {
        objects.forEach(obj => this.addObject(obj.id, obj.x, obj.y, obj.data));
    }

    /**
     * 移除 LOD 对象
     * @param id 对象 ID
     */
    removeObject(id: string): void {
        if (this.objects.delete(id)) {
            this.stats.total--;
            this.visibleObjects.delete(id);
        }
    }

    /**
     * 更新所有对象的 LOD 级别
     */
    update(): void {
        // 重置统计
        this.stats = {
            total: this.stats.total,
            visible: 0,
            highDetail: 0,
            mediumDetail: 0,
            lowDetail: 0,
            culled: 0,
        };

        this.visibleObjects.clear();

        for (const obj of this.objects.values()) {
            const { level, visible } = this.calculateLOD(obj);

            obj.currentLevel = level;
            obj.visible = visible;

            if (visible) {
                this.visibleObjects.add(obj.id);
                this.stats.visible++;

                switch (level) {
                    case LODLevel.HIGH:
                        this.stats.highDetail++;
                        break;
                    case LODLevel.MEDIUM:
                        this.stats.mediumDetail++;
                        break;
                    case LODLevel.LOW:
                        this.stats.lowDetail++;
                        break;
                    case LODLevel.NONE:
                        this.stats.culled++;
                        break;
                }
            } else {
                this.stats.culled++;
            }
        }
    }

    /**
     * 计算对象的 LOD 级别
     * @param obj LOD 对象
     */
    private calculateLOD(obj: LODObject): { level: LODLevel; visible: boolean } {
        const { cameraX, cameraY, viewportWidth, viewportHeight, extendedArea, enableFrustumCulling } = this.config;

        // 计算到相机的距离
        const dx = obj.x - cameraX;
        const dy = obj.y - cameraY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // 视锥剔除
        if (enableFrustumCulling) {
            const halfWidth = viewportWidth / 2 + extendedArea;
            const halfHeight = viewportHeight / 2 + extendedArea;

            if (dx < -halfWidth || dx > halfWidth || dy < -halfHeight || dy > halfHeight) {
                return { level: LODLevel.NONE, visible: false };
            }
        }

        // 根据距离确定 LOD 级别
        let level = LODLevel.LOW;

        for (const region of this.config.regions) {
            if (distance < region.distance) {
                level = region.level;
                break;
            }
        }

        return { level, visible: true };
    }

    /**
     * 获取对象的 LOD 级别
     * @param id 对象 ID
     */
    getLODLevel(id: string): LODLevel | null {
        const obj = this.objects.get(id);
        return obj?.currentLevel ?? null;
    }

    /**
     * 检查对象是否可见
     * @param id 对象 ID
     */
    isVisible(id: string): boolean {
        const obj = this.objects.get(id);
        return obj?.visible ?? false;
    }

    /**
     * 获取可见对象集合
     */
    getVisibleObjects(): LODObject[] {
        return Array.from(this.visibleObjects)
            .map(id => this.objects.get(id))
            .filter((obj): obj is LODObject => obj !== undefined);
    }

    /**
     * 获取指定 LOD 级别的对象
     * @param level LOD 级别
     */
    getObjectsByLevel(level: LODLevel): LODObject[] {
        return Array.from(this.objects.values()).filter(obj => obj.currentLevel === level && obj.visible);
    }

    /**
     * 获取统计信息
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * 清空所有对象
     */
    clear(): void {
        this.objects.clear();
        this.visibleObjects.clear();
        this.stats = {
            total: 0,
            visible: 0,
            highDetail: 0,
            mediumDetail: 0,
            lowDetail: 0,
            culled: 0,
        };
    }

    /**
     * 启用视锥剔除
     */
    enableFrustumCulling(): void {
        this.config.enableFrustumCulling = true;
        console.log('[LODManager] 视锥剔除已启用');
    }

    /**
     * 禁用视锥剔除
     */
    disableFrustumCulling(): void {
        this.config.enableFrustumCulling = false;
        console.log('[LODManager] 视锥剔除已禁用');
    }

    /**
     * 设置 LOD 区域配置
     * @param regions LOD 区域配置
     */
    setRegions(regions: LODRegion[]): void {
        this.config.regions = regions;
        console.log('[LODManager] LOD 区域配置已更新', regions);
    }

    /**
     * 获取 LOD 区域配置
     */
    getRegions(): LODRegion[] {
        return [...this.config.regions];
    }
}

/**
 * 导出 LOD 管理器单例
 */
export const lodManager = LODManager.getInstance();
