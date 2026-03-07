# OpenClaw MMO - 当前任务清单

**日期：** 2026-03-07
**阶段：** Week 3-4 - 地图系统 + NPC 系统（补充核心功能）

---

## ⚠️ 对标 Tuxemon 核心功能补充

根据对比分析，我们需要补充以下核心功能才能达到"只能更好不能更差"的标准：

---

## 📋 本轮任务（3个细粒度任务）

### Task 1: 实现 A* 寻路算法
**目标：** 对标 Tuxemon 的 Pathfinder，实现完整的 A* 寻路系统

**具体步骤：**
- [ ] 创建 `src/engine/Pathfinder.ts` 文件
- [ ] 实现 A* 算法核心逻辑（Manhattan 距离、优先队列）
- [ ] 实现路径节点类（PathfindNode）
- [ ] 支持碰撞地图集成
- [ ] 支持跳跃点、传送门路径规划
- [ ] 添加路径缓存机制

**预期文件：**
- `src/engine/Pathfinder.ts`（新建）

**对标 Tuxemon：**
- 参考 `tuxemon/movement.py` 中的 `Pathfinder` 类
- 参考 `PathfindNode` 节点系统
- 实现 `find_path()` 方法

---

### Task 2: 实现路径队列系统
**目标：** NPC 可以沿着路径队列移动

**具体步骤：**
- [ ] 在 NPCManager 中添加路径队列（path queue）
- [ ] 实现路径点跟随逻辑
- [ ] 支持任意长度路径
- [ ] 支持路径中断和重置
- [ ] 与 A* 寻路系统对接

**预期文件：**
- `src/engine/NPCManager.ts`（修改）
- `src/engine/PathQueue.ts`（新建，可选）

**对标 Tuxemon：**
- 参考 `tuxemon/entity/npc.py` 中的 `path` 队列
- 参考 `PathController` 路径控制器
- 实现路径跟随和中断逻辑

---

### Task 3: 实现动态碰撞管理
**目标：** 支持动态添加/移除碰撞区域

**具体步骤：**
- [ ] 在 CollisionManager 中添加 `addCollision()` 方法
- [ ] 添加 `removeCollision()` 方法
- [ ] 支持实体碰撞注册（玩家、NPC）
- [ ] 支持动态碰撞区域（开门、移动障碍物）
- [ ] 更新碰撞地图缓存

**预期文件：**
- `src/engine/CollisionManager.ts`（修改）

**对标 Tuxemon：**
- 参考 `tuxemon/map/collision_manager.py` 中的 `add_collision()` 方法
- 参考 `remove_collision()` 方法
- 实现实体碰撞注册

---

## ✅ 验收标准

1. **A* 寻路：** NPC 可以自动寻路到目标位置，避开障碍物
2. **路径队列：** NPC 可以沿着路径队列平滑移动
3. **动态碰撞：** 可以动态添加/移除碰撞区域

---

## 📝 备注

- 对标 Tuxemon 原生 Python 实现
- 所有资源必须使用 Tuxemon 原版资源
- 代码必须有详细中文注释
- 参考文档：`TUXEMON_RESOURCES.md`

---

## 🔄 后续任务（Week 3-4 剩余）

- [ ] 跑步/跳跃系统（可选）
- [ ] 像素级移动支持（可选）
- [ ] 事件系统（触发器、条件判断）
- [ ] 场景切换（传送门、进出建筑）

---

创建日期：2026-03-07
最后更新：2026-03-07 16:31（补充核心功能清单）
