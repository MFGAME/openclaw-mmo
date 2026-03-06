/**
 * OpenClaw MMO - Tuxemon Web Engine
 * MVP版本 - 完整可玩的Web版Tuxemon
 */

// ==================== 游戏配置 ====================
const CONFIG = {
    TILE_SIZE: 32,
    PLAYER_SPEED: 160,
    ENCOUNTER_RATE: 0.05,  // 5%草丛遭遇率
    API_URL: 'http://localhost:8000'
};

// ==================== 游戏状态 ====================
const GameState = {
    player: {
        name: 'Player',
        level: 1,
        x: 5,
        y: 5,
        monsters: [],
        items: [],
        money: 1000
    },
    world: {
        currentMap: 'start_town',
        npcStates: {},
        eventFlags: {}
    }
};

// ==================== 怪物数据（从Tuxemon导入）====================
const MONSTERS_DATA = {
    aardart: { name: 'Aardart', types: ['normal'], hp: 80, attack: 60, defense: 50, speed: 40 },
    flambear: { name: 'Flambear', types: ['fire'], hp: 70, attack: 70, defense: 40, speed: 50 },
    dollfin: { name: 'Dollfin', types: ['water'], hp: 75, attack: 55, defense: 45, speed: 55 },
    budaye: { name: 'Budaye', types: ['grass'], hp: 78, attack: 50, defense: 50, speed: 45 },
    propell: { name: 'Propell', types: ['flying'], hp: 65, attack: 65, defense: 40, speed: 70 },
    rockitten: { name: 'Rockitten', types: ['rock'], hp: 85, attack: 55, defense: 65, speed: 35 },
    pikachu: { name: 'Pikachu', types: ['electric'], hp: 60, attack: 75, defense: 35, speed: 80 },
    sumob: { name: 'Sumob', types: ['fighting'], hp: 90, attack: 80, defense: 55, speed: 30 }
};

// ==================== 技能数据 ====================
const SKILLS_DATA = {
    tackle: { name: 'Tackle', power: 40, type: 'normal', accuracy: 100 },
    fire_blast: { name: 'Fire Blast', power: 90, type: 'fire', accuracy: 85 },
    water_gun: { name: 'Water Gun', power: 40, type: 'water', accuracy: 100 },
    vine_whip: { name: 'Vine Whip', power: 45, type: 'grass', accuracy: 100 },
    thunder_shock: { name: 'Thunder Shock', power: 40, type: 'electric', accuracy: 100 }
};

// ==================== 属性克制表 ====================
const TYPE_CHART = {
    fire: { grass: 2, water: 0.5, fire: 0.5 },
    water: { fire: 2, grass: 0.5, water: 0.5 },
    grass: { water: 2, fire: 0.5, grass: 0.5 },
    electric: { water: 2, flying: 2, electric: 0.5 },
    fighting: { normal: 2, rock: 2 },
    rock: { fire: 2, flying: 2 },
    flying: { grass: 2, fighting: 2 }
};

