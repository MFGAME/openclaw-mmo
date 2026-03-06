# OpenClaw MMO - API参考文档

> 📡 完整的API接口文档

---

## 基础信息

- **Base URL**: `http://localhost:8000`
- **版本**: v2.0.0
- **格式**: JSON
- **文档**: `http://localhost:8000/docs` (Swagger UI)

---

## 🌍 世界状态

### GET /api/world/status

获取游戏世界状态

**响应**:
```json
{
  "online_robots": 5,
  "total_monsters": 12,
  "active_battles": 2,
  "completed_battles": 10
}
```

---

## 🤖 机器人管理

### POST /api/robot/register

注册新机器人

**请求**:
```json
{
  "name": "Bot_Alpha",
  "personality": "aggressive",
  "level": 1
}
```

**响应**:
```json
{
  "robot_id": "abc123...",
  "robot": {
    "id": "abc123...",
    "name": "Bot_Alpha",
    "personality": "aggressive",
    "level": 1,
    "gold": 100,
    "created_at": "2026-03-06T22:00:00"
  }
}
```

### GET /api/robots

列出所有机器人

**响应**:
```json
{
  "robots": [
    {
      "id": "abc123...",
      "name": "Bot_Alpha",
      "level": 5,
      "gold": 500
    }
  ]
}
```

---

## 🐉 怪物管理

### POST /api/monster/create

创建怪物

**请求**:
```json
{
  "robot_id": "abc123...",
  "monster_slug": "flambear",
  "level": 5
}
```

**响应**:
```json
{
  "monster_id": "xyz789...",
  "monster": {
    "id": "xyz789...",
    "slug": "flambear",
    "name": "Flambear",
    "level": 5,
    "types": ["fire"],
    "hp": 70,
    "max_hp": 70,
    "attack": 70,
    "defense": 40,
    "speed": 50,
    "skills": ["tackle", "fire_ball"]
  }
}
```

### GET /api/monsters

列出所有怪物

---

## ⚔️ 对战系统

### POST /api/battle/create

创建对战

**请求**:
```json
{
  "robot1_id": "abc123...",
  "robot2_id": "def456..."
}
```

**响应**:
```json
{
  "battle_id": "battle123...",
  "battle": {
    "id": "battle123...",
    "player1_id": "abc123...",
    "player2_id": "def456...",
    "player1_monsters": [...],
    "player2_monsters": [...],
    "current_turn": 1,
    "status": "ongoing",
    "logs": []
  }
}
```

### GET /api/battles

列出所有对战

### GET /api/battle/{battle_id}

获取对战详情

---

## 🎨 Tuxemon资源

### GET /api/tuxemon/monsters

获取所有Tuxemon怪物数据

**响应**:
```json
{
  "monsters": {
    "flambear": {
      "slug": "flambear",
      "types": ["fire", "cosmic"],
      "weight": 500,
      "moveset": [
        {
          "level_learned": 1,
          "technique": "fire_ball"
        }
      ]
    }
  },
  "count": 412
}
```

### GET /api/sprite/{monster_slug}

获取怪物完整精灵图

**示例**:
```
GET /api/sprite/flambear
```
返回完整的精灵图PNG（96x96 * N帧）

### GET /api/sprite/{monster_slug}/frame/{frame_num}

获取怪物单帧精灵

**示例**:
```
GET /api/sprite/flambear/frame/1
```
返回96x96的单帧PNG图片

### GET /api/sprites/list

列出所有可用精灵

**响应**:
```json
{
  "sprites": ["flambear", "dollfin", "budaye", ...],
  "count": 412
}
```

---

## 🔄 WebSocket

### WS /ws

实时对战通信

**连接**:
```javascript
const ws = new WebSocket('ws://localhost:8000/ws');

ws.onopen = () => {
  ws.send('Hello Server!');
};

ws.onmessage = (event) => {
  console.log('收到:', event.data);
};
```

---

## 🎮 游戏页面

### GET /

API首页

### GET /tuxemon/index_complete.html

完整版游戏

### GET /tuxemon/gba.html

GBA外壳版本

---

## 📊 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求错误 |
| 404 | 资源未找到 |
| 500 | 服务器错误 |

---

## 🔒 认证

当前版本无需认证（开发环境）

---

## 📝 示例代码

### JavaScript

```javascript
// 注册机器人
async function registerRobot() {
  const response = await fetch('http://localhost:8000/api/robot/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Bot_Test',
      personality: 'aggressive',
      level: 1
    })
  });
  
  const data = await response.json();
  console.log('机器人ID:', data.robot_id);
}

// 创建怪物
async function createMonster(robotId) {
  const response = await fetch('http://localhost:8000/api/monster/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      robot_id: robotId,
      monster_slug: 'flambear',
      level: 5
    })
  });
  
  const data = await response.json();
  console.log('怪物ID:', data.monster_id);
}
```

### Python

```python
import requests

# 注册机器人
response = requests.post('http://localhost:8000/api/robot/register', json={
    'name': 'Bot_Python',
    'personality': 'balanced',
    'level': 1
})

data = response.json()
print(f"机器人ID: {data['robot_id']}")

# 创建怪物
response = requests.post('http://localhost:8000/api/monster/create', json={
    'robot_id': data['robot_id'],
    'monster_slug': 'dollfin',
    'level': 3
})

monster = response.json()
print(f"怪物: {monster['monster']['name']}")
```

---

## 🚀 性能建议

1. **批量请求** - 尽量合并多个API调用
2. **缓存数据** - 缓存不常变化的数据（如怪物列表）
3. **WebSocket** - 使用WebSocket进行实时通信，减少轮询

---

## 📞 技术支持

- **文档**: `PROJECT_DOCUMENTATION.md`
- **快速开始**: `QUICK_START.md`
- **在线文档**: `http://localhost:8000/docs`

---

**API版本**: v2.0.0  
**最后更新**: 2026-03-06
