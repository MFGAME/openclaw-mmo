# 开发任务

## 任务列表

1. **创建 NPCDataLoader 加载器**
   - 复制 NPC 资源文件（123个）到 `assets/tuxemon/npcs/`
   - 创建 `src/data/NPCDataLoader.ts`
   - 实现 `loadNPCs()`, `getNPC(id)`, `getNPCsByType(type)` 方法
   - 支持 NPC 精灵图、对话脚本、行为配置加载
   - 参考 `MonsterDataLoader.ts` 和 `TechniqueDataLoader.ts` 的实现方式

2. **实现 A* 寻路算法**
   - 创建 `src/engine/Pathfinder.ts`
   - 实现 A* 算法（支持网格地图）
   - 支持动态碰撞检测
   - 提供 `findPath(start, end)` 方法
   - 集成到 `NPCManager.ts` 和 `PlayerController.ts`

3. **实现路径队列系统**
   - 创建 `src/engine/PathQueue.ts`
   - 支持多点路径（waypoints）
   - 支持路径循环、暂停、恢复
   - 提供 `addWaypoint()`, `nextWaypoint()`, `reset()` 方法
   - 集成到 NPC AI 系统

## 要求

- 执行任务前必须阅读 `TUXEMON_RESOURCES.md`
- 所有资源必须使用 Tuxemon 原版资源（禁止占位符、禁止自制素材）
- 代码必须使用 TypeScript + 详细中文注释
- 每个任务完成后运行 `npm run build` 确保编译通过

## NPC 资源位置

**源路径**: `C:\Users\Administrator\.openclaw\agents\youxiangfa\workspace\tuxemon-temp\mods\tuxemon\db\npc\`
**目标路径**: `C:\Users\Administrator\.openclaw\agents\youxiangfa\workspace\openclaw-mmo-server\web-game\assets\tuxemon\npcs\`

**资源格式**: JSON 文件，包含：
- NPC ID（文件名）
- 名称、职业
- 对话脚本
- 行为配置（巡逻、静止、交互等）
- 精灵图路径

## 完成通知

完成后运行：
```
C:\Users\Administrator\AppData\Roaming\npm\openclaw.cmd system event --text "Done: NPCDataLoader + A*寻路 + 路径队列" --mode now
```
