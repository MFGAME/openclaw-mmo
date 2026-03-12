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
import { TMXMapData, TMXTileset, mapParser } from './engine/MapParser.js';
import { monsterDataLoader } from './engine/MonsterData.js';
import { techniqueDataLoader } from './engine/TechniqueData.js';
import { eventSystem } from './engine/EventSystem.js';
import { audioManager } from './engine/AudioManager.js';
import { itemDataLoader } from './engine/ItemData.js';
import { titleScreen } from './engine/TitleScreen.js';
import { bagUI } from './engine/BagUI.js';
import { io, Socket } from 'socket.io-client';
import { shopManager } from './engine/ShopManager.js';
import { battleManager } from './engine/BattleManager.js';
import { battleUI } from './engine/BattleUI.js';
import { BattleUnit, BattleResult } from './engine/BattleState.js';
import type { MonsterInstance } from './engine/MonsterData.js';
import { encounterManager, EncounterResult } from './encounter/EncounterManager.js';
import { performanceMonitor } from './engine/PerformanceMonitor.js';

/**
 * 其他玩家数据接口
 */
interface OtherPlayer {
    id: string;
    name: string;
    x: number;
    y: number;
    direction: Direction;
    level: number;
    isBot: boolean;
}
/**
 * 从怪物实例创建战斗单位
 */
function createBattleUnitFromInstance(m: MonsterInstance, isPlayer: boolean): BattleUnit {
  return {
    id: m.instanceId,
    monsterId: m.monsterId,
    name: m.nickname || m.monsterId,
    currentHp: m.currentHp,
    maxHp: m.maxHp,
    level: m.level,
    exp: m.exp,
    elements: m.types,
    status: m.status,
    techniques: m.techniques,
    attack: m.attack,
    defense: m.defense,
    speed: m.speed,
    specialAttack: m.specialAttack,
    specialDefense: m.specialDefense,
    isPlayer,
    isFainted: m.currentHp <= 0,
  };
}
interface BattleData {
    battleId: string;
    opponent: OtherPlayer;
}
/**
 * 瓦片图片缓存（GID -> Image）
 */
interface TilesetImage {
    image: HTMLImageElement;
    tileWidth: number;
    tileHeight: number;
    columns: number;
    firstGid: number;
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

    /** 瓦片图片缓存 */
    private tilesetImages: Map<number, TilesetImage> = new Map();

    /** 瓦片宽高 */
    private tileWidth = 32;
    private tileHeight = 32;

    /** 摄像机位置 */
    private cameraX = 0;
    private cameraY = 0;

    /** 显示调试信息 */
    private showDebugInfo = false;
    private gameState: 'loading' | 'title' | 'playing' = 'loading';

    /** Socket.IO 实例 */
    private socket: Socket | null = null;

    /** 连接状态 */
    private connectedToMMO = false;

    /** 玩家 ID */
    private playerId: string = '';

    /** 玩家名称 */
    private playerName: string = 'Player_' + Math.floor(Math.random() * 10000);

    /** 其他玩家列表 */
    private otherPlayers: Map<string, OtherPlayer> = new Map();

    /** 最后发送位置的时间 */
    private lastPositionSendTime = 0;

    /** 位置发送间隔（毫秒） */
    private readonly POSITION_SEND_INTERVAL = 200;

    /** 连接状态显示元素 */
    private connectionStatusElement: HTMLElement | null = null;

    /** 选中玩家 ID（用于挑战） */
    private selectedPlayerId: string | null = null;

    /** 战斗界面是否打开 */
    private inBattle = false;

    constructor() {
        super('game-canvas', 800, 600);
        this.resourceManager = new ResourceManager();

        // 初始化 Socket.IO 连接
        this.initializeSocketConnection();
    }

