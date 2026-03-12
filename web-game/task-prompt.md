# 开发任务

**项目路径**: C:\Users\Administrator\.openclaw\agents\youxiangfa\workspace\openclaw-mmo-server\web-game

---

## 任务列表

### 任务 1: 完善机器人系统（P0）

**目标**: 让机器人完全自主行动

**具体步骤**:
1. 检查 `src/engine/BotAI.ts` 是否存在，验证功能完整性
2. 完善 AI 性格逻辑：
   - 激进型：优先攻击，使用高伤害技能
   - 辅助型：优先治疗，使用状态技能
   - 收集型：优先采集，避免战斗
   - 平衡型：根据情况选择行动
3. 实现机器人背包管理：
   - 自动使用恢复道具
   - 自动使用进化石
4. 添加机器人升级和进化系统
5. 测试机器人跟随和自主行为

**验证标准**:
- 机器人可以自主移动
- 机器人遇到敌人会战斗
- 机器人 HP 低时会使用道具
- 机器人可以升级和进化

---

### 任务 2: 实现 NPC 商店系统（P1）

**目标**: 玩家可以与 NPC 商店交易

**具体步骤**:
1. 检查 `src/engine/ShopManager.ts` 和 `src/components/ShopUI.ts` 是否存在
2. 如果不存在，创建以下文件：
   - `src/engine/ShopManager.ts`（商店逻辑）
   - `src/components/ShopUI.ts`（商店界面）
3. 实现商店数据结构：
   ```typescript
   interface Shop {
     id: string;
     name: string;
     items: ShopItem[];
     buyMultiplier: number; // 购买价格倍率
     sellMultiplier: number; // 出售价格倍率
   }
   ```
4. 实现购买逻辑：
   - 检查玩家金币是否足够
   - 扣除金币，添加道具到背包
5. 实现出售逻辑：
   - 玩家选择道具
   - 扣除道具，添加金币
6. 创建商店 UI：
   - 显示商品列表
   - 显示价格
   - 购买/出售按钮
7. 在 NPC 配置中添加商店触发器

**验证标准**:
- 玩家可以打开商店界面
- 可以购买道具（金币减少，道具增加）
- 可以出售道具（道具减少，金币增加）
- UI 显示正确

---

### 任务 3: 优化游戏性能（P2）

**目标**: 游戏稳定运行在 60 FPS

**具体步骤**:
1. 添加 FPS 计数器：
   - 在游戏右上角显示当前 FPS
   - 使用 `requestAnimationFrame` 计算帧率
2. 分析性能瓶颈：
   - 检查渲染循环
   - 检查碰撞检测
   - 检查事件处理
3. 实现精灵图预加载：
   - 启动时预加载所有精灵图
   - 使用缓存避免重复加载
4. 优化渲染：
   - 实现脏矩形检测（只重绘变化区域）
   - 减少不必要的 `clearRect` 调用
5. 优化碰撞检测：
   - 使用空间分区（四叉树）
   - 减少碰撞检测次数

**验证标准**:
- 游戏稳定运行在 60 FPS
- FPS 显示在右上角
- 没有明显卡顿

---

## 要求

1. **必须阅读 TUXEMON_RESOURCES.md**，确保使用 Tuxemon 原版资源
2. **禁止使用占位符素材**
3. **禁止自制素材**
4. **代码必须有详细中文注释**
5. **每完成一个任务，更新 todolist.md**

---

## 完成通知

完成后运行：
```bash
C:\Users\Administrator\AppData\Roaming\npm\openclaw.cmd system event --text "Done: 机器人 + 商店 + 性能优化完成" --mode now
```
