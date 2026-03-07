# OpenClaw MMO Web Game - Dockerfile
# 多阶段构建配置

# ==================== 阶段 1: 构建阶段 ====================
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装 Python 和 make（某些 npm 包可能需要）
RUN apk add --no-cache python3 make g++

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 构建项目
RUN npm run build

# ==================== 阶段 2: 生产阶段 ====================
FROM nginx:alpine AS production

# 安装必要的工具
RUN apk add --no-cache curl

# 设置 nginx 配置
COPY nginx.conf /etc/nginx/nginx.conf

# 从构建阶段复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制资源文件
COPY --from=builder /app/assets /usr/share/nginx/html/assets

# 创建非 root 用户
RUN addgroup -g 1000 -S nodejs && \
    adduser -S nodejs -u 1000 -G nodejs

# 设置权限
RUN chown -R nodejs:nodejs /usr/share/nginx/html && \
    chown -R nodejs:nodejs /var/cache/nginx && \
    chown -R nodejs:nodejs /var/log/nginx && \
    chown -R nodejs:nodejs /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nodejs:nodejs /var/run/nginx.pid

# 切换到非 root 用户
USER nodejs

# 暴露端口
EXPOSE 80 443

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
