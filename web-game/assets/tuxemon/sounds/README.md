# Tuxemon 战斗音效资源

本目录用于存放 Tuxemon 原版战斗音效资源。

## 资源来源

- **GitHub 仓库**: https://github.com/Tuxemon/Tuxemon
- **原版路径**: `tuxemon/resources/sounds/`
- **许可证**: GPL-3.0

## 音效分类

### 战斗基础音效

| 文件名 | 用途 | 说明 |
|--------|------|------|
| attack.ogg | 普通攻击 | 基础物理攻击音效 |
| damage.ogg | 伤害 | 受到伤害时的音效 |
| heal.ogg | 治疗 | 恢复生命值的音效 |
| status.ogg | 状态效果 | 状态效果触发时的音效 |
| level_up.ogg | 升级 | 怪物升级时的音效 |
| victory.ogg | 胜利 | 战斗胜利音乐 |
| defeat.ogg | 失败 | 战斗失败音乐 |
| monster_appear.ogg | 怪物出现 | 怪物进入战斗场的音效 |
| monster_faint.ogg | 怪物倒下 | 怪物被击败的音效 |

### 菜单音效

| 文件名 | 用途 | 说明 |
|--------|------|------|
| menu_select.ogg | 菜单选择 | 在菜单中移动选择 |
| menu_confirm.ogg | 菜单确认 | 确认选择 |
| menu_cancel.ogg | 菜单取消 | 取消或返回 |
| error.ogg | 错误 | 操作错误的音效 |

### 属性音效

| 文件名 | 属性 | 说明 |
|--------|------|------|
| element_fire.ogg | 火 | 火属性技能音效 |
| element_water.ogg | 水 | 水属性技能音效 |
| element_grass.ogg | 草 | 草属性技能音效 |
| element_electric.ogg | 电 | 电属性技能音效 |
| element_ice.ogg | 冰 | 冰属性技能音效 |
| element_flying.ogg | 飞行 | 飞行属性技能音效 |
| element_fighting.ogg | 格斗 | 格斗属性技能音效 |
| element_poison.ogg | 毒 | 毒属性技能音效 |
| element_ground.ogg | 地面 | 地面属性技能音效 |
| element_rock.ogg | 岩石 | 岩石属性技能音效 |
| element_bug.ogg | 虫 | 虫属性技能音效 |
| element_ghost.ogg | 幽灵 | 幽灵属性技能音效 |
| element_steel.ogg | 钢 | 钢属性技能音效 |
| element_dragon.ogg | 龙 | 龙属性技能音效 |
| element_dark.ogg | 恶 | 恶属性技能音效 |
| element_fairy.ogg | 妖精 | 妖精属性技能音效 |
| element_normal.ogg | 一般 | 一般属性技能音效 |

## 资源获取方式

1. 克隆 Tuxemon 仓库：
   ```bash
   git clone https://github.com/Tuxemon/Tuxemon.git
   ```

2. 复制音效文件：
   ```bash
   cp -r Tuxemon/tuxemon/resources/sounds/* ./web-game/assets/tuxemon/sounds/
   ```

## 使用方式

```typescript
import { battleSoundManager, BattleSoundType } from './BattleSoundManager';

// 初始化（必须在用户交互后调用）
await battleSoundManager.initialize();

// 播放音效
await battleSoundManager.playSound(BattleSoundType.ATTACK);
await battleSoundManager.playDamageSound(50, true); // 50点暴击伤害
await battleSoundManager.playHealSound(30);
```

## 音频格式

- **推荐格式**: OGG (Vorbis 编码)
- **备选格式**: WAV, MP3
- **采样率**: 44100 Hz 或 22050 Hz
- **声道**: 单声道或立体声

## 注意事项

- 所有音效必须使用 Tuxemon 原版资源
- 禁止使用自制或占位符音效
- 保持原版文件名和格式
- 控制音效文件大小（建议 < 500KB）

---
创建日期: 2026-03-08
