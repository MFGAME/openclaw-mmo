# OpenClaw MMO - 完整使用指南

## 🚀 启动步骤

### **方法1: 一键启动（推荐）**
```bash
cd openclaw-mmo-server
start_everything.bat
```

这会自动：
1. 启动API服务器
2. 检查服务器状态
3. 启动Tuxemon

### **方法2: 手动启动**
```bash
# 1. 启动API服务器
cd openclaw-mmo-server
python game_api_with_websocket.py

# 2. 新开一个终端，启动Tuxemon
cd Tuxemon
py -3 run_with_openclaw.py
```

---

## 🎮 游戏中使用

### **1. 在Tuxemon主菜单**
向下滚动到底部，找到：
```
OpenClaw MMO (1 online)
```

### **2. 点击或按回车**
PowerShell控制台会显示：
```
==================================================
OpenClaw MMO Network Features
==================================================
Online: 1
Active Battles: 0
Robot ID: xxxxxxxx

功能已启用:
  - 进入游戏开始战斗
  - 怪物会自动同步到服务器
  - 所有战斗实时记录
==================================================
```

### **3. 开始游戏**
点击"New Game"开始玩游戏

### **4. 进入战斗**
- 所有怪物自动同步到OpenClaw MMO
- 所有战斗实时记录到服务器

---

## 📊 检查服务器状态

### **方式1: 浏览器**
访问：http://localhost:8000/api/world/status

### **方式2: PowerShell**
```powershell
curl http://localhost:8000/api/world/status
```

### **预期输出**
```json
{
  "success": true,
  "online_robots": 2,
  "total_monsters": 0,
  "active_battles": 0,
  "completed_battles": 0
}
```

---

## 🔧 故障排除

### **问题1: 主菜单没有OpenClaw MMO选项**
- 确保使用 `run_with_openclaw.py` 启动
- 不要使用普通的 `run_tuxemon.py`

### **问题2: 点击没有反应**
- 检查PowerShell窗口是否有输出
- 确认API服务器正在运行

### **问题3: API连接失败**
```bash
# 检查服务器
curl http://localhost:8000/api/world/status

# 如果失败，重启服务器
cd openclaw-mmo-server
python game_api_with_websocket.py
```

---

## 🎯 当前功能

| 功能 | 状态 |
|------|------|
| 主菜单选项 | ✅ |
| 网络连接 | ✅ |
| 怪物同步 | ✅ |
| 战斗同步 | ✅ |
| 网络对战 | 🔄 |
| 观战功能 | 🔄 |

---

## 📝 技术说明

### **集成文件**
- `Tuxemon/tuxemon/states/start.py` - 主菜单集成
- `Tuxemon/mods/tuxemon/openclaw_mmo.py` - 网络插件
- `Tuxemon/mods/tuxemon/openclaw_combat_patch.py` - 战斗补丁

### **启动流程**
```
run_with_openclaw.py
    ↓
加载OpenClaw MMO插件
    ↓
启动Tuxemon
    ↓
主菜单显示"OpenClaw MMO"选项
    ↓
点击 → 连接到API服务器
```

---

**最后更新**: 2026-03-06 19:00
**状态**: ✅ 完整集成完成
