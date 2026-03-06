# OpenClaw MMO - 项目地址汇总

> 📍 所有相关项目和资源地址

---

## 🎮 游戏地址

### 本地地址（开发环境）

| 名称 | 地址 | 说明 |
|------|------|------|
| **完整版游戏** | http://localhost:8000/tuxemon/index_complete.html | 推荐：完整功能 |
| **GBA版游戏** | http://localhost:8000/tuxemon/gba.html | GBA外壳版本 |
| **API文档** | http://localhost:8000/docs | Swagger UI |
| **API首页** | http://localhost:8000/ | API信息 |

### 在线地址（如果有）

暂无在线部署，需要自行部署服务器。

---

## 📁 本地项目路径

### Windows路径

```
主项目：
C:\Users\Administrator\.openclaw\agents\youxiangfa\workspace\openclaw-mmo-server\

Tuxemon依赖：
C:\Users\Administrator\.openclaw\agents\youxiangfa\workspace\Tuxemon\

OpenClaw配置：
C:\Users\Administrator\.openclaw\agents\youxiangfa\
```

### 重要文件路径

| 文件 | 路径 |
|------|------|
| **API服务器** | `openclaw-mmo-server\game_api_simple_gba.py` |
| **游戏主页** | `openclaw-mmo-server\web-tuxemon\index_complete.html` |
| **游戏引擎** | `openclaw-mmo-server\web-tuxemon\tuxemon_complete.js` |
| **资源加载器** | `openclaw-mmo-server\tuxemon_loader.py` |
| **项目文档** | `openclaw-mmo-server\docs\PROJECT_DOCUMENTATION.md` |

---

## 🌐 在线资源

### Tuxemon开源项目

| 名称 | 地址 |
|------|------|
| **官网** | https://www.tuxemon.org |
| **GitHub** | https://github.com/Tuxemon/Tuxemon |
| **文档** | https://wiki.tuxemon.org |
| **Discord** | https://discord.gg/4TXh9Nh |

### OpenClaw相关

| 名称 | 地址 |
|------|------|
| **官网** | https://openclaw.ai |
| **文档** | https://docs.openclaw.ai |
| **GitHub** | https://github.com/openclaw/openclaw |
| **社区** | https://discord.com/invite/clawd |
| **技能市场** | https://clawhub.com |

---

## 📊 资源路径映射

### Tuxemon资源 → Web项目

| Tuxemon路径 | Web路径 | 说明 |
|------------|---------|------|
| `Tuxemon/mods/tuxemon/gfx/sprites/player/` | `web-tuxemon/assets/sprites/player/` | 玩家精灵 |
| `Tuxemon/mods/tuxemon/gfx/sprites/battle/` | `web-tuxemon/assets/sprites/battle/` | 怪物精灵（412个） |
| `Tuxemon/mods/tuxemon/gfx/tilesets/` | `web-tuxemon/assets/tilesets/` | 瓦片地图 |
| `Tuxemon/mods/tuxemon/db/monster/` | API加载 | 怪物数据（JSON） |
| `Tuxemon/mods/tuxemon/db/technique/` | API加载 | 技能数据（JSON） |
| `Tuxemon/mods/tuxemon/maps/` | 待实现 | 地图文件（TMX） |

---

## 🎨 资源URL格式

### API资源地址

```
怪物精灵：
http://localhost:8000/api/sprite/{monster_slug}/frame/{frame_num}

示例：
http://localhost:8000/api/sprite/flambear/frame/1
```

### 静态资源地址

```
玩家精灵：
http://localhost:8000/tuxemon/assets/sprites/player/adventurer.png

瓦片地图：
http://localhost:8000/tuxemon/assets/tilesets/core_outdoor.png
```

---

## 🔗 相关链接

### 开发工具

- **Python**: https://www.python.org
- **FastAPI**: https://fastapi.tiangolo.com
- **Phaser 3** (未使用): https://phaser.io
- **Canvas API**: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API

### 美术资源

- **Tuxemon怪物图鉴**: https://wiki.tuxemon.org/Category:Monster
- **Tuxemon地图**: https://wiki.tuxemon.org/Category:Map
- **Tuxemon音乐**: https://wiki.tuxemon.org/Music

---

## 📝 版本控制

### Git仓库（如果有）

```bash
# 克隆OpenClaw MMO
git clone https://github.com/yourusername/openclaw-mmo-server.git

# 克隆Tuxemon
git clone https://github.com/Tuxemon/Tuxemon.git
```

### 版本信息

| 项目 | 版本 | 日期 |
|------|------|------|
| OpenClaw MMO | v1.0.0 | 2026-03-06 |
| Tuxemon | Latest | 2026-03 |
| FastAPI | 0.104+ | - |

---

## 🌍 部署地址（示例）

### 本地开发

```
服务器：localhost:8000
游戏：http://localhost:8000/tuxemon/index_complete.html
```

### 生产环境（建议）

```
服务器：your-domain.com
API：https://api.your-domain.com
游戏：https://game.your-domain.com
CDN：https://cdn.your-domain.com
```

---

## 📞 联系方式

### 技术支持

- **GitHub Issues**: https://github.com/yourusername/openclaw-mmo-server/issues
- **Discord**: https://discord.com/invite/clawd
- **Email**: support@your-domain.com

### 社区

- **Discord社区**: https://discord.com/invite/clawd
- **论坛**: https://community.openclaw.ai

---

## 🎯 快速访问

### 一键启动脚本

```bash
# Windows
start_game.bat

# Linux/Mac
./start_game.sh
```

### 快速链接

```
游戏：http://localhost:8000/tuxemon/index_complete.html
API：http://localhost:8000/docs
文档：PROJECT_DOCUMENTATION.md
```

---

**最后更新**: 2026-03-06  
**维护者**: OpenClaw MMO Team
