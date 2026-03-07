/**
 * OpenClaw MMO - 主入口文件
 */
import { Game } from './engine/Game.js';
import { ResourceManager } from './engine/ResourceManager.js';
import { inputManager, KeyCode } from './engine/InputManager.js';
import { collisionManager } from './engine/CollisionManager.js';
import { playerController, Direction } from './engine/PlayerController.js';
import { npcManager, NPCBehavior, NPCInteractionType, NPCDialogue } from './engine/NPCManager.js';
import { dialogManager } from './engine/DialogManager.js';
import { interactionManager } from './engine/InteractionManager.js';
import { sceneManager, SceneData } from './engine/SceneManager.js';
import { TMXMapData, TMXTileLayer } from './engine/MapParser.js';
import { monsterDataLoader } from './engine/MonsterData.js';
import { techniqueDataLoader } from './engine/TechniqueData.js';


/**
 * 测试地图数据（简单示例）
 * 0: 可通行, 1: 墙壁, 2: 水面, 3: 草地
 */
const TEST_MAP_WIDTH = 20;
const TEST_MAP_HEIGHT = 15;
const TEST_MAP_DATA = [
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
  1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
  1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
  1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
  1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1,
  1, 1, 0, 0, 0, 0, 0, 0, 1, 2, 2, 1, 0, 0, 0, 0, 0, 0, 1, 1,
  1, 1, 0, 0, 0, 0, 0, 0, 1, 2, 2, 1, 0, 0, 0, 0, 0, 0, 1, 1,
  1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1,
  1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
  1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
  1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1,
  1, 0, 0, 0, 3, 3, 3, 0, 0, 0, 0, 0, 0, 3, 3, 3, 0, 0, 0, 1,
  1, 0, 0, 0, 3, 3, 3, 0, 0, 0, 0, 0, 0, 3, 3, 3, 0, 0, 0, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
];

/**
 * 创建测试地图数据
 */
function createTestMapData(): TMXMapData {
  const tileLayer: TMXTileLayer = {
    name: 'ground',
    width: TEST_MAP_WIDTH,
    height: TEST_MAP_HEIGHT,
    data: TEST_MAP_DATA,
    properties: {},
    visible: true,
    opacity: 1,
    offsetX: 0,
    offsetY: 0,
  };

  return {
    width: TEST_MAP_WIDTH,
    height: TEST_MAP_HEIGHT,
    tileWidth: 32,
    tileHeight: 32,
    renderOrder: 'right-down',
    tileLayers: [tileLayer],
    objectGroups: [],
    tilesets: [],
    properties: {},
  };
}

/**
 * 游戏主类
 */
class OpenClawGame extends Game {
    private resourceManager: ResourceManager;
    private loadingScreen: HTMLElement | null = null;
    private loadingText: HTMLElement | null = null;

    /** 地图数据 */
    private mapData: TMXMapData | null = null;

    /** 瓦片宽高 */
    private tileWidth = 32;
    private tileHeight = 32;

    /** 摄像机位置 */
    private cameraX = 0;
    private cameraY = 0;

    /** 显示调试信息 */
    private showDebugInfo = false;

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

        // 初始化输入系统
        inputManager.initialize();
        console.log('[Game] Input system initialized');

        // 创建测试地图
        this.mapData = createTestMapData();
        console.log('[Game] Test map created');

        // 初始化碰撞管理器
        collisionManager.setMap(this.mapData!);
        collisionManager.addCollisionLayer({
            layerName: 'ground',
            solidTiles: [1], // GID 1 是墙壁
        });
        console.log('[Game] Collision manager initialized');

        // 初始化玩家控制器
        playerController.initialize({
            tileWidth: this.tileWidth,
            tileHeight: this.tileHeight,
            moveSpeed: 200,
            enableCollision: true,
            enableSmoothAnimation: true,
            collisionRadius: 12,
            keyRepeatDelay: 200,
            keyRepeatInterval: 100,
        });

