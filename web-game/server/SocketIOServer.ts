/**
 * Socket.IO 服务器
 * 处理 MMO 多人联机功能
 */

import { Server, Socket } from 'socket.io';

/**
 * 玩家数据接口
 */
export interface PlayerData {
    id: string;
    name: string;
    x: number;
    y: number;
    direction: string;
    level: number;
    isBot: boolean;
}

/**
 * 挑战数据接口
 */
export interface ChallengeData {
    fromId: string;
    toId: string;
    battleId: string;
}

/**
 * Socket.IO 服务器类
 */
export class SocketIOServer {
    private static instance: SocketIOServer;

    private io: Server | null = null;
    private players: Map<string, PlayerData> = new Map();
    private challenges: Map<string, ChallengeData> = new Map();

    private constructor() {}

    static getInstance(): SocketIOServer {
        if (!SocketIOServer.instance) {
            SocketIOServer.instance = new SocketIOServer();
        }
        return SocketIOServer.instance;
    }

    start(port: number = 3000): void {
        // 创建 Socket.IO 服务器
        this.io = new Server(port, {
            cors: {
                origin: '*',
                methods: ['GET', 'POST']
            }
        });

        this.io.on('connection', (socket: Socket) => {
            this.handleConnection(socket);
        });

        // 添加测试 Bot（靠近玩家起始位置 25,25），供单人测试挑战
        this.addBotPlayer({
            id: 'bot_test_1',
            name: '测试Bot',
            x: 24 * 32,  // 瓦片 (24, 24)
            y: 24 * 32,
            direction: 'down',
            level: 5,
            isBot: true
        });

        console.log(`[SocketIOServer] Server started on port ${port}`);
    }

    stop(): void {
        if (this.io) {
            this.io.close();
            this.io = null;
            console.log('[SocketIOServer] Server stopped');
        }
    }

    private handleConnection(socket: Socket): void {
        console.log(`[SocketIOServer] Client connected: ${socket.id}`);

        // 玩家加入
        socket.on('player_join', (data: { name: string; x: number; y: number; direction: string; level: number }) => {
            const player: PlayerData = {
                id: socket.id,
                name: data.name || `Player_${socket.id.substring(0, 8)}`,
                x: data.x || 0,
                y: data.y || 0,
                direction: data.direction || 'down',
                level: data.level || 1,
                isBot: false
            };

            this.players.set(socket.id, player);
            console.log(`[SocketIOServer] Player joined: ${player.name} (${socket.id})`);

            // 发送当前所有玩家列表
            socket.emit('players_update', Array.from(this.players.values()));

            // 通知其他玩家
            socket.broadcast.emit('player_joined', player);
        });

        // 玩家移动
        socket.on('player_move', (data: { x: number; y: number; direction: string }) => {
            const player = this.players.get(socket.id);
            if (player) {
                player.x = data.x;
                player.y = data.y;
                player.direction = data.direction;

                // 广播给其他玩家
                socket.broadcast.emit('player_move', {
                    id: socket.id,
                    x: player.x,
                    y: player.y,
                    direction: player.direction
                });
            }
        });

        // 挑战玩家
        socket.on('challenge_player', (data: { targetId: string }) => {
            const challenger = this.players.get(socket.id);
            const target = this.players.get(data.targetId);

            if (challenger && target) {
                const battleId = `battle_${Date.now()}_${socket.id}_${data.targetId}`;

                // 测试/Bot 玩家自动接受，直接开始战斗（含 test-socket.html 的「测试玩家」）
                if (target.isBot || target.name === '测试玩家') {
                    const battleData = {
                        battleId,
                        player1: challenger,
                        player2: target
                    };
                    socket.emit('battle_start', battleData);
                    console.log(`[SocketIOServer] Challenge (auto-accept bot): ${challenger.name} -> ${target.name}`);
                    return;
                }

                const challenge: ChallengeData = {
                    fromId: socket.id,
                    toId: data.targetId,
                    battleId
                };
                this.challenges.set(battleId, challenge);

                // 通知被挑战的玩家
                socket.to(data.targetId).emit('challenge_received', {
                    fromId: socket.id,
                    fromName: challenger.name,
                    battleId
                });

                console.log(`[SocketIOServer] Challenge: ${challenger.name} -> ${target.name}`);
            }
        });

        // 挑战响应
        socket.on('challenge_response', (data: { battleId: string; accepted: boolean }) => {
            const challenge = this.challenges.get(data.battleId);
            if (challenge && (challenge.fromId === socket.id || challenge.toId === socket.id)) {
                const challenger = this.players.get(challenge.fromId);
                const target = this.players.get(challenge.toId);

                if (data.accepted && challenger && target) {
                    // 开始战斗
                    const battleData = {
                        battleId: data.battleId,
                        player1: challenger,
                        player2: target
                    };

                    this.io!.to(challenge.fromId).emit('battle_start', battleData);
                    this.io!.to(challenge.toId).emit('battle_start', battleData);

                    console.log(`[SocketIOServer] Battle started: ${challenger.name} vs ${target.name}`);
                } else {
                    // 拒绝挑战
                    socket.to(challenge.fromId).emit('challenge_response', {
                        battleId: data.battleId,
                        accepted: false
                    });
                }

                this.challenges.delete(data.battleId);
            }
        });

        // 战斗结束
        socket.on('battle_end', (data: { battleId: string; winnerId: string }) => {
            // 通知所有相关玩家
            this.io?.emit('battle_end', data);
            console.log(`[SocketIOServer] Battle ended: ${data.battleId}`);
        });

        // 断开连接
        socket.on('disconnect', () => {
            const player = this.players.get(socket.id);
            if (player) {
                console.log(`[SocketIOServer] Player disconnected: ${player.name} (${socket.id})`);

                // 通知其他玩家
                socket.broadcast.emit('player_left', {
                    id: socket.id,
                    name: player.name
                });

                this.players.delete(socket.id);
            }
        });
    }

    // 添加机器人玩家
    addBotPlayer(bot: PlayerData): void {
        this.players.set(bot.id, bot);
        console.log(`[SocketIOServer] Bot added: ${bot.name} (${bot.id})`);

        // 广播给所有连接的玩家
        this.io?.emit('player_joined', bot);
    }

    // 移除机器人玩家
    removeBotPlayer(botId: string): void {
        const bot = this.players.get(botId);
        if (bot) {
            this.players.delete(botId);
            this.io?.emit('player_left', {
                id: botId,
                name: bot.name
            });
            console.log(`[SocketIOServer] Bot removed: ${bot.name} (${botId})`);
        }
    }

    // 获取所有玩家
    getPlayers(): PlayerData[] {
        return Array.from(this.players.values());
    }

    // 获取在线玩家数量
    getPlayerCount(): number {
        return this.players.size;
    }
}

// 导出单例
export const socketIOServer = SocketIOServer.getInstance();