// ==================== 地图数据（简化版Tuxemon地图）====================
const MAPS = {
    start_town: {
        name: 'Start Town',
        width: 20,
        height: 15,
        tiles: [
            // 地图层
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,0,0,2,2,2,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,2,2,2,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,0,0,0,1],
            [1,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        npcs: [
            { id: 'professor', name: 'Professor Oak', x: 9, y: 5, sprite: 'npc',
              dialog: ['Welcome to the world of monsters!', 'I\'m Professor Oak.', 
                      'This world is inhabited by creatures called monsters!',
                      'People and monsters live together by supporting each other.',
                      'Go explore and catch your first monster!'],
              event: 'give_starter' }
        ],
        encounters: [
            { x: 1, y: 5, w: 3, h: 3, monsters: ['aardart', 'dollfin'], rates: [0.5, 0.5] },
            { x: 12, y: 3, w: 4, h: 2, monsters: ['budaye', 'flambear'], rates: [0.5, 0.5] }
        ],
        warps: [
            { x: 19, y: 7, targetMap: 'route1', targetX: 1, targetY: 7 }
        ]
    },
    route1: {
        name: 'Route 1',
        width: 30,
        height: 20,
        tiles: generateRoute1Tiles(),
        npcs: [
            { id: 'trainer1', name: 'Youngster Joey', x: 15, y: 10, sprite: 'npc',
              dialog: ['Hey! Let\'s battle!', 'You won! Good job!'],
              isTrainer: true, monster: 'aardart', level: 3,
              defeated: false }
        ],
        encounters: [
            { x: 5, y: 5, w: 20, h: 10, monsters: ['aardart', 'dollfin', 'budaye'], 
              rates: [0.4, 0.3, 0.3] }
        ],
        warps: [
            { x: 0, y: 7, targetMap: 'start_town', targetX: 18, targetY: 7 }
        ]
    }
};

function generateRoute1Tiles() {
    const tiles = [];
    for (let y = 0; y < 20; y++) {
        const row = [];
        for (let x = 0; x < 30; x++) {
            if (x === 0 || x === 29 || y === 0 || y === 19) {
                row.push(1); // 墙壁
            } else if (Math.random() < 0.3) {
                row.push(2); // 草丛
            } else {
                row.push(0); // 地面
            }
        }
        tiles.push(row);
    }
    return tiles;
}

// ==================== Phaser游戏场景 ====================
class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }
    
    preload() {
        // 加载进度条
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(240, 270, 320, 50);
        
        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0x00ff00, 1);
            progressBar.fillRect(250, 280, 300 * value, 30);
        });
        
        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
        });
        
        // 加载资源
        this.load.spritesheet('player', 
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABlSURBVFhH7c0xCoAwEETRvf+hLOwsLKysLGy9QZzYOBYmtiTH4xgSoVesVqtV0FdQVVBFUEVQRVD1H2v4G/CPA34fwH8D+O+Afz3wBxT/AvwB0FQJrlUU4PgFeB2AW/oAvgfglh/gtgD+BeCWH+C2AP4F4JYf4LYA/gXglh/gVQD/AvADAH8D8AMAfwPwAwB/A/ADAH8D8AMAfwPwAwB/A/ADAMC/AT8BAWBPwF0AAAAASUVORK5CYII=',
            { frameWidth: 32, frameHeight: 32 }
        );
        
        this.load.spritesheet('npc', 
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABcSURBVFhH7c6xDQAgCARAdf+HuUYSwYzMDGZmMjOZWUdChCzLsqL7fT8Px3Gc36cL4jiO4ziOIziOIziOIziOI0Jd13Vd13Vd13Vd13Vd13Vd13Vd13Vd17WI4ziO4ziO4ziO4ziO4zhO4ziO4ziO4ziO4ziO4ziO4ziO4zhOiBcC4gY3mVwFYQAAAABJRU5ErkJggg==',
            { frameWidth: 32, frameHeight: 32 }
        );
        
        console.log('BootScene: Resources loaded');
    }
    
    create() {
        this.scene.start('WorldScene');
    }
}

// ==================== 世界场景（地图探索）====================
class WorldScene extends Phaser.Scene {
    constructor() {
        super({ key: 'WorldScene' });
    }
    
    create() {
        this.loadMap();
        this.createPlayer();
        this.createNPCs();
        this.setupControls();
        this.setupCamera();
        
        // UI
        this.createUI();
        
        // 事件
        this.encounterCooldown = 0;
        
        console.log('WorldScene: Created');
    }
    
