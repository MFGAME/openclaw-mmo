/**
 * Socket.IO 服务器
 * 处理 MMO 多人联机功能
 */
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
export declare class SocketIOServer {
    private static instance;
    private io;
    private players;
    private challenges;
    private port;
    private constructor();
    static getInstance(): SocketIOServer;
    start(port?: number): void;
    stop(): void;
    private handleConnection;
    addBotPlayer(bot: PlayerData): void;
    removeBotPlayer(botId: string): void;
    getPlayers(): PlayerData[];
    getPlayerCount(): number;
}
export declare const socketIOServer: SocketIOServer;
//# sourceMappingURL=SocketIOServer.d.ts.map