        // 设置玩家起始位置（在地图中心附近）
        playerController.setStartTile(2, 2);

        // 注册移动事件回调
        playerController.onMoveComplete((event) => {
            console.log(`[Player] Moved from (${event.fromX}, ${event.fromY}) to (${event.toX}, ${event.toY})`);
        });

        playerController.onMoveBlocked((event) => {
            console.log(`[Player] Move blocked at (${event.toX}, ${event.toY})`);
        });
        console.log('[Game] Player controller initialized');

        // 初始化 NPC 管理器
        npcManager.initialize(playerController, this.tileWidth, this.tileHeight);

        // 添加测试 NPC
        this.createTestNPCs();
        console.log('[Game] NPC manager initialized');

        // 初始化对话管理器
        dialogManager.initialize({}, this.getWidth(), this.getHeight());
        console.log('[Game] Dialog manager initialized');

        // 初始化交互管理器
        interactionManager.initialize();
        console.log('[Game] Interaction manager initialized');

        // 初始化场景管理器
        sceneManager.initialize(this.tileWidth, this.tileHeight);
        
        // 注册测试场景
        this.createTestScenes();
        console.log('[Game] Scene manager initialized');

        try {
            // 加载 Tuxemon 资源
            console.log('[Game] Loading Tuxemon resources...');
            await monsterDataLoader.loadMonsters();
            await techniqueDataLoader.loadTechniques();
            console.log('[Game] Tuxemon resources loaded');

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

        // 绑定调试按键
        this.bindDebugKeys();
    }

    /**
     * 创建测试 NPC
     */
    private createTestNPCs(): void {
        // 村民 1 - 对话 NPC
        const villagerDialogues: NPCDialogue[] = [
            {
                id: 'greeting',
                text: '你好，旅行者！欢迎来到我们的村庄。',
                next: 'ask_help',
            },
            {
                id: 'ask_help',
                text: '有什么我可以帮助你的吗？',
                choices: [
                    { text: '我想了解一下这里', next: 'about_village' },
                    { text: '没有，谢谢', next: 'goodbye' },
                ],
            },
            {
                id: 'about_village',
                text: '我们是一个和平的小村庄，这里有许多有趣的传说...',
                next: 'goodbye',
            },
            {
                id: 'goodbye',
                text: '祝你好运，旅行者！',
            },
        ];

        npcManager.addNPC({
            id: 'villager1',
            name: '村长',
            tileX: 5,
            tileY: 5,
            x: 5 * this.tileWidth,
            y: 5 * this.tileHeight,
            tileWidth: this.tileWidth,
            tileHeight: this.tileHeight,
            direction: Direction.DOWN,
            behavior: NPCBehavior.STATIC,
            interactionType: NPCInteractionType.DIALOGUE,
            moveSpeed: 200,
            wanderInterval: [2000, 5000],
            pathPoints: [],
            currentPathIndex: 0,
            followDistance: 3,
            dialogues: villagerDialogues,
            initialDialogueId: 'greeting',
            customData: {},
            visible: true,
            interactable: true,
            collisionRadius: 12,
        });

        // 商人
        const merchantDialogues: NPCDialogue[] = [
            {
                id: 'shop',
                text: '欢迎光临我的商店！你需要什么？',
                action: 'open_shop',
            },
        ];

        npcManager.addNPC({
            id: 'merchant1',
            name: '商人',
            tileX: 10,
            tileY: 3,
            x: 10 * this.tileWidth,
            y: 3 * this.tileHeight,
            tileWidth: this.tileWidth,
            tileHeight: this.tileHeight,
            direction: Direction.DOWN,
            behavior: NPCBehavior.WANDER,
            interactionType: NPCInteractionType.SHOP,
            moveSpeed: 300,
            wanderInterval: [3000, 6000],
            pathPoints: [],
            currentPathIndex: 0,
            followDistance: 3,
            dialogues: merchantDialogues,
            customData: {},
            visible: true,
            interactable: true,
            collisionRadius: 12,
        });

        // 巡逻的守卫
        npcManager.addNPC({
            id: 'guard1',
            name: '守卫',
            tileX: 15,
            tileY: 2,
            x: 15 * this.tileWidth,
            y: 2 * this.tileHeight,
            tileWidth: this.tileWidth,
            tileHeight: this.tileHeight,
            direction: Direction.LEFT,
            behavior: NPCBehavior.PATROL,
            interactionType: NPCInteractionType.DIALOGUE,
            moveSpeed: 250,
            wanderInterval: [2000, 5000],
            pathPoints: [
                { x: 15, y: 2, waitTime: 500 },
                { x: 15, y: 10, waitTime: 1000 },
                { x: 18, y: 10, waitTime: 500 },
                { x: 18, y: 2, waitTime: 1000 },
            ],
            currentPathIndex: 0,
            followDistance: 3,
            dialogues: [
                {
                    id: 'guard',
                    text: '站住！这里是村庄的入口。',
                },
            ],
            customData: {},
            visible: true,
            interactable: true,
            collisionRadius: 12,
        });
    }

