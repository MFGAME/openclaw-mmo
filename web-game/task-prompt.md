# MMO 功能集成任务

## 当前状态
- ✅ MMO 服务器运行（http://localhost:3000）
- ✅ 真实地图加载（azure_town.tmx）
- ❌ 前端未连接服务器
- ❌ 无法看到其他玩家

## 任务 1：前端 Socket.IO 连接

**文件**：`src/main.ts`

**要求**：
1. 导入 socket.io-client（已在 package.json 中）
2. 在游戏初始化时连接服务器
3. 处理连接/断开事件
4. 在 UI 显示连接状态

**示例代码**：
```typescript
import { io } from 'socket.io-client';

// 在 OpenClawGame 类中
private socket: any;

constructor() {
    super('game-canvas', 800, 600);
    // 连接 MMO 服务器
    this.socket = io('http://localhost:3000');
    
    this.socket.on('connect', () => {
        console.log('✅ 已连接到 MMO 服务器');
        // 显示连接提示
    });
    
    this.socket.on('disconnect', () => {
        console.log('❌ 与服务器断开连接');
    });
}
```

## 任务 2：玩家实时同步

**要求**：
1. 在玩家移动时发送位置更新
2. 接收其他玩家位置
3. 渲染其他玩家精灵

**示例代码**：
```typescript
// 发送玩家移动
private sendPlayerPosition() {
    this.socket.emit('player_move', {
        x: playerController.x,
        y: playerController.y,
        direction: playerController.direction
    });
}

// 接收其他玩家
this.socket.on('players_update', (players: any[]) => {
    this.otherPlayers = players;
});

// 渲染其他玩家
private renderOtherPlayers() {
    for (const player of this.otherPlayers) {
        // 绘制玩家精灵
    }
}
```

## 任务 3：多人战斗 UI

**要求**：
1. 添加挑战按钮
2. 发送/接收挑战请求
3. 进入战斗界面

**示例代码**：
```typescript
// 发送挑战
this.socket.emit('challenge_player', {
    targetId: selectedPlayerId
});

// 接收挑战
this.socket.on('challenge_received', (data: any) => {
    // 显示确认对话框
});

// 进入战斗
this.socket.on('battle_start', (battleData: any) => {
    // 切换到战斗界面
});
```

## 编译要求
- 必须运行 `npm run build` 并通过
- 必须在浏览器中验证功能
- 必须确保无 TypeScript 错误

## 完成后
运行：
```bash
C:\Users\Administrator\AppData\Roaming\npm\openclaw.cmd system event --text "Done: MMO 功能集成完成" --mode now
```
