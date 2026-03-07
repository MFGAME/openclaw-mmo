# OpenClaw MMO - 部署文档

本文档提供 OpenClaw MMO 项目的部署指南，包括 Docker 容器化部署、云服务器配置等。

---

## 目录

- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [Docker 部署](#docker-部署)
- [云服务器部署](#云服务器部署)
- [PM2 进程管理](#pm2-进程管理)
- [Nginx 配置](#nginx-配置)
- [监控与日志](#监控与日志)
- [故障排查](#故障排查)

---

## 环境要求

### 本地开发

- Node.js >= 20.x
- npm >= 9.x
- TypeScript >= 5.x

### 生产服务器

- Docker >= 24.x
- Docker Compose >= 2.x
- Node.js >= 20.x（非 Docker 部署）
- PM2 >= 5.x（非 Docker 部署）
- Nginx >= 1.24.x

### 可选组件

- Redis >= 7.x（缓存）
- PostgreSQL >= 15.x（数据库）
- Prometheus + Grafana（监控）

---

## 快速开始

### 1. 克隆代码库

```bash
git clone https://github.com/your-org/openclaw-mmo.git
cd openclaw-mmo/web-game
```

### 2. 安装依赖

```bash
npm install
```

### 3. 构建项目

```bash
npm run build
```

### 4. 本地运行

```bash
npm run serve
```

访问 `http://localhost:8080`

---

## Docker 部署

### 使用 Docker Compose（推荐）

#### 1. 创建环境变量文件

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# Web 服务器
WEB_PORT=80
WEB_SSL_PORT=443

# WebSocket 服务器
WEBSOCKET_PORT=8080

# Redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# PostgreSQL
POSTGRES_PORT=5432
POSTGRES_USER=openclaw
POSTGRES_PASSWORD=your_postgres_password
POSTGRES_DB=openclaw

# 监控
PROMETHEUS_PORT=9090
GRAFANA_PORT=3000
GRAFANA_USER=admin
GRAFANA_PASSWORD=your_grafana_password
```

#### 2. 启动所有服务

```bash
docker-compose up -d
```

#### 3. 查看服务状态

```bash
docker-compose ps
```

#### 4. 查看日志

```bash
# 查看所有日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f web
docker-compose logs -f websocket
```

#### 5. 停止服务

```bash
docker-compose down
```

### 单独使用 Docker

#### 1. 构建镜像

```bash
docker build -t openclaw-web .
```

#### 2. 运行容器

```bash
docker run -d \
  --name openclaw-web \
  -p 80:80 \
  -p 443:443 \
  openclaw-web
```

#### 3. 查看日志

```bash
docker logs -f openclaw-web
```

---

## 云服务器部署

### 阿里云 ECS 部署

#### 1. 购买 ECS 实例

- 实例规格：2核4GB 或更高
- 操作系统：Ubuntu 22.04 LTS
- 网络类型：专有网络（VPC）

#### 2. 连接服务器

```bash
ssh root@your-server-ip
```

#### 3. 安装 Docker

```bash
curl -fsSL https://get.docker.com | bash
systemctl start docker
systemctl enable docker
```

#### 4. 安装 Docker Compose

```bash
curl -fsSL https://github.com/docker/compose/releases/latest/download/docker-compose-Linux-x86_64 \
  -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

#### 5. 部署应用

```bash
# 克隆代码
git clone https://github.com/your-org/openclaw-mmo.git
cd openclaw-mmo/web-game

# 配置环境变量
cp .env.example .env
vim .env

# 启动服务
docker-compose up -d

# 配置防火墙
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp
ufw enable
```

### 腾讯云 CVM 部署

步骤与阿里云 ECS 类似，使用相同的部署命令。

### 使用部署脚本（自动化）

项目提供了 `deploy.sh` 脚本用于自动化部署：

```bash
# 部署到生产环境
./deploy.sh deploy

# 回滚到上一个版本
./deploy.sh rollback

# 健康检查
./deploy.sh health
```

配置脚本变量：

```bash
export GIT_REPO="git@github.com:your-org/openclaw-mmo.git"
export GIT_BRANCH="main"
export NODE_VERSION="20"
export PM2_PROCESS="openclaw-mmo"

# 执行部署
./deploy.sh deploy
```

---

## PM2 进程管理

### 安装 PM2

```bash
npm install -g pm2
```

### 启动应用

```bash
pm2 start ecosystem.config.js
```

### 查看应用状态

```bash
pm2 list
```

### 查看日志

```bash
pm2 logs
pm2 logs web-game
pm2 logs websocket-server
```

### 重启应用

```bash
pm2 restart openclaw-mmo
pm2 reload openclaw-mmo  # 零停机重启
```

### 停止应用

```bash
pm2 stop openclaw-mmo
```

### 删除应用

```bash
pm2 delete openclaw-mmo
```

### 监控应用

```bash
pm2 monit
```

### 保存 PM2 配置

```bash
pm2 save
pm2 startup
```

---

## Nginx 配置

### 基本配置

项目提供了 `nginx.conf` 配置文件，包含：

- 静态资源服务
- WebSocket 代理
- API 代理
- Gzip 压缩
- 缓存策略
- 安全头

### 启用 HTTPS（生产环境）

1. 获取 SSL 证书（使用 Let's Encrypt）：

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

2. 更新 `nginx.conf` 中的 HTTPS 配置：

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    # ... 其他配置
}
```

3. 重启 Nginx：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 配置反向代理

如果使用 PM2 管理 Node.js 应用，配置 Nginx 反向代理：

```nginx
upstream backend {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## 监控与日志

### Prometheus 监控

1. 访问 Prometheus：`http://your-server:9090`

2. 查看监控指标

3. 配置告警规则

### Grafana 可视化

1. 访问 Grafana：`http://your-server:3000`

2. 登录（默认用户名/密码：admin / openclaw123）

3. 导入仪表板

### 日志查看

#### Docker 日志

```bash
docker-compose logs -f
docker-compose logs -f web
docker-compose logs -f websocket
```

#### PM2 日志

```bash
pm2 logs
pm2 logs --lines 100
```

#### Nginx 日志

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## 故障排查

### 应用无法启动

1. 检查端口占用：

```bash
netstat -tlnp | grep :80
```

2. 检查日志：

```bash
docker-compose logs web
pm2 logs
```

3. 检查环境变量：

```bash
docker-compose config
```

### WebSocket 连接失败

1. 检查防火墙规则

2. 检查 Nginx 配置中的 WebSocket 代理

3. 检查 WebSocket 服务器状态

### 性能问题

1. 查看性能监控：

```bash
pm2 monit
```

2. 检查资源使用：

```bash
docker stats
```

3. 查看应用日志：

```bash
pm2 logs --lines 500
```

### 数据库连接失败

1. 检查数据库服务状态：

```bash
docker-compose ps postgres
```

2. 检查连接配置：

```bash
docker-compose exec postgres psql -U openclaw -d openclaw
```

3. 检查网络连接：

```bash
docker network inspect openclaw-network
```

---

## 维护建议

### 定期更新

1. 更新依赖：

```bash
npm update
npm run build
```

2. 更新 Docker 镜像：

```bash
docker-compose pull
docker-compose up -d
```

### 备份

1. 备份数据库：

```bash
docker-compose exec postgres pg_dump -U openclaw openclaw > backup.sql
```

2. 备份 Redis：

```bash
docker-compose exec redis redis-cli --rdb /data/dump.rdb
```

### 清理

1. 清理 Docker 资源：

```bash
docker system prune -a
```

2. 清理日志：

```bash
pm2 flush
docker-compose logs --tail=0
```

---

## 支持

如有问题，请联系：

- 邮箱：support@openclaw.com
- GitHub Issues：https://github.com/your-org/openclaw-mmo/issues

---

**最后更新：2026-03-08**
