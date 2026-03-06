# OpenClaw MMO - Tuxemon集成指南

## 🎮 如何找到OpenClaw MMO入口

### **方法1: 主菜单（推荐）**
1. 启动游戏: `py -3 run_tuxemon_mmo.py`
2. 在主菜单中找到 **"OpenClaw MMO"** 选项
3. 点击进入后会看到：
   - 在线玩家数
   - 进行中对战场次
   - "Online Battle" - 开始网络对战
   - "Spectate" - 观看其他玩家对战

### **方法2: 手动连接**
如果主菜单没有显示，按 **N键**（需要在游戏中实现快捷键）

## 🔧 集成的功能

### **主菜单新增**
- ✅ 显示在线玩家数
- ✅ "Online Battle" 按钮
- ✅ "Spectate" 按钮
- ✅ 自动连接到服务器

### **游戏内功能**
- ✅ 战斗时自动同步怪物
- ✅ 实时同步战斗行动
- ✅ 保存完整Tuxemon体验

## 📂 文件结构

```
Tuxemon/
├── run_tuxemon_mmo.py              # 集成版启动器
└── mods/tuxemon/
    ├── openclaw_mmo.py             # 主插件
    ├── openclaw_combat_patch.py    # 战斗补丁
    ├── openclaw_start_menu_patch.py # 主菜单补丁
    ├── openclaw_states.py          # 对战和观战状态
    └── openclaw_menu_integration.py # 菜单集成

openclaw-mmo-server/
├── game_api_with_websocket.py      # API服务器
└── TUXEMON_INTEGRATION.md          # 本文件
```

## 🚀 启动顺序

1. **启动API服务器**
   ```bash
   cd openclaw-mmo-server
   python game_api_with_websocket.py
   ```

2. **启动Tuxemon（集成版）**
   ```bash
   cd Tuxemon
   py -3 run_tuxemon_mmo.py
   ```

3. **在主菜单中找到"OpenClaw MMO"**

## 🎯 主菜单布局

```
┌─────────────────────────────┐
│      TUXEMON               │
├─────────────────────────────┤
│  New Game                   │
│  Load Game                  │
│  Options                    │
│  ─────────────────          │
│  OpenClaw MMO (Online: X)   │
│    → Online Battle          │
│    → Spectate               │
│  Exit                       │
└─────────────────────────────┘
```

## ⚠️ 故障排除

### **问题1: 主菜单没有OpenClaw MMO选项**
- 确保使用 `run_tuxemon_mmo.py` 启动
- 检查API服务器是否运行（http://localhost:8000）

### **问题2: 连接失败**
- 确认API服务器正在运行
- 检查控制台输出的错误信息

### **问题3: 只看到普通Tuxemon**
- 必须使用 `run_tuxemon_mmo.py` 而不是 `run_tuxemon.py`

## 📊 状态说明

- **Connected**: 已连接到OpenClaw MMO服务器
- **Online: X**: 当前有X个玩家在线
- **Active battles: X**: 当前有X场对战正在进行

---

**版本**: OpenClaw MMO v1.0 + Tuxemon
**更新时间**: 2026-03-06 17:45
