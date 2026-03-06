/**
 * OpenClaw MMO - Tuxemon Web GBA版本
 * 完整使用Tuxemon的所有资源
 */

// ==================== 游戏配置 ====================
const CONFIG = {
    SCREEN_WIDTH: 720,
    SCREEN_HEIGHT: 480,
    TILE_SIZE: 16,
    SCALE: 2,
    API_URL: 'http://localhost:8000'
};

// ==================== 资源管理器 ====================
class ResourceManager {
    constructor() {
        this.monsters = {};
        this.sprites = {};
        this.maps = {};
        this.sounds = {};
        this.loaded = false;
    }
    
    async loadMonsterData() {
        try {
            const response = await fetch(`${CONFIG.API_URL}/api/tuxemon/monsters`);
            const data = await response.json();
            this.monsters = data.monsters || {};
            console.log(`[OK] Loaded ${Object.keys(this.monsters).length} monsters`);
        } catch (error) {
            console.log('[WARNING] Failed to load monster data, using defaults');
            // 默认怪物数据
            this.monsters = {
                flambear: { slug: 'flambear', types: ['fire'], weight: 500 },
                dollfin: { slug: 'dollfin', types: ['water'], weight: 300 },
                budaye: { slug: 'budaye', types: ['grass'], weight: 200 }
            };
        }
    }
    
    async loadSprite(monsterSlug) {
        if (this.sprites[monsterSlug]) {
            return this.sprites[monsterSlug];
        }
        
        const img = new Image();
        img.src = `${CONFIG.API_URL}/api/sprite/${monsterSlug}/frame/1`;
        
        return new Promise((resolve, reject) => {
            img.onload = () => {
                this.sprites[monsterSlug] = img;
                console.log(`[OK] Loaded sprite: ${monsterSlug}`);
                resolve(img);
            };
            img.onerror = () => {
                console.log(`[WARNING] Failed to load sprite: ${monsterSlug}`);
                resolve(null);
            };
        });
    }
    
    async loadAll() {
        await this.loadMonsterData();
        this.loaded = true;
        console.log('[OK] All resources loaded');
    }
}