    loadMap() {
        const mapData = MAPS[GameState.world.currentMap];
        
        // 创建地图
        this.map = this.make.tilemap({
            tileWidth: CONFIG.TILE_SIZE,
            tileHeight: CONFIG.TILE_SIZE,
            width: mapData.width,
            height: mapData.height
        });
        
        // 绘制地图
        const graphics = this.add.graphics();
        graphics.fillStyle(0x228B22, 1); // 森林绿背景
        
        for (let y = 0; y < mapData.height; y++) {
            for (let x = 0; x < mapData.width; x++) {
                const tile = mapData.tiles[y][x];
                const px = x * CONFIG.TILE_SIZE;
                const py = y * CONFIG.TILE_SIZE;
                
                if (tile === 1) {
                    // 墙壁
                    graphics.fillStyle(0x4a4a4a, 1);
                    graphics.fillRect(px, py, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
                } else if (tile === 2) {
                    // 草丛
                    graphics.fillStyle(0x228B22, 1);
                    graphics.fillRect(px, py, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
                    graphics.fillStyle(0x32CD32, 1);
                    graphics.fillRect(px + 4, py + 4, CONFIG.TILE_SIZE - 8, CONFIG.TILE_SIZE - 8);
                } else if (tile === 3) {
                    // 特殊点
                    graphics.fillStyle(0xFFD700, 1);
                    graphics.fillRect(px, py, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
                } else {
                    // 地面
                    graphics.fillStyle(0xC0C0C0, 1);
                    graphics.fillRect(px, py, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
                }
            }
        }
        
        // 设置世界边界
        this.physics.world.setBounds(
            0, 0,
            mapData.width * CONFIG.TILE_SIZE,
            mapData.height * CONFIG.TILE_SIZE
        );
    }
    
    createPlayer() {
        this.player = this.physics.add.sprite(
            GameState.player.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
            GameState.player.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
            'player'
        );
        this.player.setCollideWorldBounds(true);
        this.player.setDepth(10);
        
        // 玩家动画
        this.anims.create({
            key: 'walk-left',
            frames: this.anims.generateFrameNumbers('player', { start: 0, end: 1 }),
            frameRate: 8,
            repeat: -1
        });
        
        this.anims.create({
            key: 'walk-right',
            frames: this.anims.generateFrameNumbers('player', { start: 2, end: 3 }),
            frameRate: 8,
            repeat: -1
        });
        
        this.anims.create({
            key: 'idle',
            frames: [ { key: 'player', frame: 0 } ],
            frameRate: 1
        });
    }
    
    createNPCs() {
        const mapData = MAPS[GameState.world.currentMap];
        this.npcs = [];
        
        mapData.npcs.forEach(npcData => {
            const npc = this.physics.add.sprite(
                npcData.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
                npcData.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
                'npc'
            );
            npc.setData('npcData', npcData);
            npc.setImmovable(true);
            this.npcs.push(npc);
        });
    }
    
    setupControls() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            interact: Phaser.Input.Keyboard.KeyCodes.SPACE,
            menu: Phaser.Input.Keyboard.KeyCodes.ESC
        });
    }
    
    setupCamera() {
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setBounds(0, 0,
            MAPS[GameState.world.currentMap].width * CONFIG.TILE_SIZE,
            MAPS[GameState.world.currentMap].height * CONFIG.TILE_SIZE
        );
    }
    
    createUI() {
        // 简单的UI文本
        this.add.text(10, 10, 'OpenClaw MMO - Tuxemon Web', {
            fontSize: '16px',
            fill: '#fff',
            backgroundColor: '#000',
            padding: { x: 10, y: 5 }
        }).setScrollFactor(0).setDepth(100);
        
        this.add.text(10, 40, 'WASD/Arrows: Move | Space: Interact | ESC: Menu', {
            fontSize: '12px',
            fill: '#fff',
            backgroundColor: '#000',
            padding: { x: 10, y: 5 }
        }).setScrollFactor(0).setDepth(100);
    }
    
    update(time, delta) {
        this.handleMovement();
        this.handleInteraction();
        this.checkEncounters(delta);
        this.checkWarps();
    }
    
    handleMovement() {
        const speed = CONFIG.PLAYER_SPEED;
        let vx = 0;
        let vy = 0;
        
        if (this.cursors.left.isDown || this.wasd.left.isDown) {
            vx = -speed;
            this.player.anims.play('walk-left', true);
        } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
            vx = speed;
            this.player.anims.play('walk-right', true);
        } else if (this.cursors.up.isDown || this.wasd.up.isDown) {
            vy = -speed;
            this.player.anims.play('walk-right', true);
        } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
            vy = speed;
            this.player.anims.play('walk-left', true);
        } else {
            this.player.setVelocity(0, 0);
            this.player.anims.play('idle', true);
            return;
        }
        
        this.player.setVelocity(vx, vy);
        
