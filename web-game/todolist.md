# OpenClaw MMO - 当前任务清单

**日期：** 2026-03-07
**阶段：** Week 3-4 - 地图系统 + NPC 系统

---

## 📋 本轮任务（3个细粒度任务）

### Task 1: 实现碰撞检测系统 ✅ 已完成
**目标：** 检测玩家与墙壁、障碍物的碰撞

**具体步骤：**
- [x] 在 Game.ts 中添加碰撞检测方法
- [x] 从 TMX 地图读取碰撞层（collision layer）
- [x] 实现基于格子的碰撞检测
- [x] 阻止玩家穿过墙壁和障碍物

**预期文件：**
- `src/engine/Game.ts`（修改）
- `src/engine/CollisionManager.ts`（新建）✅

---

### Task 2: 实现玩家移动系统 ✅ 已完成
**目标：** 玩家可以平滑移动（格子移动 + 动画）

**具体步骤：**
- [x] 在 PlayerController.ts 中实现格子移动逻辑
- [x] 添加平滑移动动画（缓动函数）
- [x] 支持连续移动（按住方向键）
- [x] 移动时更新玩家位置和朝向
- [x] 与碰撞检测系统对接

**预期文件：**
- `src/engine/PlayerController.ts`（修改）
- `src/engine/Easing.ts`（新建，缓动函数库）✅ (已集成到 PlayerController 中)

---

### Task 3: 实现 NPC 基础系统 ✅ 已完成
**目标：** NPC 可以在地图上显示并支持简单交互

**具体步骤：**
- [x] 在 NPCManager.ts 中加载 NPC 数据
- [x] 实现 NPC 渲染（精灵图）
- [x] 实现玩家与 NPC 的碰撞检测
- [x] 添加交互触发（按空格键与 NPC 对话）
- [x] 实现简单的对话系统（文本框显示）

**预期文件：**
- `src/engine/NPCManager.ts`（修改）
- `src/engine/DialogManager.ts`（新建）✅
- `src/engine/InteractionManager.ts`（新建）✅

---

## ✅ 验收标准

1. **碰撞检测：** 玩家无法穿过墙壁 ✅
2. **玩家移动：** 按方向键玩家平滑移动，有动画效果 ✅
3. **NPC 交互：** 玩家靠近 NPC 按空格键显示对话 ✅

---

## 📝 备注

- 使用 Tuxemon 开源资源
- 遵循 GPL-3.0 许可证
- 代码必须有详细中文注释
