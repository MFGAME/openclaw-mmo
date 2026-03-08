#!/bin/bash

# OpenClaw MMO - 部署脚本
# 用于一键部署应用到云服务器

set -e  # 遇到错误立即退出

# ============================================
# 配置变量
# ============================================

# Git 仓库地址
GIT_REPO="${GIT_REPO:-https://github.com/your-org/openclaw-mmo.git}"

# Git 分支
GIT_BRANCH="${GIT_BRANCH:-main}"

# 部署目录
DEPLOY_DIR="${DEPLOY_DIR:-/opt/openclaw}"

# 项目名称
PROJECT_NAME="openclaw-mmo"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================
# 工具函数
# ============================================

# 打印信息
info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# 打印成功信息
success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# 打印警告信息
warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# 打印错误信息
error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 检查是否为 root 用户
check_root() {
    if [ "$EUID" -ne 0 ]; then
        error "请使用 root 用户运行此脚本，或使用 sudo"
        exit 1
    fi
}

# 创建备份
create_backup() {
    local backup_dir="$DEPLOY_DIR/backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    info "创建备份到 $backup_dir"

    # 备份配置文件
    if [ -f "$DEPLOY_DIR/web-game/.env" ]; then
        cp "$DEPLOY_DIR/web-game/.env" "$backup_dir/.env"
    fi

    success "备份完成"
}

# ============================================
# 部署函数
# ============================================

# 构建应用
build_app() {
    info "开始构建应用..."

    cd "$DEPLOY_DIR/$PROJECT_NAME/web-game"

    # 安装依赖
    info "安装依赖..."
    npm ci --only=production

    # 构建项目
    info "编译 TypeScript..."
    npm run build

    success "应用构建完成"
}

# 使用 Docker 部署
deploy_docker() {
    info "使用 Docker 部署..."

    cd "$DEPLOY_DIR/$PROJECT_NAME/web-game"

    # 构建并启动容器
    docker-compose build
    docker-compose up -d

    # 等待服务启动
    info "等待服务启动..."
    sleep 10

    # 检查服务状态
    docker-compose ps

    success "Docker 部署完成"
}

# 使用 PM2 部署
deploy_pm2() {
    info "使用 PM2 部署..."

    # 检查 PM2 是否安装
    if ! command_exists pm2; then
        error "PM2 未安装，请先安装: npm install -g pm2"
        exit 1
    fi

    # 重启应用
    pm2 restart "$PROJECT_NAME" || pm2 start "$DEPLOY_DIR/$PROJECT_NAME/ecosystem.config.js" --name "$PROJECT_NAME"

    success "PM2 部署完成"
}

# 回滚部署
rollback() {
    info "回滚到上一个版本..."

    local backup_dir="$DEPLOY_DIR/backups"
    local latest_backup=$(ls -t "$backup_dir" | head -n1)

    if [ -z "$latest_backup" ]; then
        error "没有找到备份"
        exit 1
    fi

    info "使用备份: $latest_backup"

    # 停止服务
    docker-compose down || pm2 stop "$PROJECT_NAME" || true

    # 恢复配置
    if [ -f "$backup_dir/$latest_backup/.env" ]; then
        cp "$backup_dir/$latest_backup/.env" "$DEPLOY_DIR/web-game/.env"
    fi

    # 重新部署
    deploy_docker || deploy_pm2

    success "回滚完成"
}

# 健康检查
health_check() {
    info "执行健康检查..."

    local max_attempts=5
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        info "健康检查尝试 $attempt/$max_attempts..."

        # 检查 HTTP 服务
        if command_exists curl; then
            if curl -f -s http://localhost/health > /dev/null 2>&1; then
                success "HTTP 服务健康"
                return 0
            fi
        fi

        attempt=$((attempt + 1))
        sleep 5
    done

    error "健康检查失败"
    return 1
}

# 拉取最新代码
pull_code() {
    info "拉取最新代码..."

    cd "$DEPLOY_DIR/$PROJECT_NAME"

    # 切换到指定分支
    git checkout "$GIT_BRANCH" || git checkout -b "$GIT_BRANCH" "origin/$GIT_BRANCH"

    # 拉取最新代码
    git pull origin "$GIT_BRANCH"

    success "代码拉取完成"
}

# ============================================
# 主函数
# ============================================

# 显示使用说明
show_usage() {
    cat << EOF
OpenClaw MMO - 部署脚本

使用方法:
    $0 <command> [options]

命令:
    deploy          部署应用到服务器
    build           仅构建应用
    docker          使用 Docker 部署
    pm2             使用 PM2 部署
    rollback        回滚到上一个版本
    health          执行健康检查
    logs            查看日志

环境变量:
    GIT_REPO        Git 仓库地址 (默认: https://github.com/your-org/openclaw-mmo.git)
    GIT_BRANCH      Git 分支 (默认: main)
    DEPLOY_DIR      部署目录 (默认: /opt/openclaw)

示例:
    # 部署应用
    $0 deploy

    # 使用 Docker 部署
    $0 docker

    # 回滚到上一个版本
    $0 rollback

    # 查看日志
    $0 logs

EOF
}

# 查看日志
show_logs() {
    info "查看日志..."

    if [ -f "$DEPLOY_DIR/$PROJECT_NAME/docker-compose.yml" ]; then
        docker-compose logs -f --tail=100
    elif command_exists pm2; then
        pm2 logs "$PROJECT_NAME" --lines 100
    else
        error "未找到日志服务"
        exit 1
    fi
}

# 主部署函数
main_deploy() {
    check_root

    info "开始部署 OpenClaw MMO..."
    info "仓库: $GIT_REPO"
    info "分支: $GIT_BRANCH"
    info "目录: $DEPLOY_DIR"

    # 创建部署目录
    mkdir -p "$DEPLOY_DIR"

    # 克隆或更新代码
    if [ ! -d "$DEPLOY_DIR/$PROJECT_NAME" ]; then
        info "克隆仓库..."
        git clone "$GIT_REPO" "$DEPLOY_DIR/$PROJECT_NAME"
    else
        pull_code
    fi

    # 创建备份
    create_backup

    # 构建应用
    build_app

    # 检查使用 Docker 还是 PM2
    if command_exists docker && command_exists docker-compose; then
        deploy_docker
    else
        warn "Docker 未安装，尝试使用 PM2 部署..."
        deploy_pm2
    fi

    # 健康检查
    if health_check; then
        success "部署成功！"
    else
        error "部署后健康检查失败"
        exit 1
    fi
}

# ============================================
# 主程序
# ============================================

# 解析命令
case "${1:-}" in
    deploy)
        main_deploy
        ;;
    build)
        build_app
        ;;
    docker)
        deploy_docker
        ;;
    pm2)
        deploy_pm2
        ;;
    rollback)
        rollback
        ;;
    health)
        health_check
        ;;
    logs)
        show_logs
        ;;
    *)
        show_usage
        exit 1
        ;;
esac

exit 0