        // 更新玩家位置
        GameState.player.x = Math.floor(this.player.x / CONFIG.TILE_SIZE);
        GameState.player.y = Math.floor(this.player.y / CONFIG.TILE_SIZE);
    }
    
    handleInteraction() {
        if (Phaser.Input.Keyboard.JustDown(this.wasd.interact)) {
            // 检查NPC交互
            this.npcs.forEach(npc => {
                const dist = Phaser.Math.Distance.Between(
                    this.player.x, this.player.y,
                    npc.x, npc.y
                );
                
                if (dist < CONFIG.TILE_SIZE * 1.5) {
                    const npcData = npc.getData('npcData');
                    
                    if (npcData.isTrainer && !npcData.defeated) {
                        // 开始训练师对战
                        this.startBattle(npcData);
                    } else {
                        // 显示对话
                        this.showDialog(npcData.dialog, npcData.event);
                    }
                }
            });
        }
    }
    
    checkEncounters(delta) {
        this.encounterCooldown -= delta;
        if (this.encounterCooldown > 0) return;
        
        const mapData = MAPS[GameState.world.currentMap];
        const px = GameState.player.x;
        const py = GameState.player.y;
        
        // 检查是否在草丛
        if (mapData.tiles[py] && mapData.tiles[py][px] === 2) {
            if (Math.random() < CONFIG.ENCOUNTER_RATE) {
                this.encounterCooldown = 2000; // 2秒冷却
                
                // 随机遭遇
                const encounter = mapData.encounters.find(e => 
                    px >= e.x && px < e.x + e.w &&
                    py >= e.y && py < e.y + e.h
                );
                
                if (encounter) {
                    const roll = Math.random();
                    let cumulative = 0;
                    let selectedMonster = encounter.monsters[0];
                    
                    for (let i = 0; i < encounter.rates.length; i++) {
                        cumulative += encounter.rates[i];
                        if (roll < cumulative) {
                            selectedMonster = encounter.monsters[i];
                            break;
                        }
                    }
                    
                    // 开始野生怪物对战
                    this.startBattle({
                        name: 'Wild ' + MONSTERS_DATA[selectedMonster].name,
                        monster: selectedMonster,
                        level: Phaser.Math.Between(2, 5),
                        isWild: true
                    });
                }
            }
        }
    }
    
    checkWarps() {
        const mapData = MAPS[GameState.world.currentMap];
        const px = GameState.player.x;
        const py = GameState.player.y;
        
        mapData.warps.forEach(warp => {
            if (px === warp.x && py === warp.y) {
                this.changeMap(warp.targetMap, warp.targetX, warp.targetY);
            }
        });
    }
    
    changeMap(mapName, x, y) {
        GameState.world.currentMap = mapName;
        GameState.player.x = x;
        GameState.player.y = y;
        
        this.scene.restart();
    }
    
    showDialog(texts, eventId) {
        this.player.setVelocity(0, 0);
        
        let currentIndex = 0;
        const dialogBox = this.add.graphics();
        dialogBox.fillStyle(0x000000, 0.9);
        dialogBox.fillRect(50, 500, 700, 100);
        
        const dialogText = this.add.text(70, 520, texts[currentIndex], {
            fontSize: '18px',
            fill: '#fff',
            wordWrap: { width: 660 }
        });
        
        const clickHandler = () => {
            currentIndex++;
            if (currentIndex < texts.length) {
                dialogText.setText(texts[currentIndex]);
            } else {
                dialogBox.destroy();
                dialogText.destroy();
                this.input.off('pointerdown', clickHandler);
                
                // 触发事件
                if (eventId === 'give_starter' && GameState.player.monsters.length === 0) {
                    this.giveStarterMonster();
                }
            }
        };
        
        this.input.on('pointerdown', clickHandler);
    }
    
    giveStarterMonster() {
        // 给予初始怪物
        const starter = {
            slug: 'flambear',
            ...MONSTERS_DATA.flambear,
            level: 5,
            currentHp: 70,
            skills: ['tackle', 'fire_blast'],
            exp: 0
        };
        
        GameState.player.monsters.push(starter);
        
        const msg = this.add.text(200, 300, 'You received Flambear!', {
            fontSize: '24px',
            fill: '#fff',
            backgroundColor: '#000',
            padding: { x: 20, y: 10 }
        });
        
        this.time.delayedCall(2000, () => msg.destroy());
    }
    
    startBattle(enemyData) {
        this.scene.pause();
        this.scene.launch('BattleScene', {
            player: GameState.player,
            enemy: enemyData,
            onEnd: (result) => {
                this.scene.resume();
                
                if (result === 'win' && enemyData.id) {
                    // 标记训练师已击败
                    const npc = this.npcs.find(n => n.getData('npcData').id === enemyData.id);
                    if (npc) {
                        npc.getData('npcData').defeated = true;
                    }
                }
            }
        });
    }
}