    /**
     * 创建测试场景
     */
    private createTestScenes(): void {
        // 主地图场景
        const mainMapData = createTestMapData();
        const mainScene: SceneData = {
            id: 'main_map',
            name: '主地图',
            mapData: mainMapData,
            teleports: [
                {
                    id: 'teleport_to_house',
                    name: '进入房屋',
                    x: 18 * this.tileWidth,
                    y: 5 * this.tileHeight,
                    width: this.tileWidth,
                    height: this.tileHeight,
                    targetMapId: 'house_interior',
                    targetX: 2,
                    targetY: 2,
                    type: 'door',
                },
            ],
            isIndoor: false,
            type: 'town',
        };

        // 室内场景（房屋内部）
        const houseMapData = this.createHouseMapData();
        const houseScene: SceneData = {
            id: 'house_interior',
            name: '房屋内部',
            mapData: houseMapData,
            teleports: [
                {
                    id: 'teleport_to_main',
                    name: '离开房屋',
                    x: 2 * this.tileWidth,
                    y: 4 * this.tileHeight,
                    width: this.tileWidth,
                    height: this.tileHeight,
                    targetMapId: 'main_map',
                    targetX: 18,
                    targetY: 6,
                    type: 'door',
                },
            ],
            isIndoor: true,
            type: 'building',
        };

        // 注册场景
        sceneManager.registerScene(mainScene);
        sceneManager.registerScene(houseScene);

        // 设置当前场景为主地图
        sceneManager.setCurrentScene('main_map');
    }

    /**
     * 创建房屋内部地图
     */
    private createHouseMapData(): TMXMapData {
        // 5x5 的小房间
        const HOUSE_WIDTH = 5;
        const HOUSE_HEIGHT = 5;
        const houseMapData = [
            1, 1, 1, 1, 1,
            1, 0, 0, 0, 1,
            1, 0, 0, 0, 1,
            1, 0, 0, 0, 1,
            1, 1, 0, 1, 1,  // 门在底部中间
        ];

        const tileLayer: TMXTileLayer = {
            name: 'house_floor',
            width: HOUSE_WIDTH,
            height: HOUSE_HEIGHT,
            data: houseMapData,
            properties: {},
            visible: true,
            opacity: 1,
            offsetX: 0,
            offsetY: 0,
        };

        return {
            width: HOUSE_WIDTH,
            height: HOUSE_HEIGHT,
            tileWidth: this.tileWidth,
            tileHeight: this.tileHeight,
            renderOrder: 'right-down',
            tileLayers: [tileLayer],
            objectGroups: [],
            tilesets: [],
            properties: {},
        };
    }

