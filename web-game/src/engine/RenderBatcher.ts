/**
 * 渲染批处理系统
 * 负责优化渲染性能，通过批量渲染减少 draw call 数量
 */

/**
 * 渲染批处理类型
 */
export enum BatchType {
    /** 矩形批次 */
    RECTANGLE = 'rectangle',

    /** 圆形批次 */
    CIRCLE = 'circle',

    /** 图片批次 */
    IMAGE = 'image',

    /** 文本批次 */
    TEXT = 'text',

    /** 线条批次 */
    LINE = 'line',
}

/**
 * 渲染操作
 */
export interface RenderOperation {
    /** 批次类型 */
    type: BatchType;

    /** 绘制函数 */
    render: (ctx: CanvasRenderingContext2D) => void;

    /** 是否需要保存/恢复上下文 */
    saveRestore?: boolean;

    /** 自定义属性 */
    properties?: Record<string, any>;
}

/**
 * 渲染批次配置
 */
export interface RenderBatchConfig {
    /** 是否启用批处理 */
    enabled: boolean;

    /** 最大批次大小 */
    maxBatchSize: number;

    /** 是否启用上下文状态优化 */
    enableContextOptimization: boolean;
}

/**
 * 渲染批处理器
 */
export class RenderBatcher {
    private static instance: RenderBatcher;

    /** 批次映射表 */
    private batches: Map<BatchType, RenderOperation[]> = new Map();

    /** 当前上下文状态 */
    private contextState: Map<string, any> = new Map();

    /** 配置 */
    private config: RenderBatchConfig = {
        enabled: true,
        maxBatchSize: 1000,
        enableContextOptimization: true,
    };

    /** 是否在批处理模式 */
    private batching: boolean = false;

    /** 渲染统计 */
    private stats = {
        operations: 0,
        batches: 0,
        drawCalls: 0,
        contextStateChanges: 0,
    };

    /**
     * 私有构造函数，确保单例
     */
    private constructor() {
        // 初始化批次
        Object.values(BatchType).forEach(type => {
            this.batches.set(type as BatchType, []);
        });
    }

    /**
     * 获取渲染批处理器单例实例
     */
    static getInstance(): RenderBatcher {
        if (!RenderBatcher.instance) {
            RenderBatcher.instance = new RenderBatcher();
        }
        return RenderBatcher.instance;
    }

    /**
     * 初始化渲染批处理器
     * @param config 配置选项
     */
    initialize(config?: Partial<RenderBatchConfig>): void {
        if (config) {
            this.config = { ...this.config, ...config };
        }
        console.log('[RenderBatcher] 渲染批处理器已初始化', this.config);
    }

    /**
     * 开始批处理
     */
    beginBatch(): void {
        this.batching = true;
        this.resetStats();
    }

    /**
     * 结束批处理并执行渲染
     */
    endBatch(ctx: CanvasRenderingContext2D): void {
        this.batching = false;

        // 执行所有批次
        for (const [, operations] of this.batches) {
            if (operations.length === 0) continue;

            this.stats.batches++;

            // 批量渲染
            for (let i = 0; i < operations.length; i += this.config.maxBatchSize) {
                const batch = operations.slice(i, i + this.config.maxBatchSize);

                if (batch.length > 0) {
                    // 保存状态
                    if (batch[0].saveRestore) {
                        ctx.save();
                    }

                    // 执行渲染
                    for (const op of batch) {
                        op.render(ctx);
                        this.stats.drawCalls++;
                    }

                    // 恢复状态
                    if (batch[0].saveRestore) {
                        ctx.restore();
                    }
                }
            }
        }

        // 清空批次
        this.batches.forEach(ops => ops.length = 0);
    }

    /**
     * 添加渲染操作
     */
    addOperation(type: BatchType, render: (ctx: CanvasRenderingContext2D) => void, saveRestore: boolean = true): void {
        if (!this.batching || !this.config.enabled) {
            // 不在批处理模式下，立即执行
            return;
        }

        const batch = this.batches.get(type);
        if (!batch) return;

        batch.push({ type, render, saveRestore });
        this.stats.operations++;
    }

    /**
     * 批量绘制矩形
     */
    drawRect(x: number, y: number, width: number, height: number, fillStyle: string | CanvasGradient | CanvasPattern): void {
        if (!this.batching) return;

        const batch = this.batches.get(BatchType.RECTANGLE);
        if (!batch) return;

        batch.push({
            type: BatchType.RECTANGLE,
            saveRestore: false,
            properties: { x, y, width, height, fillStyle },
            render: (ctx) => {
                ctx.fillStyle = fillStyle;
                ctx.fillRect(x, y, width, height);
            },
        });

        this.stats.operations++;
    }

    /**
     * 批量绘制图片
     */
    drawImage(image: CanvasImageSource, dx: number, dy: number): void {
        if (!this.batching) return;

        const batch = this.batches.get(BatchType.IMAGE);
        if (!batch) return;

        batch.push({
            type: BatchType.IMAGE,
            saveRestore: false,
            properties: { image, dx, dy },
            render: (ctx) => {
                ctx.drawImage(image, dx, dy);
            },
        });

        this.stats.operations++;
    }

    /**
     * 批量绘制文本
     */
    drawText(text: string, x: number, y: number, font: string, fillStyle: string, textAlign: CanvasTextAlign = 'left'): void {
        if (!this.batching) return;

        const batch = this.batches.get(BatchType.TEXT);
        if (!batch) return;

        batch.push({
            type: BatchType.TEXT,
            saveRestore: false,
            properties: { text, x, y, font, fillStyle, textAlign },
            render: (ctx) => {
                ctx.font = font;
                ctx.fillStyle = fillStyle;
                ctx.textAlign = textAlign;
                ctx.fillText(text, x, y);
            },
        });

        this.stats.operations++;
    }

    /**
     * 优化上下文状态设置
     * 避免重复设置相同的属性
     */
    setContextProperty(ctx: CanvasRenderingContext2D, key: string, value: any): boolean {
        if (!this.config.enableContextOptimization) {
            (ctx as any)[key] = value;
            return true;
        }

        const currentValue = this.contextState.get(key);
        if (currentValue === value) {
            return false; // 没有变化，不需要设置
        }

        (ctx as any)[key] = value;
        this.contextState.set(key, value);
        this.stats.contextStateChanges++;
        return true;
    }

    /**
     * 重置上下文状态
     */
    resetContextState(): void {
        this.contextState.clear();
    }

    /**
     * 重置统计信息
     */
    private resetStats(): void {
        this.stats = {
            operations: 0,
            batches: 0,
            drawCalls: 0,
            contextStateChanges: 0,
        };
    }

    /**
     * 获取统计信息
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * 是否在批处理模式
     */
    isBatching(): boolean {
        return this.batching;
    }

    /**
     * 启用批处理
     */
    enable(): void {
        this.config.enabled = true;
        console.log('[RenderBatcher] 渲染批处理已启用');
    }

    /**
     * 禁用批处理
     */
    disable(): void {
        this.config.enabled = false;
        console.log('[RenderBatcher] 渲染批处理已禁用');
    }

    /**
     * 清空批次
     */
    clear(): void {
        this.batches.forEach(ops => ops.length = 0);
        this.resetContextState();
    }
}

/**
 * 导出渲染批处理器单例
 */
export const renderBatcher = RenderBatcher.getInstance();