// ==================== 战斗场景 ====================
class BattleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BattleScene' });
    }
    
    init(data) {
        this.battleData = data;
        this.playerMonster = data.player.monsters[0];
        this.enemyMonster = this.createEnemyMonster(data.enemy);
        this.turn = 1;
        this.battleEnd = false;
    }
    
    createEnemyMonster(enemyData) {
        const baseData = MONSTERS_DATA[enemyData.monster];
        const level = enemyData.level || 5;
        
        return {
            ...baseData,
            slug: enemyData.monster,
            level: level,
            currentHp: baseData.hp,
            skills: ['tackle'],
            isWild: enemyData.isWild
        };
    }
    
    create() {
        // 战斗背景
        this.add.rectangle(400, 300, 800, 600, 0x87CEEB);
        
        // 创建战斗UI
        this.createBattleUI();
        
        // 开始战斗
        this.showBattleStart();
    }
    
    createBattleUI() {
        // 玩家怪物
        this.add.rectangle(150, 400, 200, 150, 0xFF6B6B);
        this.playerMonsterText = this.add.text(60, 320, 
            `${this.playerMonster.name} Lv.${this.playerMonster.level}`, 
            { fontSize: '18px', fill: '#000' }
        );
        this.playerHpText = this.add.text(60, 350,
            `HP: ${this.playerMonster.currentHp}/${this.playerMonster.hp}`,
            { fontSize: '16px', fill: '#000' }
        );
        
        // 敌方怪物
        this.add.rectangle(650, 200, 200, 150, 0x4ECDC4);
        this.enemyMonsterText = this.add.text(560, 120,
            `${this.enemyMonster.name} Lv.${this.enemyMonster.level}`,
            { fontSize: '18px', fill: '#000' }
        );
        this.enemyHpText = this.add.text(560, 150,
            `HP: ${this.enemyMonster.currentHp}/${this.enemyMonster.hp}`,
            { fontSize: '16px', fill: '#000' }
        );
        
        // 战斗日志
        this.battleLog = this.add.text(400, 500, '', {
            fontSize: '16px',
            fill: '#000',
            backgroundColor: '#fff',
            padding: { x: 10, y: 5 },
            wordWrap: { width: 780 }
        }).setOrigin(0.5, 0);
        
        // 技能按钮
        this.createSkillButtons();
    }
    
    createSkillButtons() {
        const skills = this.playerMonster.skills;
        const buttonY = 550;
        
        skills.forEach((skill, index) => {
            const button = this.add.rectangle(
                150 + index * 200, buttonY, 180, 40, 0x667eea
            ).setInteractive();
            
            this.add.text(150 + index * 200, buttonY, SKILLS_DATA[skill].name, {
                fontSize: '16px',
                fill: '#fff'
            }).setOrigin(0.5);
            
            button.on('pointerdown', () => {
                if (!this.battleEnd) {
                    this.executeTurn(skill);
                }
            });
        });
        
        // 捕捉按钮（仅对野生怪物）
        if (this.enemyMonster.isWild) {
            const catchButton = this.add.rectangle(700, buttonY, 180, 40, 0xFFD700)
                .setInteractive();
            
            this.add.text(700, buttonY, 'Catch', {
                fontSize: '16px',
                fill: '#000'
            }).setOrigin(0.5);
            
            catchButton.on('pointerdown', () => {
                if (!this.battleEnd) {
                    this.attemptCatch();
                }
            });
        }
    }
    
    showBattleStart() {
        const startText = this.enemyMonster.isWild ? 
            `A wild ${this.enemyMonster.name} appeared!` :
            `${this.battleData.enemy.name} wants to battle!`;
        
        this.battleLog.setText(startText);
    }
    
    async executeTurn(skillSlug) {
        const skill = SKILLS_DATA[skillSlug];
        
        // 玩家攻击
        const playerDamage = this.calculateDamage(this.playerMonster, this.enemyMonster, skill);
        this.enemyMonster.currentHp = Math.max(0, this.enemyMonster.currentHp - playerDamage);
        
        this.updateHP();
        this.battleLog.setText(
            `${this.playerMonster.name} used ${skill.name}!\n` +
            `Dealt ${playerDamage} damage!`
        );
        
        await this.wait(1000);
        
        // 检查战斗结束
        if (this.enemyMonster.currentHp <= 0) {
            this.endBattle('win');
            return;
        }
        
        // 敌方攻击
        const enemySkill = SKILLS_DATA[this.enemyMonster.skills[0]];
        const enemyDamage = this.calculateDamage(this.enemyMonster, this.playerMonster, enemySkill);
        this.playerMonster.currentHp = Math.max(0, this.playerMonster.currentHp - enemyDamage);
        
        this.updateHP();
        this.battleLog.setText(
            `${this.enemyMonster.name} used ${enemySkill.name}!\n` +
            `Dealt ${enemyDamage} damage!`
        );
        
        await this.wait(1000);
        
        // 检查战斗结束
        if (this.playerMonster.currentHp <= 0) {
            this.endBattle('lose');
            return;
        }
        
        this.turn++;
        this.battleLog.setText(`Turn ${this.turn}: Choose your move!`);
    }
    
    calculateDamage(attacker, defender, skill) {
        const baseDamage = skill.power * (attacker.attack / defender.defense);
        
        // 属性克制
        let effectiveness = 1;
        if (TYPE_CHART[skill.type] && TYPE_CHART[skill.type][defender.types[0]]) {
            effectiveness = TYPE_CHART[skill.type][defender.types[0]];
        }
        
        const finalDamage = Math.floor(baseDamage * effectiveness * (0.85 + Math.random() * 0.15));
        
        return finalDamage;
    }
    
    updateHP() {
        this.playerHpText.setText(
            `HP: ${this.playerMonster.currentHp}/${this.playerMonster.hp}`
        );
        this.enemyHpText.setText(
            `HP: ${this.enemyMonster.currentHp}/${this.enemyMonster.hp}`
        );
    }
    
    attemptCatch() {
        const hpRatio = this.enemyMonster.currentHp / this.enemyMonster.hp;
        const catchRate = (1 - hpRatio) * 0.5 + 0.2;
        
        if (Math.random() < catchRate) {
            // 捕捉成功
            const caught = {
                ...this.enemyMonster,
                currentHp: this.enemyMonster.hp
            };
            GameState.player.monsters.push(caught);
            
            this.battleLog.setText(`Gotcha! ${this.enemyMonster.name} was caught!`);
            this.time.delayedCall(2000, () => this.endBattle('catch'));
        } else {
            // 捕捉失败
            this.battleLog.setText(`Oh no! The monster broke free!`);
        }
    }
    
    endBattle(result) {
        this.battleEnd = true;
        
        let message = '';
        if (result === 'win') {
            message = 'You won!';
            // 给经验等
        } else if (result === 'lose') {
            message = 'You lost...';
        } else if (result === 'catch') {
            message = 'Successfully caught the monster!';
        }
        
        this.battleLog.setText(message + '\nClick to continue.');
        
        this.input.once('pointerdown', () => {
            this.scene.stop();
            if (this.battleData.onEnd) {
                this.battleData.onEnd(result);
            }
        });
    }
    
    wait(ms) {
        return new Promise(resolve => {
            this.time.delayedCall(ms, resolve);
        });
    }
}

// ==================== 游戏配置 ====================
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#228B22',
    scene: [BootScene, WorldScene, BattleScene],
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

// 启动游戏
const game = new Phaser.Game(config);

console.log('🎮 OpenClaw MMO - Tuxemon Web MVP Started!');
console.log('📋 Features:');
console.log('   ✅ Map exploration');
console.log('   ✅ NPC interaction');
console.log('   ✅ Turn-based battle');
console.log('   ✅ Monster catching');
console.log('   ✅ Using Tuxemon mechanics');
