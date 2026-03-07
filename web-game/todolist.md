# OpenClaw MMO - 当前任务清单

**日期：** 2026-03-08 00:14
**阶段：** 美术资源实装（最高优先级）

---

## ⚠️ 真实进度

**总体进度：~20%**
**美术资源：0% 未实装（最高优先级）**

**当前任务：** 从 Tuxemon 项目复制资源到项目

---

## 📋 本轮任务（3个细粒度任务）

### Task 1: 克隆 Tuxemon 仓库
**目标：** 获取 Tuxemon 原版资源

**具体步骤：**
- [ ] 克隆 Tuxemon GitHub 仓库
- [ ] 验证资源目录结构
- [ ] 确认许可证文件存在

**预期文件：**
- `tuxemon-source/` 目录（Tuxemon 仓库）

**参考：**
- GitHub: https://github.com/Tuxemon/Tuxemon
- 资源路径: `tuxemon/resources/`

---

### Task 2: 创建 assets/tuxemon/ 目录结构
**目标：** 准备好资源存放目录

**具体步骤：**
- [ ] 创建 `web-game/assets/tuxemon/` 目录
- [ ] 创建子目录：
  - [ ] `monsters/` - 怪物资源
  - [ ] `techniques/` - 技能资源
  - [ ] `items/` - 道具资源
  - [ ] `npcs/` - NPC 资源
  - [ ] `maps/` - 地图资源
  - [ ] `gfx/tilesets/` - 瓦片资源
  - [ ] `gfx/ui/` - UI 资源
  - [ ] `music/` - 音乐资源
  - [ ] `sounds/` - 音效资源
- [ ] 复制 LICENSE 文件（GPL-3.0）

**预期文件：**
- `web-game/assets/tuxemon/` 目录（完整结构）

---

### Task 3: 复制怪物资源（411个）
**目标：** 实装第一批核心资源

**具体步骤：**
- [ ] 复制怪物精灵图（正面、背面、战斗动画）
- [ ] 复制怪物数据 JSON
- [ ] 验证文件数量（411个怪物）
- [ ] 更新 TUXEMON_RESOURCES.md 标记完成

**预期文件：**
- `web-game/assets/tuxemon/monsters/` 目录（411个怪物）

**验证命令：**
```bash
ls -la web-game/assets/tuxemon/monsters/ | wc -l
# 应该看到 411 个目录
```

---

## ✅ 验收标准

1. **Tuxemon 仓库克隆成功**
2. **assets/tuxemon/ 目录结构完整**
3. **怪物资源文件真实存在（411个）**

---

## 📝 备注

- **所有资源必须使用 Tuxemon 原版资源**
- **禁止使用占位符、禁止自制素材**
- **参考文档：** `TUXEMON_RESOURCES.md`
- **下次心跳优先：** 复制技能资源（274个）

---

创建日期：2026-03-08
最后更新：2026-03-08 00:14（动态生成 - 心跳测试）
