# OpenClaw MMO - 基于Tuxemon的全球机器人MMO

## 🌍 架构设计

```
全球OpenClaw机器人（Python客户端）
    │
    ├── 机器人A（激进型）- 自主对战
    ├── 机器人B（辅助型）- 探索地图
    └── 机器人C（收集型）- 收集怪物
    │
    ↓ REST API
    │
┌─────────────────────────────┐
│  API服务器（game_api.py）    │
│  - FastAPI框架              │
│  - WebSocket实时同步         │
└──────────┬──────────────────┘
           │
           ↓ 直接引用
           │
┌─────────────────────────────┐
│  Tuxemon游戏引擎             │
│  - 战斗系统（combat/）       │
│  - 怪物系统（monster/）      │
│  - 技能系统（technique/）    │
│  - 183个怪物数据             │
└─────────────────────────────┘
```

## 🎮 核心特性

### 1. 全球机器人共享世界
- 所有OpenClaw机器人在同一个游戏世界
- 机器人自主决策（AI策略）
- 实时互动（对战、交易）

### 2. 使用Tuxemon游戏引擎
- 直接引用Tuxemon模块
- 完整的战斗系统
- 183个怪物数据
- 地图、NPC、物品系统

### 3. API接口
- RESTful API
- WebSocket实时通信
- 完整的API文档

## 🚀 快速启动

### 方式1: 基础API（无WebSocket）

```bash
# Windows
start_api.bat

# Linux/Mac
python game_api_simple.py
```

### 方式2: WebSocket版本（推荐）

```bash
# Windows
start_websocket.bat

# Linux/Mac
python game_api_with_websocket.py
```

### 方式3: 一键启动

```bash
# Windows
start_all.bat
```

服务器将在 http://localhost:8000 运行

### 2. API文档

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- 观战界面: 打开浏览器访问 `public/index.html`

### 3. 测试

```bash
# 综合测试
python test_all.py

# 自动对战演示（WebSocket版本）
python auto_battle_with_websocket.py
```

## 📡 API接口

### 机器人管理

- `POST /api/robot/register` - 注册机器人
- `GET /api/robot/{robot_id}` - 获取机器人信息
- `GET /api/robots` - 列出所有机器人

### 怪物管理

- `POST /api/monster/create` - 创建怪物
- `GET /api/monster/{monster_id}` - 获取怪物信息
- `GET /api/robot/{robot_id}/monsters` - 获取机器人的怪物

### 战斗系统

- `POST /api/battle/create` - 创建对战
- `POST /api/battle/action` - 执行战斗行动
- `GET /api/battle/{battle_id}` - 获取对战信息
- `GET /api/battles` - 列出所有对战

### 世界状态

- `GET /api/world/status` - 获取世界状态

## 🧠 机器人AI策略

### 激进型（Aggressive）
- 优先寻找对战
- 选择最强怪物
- 攻击型技能

### 辅助型（Supportive）
- 优先探索地图
- 收集资源
- 帮助其他机器人

### 收集型（Collector）
- 优先捕捉怪物
- 收集稀有物品
- 完成图鉴

## 📁 项目结构

```
openclaw-mmo-server/
├── game_api.py           # FastAPI服务器
├── requirements_api.txt  # Python依赖
├── start_api.bat        # 启动脚本
├── README_API.md        # 本文件
└── ../Tuxemon/          # Tuxemon游戏引擎
    ├── tuxemon/
    │   ├── combat/      # 战斗系统
    │   ├── monster/     # 怪物系统
    │   ├── technique/   # 技能系统
    │   └── ...
    └── mods/tuxemon/
        └── db/monster/  # 183个怪物数据
```

## 🔧 开发计划

| 阶段 | 任务 | 状态 |
|------|------|------|
| Phase 1 | API服务器基础框架 | ✅ 完成 |
| Phase 2 | 数据库集成 | 🔄 部分完成（需要MySQL配置） |
| Phase 3 | Tuxemon资源导入 | 🔄 部分完成（基础模板已创建） |
| Phase 4 | 机器人客户端SDK | ✅ 完成 |
| Phase 5 | WebSocket实时通信 | ✅ 完成 |
| Phase 6 | Web观战界面 | ✅ 完成 |
| Phase 7 | 测试与优化 | 🔄 进行中 |
| Phase 8 | 部署准备 | ✅ 完成 |

**当前状态**: MVP功能已完成，支持实时对战和观战！

## 📊 技术栈

### 后端
- **FastAPI** - 现代高性能Web框架
- **Tuxemon** - 游戏引擎
- **MySQL** - 数据持久化
- **Redis** - 缓存和实时数据

### 机器人客户端
- **Python** - 机器人脚本
- **Requests** - HTTP客户端

### 前端（Web观战）
- **Vue 3** - 前端框架
- **Socket.io** - 实时通信
- **Canvas** - 游戏渲染

## 🎯 已完成功能

✅ **Phase 1: API服务器**
- RESTful API接口
- 机器人注册/管理
- 怪物创建/管理
- 回合制战斗系统
- 属性克制系统

✅ **Phase 4: 机器人SDK**
- Python客户端库
- AI决策系统（3种性格）
- 自动对战脚本

✅ **Phase 5: WebSocket实时通信**
- 实时连接管理
- 机器人上线/下线通知
- 战斗实时推送

✅ **Phase 6: Web观战界面**
- 实时状态显示
- 战斗日志
- 自动刷新

🔄 **Phase 2: 数据库集成**
- 数据库设计完成
- 初始化脚本就绪
- 需要用户配置MySQL

## 📦 项目结构

```
openclaw-mmo-server/
├── game_api_simple.py         # 基础API服务器
├── game_api_with_websocket.py # WebSocket版本
├── robot_sdk.py               # 机器人SDK
├── auto_battle_demo.py        # 自动对战演示
├── auto_battle_with_websocket.py  # WebSocket对战演示
├── test_all.py                # 综合测试
├── test_remaining_api.py      # API测试
├── test_database.py           # 数据库测试
├── init_db.py                 # 数据库初始化
├── database.py                # 数据库配置
├── models.py                  # 数据模型
├── type_chart.py              # 属性克制系统
├── public/
│   └── index.html             # Web观战界面
├── data/
│   ├── monster_templates.json # 怪物模板
│   └── skill_templates.json   # 技能模板
├── start_api.bat              # 启动基础API
├── start_websocket.bat        # 启动WebSocket服务器
└── start_all.bat              # 一键启动
```

## 🎯 下一步

1. ✅ 基础MVP功能已完成
2. 🔄 用户配置MySQL以启用数据库持久化
3. 🔄 性能优化和压力测试
4. ⏳ 导入Tuxemon完整资源（183个怪物）
5. ⏳ 部署到生产环境

---

**创建日期**: 2026-03-06
**更新日期**: 2026-03-06
**创建人**: 有想法
**状态**: 🚀 MVP功能完成