    /**
     * 绑定调试按键
     */
    private bindDebugKeys(): void {
        // F1 切换调试信息显示
        const checkDebugKey = () => {
            if (inputManager.isPressed(KeyCode.F1 as any) || inputManager.isPressed('f1')) {
                this.showDebugInfo = !this.showDebugInfo;
                console.log(`[Game] Debug info: ${this.showDebugInfo ? 'ON' : 'OFF'}`);
            }
        };

        // 在 update 中检查
        const originalOnUpdate = this.onUpdate.bind(this);
        this.onUpdate = (deltaTime: number) => {
            checkDebugKey();
            originalOnUpdate(deltaTime);
        };
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
        // 更新场景管理器
        sceneManager.update(deltaTime);

        // 更新玩家
        playerController.update(deltaTime);

        // 更新 NPC
        npcManager.update(deltaTime);

        // 更新对话管理器
        dialogManager.update(deltaTime);

        // 更新交互管理器
        interactionManager.update(deltaTime);

        // 更新摄像机位置（跟随玩家）
        this.updateCamera();
    }

    /**
     * 更新摄像机
     */
    private updateCamera(): void {
        const playerPos = playerController.getPixelPosition();
        const screenWidth = this.getWidth();
        const screenHeight = this.getHeight();

        // 计算地图边界
        const mapWidth = this.mapData!.width * this.tileWidth;
        const mapHeight = this.mapData!.height * this.tileHeight;

        // 摄像机居中于玩家
        this.cameraX = playerPos.x - screenWidth / 2 + this.tileWidth / 2;
        this.cameraY = playerPos.y - screenHeight / 2 + this.tileHeight / 2;

        // 限制摄像机在地图范围内
        this.cameraX = Math.max(0, Math.min(this.cameraX, mapWidth - screenWidth));
        this.cameraY = Math.max(0, Math.min(this.cameraY, mapHeight - screenHeight));

        // 如果地图小于屏幕，居中显示
        if (mapWidth < screenWidth) {
            this.cameraX = (mapWidth - screenWidth) / 2;
        }
        if (mapHeight < screenHeight) {
            this.cameraY = (mapHeight - screenHeight) / 2;
        }

        // 设置渲染器视口（暂时注释掉，TileRenderer 需要单独配置）
        // tileRenderer.setViewport(this.cameraX, this.cameraY, screenWidth, screenHeight);
    }

    /**
     * 渲染游戏画面
     */
    protected onRender(ctx: CanvasRenderingContext2D): void {
        // 清空画布
        ctx.fillStyle = '#16213e';
        ctx.fillRect(0, 0, this.getWidth(), this.getHeight());

        if (!this.mapData) {
            // 未加载地图时显示提示
            ctx.fillStyle = '#ffffff';
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Loading...', this.getWidth() / 2, this.getHeight() / 2);
            return;
        }

        // 渲染地图
        this.renderMap(ctx);

        // 渲染 NPC
        this.renderNPCs(ctx);

        // 渲染玩家
        this.renderPlayer(ctx);

        // 渲染交互提示
        interactionManager.render(ctx, this.cameraX, this.cameraY);

        // 渲染对话 UI
        dialogManager.render(ctx, this.getWidth(), this.getHeight());

        // 渲染场景切换效果
        sceneManager.render(ctx, this.getWidth(), this.getHeight());

        // 渲染调试信息
        if (this.showDebugInfo) {
            this.renderDebugInfo(ctx);
        }
    }

