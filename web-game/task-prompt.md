# 开发任务 - 多人联机 + 战斗系统

## 任务列表

### 任务 1: 验证多人联机功能（P0）
**目标**: 确认 Socket.IO 多人联机功能可用

**具体步骤**:
1. 检查 Socket.IO 服务器是否运行（http://localhost:3000）
2. 打开第一个浏览器标签，访问 http://localhost:8080
3. 打开第二个浏览器标签，访问 http://localhost:8080
4. 在第一个标签中移动角色，观察第二个标签
5. 检查浏览器控制台的 Socket.IO 日志
6. 验证是否能看到其他玩家的移动

**预期结果**: 可以看到其他玩家在地图上移动

**如果失败**:
- 检查 Socket.IO 服务器是否启动
- 检查 main.ts 中的 Socket.IO 客户端代码
- 检查浏览器控制台的错误信息

---

### 任务 2: 实现怪物遭遇系统（P1）
**目标**: 在地图上触发怪物遭遇和战斗

**具体步骤**:
1. 创建 `src/encounter/EncounterManager.ts`
2. 实现遭遇检测逻辑：
   - 检测玩家是否在"遭遇区域"（草丛等）
   - 随机触发战斗（概率 10-20%）
   - 随机选择怪物（基于地图配置）
3. 实现场景切换：
   - 保存当前地图状态
   - 切换到战斗场景
   - 战斗结束后恢复地图状态
4. 在 main.ts 中集成 EncounterManager

**代码示例**:
```typescript
// src/encounter/EncounterManager.ts
export class EncounterManager {
    private encounterChance = 0.15; // 15% 遭遇概率
    
    checkEncounter(tileX: number, tileY: number): boolean {
        // 检查是否在遭遇区域
        // 随机决定是否遭遇
        // 返回 true 表示遭遇怪物
    }
    
    getRandomMonster(): MonsterData {
        // 随机选择一个怪物
    }
}
```

**预期结果**: 走在草丛中会遭遇怪物，进入战斗

---

### 任务 3: 完善战斗系统前端（P2）
**目标**: 实现完整的战斗 UI 和流程

**具体步骤**:
1. 检查 `src/battle/BattleUI.ts` 是否存在
2. 实现战斗菜单：
   - 攻击（基础攻击）
   - 技能（选择技能列表）
   - 道具（使用道具）
   - 逃跑（结束战斗）
3. 显示战斗信息：
   - 玩家怪物（背面精灵图）
   - 敌方怪物（正面精灵图）
   - HP/PP 条
   - 战斗日志
4. 实现战斗动画：
   - 攻击动画
   - 受伤动画
   - 技能特效
5. 实现战斗流程：
   - 回合制（玩家 → 敌人 → 玩家）
   - 伤害计算
   - 状态效果

**预期结果**: 战斗界面完整，可以进行回合制战斗

---

## 完成标准

- ✅ 多人联机：可以看到其他玩家移动
- ✅ 怪物遭遇：走在草丛中会触发战斗
- ✅ 战斗系统：完整的回合制战斗流程
- ✅ UI 完整：战斗菜单、HP 条、动画效果
- ✅ 编译通过：npm run build 无错误

---

## 完成通知

完成后运行：
```
cmd.exe /c "C:\Users\Administrator\AppData\Roaming\npm\openclaw.cmd system event --text \"Done: 多人联机 + 战斗系统完成\" --mode now"
```

---

## 重要提醒

**必须验证功能真的能用！**
- 不只是代码文件存在
- 必须在浏览器中测试
- 必须确认多人联机可用
- 必须确认战斗系统可用
- 必须截图或录屏证明
