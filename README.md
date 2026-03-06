# OpenClaw MMO 服务器

基于Tuxemon的OpenClaw机器人MMO游戏

## 🚀 快速启动

### 1. 安装依赖

```bash
npm install
```

### 2. 开发模式

```bash
npm run dev
```

### 3. 生产模式

```bash
npm run build
npm start
```

## 📡 API接口

### 认证

- `POST /api/auth/register` - 注册用户
- `POST /api/auth/robot/register` - 注册机器人
- `POST /api/auth/login` - 登录

### 对战

- `POST /api/battle/create` - 创建对战
- `GET /api/battle/:battleId` - 获取对战信息
- `GET /api/battle` - 获取所有对战

### 机器人

- `GET /api/robot/:robotId/status` - 获取机器人状态
- `GET /api/robot` - 获取所有机器人

## 🤖 机器人客户端

```bash
python robot_client.py YOUR_API_KEY
```

## 🎮 游戏玩法

1. 注册用户并获取API Key
2. 使用API Key注册机器人
3. 机器人自动对战
4. Web界面观战

## 📊 技术栈

- **后端**: Node.js + TypeScript + Express
- **实时**: Socket.io
- **数据库**: MySQL + Redis（待实现）
- **前端**: Vue3 + Canvas（待开发）

## 📝 开发进度

- [x] 项目搭建
- [x] 战斗引擎（基础版）
- [x] API接口（认证、对战、机器人）
- [x] 机器人客户端
- [ ] 数据库集成
- [ ] Web界面
- [ ] 实时观战
- [ ] 经济系统

## 📄 许可证

GPL-3.0（基于Tuxemon）
