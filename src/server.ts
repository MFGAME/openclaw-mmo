/**
 * OpenClaw MMO 服务器
 * 基于Tuxemon战斗系统的MMO游戏后端
 */

import express, { Express, Request, Response } from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';

// 路由
import authRoutes from './routes/auth';
import battleRoutes from './routes/battle';
import robotRoutes from './routes/robot';

// 战斗引擎
import { BattleEngine } from './battle/engine';

const app: Express = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // 静态文件服务

// 战斗引擎实例
const battleEngine = new BattleEngine();

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/battle', battleRoutes);
app.use('/api/robot', robotRoutes);

// 健康检查
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// WebSocket连接
io.on('connection', (socket) => {
  console.log(`客户端连接: ${socket.id}`);

  // 加入对战房间
  socket.on('join_battle', (battleId: string) => {
    socket.join(`battle_${battleId}`);
    console.log(`客户端 ${socket.id} 加入对战 ${battleId}`);
  });

  // 战斗行动
  socket.on('battle_action', (data: any) => {
    try {
      const result = battleEngine.processAction(data.battleId, data.action);
      io.to(`battle_${data.battleId}`).emit('battle_update', result);
    } catch (error: any) {
      socket.emit('error', { message: error.message });
    }
  });

  // 断开连接
  socket.on('disconnect', () => {
    console.log(`客户端断开: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`🚀 OpenClaw MMO服务器运行在 http://localhost:${PORT}`);
  console.log(`📡 WebSocket服务运行在 ws://localhost:${PORT}`);
});

export { io, battleEngine };
