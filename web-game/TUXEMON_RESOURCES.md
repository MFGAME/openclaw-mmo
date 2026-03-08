# Tuxemon 资源使用规范

## 📋 资源来源

**GitHub 仓库**: https://github.com/Tuxemon/Tuxemon  
**资源路径**: `tuxemon/resources/`  
**许可证**: GPL-3.0（必须保留原始许可证声明）

---

## 🎨 资源清单（完整）

### 1. 怪物资源 (Monsters)
- **数量**: 411 个怪物
- **路径**: `resources/monsters/`
- **包含内容**:
  - 精灵图（正面、背面、战斗动画）
  - 属性数据（HP、攻击、防御、速度等）
  - 技能列表
  - 进化链
  - 属性（火、水、草、电等）
- **格式**: 
  - 图片: PNG (`.png`)
  - 数据: JSON (`.json`)

### 2. 技能资源 (Techniques)
- **数量**: 274 个技能
- **路径**: `resources/techniques/`
- **包含内容**:
  - 技能效果（伤害、治疗、状态）
  - 技能动画
  - 技能音效
  - 属性（火、水、草、电等）
  - 威力、命中率、PP
- **格式**:
  - 图片: PNG (动画帧)
  - 音效: OGG/WAV
  - 数据: JSON

### 3. 道具资源 (Items)
- **数量**: 221 个道具
- **路径**: `resources/items/`
- **包含内容**:
  - 道具图标
  - 道具描述
  - 道具效果（恢复、捕捉、进化等）
  - 使用动画
- **格式**:
  - 图片: PNG
  - 数据: JSON

### 4. NPC 资源
- **数量**: 123 个 NPC
- **路径**: `resources/npcs/`
- **包含内容**:
  - NPC 精灵图（4 方向行走动画）
  - NPC 对话脚本
  - NPC 行为配置（巡逻、静止、交互等）
  - NPC 数据（名字、职业等）
- **格式**:
  - 图片: PNG (spritesheet)
  - 数据: JSON

### 5. 地图资源 (Maps)
- **数量**: 50+ 张地图
- **路径**: `resources/maps/`
- **包含内容**:
  - TMX 地图文件
  - 碰撞层配置
  - 事件触发器
  - NPC 位置
  - 传送点
  - 遭遇区域
- **格式**: TMX (Tiled Map Editor)

### 6. 瓦片资源 (Tilesets)
- **数量**: 80+ 瓦片集
- **路径**: `resources/gfx/tilesets/`
- **包含内容**:
  - 地形瓦片（草地、水面、墙壁等）
  - 建筑瓦片（房屋、商店等）
  - 装饰瓦片（树木、花草等）
  - 动画瓦片（水流、火焰等）
- **格式**: PNG

### 7. 音乐资源 (Music)
- **数量**: 20+ 首 BGM
- **路径**: `resources/music/`
- **包含内容**:
  - 标题画面音乐
  - 城镇音乐
  - 战斗音乐
  - 道路音乐
  - 特殊场景音乐
- **格式**: OGG/MP3

### 8. 音效资源 (Sound Effects)
- **数量**: 100+ 个音效
- **路径**: `resources/sounds/`
- **包含内容**:
  - 技能音效
  - 环境音效（脚步、水流等）
  - UI 音效（菜单、选择等）
  - 战斗音效（攻击、受伤等）
- **格式**: OGG/WAV

### 9. UI 资源 (User Interface)
- **数量**: 完整 UI 套件
- **路径**: `resources/gfx/ui/`
- **包含内容**:
  - 对话框样式
  - 菜单背景
  - 按钮样式
  - HP/经验条
  - 战斗界面元素
  - 图标集
- **格式**: PNG

### 10. 状态效果 (Status Effects)
- **数量**: 35 种状态
- **路径**: `resources/status/`
- **包含内容**:
  - 状态图标
  - 状态动画
  - 状态数据（持续回合、效果等）
  - 状态音效
- **格式**:
  - 图片: PNG
  - 数据: JSON

---

## 🔄 资源加载流程

### Step 1: 复制资源到项目
```bash
# 从 Tuxemon 项目复制资源
cp -r /path/to/Tuxemon/tuxemon/resources/* ./web-game/assets/tuxemon/
```

### Step 2: 保持目录结构
```
web-game/assets/tuxemon/
├── monsters/          # 怪物资源
├── techniques/        # 技能资源
├── items/            # 道具资源
├── npcs/             # NPC 资源
├── maps/             # 地图资源
├── gfx/
│   ├── tilesets/    # 瓦片资源
│   └── ui/          # UI 资源
├── music/           # 音乐资源
└── sounds/          # 音效资源
```