    /**
     * 渲染地图
     */
    private renderMap(ctx: CanvasRenderingContext2D): void {
        const mapLayer = this.mapData!.tileLayers[0];
        if (!mapLayer || !mapLayer.visible) return;

        const visibleLeft = Math.floor(this.cameraX / this.tileWidth);
        const visibleTop = Math.floor(this.cameraY / this.tileHeight);
        const visibleRight = Math.ceil((this.cameraX + this.getWidth()) / this.tileWidth);
        const visibleBottom = Math.ceil((this.cameraY + this.getHeight()) / this.tileHeight);

        for (let row = Math.max(0, visibleTop); row < Math.min(this.mapData!.height, visibleBottom); row++) {
            for (let col = Math.max(0, visibleLeft); col < Math.min(this.mapData!.width, visibleRight); col++) {
                const index = row * mapLayer.width + col;
                const gid = mapLayer.data[index];

                const x = col * this.tileWidth - this.cameraX;
                const y = row * this.tileHeight - this.cameraY;

                // 根据瓦片类型渲染不同颜色
                switch (gid) {
                    case 0: // 可通行
                        ctx.fillStyle = '#2a3f5f';
                        break;
                    case 1: // 墙壁
                        ctx.fillStyle = '#4a5568';
                        break;
                    case 2: // 水面
                        ctx.fillStyle = '#2b6cb0';
                        break;
                    case 3: // 草地
                        ctx.fillStyle = '#48bb78';
                        break;
                    default:
                        ctx.fillStyle = '#2a3f5f';
                }

                ctx.fillRect(x, y, this.tileWidth, this.tileHeight);

                // 绘制瓦片边框
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.strokeRect(x, y, this.tileWidth, this.tileHeight);
            }
        }
    }

    /**
     * 渲染玩家
     */
    private renderPlayer(ctx: CanvasRenderingContext2D): void {
        const playerPos = playerController.getPixelPosition();
        const direction = playerController.getFacingDirection();

        const x = playerPos.x - this.cameraX;
        const y = playerPos.y - this.cameraY;

        // 绘制玩家（简单矩形，实际应该使用精灵图）
        ctx.save();

        // 玩家身体
        ctx.fillStyle = '#4299e1';
        ctx.fillRect(x + 4, y + 4, this.tileWidth - 8, this.tileHeight - 8);

        // 绘制方向指示
        ctx.fillStyle = '#2b6cb0';
        switch (direction) {
            case Direction.UP:
                ctx.beginPath();
                ctx.moveTo(x + this.tileWidth / 2, y + 4);
                ctx.lineTo(x + this.tileWidth / 2 - 4, y + 12);
                ctx.lineTo(x + this.tileWidth / 2 + 4, y + 12);
                ctx.fill();
                break;
            case Direction.DOWN:
                ctx.beginPath();
                ctx.moveTo(x + this.tileWidth / 2, y + this.tileHeight - 4);
                ctx.lineTo(x + this.tileWidth / 2 - 4, y + this.tileHeight - 12);
                ctx.lineTo(x + this.tileWidth / 2 + 4, y + this.tileHeight - 12);
                ctx.fill();
                break;
            case Direction.LEFT:
                ctx.beginPath();
                ctx.moveTo(x + 4, y + this.tileHeight / 2);
                ctx.lineTo(x + 12, y + this.tileHeight / 2 - 4);
                ctx.lineTo(x + 12, y + this.tileHeight / 2 + 4);
                ctx.fill();
                break;
            case Direction.RIGHT:
                ctx.beginPath();
                ctx.moveTo(x + this.tileWidth - 4, y + this.tileHeight / 2);
                ctx.lineTo(x + this.tileWidth - 12, y + this.tileHeight / 2 - 4);
                ctx.lineTo(x + this.tileWidth - 12, y + this.tileHeight / 2 + 4);
                ctx.fill();
                break;
        }

        // 眼睛
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 10, y + 12, 4, 4);
        ctx.fillRect(x + 18, y + 12, 4, 4);

