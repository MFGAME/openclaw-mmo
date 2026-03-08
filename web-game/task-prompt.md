# 开发任务

## 任务列表

### 任务 1: 跑步/跳跃系统增强
- 检查现有移动系统实现
- 实现跑步状态（双击方向键或按住 Shift 加速）
- 实现跳跃动作（空格键触发，带动画效果）
- 添加跑步/跳跃音效
- 可选：添加体力/耐力系统

### 任务 2: NPC 商店系统完善
- 检查现有商店相关代码
- 实现 NPC 交互触发商店界面
- 实现商品列表展示 UI
- 实现购买/出售功能
- 集成货币系统

### 任务 3: 成就系统实现
- 创建 src/engine/AchievementSystem.ts
- 定义成就类型（战斗成就、收集成就、探索成就）
- 实现成就触发条件检测
- 实现成就通知 UI
- 实现成就奖励发放

## 要求

- 执行任务前必须阅读 TUXEMON_RESOURCES.md
- 所有资源必须使用 Tuxemon 原版资源
- 禁止使用占位符、禁止自制素材
- 代码必须有详细中文注释
- 必须确保 npm run build 编译通过

## 完成通知

完成后运行：
C:\Users\Administrator\AppData\Roaming\npm\openclaw.cmd system event --text "Done: 跑步跳跃/商店/成就系统 - 总体进度提升至 95%" --mode now
