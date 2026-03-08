# 开发任务 - OpenClaw MMO 资源集成

## 项目路径
C:\Users\Administrator\.openclaw\agents\youxiangfa\workspace\openclaw-mmo-server\web-game

## Tuxemon 源路径
C:\Users\Administrator\.openclaw\agents\youxiangfa\workspace\tuxemon-temp\tuxemon\resources

## 任务列表

### 任务 1: NPC 精灵图资源集成
**目标**: 从 Tuxemon 复制 NPC 精灵图资源到项目中

**步骤**:
1. 检查 Tuxemon 源路径中的 NPC 精灵图目录结构
2. 创建目标目录 `assets/tuxemon/gfx/sprites/npc/`
3. 复制所有 NPC 精灵图 PNG 文件
4. 验证文件数量（预期 123+ 个 NPC）

**源路径**: `tuxemon/resources/gfx/sprites/npc/`
**目标路径**: `assets/tuxemon/gfx/sprites/npc/`

### 任务 2: 音乐资源集成
**目标**: 从 Tuxemon 复制 BGM 音乐文件

**步骤**:
1. 检查 Tuxemon 源路径中的音乐目录
2. 创建目标目录 `assets/tuxemon/music/`
3. 复制所有音乐文件 (OGG/MP3)
4. 验证文件数量（预期 20+ 首）

**源路径**: `tuxemon/resources/music/`
**目标路径**: `assets/tuxemon/music/`

### 任务 3: 音效资源集成
**目标**: 从 Tuxemon 复制音效文件

**步骤**:
1. 检查 Tuxemon 源路径中的音效目录
2. 创建目标目录 `assets/tuxemon/sounds/`
3. 复制所有音效文件 (OGG/WAV)
4. 验证文件数量（预期 100+ 个）

**源路径**: `tuxemon/resources/sounds/`
**目标路径**: `assets/tuxemon/sounds/`

## 重要规则

- **所有资源必须来自 Tuxemon 原版项目**
- **保持原有文件名和目录结构**
- **禁止使用占位符素材**
- **禁止自制美术资源**
- 资源许可证: GPL-3.0

## 完成通知

完成所有任务后，运行以下命令通知系统：
```
C:\Users\Administrator\AppData\Roaming\npm\openclaw.cmd system event --text "Done: NPC精灵图/音乐/音效资源集成完成" --mode now
```
