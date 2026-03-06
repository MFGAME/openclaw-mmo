/**
 * 游戏主类
 * 负责游戏循环、初始化和渲染
 */
export class Game {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private lastTime: number = 0;
    private targetFPS: number = 60;
    private frameDuration: number = 1000 / this.targetFPS;
    private isRunning: boolean = false;
    private animationFrameId: number | null = null;
    private width: number;
    private height: number;

    /**
     * 创建游戏实例
     * @param canvasId canvas 元素的 ID
     * @param width 游戏宽度
     * @param height 游戏高度
     */
    constructor(canvasId: string, width: number = 800, height: number = 600) {
        const canvas = document.getElementById(canvasId);
        if (!(canvas instanceof HTMLCanvasElement)) {
            throw new Error(`Canvas element with id "${canvasId}" not found`);
        }

        this.canvas = canvas;
        this.width = width;
        this.height = height;

        const ctx = this.canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get 2D context from canvas');
        }
        this.ctx = ctx;

        // 设置 canvas 尺寸
        this.canvas.width = width;
        this.canvas.height = height;
    }

    /**
     * 初始化游戏
     */
    public async init(): Promise<void> {
        console.log('Initializing game...');
        await this.onInit();
    }

    /**
     * 启动游戏循环
     */
    public start(): void {
        if (this.isRunning) {
            console.warn('Game is already running');
            return;
        }

        console.log('Starting game...');
        this.isRunning = true;
        this.lastTime = performance.now();
        this.gameLoop();
    }

    /**
     * 停止游戏循环
     */
    public stop(): void {
        if (!this.isRunning) {
            console.warn('Game is not running');
            return;
        }

        console.log('Stopping game...');
        this.isRunning = false;
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    /**
     * 暂停游戏
     */
    public pause(): void {
        this.isRunning = false;
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    /**
     * 恢复游戏
     */
    public resume(): void {
        if (!this.isRunning) {
            this.isRunning = true;
            this.lastTime = performance.now();
            this.gameLoop();
        }
    }

    /**
     * 游戏主循环
     */
    private gameLoop(): void {
        if (!this.isRunning) {
            return;
        }

        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;

        if (deltaTime >= this.frameDuration) {
            // 计算实际经过的时间，考虑帧率限制
            const adjustedDelta = Math.min(deltaTime, this.frameDuration * 3);

            this.update(adjustedDelta);
            this.render();

            this.lastTime = currentTime - (deltaTime % this.frameDuration);
        }

        this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
    }

    /**
     * 更新游戏状态
     * @param deltaTime 距离上一帧的时间（毫秒）
     */
    protected update(deltaTime: number): void {
        this.onUpdate(deltaTime);
    }

    /**
     * 渲染游戏画面
     */
    protected render(): void {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.onRender(this.ctx);
    }

    /**
     * 初始化回调（子类重写）
     */
    protected async onInit(): Promise<void> {
        // 子类实现
    }

    /**
     * 更新回调（子类重写）
     * @param deltaTime 距离上一帧的时间（毫秒）
     */
    protected onUpdate(deltaTime: number): void {
        // 子类实现
    }

    /**
     * 渲染回调（子类重写）
     * @param ctx Canvas 2D 上下文
     */
    protected onRender(ctx: CanvasRenderingContext2D): void {
        // 子类实现
    }

    /**
     * 获取画布宽度
     */
    public getWidth(): number {
        return this.width;
    }

    /**
     * 获取画布高度
     */
    public getHeight(): number {
        return this.height;
    }

    /**
     * 获取 Canvas 2D 上下文
     */
    public getContext(): CanvasRenderingContext2D {
        return this.ctx;
    }

    /**
     * 检查游戏是否正在运行
     */
    public isPlaying(): boolean {
        return this.isRunning;
    }

    /**
     * 设置目标帧率
     * @param fps 目标帧率
     */
    public setTargetFPS(fps: number): void {
        this.targetFPS = fps;
        this.frameDuration = 1000 / this.targetFPS;
    }

    /**
     * 获取目标帧率
     */
    public getTargetFPS(): number {
        return this.targetFPS;
    }
}
