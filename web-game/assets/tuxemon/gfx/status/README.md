# Tuxemon 状态效果图标资源

本目录用于存放 Tuxemon 原版状态效果图标资源。

## 资源来源

- **GitHub 仓库**: https://github.com/Tuxemon/Tuxemon
- **原版路径**: `tuxemon/resources/gfx/status/`
- **许可证**: GPL-3.0

## 状态图标列表（35种）

| 状态ID | 中文名称 | 英文名称 | 文件名 |
|--------|----------|----------|--------|
| poison | 中毒 | Poison | poison.png |
| bad_poison | 剧毒 | Badly Poisoned | bad_poison.png |
| burn | 灼烧 | Burned | burn.png |
| paralysis | 麻痹 | Paralyzed | paralysis.png |
| freeze | 冰冻 | Frozen | freeze.png |
| sleep | 睡眠 | Asleep | sleep.png |
| confuse | 混乱 | Confused | confuse.png |
| flinch | 畏缩 | Flinch | flinch.png |
| bound | 束缚 | Bound | bound.png |
| taunt | 挑衅 | Taunted | taunt.png |
| fear | 恐惧 | Fear | fear.png |
| faint | 气绝 | Fainted | faint.png |
| weaken | 虚弱 | Weakened | weaken.png |
| vulnerable | 破防 | Vulnerable | vulnerable.png |
| curse | 诅咒 | Cursed | curse.png |
| doom | 厄运 | Doom | doom.png |
| revive | 复活 | Revive | revive.png |
| shield | 护盾 | Shielded | shield.png |
| reflect | 反射 | Reflect | reflect.png |
| light_screen | 光墙 | Light Screen | light_screen.png |
| substitute | 替身 | Substitute | substitute.png |
| amnesia | 健忘 | Amnesia | amnesia.png |
| slow | 缓慢 | Slowed | slow.png |
| silence | 沉默 | Silenced | silence.png |
| blind | 失明 | Blinded | blind.png |
| hypnosis | 沉睡 | Hypnosis | hypnosis.png |
| drunk | 醉酒 | Drunk | drunk.png |
| rage | 狂暴 | Enraged | rage.png |
| mock | 嘲讽 | Mocked | mock.png |
| seal | 封印 | Sealed | seal.png |
| drain | 吸收 | Drain | drain.png |
| regenerate | 再生 | Regenerating | regenerate.png |
| poison_sting | 毒针 | Poison Sting | poison_sting.png |

## 资源获取方式

1. 克隆 Tuxemon 仓库：
   ```bash
   git clone https://github.com/Tuxemon/Tuxemon.git
   ```

2. 复制状态图标：
   ```bash
   cp -r Tuxemon/tuxemon/resources/gfx/status/* ./web-game/assets/tuxemon/gfx/status/
   ```

## 使用方式

```typescript
import { StatusEffectManager } from './StatusEffectManager';

const statusManager = StatusEffectManager.getInstance();
const poisonData = statusManager.getStatusData('poison');
console.log(poisonData.icon); // /assets/tuxemon/gfx/status/poison.png
```

## 注意事项

- 所有图标必须使用 Tuxemon 原版资源
- 禁止使用自制或占位符素材
- 保持原版文件名和格式
- 推荐尺寸: 32x32 或 64x64 像素
- 支持格式: PNG (透明背景)

---
创建日期: 2026-03-08