    /**
     * 初始化 Socket.IO 连接
     */
    private initializeSocketConnection(): void {
        console.log('[MMO] 正在连接到 MMO 服务器...');
        this.socket = io('http://localhost:3000');

        // 连接成功
        this.socket.on('connect', () => {
            this.connectedToMMO = true;
            this.playerId = this.socket!.id ?? 'unknown';
            console.log('✅ 已连接到 MMO 服务器，玩家 ID:', this.playerId);
            this.updateConnectionStatus('已连接', 'connected');

            // 发送玩家加入游戏
            this.socket!.emit('player_join', {
                id: this.playerId,
                name: this.playerName,
                x: playerController.getPixelPosition().x,
                y: playerController.getPixelPosition().y,
                direction: playerController.getFacingDirection(),
            });
        });

        // 连接断开
        this.socket.on('disconnect', () => {
            this.connectedToMMO = false;
            console.log('❌ 与服务器断开连接');
            this.updateConnectionStatus('已断开', 'disconnected');
        });

        // 连接错误
        this.socket.on('connect_error', (error: Error) => {
            console.error('[MMO] 连接错误:', error);
            this.updateConnectionStatus('连接失败', 'error');
        });

        // 接收其他玩家更新
        this.socket.on('players_update', (players: OtherPlayer[]) => {
            this.updateOtherPlayers(players);
        });

        // 接收玩家加入
        this.socket.on('player_joined', (player: OtherPlayer) => {
            console.log('[MMO] 玩家加入:', player.name);
            this.otherPlayers.set(player.id, player);
        });

        // 接收玩家离开
        this.socket.on('player_left', (playerId: string) => {
            console.log('[MMO] 玩家离开:', playerId);
            this.otherPlayers.delete(playerId);
            if (this.selectedPlayerId === playerId) {
                this.selectedPlayerId = null;
            }
        });

        // 接收玩家移动
        this.socket.on('player_move', (data: { id: string; x: number; y: number; direction: Direction }) => {
            const player = this.otherPlayers.get(data.id);
            if (player) {
                player.x = data.x;
                player.y = data.y;
                player.direction = data.direction;
            }
        });

        // 接收挑战请求（服务器发送 fromId, fromName, battleId）
        this.socket.on('challenge_received', (data: { fromId: string; fromName: string; battleId: string }) => {
            console.log('[MMO] 收到挑战请求:', data.fromName);
            this.showChallengeDialog(data.fromId, data.fromName, data.battleId);
        });

        // 接收挑战响应（仅在被拒绝时由服务器转发，接受时服务器直接发 battle_start）
        this.socket.on('challenge_response', (data: { accepted: boolean }) => {
            if (!data.accepted) {
                console.log('[MMO] 挑战被拒绝');
                this.showToast('对方拒绝了你的挑战');
            }
        });

        // 开始战斗（服务器发送 battleId, player1, player2）
        this.socket.on('battle_start', (data: { battleId: string; player1: OtherPlayer; player2: OtherPlayer }) => {
            const opponent = data.player1.id === this.playerId ? data.player2 : data.player1;
            this.startBattle({ battleId: data.battleId, opponent });
        });

        // 战斗结束
        this.socket.on('battle_end', (data: { result: string; opponentId: string }) => {
            console.log('[MMO] 战斗结束:', data);
            this.showToast(`战斗结束: ${data.result === 'win' ? '胜利' : data.result === 'lose' ? '失败' : '平局'}`);
            this.inBattle = false;
        });
    }

    /**
     * 更新其他玩家列表
     */
    private updateOtherPlayers(players: OtherPlayer[]): void {
        // 清除不存在的玩家
        const currentPlayerIds = new Set(players.map(p => p.id));
        for (const id of this.otherPlayers.keys()) {
            if (!currentPlayerIds.has(id) && id !== this.playerId) {
                this.otherPlayers.delete(id);
            }
        }

        // 添加或更新玩家
        for (const player of players) {
            if (player.id !== this.playerId) {
                this.otherPlayers.set(player.id, player);
            }
        }
    }

    /**
     * 发送玩家位置更新
     */
    private sendPlayerPosition(): void {
        if (!this.socket || !this.connectedToMMO) return;

        const now = Date.now();
        if (now - this.lastPositionSendTime < this.POSITION_SEND_INTERVAL) return;

        const position = playerController.getPixelPosition();
        const tilePosition = playerController.getTilePosition();

        this.socket.emit('player_move', {
            id: this.playerId,
            x: position.x,
            y: position.y,
            tileX: tilePosition.tileX,
            tileY: tilePosition.tileY,
            direction: playerController.getFacingDirection(),
        });

        this.lastPositionSendTime = now;
    }

    /**
     * 更新连接状态显示
     */
    private updateConnectionStatus(text: string, status: 'connected' | 'disconnected' | 'error'): void {
        if (!this.connectionStatusElement) {
            this.connectionStatusElement = document.createElement('div');
            this.connectionStatusElement.id = 'connection-status';
            this.connectionStatusElement.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                padding: 8px 16px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: bold;
                z-index: 1000;
                background: rgba(0, 0, 0, 0.7);
                color: #fff;
            `;
            document.body.appendChild(this.connectionStatusElement);
        }

        this.connectionStatusElement.textContent = `🌐 ${text}`;

        switch (status) {
            case 'connected':
                this.connectionStatusElement.style.color = '#4ade80';
                break;
            case 'disconnected':
                this.connectionStatusElement.style.color = '#f87171';
                break;
            case 'error':
                this.connectionStatusElement.style.color = '#fbbf24';
                break;
        }
    }

    /**
     * 发送挑战请求
     */
    private sendChallenge(targetId: string): void {
        if (!this.socket || !this.connectedToMMO) {
            this.showToast('未连接到服务器');
            return;
        }

        console.log('[MMO] 发送挑战请求:', targetId);
        this.socket.emit('challenge_player', {
            challengerId: this.playerId,
            challengerName: this.playerName,
            targetId,
        });
        this.showToast(`已向 ${this.otherPlayers.get(targetId)?.name || '玩家'} 发送挑战请求`);
    }

    /**
     * 响应挑战（服务器需要 battleId 才能匹配挑战）
     */
    private respondToChallenge(battleId: string, accepted: boolean): void {
        if (!this.socket || !this.connectedToMMO) return;

        console.log('[MMO] 响应挑战:', battleId, accepted);
        this.socket.emit('challenge_response', {
            battleId,
            accepted,
        });

        if (accepted) {
            this.inBattle = true;
            this.showToast('已接受挑战，进入战斗！');
        }
    }

    /**
     * 显示挑战对话框
     */
    private showChallengeDialog(_challengerId: string, challengerName: string, battleId: string): void {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
        `;

        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: #1e293b;
            border: 2px solid #4a9eff;
            border-radius: 8px;
            padding: 24px;
            max-width: 400px;
            text-align: center;
            box-shadow: 0 0 30px rgba(74, 158, 255, 0.3);
        `;

        dialog.innerHTML = `
            <h2 style="color: #4a9eff; margin-bottom: 16px;">⚔️ 挑战请求</h2>
            <p style="color: #e2e8f0; margin-bottom: 24px;">
                <span style="color: #4ade80; font-weight: bold;">${challengerName}</span> 想要与你对战！
            </p>
            <div style="display: flex; gap: 12px; justify-content: center;">
                <button id="accept-challenge" style="
                    padding: 10px 24px;
                    background: #4ade80;
                    border: none;
                    border-radius: 4px;
                    color: #0f172a;
                    font-weight: bold;
                    cursor: pointer;
                    font-size: 14px;
                ">接受挑战</button>
                <button id="reject-challenge" style="
                    padding: 10px 24px;
                    background: #f87171;
                    border: none;
                    border-radius: 4px;
                    color: #0f172a;
                    font-weight: bold;
                    cursor: pointer;
                    font-size: 14px;
                ">拒绝</button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        document.getElementById('accept-challenge')?.addEventListener('click', () => {
            this.respondToChallenge(battleId, true);
            document.body.removeChild(overlay);
        });