// ==================== 游戏引擎 ====================
class GameEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resources = new ResourceManager();
        
        this.state = 'loading';
        this.frame = 0;
        this.lastTime = 0;
        
        // 玩家数据
        this.player = {
            x: 5,
            y: 5,
            direction: 'down',
            monsters: [],
            items: []
        };
        
        // 当前地图
        this.map = {
            width: 30,
            height: 20,
            tiles: [],
            npcs: [],
            encounters: []
        };
        
        // 战斗数据
        this.battle = null;
        
        // 初始化地图
        this.initMap();
    }
    
    initMap() {
        // 创建简单的测试地图
        for (let y = 0; y < this.map.height; y++) {
            this.map.tiles[y] = [];
            for (let x = 0; x < this.map.width; x++) {
                if (x === 0 || x === this.map.width - 1 || y === 0 || y === this.map.height - 1) {
                    this.map.tiles[y][x] = 1; // 墙壁
                } else if ((x >= 5 && x <= 8 && y >= 5 && y <= 8) ||
                           (x >= 15 && x <= 20 && y >= 12 && y <= 17)) {
                    this.map.tiles[y][x] = 2; // 草丛
                } else if (x === 14 && y === 10) {
                    this.map.tiles[y][x] = 3; // NPC
                    this.map.npcs.push({ x, y, name: 'Professor', type: 'prof' });
                } else {
                    this.map.tiles[y][x] = 0; // 地面
                }
            }
        }
        
        // 遭遇区
        this.map.encounters = [
            { x: 5, y: 5, w: 4, h: 4, monsters: ['dollfin', 'budaye', 'flambear'] }
        ];
    }
    
    async init() {
        console.log('[GAME] Loading Tuxemon resources...');
        await this.resources.loadAll();
        this.state = 'title';
        console.log('[GAME] Initialization complete');
    }
    
    start() {
        this.lastTime = performance.now();
        this.gameLoop();
    }
    
    gameLoop() {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.frame++;
        
        this.update(deltaTime);
        this.render();
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update(deltaTime) {
        // 更新逻辑
    }
    
    render() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, CONFIG.SCREEN_WIDTH, CONFIG.SCREEN_HEIGHT);
        
        switch (this.state) {
            case 'loading':
                this.renderLoading();
                break;
            case 'title':
                this.renderTitle();
                break;
            case 'world':
                this.renderWorld();
                break;
            case 'battle':
                this.renderBattle();
                break;
        }
    }
    
    renderLoading() {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '24px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Loading Tuxemon Resources...', CONFIG.SCREEN_WIDTH / 2, CONFIG.SCREEN_HEIGHT / 2);
    }
    
    renderTitle() {
        // 背景
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, CONFIG.SCREEN_WIDTH, CONFIG.SCREEN_HEIGHT);
        
        // 标题
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '48px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('OPENCLAW MMO', CONFIG.SCREEN_WIDTH / 2, 150);
        
        this.ctx.font = '32px monospace';
        this.ctx.fillText('TUXEMON WEB', CONFIG.SCREEN_WIDTH / 2, 200);
        
        // 闪烁提示
        if (Math.floor(this.frame / 30) % 2 === 0) {
            this.ctx.font = '24px monospace';
            this.ctx.fillText('PRESS START', CONFIG.SCREEN_WIDTH / 2, 350);
        }
        
        // 版权信息
        this.ctx.font = '16px monospace';
        this.ctx.fillStyle = '#888';
        this.ctx.fillText('Based on Tuxemon Open Source Project', CONFIG.SCREEN_WIDTH / 2, 430);
    }
    
    renderWorld() {
        // 绘制地图
        const tileSize = CONFIG.TILE_SIZE * CONFIG.SCALE;
        const offsetX = 50;
        const offsetY = 50;
        
        for (let y = 0; y < this.map.height; y++) {
            for (let x = 0; x < this.map.width; x++) {
                const tile = this.map.tiles[y][x];
                const px = offsetX + x * tileSize;
                const py = offsetY + y * tileSize;
                
                if (tile === 1) {
                    // 墙壁
                    this.ctx.fillStyle = '#4a4a4a';
                    this.ctx.fillRect(px, py, tileSize, tileSize);
                } else if (tile === 2) {
                    // 草丛
                    this.ctx.fillStyle = '#228B22';
                    this.ctx.fillRect(px, py, tileSize, tileSize);
                    this.ctx.fillStyle = '#32CD32';
                    this.ctx.fillRect(px + 4, py + 4, 8, 8);
                } else if (tile === 3) {
                    // NPC
                    this.ctx.fillStyle = '#C0C0C0';
                    this.ctx.fillRect(px, py, tileSize, tileSize);
                    this.ctx.fillStyle = '#FF00FF';
                    this.ctx.fillRect(px + 4, py + 4, tileSize - 8, tileSize - 8);
                } else {
                    // 地面
                    this.ctx.fillStyle = '#C0C0C0';
                    this.ctx.fillRect(px, py, tileSize, tileSize);
                }
            }
        }
        
        // 绘制玩家
        const px = offsetX + this.player.x * tileSize;
        const py = offsetY + this.player.y * tileSize;
        this.ctx.fillStyle = '#0066FF';
        this.ctx.fillRect(px + 2, py + 2, tileSize - 4, tileSize - 4);
        
        // UI
        this.ctx.fillStyle = 'rgba(0,0,0,0.8)';
        this.ctx.fillRect(10, 10, 200, 80);
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '14px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Player: (${this.player.x}, ${this.player.y})`, 20, 30);
        this.ctx.fillText(`Monsters: ${this.player.monsters.length}`, 20, 50);
        this.ctx.fillText(`Direction: ${this.player.direction}`, 20, 70);
    }
    
    renderBattle() {
        // 战斗背景
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(0, 0, CONFIG.SCREEN_WIDTH, CONFIG.SCREEN_HEIGHT);
        
        // 战斗UI
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '32px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('BATTLE!', CONFIG.SCREEN_WIDTH / 2, 200);
        
        this.ctx.font = '20px monospace';
        this.ctx.fillText('Click anywhere to continue', CONFIG.SCREEN_WIDTH / 2, 300);
    }
    
    // 输入处理
    handleInput(key) {
        if (this.state === 'title') {
            if (key === 'Enter' || key === ' ') {
                this.state = 'world';
            }
            return;
        }
        
        if (this.state === 'world') {
            let moved = false;
            let newX = this.player.x;
            let newY = this.player.y;
            
            if (key === 'ArrowUp' || key === 'w') {
                newY--;
                this.player.direction = 'up';
                moved = true;
            }
            if (key === 'ArrowDown' || key === 's') {
                newY++;
                this.player.direction = 'down';
                moved = true;
            }
            if (key === 'ArrowLeft' || key === 'a') {
                newX--;
                this.player.direction = 'left';
                moved = true;
            }
            if (key === 'ArrowRight' || key === 'd') {
                newX++;
                this.player.direction = 'right';
                moved = true;
            }
            
            // 碰撞检测
            if (newX >= 0 && newX < this.map.width && newY >= 0 && newY < this.map.height) {
                if (this.map.tiles[newY][newX] !== 1) {
                    this.player.x = newX;
                    this.player.y = newY;
                    
                    // 草丛遭遇
                    if (this.map.tiles[newY][newX] === 2 && Math.random() < 0.05) {
                        this.startBattle();
                    }
                }
            }
            
            // NPC交互
            if (key === 'z' || key === 'Z' || key === ' ') {
                const npc = this.map.npcs.find(n =>
                    Math.abs(n.x - this.player.x) <= 1 &&
                    Math.abs(n.y - this.player.y) <= 1
                );
                
                if (npc) {
                    this.interactNPC(npc);
                }
            }
        }
        
        if (this.state === 'battle') {
            if (key === 'x' || key === 'X' || key === 'Escape') {
                this.state = 'world';
            }
        }
    }
    
    interactNPC(npc) {
        if (npc.type === 'prof' && this.player.monsters.length === 0) {
            // 给初始怪物
            const starter = {
                slug: 'flambear',
                name: 'Flambear',
                level: 5,
                types: ['fire'],
                hp: 70,
                maxHp: 70
            };
            this.player.monsters.push(starter);
            console.log('[GAME] Received starter monster: Flambear');
        }
    }
    
    startBattle() {
        this.state = 'battle';
        this.battle = {
            player: this.player.monsters[0],
            enemy: {
                slug: 'dollfin',
                name: 'Dollfin',
                level: 3,
                types: ['water'],
                hp: 75,
                maxHp: 75
            }
        };
        console.log('[GAME] Battle started!');
    }
}

// ==================== 初始化游戏 ====================
const canvas = document.getElementById('game-screen');
const game = new GameEngine(canvas);

game.init().then(() => {
    game.start();
    console.log('[GAME] Game started');
});

// ==================== 键盘控制 ====================
document.addEventListener('keydown', (e) => {
    game.handleInput(e.key);
});

// ==================== 按钮控制 ====================
document.getElementById('btn-up').addEventListener('click', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
});

document.getElementById('btn-down').addEventListener('click', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
});

document.getElementById('btn-left').addEventListener('click', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
});

document.getElementById('btn-right').addEventListener('click', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
});

document.getElementById('btn-a').addEventListener('click', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' }));
});

document.getElementById('btn-b').addEventListener('click', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
});

document.getElementById('btn-start').addEventListener('click', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
});

document.getElementById('btn-l').addEventListener('click', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
});

document.getElementById('btn-r').addEventListener('click', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }));
});

console.log('[GAME] OpenClaw MMO - Tuxemon Web GBA Edition');
console.log('[GAME] Using Tuxemon Open Source Resources');