        ctx.restore();
    }

    /**
     * 渲染 NPC
     */
    private renderNPCs(ctx: CanvasRenderingContext2D): void {
        const npcs = npcManager.getAllNPCs();

        for (const npc of npcs) {
            if (!npc.visible) continue;

            const x = npc.x - this.cameraX;
            const y = npc.y - this.cameraY;

            ctx.save();

            // NPC 身体
            switch (npc.interactionType) {
                case NPCInteractionType.DIALOGUE:
                    ctx.fillStyle = '#48bb78'; // 村民 - 绿色
                    break;
                case NPCInteractionType.SHOP:
                    ctx.fillStyle = '#f6e05e'; // 商人 - 黄色
                    break;
                case NPCInteractionType.QUEST:
                    ctx.fillStyle = '#9f7aea'; // 任务 NPC - 紫色
                    break;
                default:
                    ctx.fillStyle = '#a0aec0'; // 默认 - 灰色
            }

            ctx.fillRect(x + 4, y + 4, this.tileWidth - 8, this.tileHeight - 8);

            // 绘制方向指示
            ctx.fillStyle = '#ffffff';
            const dirX = x + this.tileWidth / 2;
            const dirY = y + this.tileHeight / 2;
            let eyeOffsetY = 0;
            let eyeOffsetX = 0;

            switch (npc.direction) {
                case Direction.UP:
                    eyeOffsetY = -4;
                    break;
                case Direction.DOWN:
                    eyeOffsetY = 4;
                    break;
                case Direction.LEFT:
                    eyeOffsetX = -4;
                    break;
                case Direction.RIGHT:
                    eyeOffsetX = 4;
                    break;
            }

            ctx.fillRect(dirX - 6 + eyeOffsetX, dirY - 6 + eyeOffsetY, 4, 4);
            ctx.fillRect(dirX + 2 + eyeOffsetX, dirY - 6 + eyeOffsetY, 4, 4);

            // 绘制名字标签
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(npc.name, x + this.tileWidth / 2, y - 2);

            // 可交互提示
            if (npc.interactable) {
                ctx.fillStyle = '#48bb78';
                ctx.beginPath();
                ctx.arc(x + this.tileWidth / 2, y - 8, 3, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    }

    /**
     * 渲染调试信息
     */
    private renderDebugInfo(ctx: CanvasRenderingContext2D): void {
        const playerPos = playerController.getTilePosition();
        const pixelPos = playerController.getPixelPosition();
        const direction = playerController.getFacingDirection();
        const collisionStats = collisionManager.getStats();
        const nearbyNPCs = npcManager.getNearbyNPCs(2);

        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 250, 180);

        ctx.fillStyle = '#48bb78';
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';

        let y = 30;
        const lineHeight = 16;

        ctx.fillText(`=== Debug Info ===`, 20, y); y += lineHeight;
        ctx.fillText(`FPS: ${this.getTargetFPS()}`, 20, y); y += lineHeight;
        ctx.fillText(`Player Tile: (${playerPos.tileX}, ${playerPos.tileY})`, 20, y); y += lineHeight;
        ctx.fillText(`Player Pixel: (${Math.round(pixelPos.x)}, ${Math.round(pixelPos.y)})`, 20, y); y += lineHeight;
        ctx.fillText(`Direction: ${direction}`, 20, y); y += lineHeight;
        ctx.fillText(`State: ${playerController.getState()}`, 20, y); y += lineHeight;
        ctx.fillText(`Camera: (${Math.round(this.cameraX)}, ${Math.round(this.cameraY)})`, 20, y); y += lineHeight;
        ctx.fillText(`NPC Count: ${npcManager.getAllNPCs().length}`, 20, y); y += lineHeight;
        ctx.fillText(`Nearby NPCs: ${nearbyNPCs.length}`, 20, y); y += lineHeight;
        ctx.fillText(`Collision Layers: ${collisionStats.collisionLayers}`, 20, y); y += lineHeight;
        ctx.fillText(`Solid Tiles: ${collisionStats.solidTiles}`, 20, y); y += lineHeight;
        ctx.fillText(``, 20, y); y += lineHeight;
        ctx.fillStyle = '#f6e05e';
        ctx.fillText(`Nearby: ${nearbyNPCs.map(n => n.name).join(', ')}`, 20, y);

        ctx.restore();
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

// 将游戏实例和各管理器暴露到全局，方便调试
(window as any).game = game;
(window as any).inputManager = inputManager;
(window as any).collisionManager = collisionManager;
(window as any).playerController = playerController;
(window as any).npcManager = npcManager;
(window as any).dialogManager = dialogManager;
(window as any).interactionManager = interactionManager;
(window as any).monsterDataLoader = monsterDataLoader;
(window as any).techniqueDataLoader = techniqueDataLoader;