        document.getElementById('reject-challenge')?.addEventListener('click', () => {
            this.respondToChallenge(battleId, false);
            document.body.removeChild(overlay);
        });
    }

    /**
     * 检查怪物遭遇
     * @param tileX 玩家当前瓦片 X 坐标
     * @param tileY 玩家当前瓦片 Y 坐标
     */
    private checkEncounter(tileX: number, tileY: number): void {
        if (!this.mapData) return;

        // 获取当前瓦片 GID（从第一个非空瓦片层获取）
        let tileGid = 0;
        for (const layer of this.mapData.tileLayers) {
            if (!layer.visible || layer.data.length === 0) continue;
            const index = tileY * layer.width + tileX;
            if (index >= 0 && index < layer.data.length) {
                tileGid = layer.data[index];
                if (tileGid > 0) break;
            }
        }

        // 检查是否为草丛瓦片（GID 1-4 为草丛）
        const grassGids = [1, 2, 3, 4];
        if (!grassGids.includes(tileGid)) return;

        // 使用 EncounterManager 检查遭遇
        const mapName = (this.mapData.properties.name as string) || 'default';
        const result = encounterManager.checkEncounter(
            tileX,
            tileY,
            tileGid,
            mapName
        );

        if (result.triggered && result.monster) {
            this.startEncounterBattle(result);
        }
    }

    /**
     * 开始遭遇战斗
     * @param result 遭遇结果
     */
    private startEncounterBattle(result: EncounterResult): void {
        if (!result.monster) return;

        this.inBattle = true;
        this.showToast(`遭遇了 ${result.monster.monsterId}！`);

        console.log('[Encounter] 遭遇战斗开始:', result.monster.monsterId);

        // 创建玩家队伍
        const playerParty = this.createDefaultPlayerParty();
        if (playerParty.length === 0) {
            this.showToast('战斗数据加载失败');
            this.inBattle = false;
            return;
        }

        // 创建敌方队伍（遭遇的怪物）
        const enemyUnit: BattleUnit = createBattleUnitFromInstance(result.monster, false);
        const enemyParty = [enemyUnit];

        // 开始战斗
        battleManager.startBattle(playerParty, enemyParty, {
            canEscape: true,
            background: result.zoneType === 'grass' ? 'grassland' : 'grassland',
        });
    }

    /**
     * 开始战斗（启动真实战斗逻辑与 UI）
     */
    private startBattle(battleData: BattleData): void {
        this.inBattle = true;
        this.showToast(`与 ${battleData.opponent.name} 的战斗开始！`);
        console.log('[MMO] 进入战斗:', battleData);

        const playerParty = this.createDefaultPlayerParty();
        const enemyParty = this.createDefaultEnemyParty(battleData.opponent.name);
        if (playerParty.length === 0 || enemyParty.length === 0) {
            this.showToast('战斗数据加载失败');
            this.inBattle = false;
            return;
        }
        battleManager.startBattle(playerParty, enemyParty, { canEscape: true });
    }

    /** 创建默认玩家队伍（1 只怪物） */
    private createDefaultPlayerParty(): BattleUnit[] {
        const slugs = ['cardiling', 'rockitten', 'leafygator'];
        for (const slug of slugs) {
            const instance = monsterDataLoader.createMonsterInstance(slug, 5);
            if (instance) return [createBattleUnitFromInstance(instance, true)];
        }
        const all = monsterDataLoader.getAllMonsters();
        if (all.length > 0) {
            const instance = monsterDataLoader.createMonsterInstance(all[0].slug, 5);
            if (instance) return [createBattleUnitFromInstance(instance, true)];
        }
        return [];
    }

    /** 创建默认敌方队伍（1 只怪物） */
    private createDefaultEnemyParty(_opponentName: string): BattleUnit[] {
        const slugs = ['rockitten', 'cardiling', 'leafygator'];
        for (const slug of slugs) {
            const instance = monsterDataLoader.createMonsterInstance(slug, 5);
            if (instance) return [createBattleUnitFromInstance(instance, false)];
        }
        const all = monsterDataLoader.getAllMonsters();
        if (all.length > 0) {
            const instance = monsterDataLoader.createMonsterInstance(all[0].slug, 5);
            if (instance) return [createBattleUnitFromInstance(instance, false)];
        }
        return [];
    }

    /**
     * 显示提示消息
     */
    private showToast(message: string, duration = 3000): void {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: #fff;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 1500;
            animation: fadeIn 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s ease';
            setTimeout(() => document.body.removeChild(toast), 300);
        }, duration);
    }

    /**
     * 初始化游戏
     */
    protected async onInit(): Promise<void> {
        console.log('Initializing OpenClaw MMO...');

        // 获取加载屏幕元素
        // index.html 中加载容器 id 为 "loading"
        this.loadingScreen = document.getElementById('loading');
        this.loadingText = document.getElementById('loading-text');

        // 初始化输入系统
        inputManager.initialize();
        console.log('[Game] Input system initialized');

        await audioManager.initialize();
        console.log('[Game] Audio manager initialized');
        // 初始化商店管理器
        shopManager.initialize();
        console.log('[Game] Shop manager initialized');

        // 初始化性能监控器
        performanceMonitor.initialize({
            targetFps: 60,
            goodFpsThreshold: 55,
            warningFpsThreshold: 45,
            criticalFpsThreshold: 30,
            memoryWarningThreshold: 500,
            frameTimeWindow: 60,
            enableMemoryMonitoring: true,
            enableAutoOptimization: false,
        });
        performanceMonitor.showDebugPanel();
        console.log('[Game] Performance monitor initialized');



        try {
            // 加载真实 Tuxemon 地图
            console.log('[Game] Loading Tuxemon map: azure_town.tmx');
            this.updateLoadingText('加载地图...');

            this.mapData = await mapParser.loadFromUrl('assets/tuxemon/maps/azure_town.tmx');

            // 设置瓦片宽高
            this.tileWidth = this.mapData.tileWidth;
            this.tileHeight = this.mapData.tileHeight;

            console.log(`[Game] Map loaded: ${this.mapData.width}x${this.mapData.height}, ${this.mapData.tilesets.length} tilesets, ${this.mapData.tileLayers.length} layers`);

            // 预加载瓦片图片
            await this.loadTilesetImages(this.mapData.tilesets);
            console.log(`[Game] Tileset images loaded: ${this.tilesetImages.size} tiles`);

            // 初始化碰撞管理器
            collisionManager.setMap(this.mapData);
            collisionManager.addCollisionLayer({
                layerName: 'collision',
                solidTiles: this.findSolidTiles(),
            });
            console.log('[Game] Collision manager initialized');

            // 初始化玩家控制器
            playerController.initialize({
                tileWidth: this.tileWidth,
                tileHeight: this.tileHeight,
                moveSpeed: 150,
                enableCollision: true,
                enableSmoothAnimation: true,
                collisionRadius: 8,
                keyRepeatDelay: 200,
                keyRepeatInterval: 100,
                jumpHeight: 16,
                jumpDuration: 300,
                // 面前有可交互 NPC 时 Space 优先触发对话而非跳跃
                shouldSkipJump: () => {
                    const npc = npcManager.getNPCInFrontOfPlayer();
                    return !!(npc && npc.interactable);
                },
            });

            // 设置玩家起始位置（在地图中心附近）
            playerController.setStartTile(25, 25);

            // 注册移动事件回调
            playerController.onMoveComplete((event) => {
                console.log(`[Player] Moved from (${event.fromX}, ${event.fromY}) to (${event.toX}, ${event.toY})`);

                // 检查怪物遭遇（仅在游戏中且不在战斗时）
                if (this.gameState === 'playing' && !this.inBattle && this.mapData) {
                    this.checkEncounter(event.toX, event.toY);
                }
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

            battleUI.initialize();
            console.log('[Game] Battle UI initialized');

            // 初始化场景管理器
            sceneManager.initialize(this.tileWidth, this.tileHeight);

            // 初始化事件系统
            eventSystem.initialize(this.tileWidth, this.tileHeight);

            // 注册测试场景
            this.createTestScenes();
            console.log('[Game] Scene manager initialized');
            console.log('[Game] Event system initialized');

            // 加载 Tuxemon 资源
            console.log('[Game] Loading Tuxemon resources...');
            this.updateLoadingText('加载资源...');

            await monsterDataLoader.loadMonsters();
            await techniqueDataLoader.loadTechniques();
            console.log('[Game] Tuxemon resources loaded');

            await itemDataLoader.loadItems();
            console.log('[Game] Item data loaded');
            bagUI.initialize();

            // 加载所有资源
            if (this.resourceManager.getQueueSize() > 0) {
                await this.resourceManager.loadAll((progress) => {
                    this.updateLoadingProgress(progress);
                });
            }

            // 隐藏加载屏幕
            this.hideLoadingScreen();

            await titleScreen.initialize();
            this.gameState = 'title';
            titleScreen.onGameStart = () => {
                this.gameState = 'playing';
                titleScreen.hide();
                console.log('[Game] Game started');
                audioManager.playBGM('JRPG_town_loop', true, true);

            };
            console.log('[Game] Title screen initialized');

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
     * 加载瓦片图片
     */
    private async loadTilesetImages(tilesets: TMXTileset[]): Promise<void> {
        const loadPromises: Promise<void>[] = [];

        for (const tileset of tilesets) {
            if (!tileset.image) continue;

            loadPromises.push((async () => {
                try {
                    const imagePath = `assets/tuxemon/${tileset.image}`;
                    this.updateLoadingText(`加载瓦片集: ${tileset.name}`);
                    console.log(`[Game] Loading tileset image: ${imagePath}`);

                    const image = new Image();
                    image.crossOrigin = 'anonymous';

                    await new Promise<void>((resolve, reject) => {
                        image.onload = () => resolve();
                        image.onerror = () => reject(new Error(`Failed to load image: ${imagePath}`));
                        image.src = imagePath;
                    });

                    // 为每个瓦片创建缓存条目
                    for (let i = 0; i < tileset.tileCount; i++) {
                        const gid = tileset.firstGid + i;
                        this.tilesetImages.set(gid, {
                            image,
                            tileWidth: tileset.tileWidth,
                            tileHeight: tileset.tileHeight,
                            columns: tileset.columns,
                            firstGid: tileset.firstGid,
                        });
                    }

                    console.log(`[Game] Loaded tileset ${tileset.name}: ${tileset.tileCount} tiles`);
                } catch (error) {
                    console.error(`[Game] Failed to load tileset ${tileset.name}:`, error);
                }
            })());
        }

        await Promise.all(loadPromises);
    }

    /**
     * 查找碰撞瓦片（GID > 0 的通常是障碍物）
     */
    private findSolidTiles(): number[] {
        if (!this.mapData) return [];

        const solidGids = new Set<number>();

        // 遍历所有层，找到非零 GID（假设它们是碰撞物体）
        for (const layer of this.mapData.tileLayers) {
            for (const gid of layer.data) {
                if (gid > 0) {
                    solidGids.add(gid);
                }
            }
        }

        console.log(`[Game] Found ${solidGids.size} solid tiles`);
        return Array.from(solidGids);
    }

    /**
     * 创建测试 NPC
     */
    private createTestNPCs(): void {
        // 村民 1 - 对话 NPC
        const villagerDialogues: NPCDialogue[] = [
            {
                id: 'greeting',
                text: '你好，旅行者！欢迎来到 Azure Town。',
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
                text: '这是一个和平的小镇，位于 Tuxemon 世界的重要位置。',
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
            tileX: 8,
            tileY: 8,
            x: 8 * this.tileWidth,
            y: 8 * this.tileHeight,
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
            customData: { shopId: 'village_general_shop' },
            visible: true,
            interactable: true,
            collisionRadius: 8,
            usePathfinding: false,
            pathQueue: undefined,
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
            tileX: 12,
            tileY: 10,
            x: 12 * this.tileWidth,
            y: 10 * this.tileHeight,
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
            customData: { shopId: 'village_general_shop' },
            visible: true,
            interactable: true,
            collisionRadius: 8,
            usePathfinding: true,
            pathQueue: undefined,
        });
    }

    /**
     * 创建测试场景
     */
    private createTestScenes(): void {
        if (!this.mapData) return;

        const mainScene: SceneData = {
            id: 'azure_town',
            name: 'Azure Town',
            mapData: this.mapData,
            teleports: [],
            isIndoor: false,
            type: 'town',
        };

        sceneManager.registerScene(mainScene);
        sceneManager.setCurrentScene('azure_town');
    }

    /**
     * 绑定调试按键
     */
    private bindDebugKeys(): void {
        const checkDebugKey = () => {
            if (inputManager.isPressed(KeyCode.F1 as any) || inputManager.isPressed('f1')) {
                this.showDebugInfo = !this.showDebugInfo;
                console.log(`[Game] Debug info: ${this.showDebugInfo ? 'ON' : 'OFF'}`);
            }
        };

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
     * 更新加载文本
     */
    private updateLoadingText(text: string): void {
        if (this.loadingText) {
            this.loadingText.textContent = text;
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
        // 更新性能监控
        performanceMonitor.beginUpdate();
        performanceMonitor.update();

        audioManager.update(deltaTime);

        if (this.gameState === 'title') {
            // 将键盘输入传递给标题界面（按任意键、主菜单导航）
            const pressed = (k: KeyCode | string) => inputManager.isPressed(k);
            const held = (k: KeyCode | string) => inputManager.isHeld(k);
            const anyKey = () => inputManager.anyKeyPressed(
                KeyCode.ENTER, KeyCode.SPACE, KeyCode.KEY_Z, KeyCode.KEY_X, KeyCode.ESCAPE,
                KeyCode.UP, KeyCode.DOWN, KeyCode.LEFT, KeyCode.RIGHT
            );
            let action: 'up' | 'down' | 'left' | 'right' | 'confirm' | 'cancel' | 'any' | null = null;
            if (pressed(KeyCode.UP) || held(KeyCode.UP)) action = 'up';
            else if (pressed(KeyCode.DOWN) || held(KeyCode.DOWN)) action = 'down';
            else if (pressed(KeyCode.KEY_Z) || pressed(KeyCode.ENTER) || pressed(KeyCode.SPACE)) action = 'confirm';
            else if (pressed(KeyCode.KEY_X) || pressed(KeyCode.ESCAPE)) action = 'cancel';
            else if (anyKey()) action = 'any';
            if (action) titleScreen.handleInput(action);
            titleScreen.update(deltaTime);
            inputManager.update();
            return;
        }

        // 更新场景管理器
        sceneManager.update(deltaTime);

        // 更新玩家
        playerController.update(deltaTime);

        // 发送玩家位置更新到服务器
        this.sendPlayerPosition();

        // 更新 NPC
        npcManager.update(deltaTime);

        // 更新对话管理器
        dialogManager.update(deltaTime);

        // 更新交互管理器
        interactionManager.update(deltaTime);

        // 更新事件系统（检查玩家位置触发事件）
        const playerPos = playerController.getPixelPosition();
        eventSystem.checkTriggers(playerPos.x, playerPos.y);

        // 更新摄像机位置（跟随玩家）
        this.updateCamera();

        // 战斗中：更新战斗 UI，并检测战斗结束
        if (this.inBattle) {
            battleUI.update(deltaTime);
            const state = battleManager.getBattleState();
            if (state && state.result !== BattleResult.ONGOING) {
                this.inBattle = false;
                battleManager.clearBattle();
                battleUI.clear();
                const msg = state.result === BattleResult.WIN ? '胜利！' : state.result === BattleResult.LOSE ? '失败...' : '已逃跑';
                this.showToast(`战斗结束: ${msg}`);
            }
        }

        // 检查挑战输入（Z 键）
        this.checkChallengeInput();

        // 每帧末尾更新输入状态（清空 justPressed 等），必须在所有输入读取之后
        inputManager.update();

        // 结束性能监控
        performanceMonitor.endUpdate();
    }

    /**
     * 检查挑战输入
     */
    private checkChallengeInput(): void {
        if (this.inBattle) return;

        // 检查 Z 键按下
        if (inputManager.isPressed('z')) {
            if (!this.connectedToMMO) {
                this.showToast('请先连接 MMO 服务器才能挑战其他玩家');
                return;
            }

            const playerPos = playerController.getTilePosition();

            // 找到最近的玩家
            let nearestPlayer: OtherPlayer | null = null;
            let nearestDistance = 3; // 最大距离

            for (const player of this.otherPlayers.values()) {
                const distance = Math.abs(playerPos.tileX - player.x / this.tileWidth) +
                                Math.abs(playerPos.tileY - player.y / this.tileHeight);
                if (distance <= nearestDistance) {
                    if (!nearestPlayer || distance < nearestDistance) {
                        nearestPlayer = player;
                        nearestDistance = distance;
                    }
                }
            }

            if (nearestPlayer) {
                this.sendChallenge(nearestPlayer.id);
            } else {
                this.showToast('附近没有可挑战的玩家');
            }
        }
    }

    /**
     * 更新摄像机
     */
    private updateCamera(): void {
        const playerPos = playerController.getPixelPosition();
        const screenWidth = this.getWidth();
        const screenHeight = this.getHeight();

        const mapWidth = this.mapData!.width * this.tileWidth;
        const mapHeight = this.mapData!.height * this.tileHeight;

        this.cameraX = playerPos.x - screenWidth / 2 + this.tileWidth / 2;
        this.cameraY = playerPos.y - screenHeight / 2 + this.tileHeight / 2;

        this.cameraX = Math.max(0, Math.min(this.cameraX, mapWidth - screenWidth));
        this.cameraY = Math.max(0, Math.min(this.cameraY, mapHeight - screenHeight));

        if (mapWidth < screenWidth) {
            this.cameraX = (mapWidth - screenWidth) / 2;
        }
        if (mapHeight < screenHeight) {
            this.cameraY = (mapHeight - screenHeight) / 2;
        }
    }

    /**
     * 渲染游戏画面
     */
    protected onRender(ctx: CanvasRenderingContext2D): void {
        if (this.gameState === 'title') {
            titleScreen.render(ctx, this.getWidth(), this.getHeight());
            return;
        }

        // 清空画布 - 使用深蓝色背景
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, this.getWidth(), this.getHeight());

        if (!this.mapData) {
            ctx.fillStyle = '#ffffff';
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Loading...', this.getWidth() / 2, this.getHeight() / 2);
            return;
        }

        // 渲染地图（使用真实瓦片图片）
        this.renderMap(ctx);

        // 渲染其他玩家（MMO）
        this.renderOtherPlayers(ctx);

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

        // 渲染战斗界面
        if (this.inBattle) {
            this.renderBattleUI(ctx);
        }

        // 渲染调试信息
        if (this.showDebugInfo) {
            this.renderDebugInfo(ctx);
        }
    }

    /**
     * 渲染地图 - 使用真实瓦片图片
     */
    private renderMap(ctx: CanvasRenderingContext2D): void {
        for (const layer of this.mapData!.tileLayers) {
            if (!layer.visible) continue;

            const visibleLeft = Math.floor(this.cameraX / this.tileWidth);
            const visibleTop = Math.floor(this.cameraY / this.tileHeight);
            const visibleRight = Math.ceil((this.cameraX + this.getWidth()) / this.tileWidth);
            const visibleBottom = Math.ceil((this.cameraY + this.getHeight()) / this.tileHeight);

            for (let row = Math.max(0, visibleTop); row < Math.min(this.mapData!.height, visibleBottom); row++) {
                for (let col = Math.max(0, visibleLeft); col < Math.min(this.mapData!.width, visibleRight); col++) {
                    const index = row * layer.width + col;
                    const gid = layer.data[index];

                    if (gid === 0) continue; // 空瓦片

                    const tilesetImage = this.tilesetImages.get(gid);
                    if (!tilesetImage) continue;

                    const x = col * this.tileWidth - this.cameraX;
                    const y = row * this.tileHeight - this.cameraY;

                    // 计算瓦片在图片中的位置
                    const tileIndex = gid - tilesetImage.firstGid;
                    const tileRow = Math.floor(tileIndex / tilesetImage.columns);
                    const tileCol = tileIndex % tilesetImage.columns;

                    const srcX = tileCol * tilesetImage.tileWidth;
                    const srcY = tileRow * tilesetImage.tileHeight;

                    // 绘制瓦片
                    ctx.drawImage(
                        tilesetImage.image,
                        srcX, srcY, tilesetImage.tileWidth, tilesetImage.tileHeight,
                        x, y, this.tileWidth, this.tileHeight
                    );
                }
            }
        }
    }

    /**
     * 渲染玩家
     */
    private renderPlayer(ctx: CanvasRenderingContext2D): void {
        const playerPos = playerController.getPixelPosition();
        const playerFullPos = playerController.getPosition();
        const direction = playerController.getFacingDirection();
        const isRunning = playerController.isRunning();
        const isJumping = playerController.isJumping();

        const x = playerPos.x - this.cameraX;
        const y = playerPos.y - this.cameraY;
        const jumpOffset = playerFullPos.jumpOffset;

        ctx.save();

        // 跳跃时的阴影
        if (isJumping) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.beginPath();
            ctx.ellipse(x + this.tileWidth / 2, y + this.tileHeight - 2, 10, 5, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        const renderY = y + jumpOffset;

        // 玩家身体 - 使用蓝色
        ctx.fillStyle = isRunning ? '#2563eb' : '#4299e1';
        ctx.fillRect(x + 4, renderY + 4, this.tileWidth - 8, this.tileHeight - 8);

        // 绘制方向指示
        ctx.fillStyle = isRunning ? '#1d4ed8' : '#2b6cb0';
        switch (direction) {
            case Direction.UP:
                ctx.beginPath();
                ctx.moveTo(x + this.tileWidth / 2, renderY + 4);
                ctx.lineTo(x + this.tileWidth / 2 - 4, renderY + 12);
                ctx.lineTo(x + this.tileWidth / 2 + 4, renderY + 12);
                ctx.fill();
                break;
            case Direction.DOWN:
                ctx.beginPath();
                ctx.moveTo(x + this.tileWidth / 2, renderY + this.tileHeight - 4);
                ctx.lineTo(x + this.tileWidth / 2 - 4, renderY + this.tileHeight - 12);
                ctx.lineTo(x + this.tileWidth / 2 + 4, renderY + this.tileHeight - 12);
                ctx.fill();
                break;
            case Direction.LEFT:
                ctx.beginPath();
                ctx.moveTo(x + 4, renderY + this.tileHeight / 2);
                ctx.lineTo(x + 12, renderY + this.tileHeight / 2 - 4);
                ctx.lineTo(x + 12, renderY + this.tileHeight / 2 + 4);
                ctx.fill();
                break;
            case Direction.RIGHT:
                ctx.beginPath();
                ctx.moveTo(x + this.tileWidth - 4, renderY + this.tileHeight / 2);
                ctx.lineTo(x + this.tileWidth - 12, renderY + this.tileHeight / 2 - 4);
                ctx.lineTo(x + this.tileWidth - 12, renderY + this.tileHeight / 2 + 4);
                ctx.fill();
                break;
        }

        // 眼睛
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 8, renderY + 10, 3, 3);
        ctx.fillRect(x + 14, renderY + 10, 3, 3);

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
                    ctx.fillStyle = '#48bb78';
                    break;
                case NPCInteractionType.SHOP:
                    ctx.fillStyle = '#f6e05e';
                    break;
                case NPCInteractionType.QUEST:
                    ctx.fillStyle = '#9f7aea';
                    break;
                default:
                    ctx.fillStyle = '#a0aec0';
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

            ctx.fillRect(dirX - 5 + eyeOffsetX, dirY - 5 + eyeOffsetY, 3, 3);
            ctx.fillRect(dirX + 2 + eyeOffsetX, dirY - 5 + eyeOffsetY, 3, 3);

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
     * 渲染其他玩家（MMO）
     */
    private renderOtherPlayers(ctx: CanvasRenderingContext2D): void {
        for (const player of this.otherPlayers.values()) {
            const x = player.x - this.cameraX;
            const y = player.y - this.cameraY;

            // 检查是否在屏幕范围内
            if (x < -this.tileWidth || x > this.getWidth() ||
                y < -this.tileHeight || y > this.getHeight()) {
                continue;
            }

            ctx.save();

            // 玩家身体 - 使用橙色（与玩家蓝色区分）
            ctx.fillStyle = player.isBot ? '#f59e0b' : '#f97316';
            ctx.fillRect(x + 4, y + 4, this.tileWidth - 8, this.tileHeight - 8);

            // 绘制方向指示
            ctx.fillStyle = '#d97706';
            switch (player.direction) {
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
            ctx.fillRect(x + 8, y + 10, 3, 3);
            ctx.fillRect(x + 14, y + 10, 3, 3);

            // 绘制名字标签
            ctx.fillStyle = '#fbbf24';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            const nameText = player.isBot ? `${player.name} (Bot Lv.${player.level})` : player.name;
            ctx.fillText(nameText, x + this.tileWidth / 2, y - 2);

            // 挑战按钮（如果在附近且未战斗中）
            const playerPos = playerController.getTilePosition();
            const distance = Math.abs(playerPos.tileX - player.x / this.tileWidth) +
                            Math.abs(playerPos.tileY - player.y / this.tileHeight);

            if (distance <= 3 && !this.inBattle && this.connectedToMMO) {
                ctx.fillStyle = '#ef4444';
                ctx.fillRect(x, y - 18, this.tileWidth, 14);
                ctx.fillStyle = '#ffffff';
                ctx.font = '9px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('[挑战]', x + this.tileWidth / 2, y - 8);

                // 如果选中了该玩家，用高亮显示
                if (this.selectedPlayerId === player.id) {
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x - 2, y - 20, this.tileWidth + 4, this.tileHeight + 4);
                }
            }

            ctx.restore();
        }
    }

    /**
     * 渲染战斗 UI（有战斗状态时用 BattleUI，否则占位）
     */
    private renderBattleUI(ctx: CanvasRenderingContext2D): void {
        const width = this.getWidth();
        const height = this.getHeight();
        const state = battleManager.getBattleState();
        if (state) {
            battleUI.render(ctx, width, height);
            return;
        }
        // 占位
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('战斗进行中...', width / 2, height / 2);
    }

    /**
     * 渲染调试信息
     */
    private renderDebugInfo(ctx: CanvasRenderingContext2D): void {
        const playerPos = playerController.getTilePosition();
        const pixelPos = playerController.getPixelPosition();
        const direction = playerController.getFacingDirection();
        const nearbyNPCs = npcManager.getNearbyNPCs(2);

        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 280, 260);

        ctx.fillStyle = '#48bb78';
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';

        let y = 30;
        const lineHeight = 16;

        ctx.fillText('=== Debug Info ===', 20, y); y += lineHeight;
        const stats = performanceMonitor.getStats();
        ctx.fillText('FPS: ' + stats.fps.toFixed(1) + ' (目标: ' + this.getTargetFPS() + ')', 20, y); y += lineHeight;
        ctx.fillText('FPS (平均): ' + stats.avgFps.toFixed(1), 20, y); y += lineHeight;
        ctx.fillText('帧时间: ' + stats.frameTime.toFixed(2) + 'ms (平均: ' + stats.avgFrameTime.toFixed(2) + 'ms)', 20, y); y += lineHeight;
        ctx.fillText('更新: ' + stats.updateTime.toFixed(2) + 'ms', 20, y); y += lineHeight;
        ctx.fillText('渲染: ' + stats.renderTime.toFixed(2) + 'ms', 20, y); y += lineHeight;
        ctx.fillText('内存: ' + stats.memoryUsage.toFixed(1) + 'MB (峰值: ' + stats.memoryPeak.toFixed(1) + 'MB)', 20, y); y += lineHeight;
        ctx.fillText('Player Tile: (' + playerPos.tileX + ', ' + playerPos.tileY + ')', 20, y); y += lineHeight;
        ctx.fillText('Player Pixel: (' + Math.round(pixelPos.x) + ', ' + Math.round(pixelPos.y) + ')', 20, y); y += lineHeight;
        ctx.fillText('Direction: ' + direction, 20, y); y += lineHeight;
        ctx.fillText('State: ' + playerController.getState(), 20, y); y += lineHeight;
        ctx.fillText('Running: ' + (playerController.isRunning() ? 'YES' : 'NO'), 20, y); y += lineHeight;
        ctx.fillText('Jumping: ' + (playerController.isJumping() ? 'YES' : 'NO'), 20, y); y += lineHeight;
        ctx.fillText('Camera: (' + Math.round(this.cameraX) + ', ' + Math.round(this.cameraY) + ')', 20, y); y += lineHeight;
        ctx.fillText('NPC Count: ' + npcManager.getAllNPCs().length, 20, y); y += lineHeight;
        ctx.fillText('Nearby NPCs: ' + nearbyNPCs.length, 20, y); y += lineHeight;
        ctx.fillText('Loaded Tiles: ' + this.tilesetImages.size, 20, y); y += lineHeight;
        ctx.fillText('Tilesets: ' + (this.mapData?.tilesets.length || 0), 20, y); y += lineHeight;

        // MMO 调试信息
        y += 8;
        ctx.fillStyle = '#fbbf24';
        ctx.fillText('=== MMO Info ===', 20, y); y += lineHeight;
        ctx.fillStyle = this.connectedToMMO ? '#48bb78' : '#f87171';
        ctx.fillText('Connected: ' + (this.connectedToMMO ? 'YES' : 'NO'), 20, y); y += lineHeight;
        ctx.fillStyle = '#ffffff';
        ctx.fillText('Player ID: ' + this.playerId.substring(0, 12) + '...', 20, y); y += lineHeight;
        ctx.fillText('Player Name: ' + this.playerName, 20, y); y += lineHeight;
        ctx.fillText('Other Players: ' + this.otherPlayers.size, 20, y); y += lineHeight;
        ctx.fillText('In Battle: ' + (this.inBattle ? 'YES' : 'NO'), 20, y); y += lineHeight;

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
    (async () => {
        await game.init();
        game.start();
    })();
}

// 将游戏实例和各管理器暴露到全局
(window as any).game = game;
(window as any).inputManager = inputManager;
(window as any).collisionManager = collisionManager;
(window as any).playerController = playerController;
(window as any).npcManager = npcManager;
(window as any).dialogManager = dialogManager;
(window as any).interactionManager = interactionManager;
(window as any).sceneManager = sceneManager;
(window as any).eventSystem = eventSystem;
(window as any).monsterDataLoader = monsterDataLoader;
(window as any).techniqueDataLoader = techniqueDataLoader;
(window as any).audioManager = audioManager;
(window as any).itemDataLoader = itemDataLoader;
(window as any).titleScreen = titleScreen;
(window as any).bagUI = bagUI;
