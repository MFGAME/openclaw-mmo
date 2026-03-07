/**
 * 飞书小程序 Canvas 适配器
 * 负责将标准 Canvas API 适配到飞书小程序环境
 */

/**
 * Canvas 适配器接口
 */
export interface ICanvasAdapter {
    /**
     * 获取 Canvas 2D 上下文
     */
    getContext(): CanvasRenderingContext2D;

    /**
     * 设置 Canvas 尺寸
     */
    setSize(width: number, height: number): void;

    /**
     * 获取 Canvas 宽度
     */
    getWidth(): number;

    /**
     * 获取 Canvas 高度
     */
    getHeight(): number;

    /**
     * 请求动画帧
     */
    requestAnimationFrame(callback: FrameRequestCallback): number;

    /**
     * 取消动画帧
     */
    cancelAnimationFrame(requestId: number): void;
}

/**
 * 标准 Canvas 适配器（浏览器环境）
 */
class StandardCanvasAdapter implements ICanvasAdapter {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    constructor(canvasId: string) {
        const canvas = document.getElementById(canvasId);
        if (!(canvas instanceof HTMLCanvasElement)) {
            throw new Error(`Canvas element with id "${canvasId}" not found`);
        }
        this.canvas = canvas;

        const ctx = this.canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get 2D context from canvas');
        }
        this.ctx = ctx;
    }

    getContext(): CanvasRenderingContext2D {
        return this.ctx;
    }

    setSize(width: number, height: number): void {
        this.canvas.width = width;
        this.canvas.height = height;
    }

    getWidth(): number {
        return this.canvas.width;
    }

    getHeight(): number {
        return this.canvas.height;
    }

    requestAnimationFrame(callback: FrameRequestCallback): number {
        return requestAnimationFrame(callback);
    }

    cancelAnimationFrame(requestId: number): void {
        cancelAnimationFrame(requestId);
    }
}

/**
 * 飞书小程序 Canvas 适配器
 */
class FeishuCanvasAdapterImpl implements ICanvasAdapter {
    private canvas: any; // Feishu Canvas 类型
    private ctx: any; // Feishu Canvas Context 类型
    private proxyCtx: CanvasRenderingContext2D = {} as CanvasRenderingContext2D; // 代理上下文

    constructor(canvasId: string) {
        const uni = (globalThis as any).uni;
        if (typeof uni === 'undefined') {
            throw new Error('Not in Feishu environment');
        }

        // 获取飞书小程序 Canvas
        const query = uni.createSelectorQuery();
        query.select(`#${canvasId}`)
            .fields({ node: true, size: true })
            .exec((res: any) => {
                if (!res || !res[0]) {
                    throw new Error(`Canvas element with id "${canvasId}" not found`);
                }
                this.canvas = res[0].node;
                this.ctx = this.canvas.getContext('2d');

                // 设置 Canvas 尺寸
                const dpr = uni.getSystemInfoSync().pixelRatio || 1;
                this.canvas.width = res[0].width * dpr;
                this.canvas.height = res[0].height * dpr;
                this.ctx.scale(dpr, dpr);

                // 创建代理上下文
                this.proxyCtx = this.createProxyContext();
            });
    }

    /**
     * 创建代理 Canvas 2D 上下文
     * 将标准 API 调用转发到飞书小程序 Canvas 上下文
     */
    private createProxyContext(): CanvasRenderingContext2D {
        const handler: ProxyHandler<any> = {
            get: (target, prop) => {
                // 如果是函数，返回代理函数
                if (typeof target[prop] === 'function') {
                    return (...args: any[]) => {
                        try {
                            return target[prop].apply(target, args);
                        } catch (error) {
                            console.warn(`[FeishuCanvasAdapter] Method ${String(prop)} failed:`, error);
                            return undefined;
                        }
                    };
                }
                // 否则返回属性值
                return target[prop];
            },
            set: (target, prop, value) => {
                target[prop] = value;
                return true;
            }
        };

        return new Proxy(this.ctx, handler) as CanvasRenderingContext2D;
    }

    getContext(): CanvasRenderingContext2D {
        return this.proxyCtx;
    }

    setSize(width: number, height: number): void {
        const uni = (globalThis as any).uni;
        if (!this.canvas || typeof uni === 'undefined') {
            return;
        }
        const dpr = uni.getSystemInfoSync().pixelRatio || 1;
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.ctx.scale(dpr, dpr);
    }

    getWidth(): number {
        if (!this.canvas) {
            return 0;
        }
        const uni = (globalThis as any).uni;
        const dpr = (typeof uni !== 'undefined' && uni.getSystemInfoSync) ? uni.getSystemInfoSync().pixelRatio || 1 : 1;
        return this.canvas.width / dpr;
    }

    getHeight(): number {
        if (!this.canvas) {
            return 0;
        }
        const uni = (globalThis as any).uni;
        const dpr = (typeof uni !== 'undefined' && uni.getSystemInfoSync) ? uni.getSystemInfoSync().pixelRatio || 1 : 1;
        return this.canvas.height / dpr;
    }

    requestAnimationFrame(callback: FrameRequestCallback): number {
        // 飞书小程序使用 setTimeout 模拟 requestAnimationFrame
        return setTimeout(() => {
            callback(Date.now());
        }, 1000 / 60) as unknown as number;
    }

    cancelAnimationFrame(requestId: number): void {
        clearTimeout(requestId);
    }
}

/**
 * Canvas 适配器工厂
 */
export class CanvasAdapterFactory {
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
     * 创建 Canvas 适配器
     * @param canvasId Canvas 元素的 ID
     * @returns Canvas 适配器实例
     */
    public static create(canvasId: string): ICanvasAdapter {
        const env = this.detectEnvironment();

        console.log(`[CanvasAdapterFactory] Detected environment: ${env}`);

        switch (env) {
            case 'feishu':
                return new FeishuCanvasAdapterImpl(canvasId);
            case 'standard':
            default:
                return new StandardCanvasAdapter(canvasId);
        }
    }

    /**
     * 检查是否在飞书小程序环境中
     */
    public static isFeishuEnvironment(): boolean {
        return this.detectEnvironment() === 'feishu';
    }
}

// 导出单例适配器实例
let adapterInstance: ICanvasAdapter | null = null;

/**
 * 获取 Canvas 适配器实例
 * @param canvasId Canvas 元素的 ID
 * @returns Canvas 适配器实例
 */
export function getCanvasAdapter(canvasId: string): ICanvasAdapter {
    if (!adapterInstance) {
        adapterInstance = CanvasAdapterFactory.create(canvasId);
    }
    return adapterInstance;
}

/**
 * 重置 Canvas 适配器实例
 */
export function resetCanvasAdapter(): void {
    adapterInstance = null;
}
