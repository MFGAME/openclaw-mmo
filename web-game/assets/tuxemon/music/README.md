# Tuxemon 战斗背景音乐资源

本目录用于存放 Tuxemon 原版战斗背景音乐。

## 资源来源

- **GitHub 仓库**: https://github.com/Tuxemon/Tuxemon
- **原版路径**: `tuxemon/resources/music/`
- **许可证**: GPL-3.0

## BGM 分类

| 文件名 | 类型 | 用途 | 说明 |
|--------|------|------|------|
| battle_normal.ogg | 普通战斗 | 标准战斗 BGM | 常规野外战斗 |
| battle_boss.ogg | BOSS 战斗 | BOSS 战 BGM | 重要敌人战斗 |
| battle_rare.ogg | 稀有战斗 | 稀有怪物 BGM | 特殊怪物战斗 |
| battle_arena.ogg | 竞技场战斗 | 竞技场 BGM | PvP 或竞技场 |
| battle_final.ogg | 决战 | 最终决战 BGM | 最终关卡/BOSS |

## 资源获取方式

1. 克隆 Tuxemon 仓库：
   ```bash
   git clone https://github.com/Tuxemon/Tuxemon.git
   ```

2. 复制音乐文件：
   ```bash
   cp -r Tuxemon/tuxemon/resources/music/* ./web-game/assets/tuxemon/music/
   ```

## 使用方式

```typescript
import { battleSoundManager, BattleMusicType } from './BattleSoundManager';

// 初始化
await battleSoundManager.initialize();

// 播放背景音乐
await battleSoundManager.playBGM(BattleMusicType.NORMAL);

// 切换 BGM
await battleSoundManager.playBGM(BattleMusicType.BOSS);

// 停止 BGM
battleSoundManager.stopBGM();
```

## 音频格式

- **推荐格式**: OGG (Vorbis 编码)
- **备选格式**: MP3
- **采样率**: 44100 Hz
- **声道**: 立体声
- **比特率**: 128-192 kbps

## 注意事项

- 所有音乐必须使用 Tuxemon 原版资源
- 禁止使用自制或占位符音乐
- 保持原版文件名和格式
- BGM 应循环播放无缝衔接

---
创建日期: 2026-03-08
