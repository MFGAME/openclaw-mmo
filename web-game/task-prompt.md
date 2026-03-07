# 开发任务 - 2026-03-08 01:56

## 📋 任务列表

### 任务 1：在战斗系统中集成怪物数据

**目标**：修改 BattleManager.ts，使用 MonsterDataLoader 加载怪物数据

**具体步骤**：
1. 找到 BattleManager.ts 文件
2. 导入 MonsterDataLoader
3. 在战斗初始化时加载怪物数据
4. 在战斗界面显示怪物属性：
   - HP（生命值）
   - 攻击（melee）
   - 防御（armour）
   - 速度（speed）
5. 测试：能够从 411 个怪物中选择并显示属性

**验收标准**：
- BattleManager 可以调用 `monsterDataLoader.getMonster('aardart')`
- 战斗系统中显示真实怪物数据（从 JSON 加载）

---

### 任务 2：在战斗系统中集成技能数据

**目标**：修改 BattleManager.ts，使用 TechniqueDataLoader 加载技能数据

**具体步骤**：
1. 找到 BattleManager.ts 文件
2. 导入 TechniqueDataLoader
3. 在战斗菜单中加载技能数据
4. 在战斗菜单中显示技能列表：
   - 名称（name）
   - 威力（power）
   - 命中率（accuracy）
   - PP（pp）
5. 测试：能够从 274 个技能中选择并显示详情

**验收标准**：
- BattleManager 可以调用 `techniqueDataLoader.getTechnique('fire_ball')`
- 战斗菜单显示真实技能数据（从 JSON 加载）

---

### 任务 3：创建 ItemDataLoader 加载器

**目标**：创建 ItemDataLoader.ts，用于加载道具数据

**具体步骤**：
1. 在 src/data/ 目录下创建 ItemDataLoader.ts
2. 实现 ItemDataLoader 类：
   - `loadItems()`：加载所有道具数据
   - `getItem(id: string)`：获取指定道具
   - `getItemsByType(type: string)`：按类型获取道具
3. 定义 ItemData 接口
4. 从 assets/tuxemon/items/ 加载 JSON 文件
5. 测试：能够成功加载 221 个道具

**验收标准**：
- ItemDataLoader.ts 文件存在
- 可以调用 `itemDataLoader.getItem('potion')`
- 返回正确的道具数据

---

## ⚠️ 重要要求

### 资源使用规范
- ✅ **执行任务前必须阅读 TUXEMON_RESOURCES.md**
- ✅ **所有资源必须使用 Tuxemon 原版资源**
- ❌ **禁止使用占位符、禁止自制素材**

### 代码规范
- ✅ 使用 TypeScript
- ✅ 添加详细的中文注释
- ✅ 遵循现有代码风格
- ✅ 确保 npm run build 编译通过

### 文件路径
- 怪物数据：`assets/tuxemon/monsters/*.json`（411个）
- 技能数据：`assets/tuxemon/techniques/*.json`（274个）
- 道具数据：`assets/tuxemon/items/*.json`（221个）
- 数据加载器：`src/data/*DataLoader.ts`
- 战斗管理器：`src/game/BattleManager.ts`

---

## ✅ 完成通知

**完成后运行此命令通知我（使用完整路径）**：

```bash
C:\Users\Administrator\AppData\Roaming\npm\openclaw.cmd system event --text "Done: 完成战斗系统集成和 ItemDataLoader 创建" --mode now
```

---

**创建时间**：2026-03-08 01:56
**预计时间**：90-120 分钟