### Step 3: 使用 ResourceManager 加载
```typescript
// 加载怪物资源
const monster = await resourceManager.loadMonster('aardart');

// 加载技能资源
const technique = await resourceManager.loadTechnique('fire_blast');

// 加载地图资源
const map = await resourceManager.loadMap('start_town');
```

---

## ⚠️ 重要规则

### ✅ 必须遵守：
1. **所有资源必须来自 Tuxemon 项目**
2. **保持原有文件名和目录结构**
3. **保留原始许可证声明（GPL-3.0）**
4. **使用 ResourceManager 统一加载资源**
5. **在代码中通过资源 ID 引用资源**

### ❌ 禁止行为：
1. **禁止使用占位符素材**
2. **禁止自制美术资源**
3. **禁止使用其他项目的资源**
4. **禁止修改原版资源（除非必要优化）**
5. **禁止删除原始许可证文件**

---

## 📊 资源实装进度（重要：实装 ≠ 文件复制）

**⚠️ 实装定义**：
- ✅ **实装 = 资源文件 + 加载系统 + 在游戏中使用**
- ❌ **只是复制文件不算实装**

**完整实装包含**：
1. ✅ 复制资源文件到 assets/tuxemon/
2. ❌ 创建 ResourceManager 加载器
3. ❌ 在游戏系统中使用资源（战斗、渲染、UI等）
4. ❌ 代码真正调用和显示资源

| 类别 | 文件复制 | 加载器 | 系统集成 | 实装状态 |
|------|---------|--------|---------|---------|
| 怪物资源 | ✅ 411个 + 模板 | ✅ MonsterDataLoader | ✅ 游戏初始化 | 🔄 **部分实装** |
| 技能资源 | ✅ 模板 (14个) | ✅ TechniqueDataLoader | ✅ 游戏初始化 | 🔄 **部分实装** |
| 道具资源 | ✅ 113个 | ✅ ItemDataLoader | ⏳ 待集成 | 🔄 **加载器已实现** |
| NPC 资源 | ⏳ 未开始 | ❌ 未实现 | ❌ 未使用 | ⏳ **未实装** |
| 地图资源 | ✅ 已实现 | ✅ MapParser | ✅ TileRenderer | ✅ **已实装** |
| 瓦片资源 | ✅ 已实现 | ✅ MapParser | ✅ TileRenderer | ✅ **已实装** |
| 音乐资源 | ⏳ 待复制 | ✅ MusicLoader | ⏳ 待集成 | 🔄 **加载器已实现** |
| 音效资源 | ⏳ 待复制 | ✅ SoundLoader | ⏳ 待集成 | 🔄 **加载器已实现** |
| UI 资源 | ⏳ 未开始 | ❌ 未实现 | ❌ 未使用 | ⏳ **未实装** |
| 状态效果 | ⏳ 未开始 | ❌ 未实现 | ❌ 未使用 | ⏳ **未实装** |

### 📈 实装进度统计（2026-03-08 更新）
- **美术资源整体进度**: ~50%
  - 已实装: 地图、瓦片 (2/10)
  - 加载器已实现: 怪物、技能、道具、音乐、音效 (5/10)
  - 未开始: NPC、UI、状态效果 (3/10)

---

## 🔧 技术实现

### ResourceManager 接口
```typescript
interface ResourceManager {
  // 加载怪物数据
  loadMonster(id: string): Promise<MonsterData>;
  
  // 加载技能数据
  loadTechnique(id: string): Promise<TechniqueData>;
  
  // 加载道具数据
  loadItem(id: string): Promise<ItemData>;
  
  // 加载 NPC 数据
  loadNPC(id: string): Promise<NPCData>;
  
  // 加载地图数据
  loadMap(id: string): Promise<TMXMapData>;
  
  // 加载音效
  loadSound(id: string): Promise<AudioBuffer>;
  
  // 加载音乐
  loadMusic(id: string): Promise<AudioBuffer>;
  
  // 加载图片
  loadImage(path: string): Promise<HTMLImageElement>;
}
```

### 数据格式示例

#### 怪物数据
```json
{
  "slug": "aardart",
  "name": "Aardart",
  "types": ["normal"],
  "hp": 80,
  "attack": 60,
  "defense": 50,
  "speed": 40,
  "techniques": ["tackle", "scratch"],
  "evolves_to": null
}
```

#### 技能数据
```json
{
  "slug": "fire_blast",
  "name": "Fire Blast",
  "type": "fire",
  "power": 90,
  "accuracy": 85,
  "pp": 5,
  "effects": ["damage", "burn"]
}
```

---

创建日期：2026-03-07
最后更新：2026-03-07 16:30（补充资源使用规范）
