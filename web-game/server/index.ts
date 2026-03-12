/**
 * Socket.IO 服务器入口文件
 */

import { socketIOServer } from './SocketIOServer.js';

// 启动服务器
socketIOServer.start(3000);

console.log('OpenClaw MMO Socket.IO Server is running on port 3000');
