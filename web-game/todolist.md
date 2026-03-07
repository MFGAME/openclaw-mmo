# 心跳任务清单 - 2026-03-08 01:37

**当前进度**：~25%（美术资源 15% 部分实装）

**本次心跳的 3 个任务**（动态生成）：

## 任务 1：在战斗系统中集成怪物数据
**优先级**：P0（美术资源实装 - 系统集成）
**描述**：
- 修改 BattleManager.ts，使用 MonsterDataLoader 加载怪物数据
- 在战斗界面显示怪物属性（HP、攻击、防御、速度）
- 实现怪物选择和切换功能
- 测试：能够从 411 个怪物中选择并显示属性
**验收标准**：
- BattleManager 可以调用 `monsterDataLoader.getMonster('aardart')`
- 战斗系统中显示真实怪物数据（从 JSON 加载）
- 怪物属性正确显示（HP、攻击等）
**预计时间**：30-40 分钟

## 任务 2：在战斗系统中集成技能数据
**优先级**：P0（美术资源实装 - 系统集成）
**描述**：
- 修改 BattleManager.ts，使用 TechniqueDataLoader 加载技能数据
- 在战斗菜单中显示技能列表（名称、威力、命中率、PP）
- 实现技能选择功能
- 测试：能够从 274 个技能中选择并显示详情
**验收标准**：
- BattleManager 可以调用 `techniqueDataLoader.getTechnique('fire_ball')`
- 战斗菜单显示真实技能数据（从 JSON 加载）
- 技能属性正确显示（power、accuracy、pp）
**预计时间**：30-40 分钟

## 任务 3：复制道具资源（221个 JSON）
**优先级**：P0（美术资源实装）
**描述**：
- 从 tuxemon-temp 仓库复制道具资源
- 源路径：`tuxemon-temp\mods\tuxemon\db\item\`
- 目标路径：`web-game\assets\tuxemon\items\`
- 复制所有 221 个道具 JSON 文件
**验收标准**：
- assets/tuxemon/items/ 包含 221+ 个 JSON 文件
- 文件内容完整（包含图标、描述、效果等字段）
**预计时间**：5-10 分钟

---

**执行顺序**：任务 1 → 任务 2 → 任务 3
**总预计时间**：65-90 分钟

**重要提醒**：
- ✅ 必须使用 Tuxemon 原版资源
- ❌ 禁止使用占位符
- ❌ 禁止自制素材
- ✅ 必须验证文件真实存在
- ✅ 使用 sessions_spawn 调用 claude-code
