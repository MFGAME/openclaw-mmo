/**
 * Socket.IO 服务器
 * 处理 MMO 多人联机功能
 */
import { Server } from 'socket.io';
/**
 * Socket.IO 服务器类
 */
export class SocketIOServer {
    constructor() {
        this.io = null;
        this.players = new Map();
        this.challenges = new Map();
        this.port = 3000;
    }
    static getInstance() {
        if (!SocketIOServer.instance) {
            SocketIOServer.instance = new SocketIOServer();
        }
        return SocketIOServer.instance;
    }
    start(port = 3000) {
        this.port = port;
        // 创建 Socket.IO 服务器
        this.io = new Server(port, {
            cors: {
                origin: '*',
                methods: ['GET', 'POST']
            }
        });
        this.io.on('connection', (socket) => {
            this.handleConnection(socket);
        });
        console.log(`[SocketIOServer] Server started on port ${port}`);
    }
    stop() {
        if (this.io) {
            this.io.close();
            this.io = null;
            console.log('[SocketIOServer] Server stopped');
        }
    }
    handleConnection(socket) {
        console.log(`[SocketIOServer] Client connected: ${socket.id}`);
        // 玩家加入
        socket.on('player_join', (data) => {
            const player = {
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
        socket.on('player_move', (data) => {
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
        socket.on('challenge_player', (data) => {
            const challenger = this.players.get(socket.id);
            const target = this.players.get(data.targetId);
            if (challenger && target) {
                const battleId = `battle_${Date.now()}_${socket.id}_${data.targetId}`;
                const challenge = {
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
        socket.on('challenge_response', (data) => {
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
                    this.io.to(challenge.fromId).emit('battle_start', battleData);
                    this.io.to(challenge.toId).emit('battle_start', battleData);
                    console.log(`[SocketIOServer] Battle started: ${challenger.name} vs ${target.name}`);
                }
                else {
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
        socket.on('battle_end', (data) => {
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
    addBotPlayer(bot) {
        this.players.set(bot.id, bot);
        console.log(`[SocketIOServer] Bot added: ${bot.name} (${bot.id})`);
        // 广播给所有连接的玩家
        this.io?.emit('player_joined', bot);
    }
    // 移除机器人玩家
    removeBotPlayer(botId) {
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
    getPlayers() {
        return Array.from(this.players.values());
    }
    // 获取在线玩家数量
    getPlayerCount() {
        return this.players.size;
    }
}
// 导出单例
export const socketIOServer = SocketIOServer.getInstance();
//# sourceMappingURL=SocketIOServer.js.map