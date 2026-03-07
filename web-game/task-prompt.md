# 开发任务 - Week 3-4 核心功能补充

## 📋 任务列表

### 任务 1: 动态碰撞管理（CollisionManager 增强）

**目标**: 实现动态添加/移除碰撞区域

**具体步骤**:
1. 在 `CollisionManager.ts` 中添加以下方法：
   - `addCollision(x: number, y: number, temporary?: boolean, duration?: number): void`
   - `removeCollision(x: number, y: number): void`
   - `addCollisionArea(area: CollisionArea): void`
   - `removeCollisionArea(id: string): void`

2. 支持临时碰撞：
   - 带过期时间的碰撞（如技能效果区域）
   - 使用 `setTimeout` 或游戏循环检查

3. 支持碰撞区域：
   - 矩形区域（RectCollisionArea）
   - 圆形区域（CircleCollisionArea）

4. 更新碰撞检测逻辑：
   - `isCollision(x, y)` 需要检查动态碰撞
   - NPC 和玩家移动时需要考虑动态碰撞

**验收标准**:
- 可以动态添加/移除碰撞
- 临时碰撞能自动过期
- 不影响现有碰撞系统

---

### 任务 2: 事件系统（EventManager）

**目标**: 实现地图事件触发器和条件判断

**具体步骤**:
1. 创建 `src/engine/EventManager.ts`

2. 定义接口：
```typescript
interface GameEvent {
  id: string;
  type: 'step_on' | 'interact' | 'auto';
  trigger: { x: number; y: number; width?: number; height?: number };
  conditions: EventCondition[];
  actions: EventAction[];
  once?: boolean;
  triggered?: boolean;
}

interface EventCondition {
  type: 'has_item' | 'flag_set' | 'npc_defeated' | 'level_above';
  params: Record<string, any>;
}

interface EventAction {
  type: 'teleport' | 'dialogue' | 'give_item' | 'set_flag' | 'start_battle';
  params: Record<string, any>;
}
```

3. 实现核心方法：
   - `checkEvents(x, y, type)` - 检查事件触发
   - `evaluateConditions(conditions)` - 评估条件
   - `executeActions(actions)` - 执行动作
   - `triggerEvent(eventId)` - 触发特定事件

4. 集成到 Game.ts：
   - 在游戏循环中检查 `step_on` 事件
   - 在交互时检查 `interact` 事件
   - 场景加载时检查 `auto` 事件

**验收标准**:
- 踩踏触发器能正常工作
- 条件判断能正确执行
- 动作能正确触发（传送、对话等）

---

### 任务 3: 场景切换系统（SceneManager）

**目标**: 实现传送门和进出建筑

**具体步骤**:
1. 创建 `src/engine/SceneManager.ts`

2. 定义场景数据结构：
```typescript
interface SceneData {
  id: string;
  name: string;
  mapPath: string;
  npcs: NPC[];
  events: GameEvent[];
  spawnPoints: Record<string, { x: number; y: number }>;
  isIndoor?: boolean;
}
```

3. 实现核心方法：
   - `loadScene(sceneId: string, spawnPoint?: string)` - 加载场景
   - `changeScene(sceneId: string, spawnPoint?: string)` - 切换场景
   - `getCurrentScene()` - 获取当前场景
   - `saveSceneState()` - 保存场景状态
   - `restoreSceneState(sceneId)` - 恢复场景状态

4. 实现传送门：
   - 在 TMX 地图中定义传送门对象
   - 解析传送门属性（目标场景、出生点）
   - 玩家踩踏时触发场景切换

5. 实现场景切换动画：
   - 淡出当前场景
   - 加载新场景
   - 淡入新场景
   - 播放音效（可选）

**验收标准**:
- 传送门能正常工作
- 进出建筑能正常切换
- 场景切换有动画过渡
- NPC 和事件状态正确保持

---

## 🎯 完成后预期

- Week 3-4 进度: 85% → **95%**
- 总体进度: ~25% → **~30%**
- 核心功能基本完成

---

## ⚠️ 重要要求

1. **阅读 TUXEMON_RESOURCES.md** - 了解资源使用规范
2. **使用 Tuxemon 原版资源** - 禁止占位符
3. **详细中文注释** - 代码可读性
4. **完整功能实现** - 不偷工减料
5. **遇到编译错误必须修复** - 不能停止
6. **必须确保 npm run build 编译通过** - 验收标准
7. **测试验收** - 确保功能正常

---

## 📝 完成通知

完成后运行：
```bash
C:\Users\Administrator\AppData\Roaming\npm\openclaw.cmd system event --text "Done: [任务摘要]" --mode now
```

替换 `[任务摘要]` 为实际完成的任务描述。
