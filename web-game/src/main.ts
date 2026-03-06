/**
 * OpenClaw MMO - 主入口文件
 */
import { Game } from './engine/Game.js';
import { ResourceManager } from './engine/ResourceManager.js';

/**
 * 游戏主类
 */
class OpenClawGame extends Game {
    private resourceManager: ResourceManager;
    private loadingScreen: HTMLElement | null = null;
    private loadingText: HTMLElement | null = null;

    constructor() {
        super('game-canvas', 800, 600);
        this.resourceManager = new ResourceManager();
    }

    /**
     * 初始化游戏
     */
    protected async onInit(): Promise<void> {
        console.log('Initializing OpenClaw MMO...');

        // 获取加载屏幕元素
        this.loadingScreen = document.getElementById('loading-screen');
        this.loadingText = document.getElementById('loading-text');

        // 添加资源到加载队列（示例资源）
        // this.resourceManager.add('/assets/sprites/player.png', 'image');
        // this.resourceManager.add('/assets/sprites/enemy.png', 'image');
        // this.resourceManager.add('/assets/data/game.json', 'json');
        // this.resourceManager.add('/assets/audio/bgm.mp3', 'audio');

        try {
            // 加载所有资源
            if (this.resourceManager.getQueueSize() > 0) {
                await this.resourceManager.loadAll((progress) => {
                    this.updateLoadingProgress(progress);
                });
            }

            // 隐藏加载屏幕
            this.hideLoadingScreen();

            console.log('Game initialized successfully');
        } catch (error) {
            console.error('Failed to initialize game:', error);
            if (this.loadingText) {
                this.loadingText.textContent = '加载失败！请刷新页面重试。';
            }
        }
    }

    /**
     * 更新加载进度显示
     */
    private updateLoadingProgress(progress: { percentage: number }): void {
        if (this.loadingText) {
            this.loadingText.textContent = `加载中... ${Math.floor(progress.percentage)}%`;
        }
    }

    /**
     * 隐藏加载屏幕
     */
    private hideLoadingScreen(): void {
        if (this.loadingScreen) {
            this.loadingScreen.classList.add('hidden');
        }
    }

    /**
     * 更新游戏状态
     */
    protected onUpdate(deltaTime: number): void {
        // TODO: 实现游戏逻辑更新
    }

    /**
     * 渲染游戏画面
     */
    protected onRender(ctx: CanvasRenderingContext2D): void {
        // TODO: 实现游戏画面渲染

        // 绘制简单的测试画面
        ctx.fillStyle = '#16213e';
        ctx.fillRect(0, 0, this.getWidth(), this.getHeight());

        ctx.fillStyle = '#ffffff';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('OpenClaw MMO', this.getWidth() / 2, this.getHeight() / 2);
    }
}

// 创建并启动游戏
const game = new OpenClawGame();

// 等待 DOM 加载完成后初始化游戏
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        await game.init();
        game.start();
    });
} else {
    // DOM 已经加载完成
    (async () => {
        await game.init();
        game.start();
    })();
}

// 将游戏实例暴露到全局，方便调试
(window as any).game = game;
