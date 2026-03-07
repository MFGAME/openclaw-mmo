#!/bin/bash

################################################################################
# OpenClaw MMO - 部署脚本
# 用于自动部署应用到生产服务器
################################################################################

set -e  # 遇到错误立即退出

# ==================== 配置变量 ====================
PROJECT_NAME="openclaw-mmo"
DEPLOY_DIR="/var/www/${PROJECT_NAME}"
BACKUP_DIR="/var/backups/${PROJECT_NAME}"
LOG_DIR="/var/log/${PROJECT_NAME}"
GIT_REPO="${GIT_REPO:-git@github.com:your-org/openclaw-mmo.git}"
GIT_BRANCH="${GIT_BRANCH:-main}"
NODE_VERSION="${NODE_VERSION:-20}"
PM2_PROCESS="${PM2_PROCESS:-openclaw-mmo}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ==================== 函数定义 ====================

# 打印信息
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# 打印成功
log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# 打印警告
log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# 打印错误
log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 创建目录
create_dir() {
    if [ ! -d "$1" ]; then
        log_info "创建目录: $1"
        sudo mkdir -p "$1"
    fi
}

# 检查并安装 Node.js
install_nodejs() {
    if ! command_exists node; then
        log_info "安装 Node.js ${NODE_VERSION}..."
        curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
        sudo apt-get install -y nodejs
        log_success "Node.js 安装完成"
    else
        log_info "Node.js 已安装: $(node --version)"
    fi
}

# 检查并安装 PM2
install_pm2() {
    if ! command_exists pm2; then
        log_info "安装 PM2..."
        sudo npm install -g pm2
        log_success "PM2 安装完成"
    else
        log_info "PM2 已安装: $(pm2 --version)"
    fi
}

# 备份当前版本
backup_current_version() {
    if [ -d "${DEPLOY_DIR}/current" ]; then
        local backup_path="${BACKUP_DIR}/backup-$(date +%Y%m%d-%H%M%S)"
        log_info "备份当前版本到: ${backup_path}"
        sudo mkdir -p "${BACKUP_DIR}"
        sudo cp -r "${DEPLOY_DIR}/current" "${backup_path}"
        log_success "备份完成"

        # 保留最近 5 个备份
        ls -t ${BACKUP_DIR} | tail -n +6 | xargs -I {} sudo rm -rf ${BACKUP_DIR}/{}
    fi
}

# 克隆或拉取代码
clone_or_pull() {
    if [ -d "${DEPLOY_DIR}/repo" ]; then
        log_info "拉取最新代码..."
        cd "${DEPLOY_DIR}/repo"
        sudo git fetch origin
        sudo git checkout "${GIT_BRANCH}"
        sudo git pull origin "${GIT_BRANCH}"
    else
        log_info "克隆代码库..."
        sudo mkdir -p "${DEPLOY_DIR}"
        sudo git clone "${GIT_REPO}" "${DEPLOY_DIR}/repo"
        cd "${DEPLOY_DIR}/repo"
        sudo git checkout "${GIT_BRANCH}"
    fi
    log_success "代码更新完成"
}

# 安装依赖
install_dependencies() {
    log_info "安装项目依赖..."
    cd "${DEPLOY_DIR}/repo"
    sudo npm ci --only=production
    log_success "依赖安装完成"
}

# 构建项目
build_project() {
    log_info "构建项目..."
    cd "${DEPLOY_DIR}/repo"
    sudo npm run build
    log_success "项目构建完成"
}

# 部署新版本
deploy_new_version() {
    log_info "部署新版本..."
    local new_release="${DEPLOY_DIR}/releases/$(date +%Y%m%d-%H%M%S)"
    sudo mkdir -p "${new_release}"
    sudo cp -r "${DEPLOY_DIR}/repo/dist" "${new_release}/"
    sudo cp -r "${DEPLOY_DIR}/repo/assets" "${new_release}/"
    sudo cp -r "${DEPLOY_DIR}/repo/*.json" "${new_release}/" 2>/dev/null || true
    sudo cp -r "${DEPLOY_DIR}/repo/*.js" "${new_release}/" 2>/dev/null || true

    # 创建软链接
    sudo ln -sfn "${new_release}" "${DEPLOY_DIR}/current"
    log_success "新版本部署完成: ${new_release}"
}

# 重启应用
restart_app() {
    log_info "重启应用..."
    cd "${DEPLOY_DIR}/current"

    if command_exists pm2; then
        if pm2 list | grep -q "${PM2_PROCESS}"; then
            sudo pm2 reload "${PM2_PROCESS}"
        else
            sudo pm2 start ecosystem.config.js --env production
        fi
    else
        log_warn "PM2 未安装，跳过应用重启"
    fi
    log_success "应用重启完成"
}

# 清理旧版本
cleanup_old_releases() {
    log_info "清理旧版本..."
    cd "${DEPLOY_DIR}/releases"
    ls -t | tail -n +4 | xargs -I {} sudo rm -rf {}
    log_success "清理完成"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    local max_attempts=30
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if curl -f http://localhost/health >/dev/null 2>&1; then
            log_success "健康检查通过"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 2
    done

    log_error "健康检查失败"
    return 1
}

# ==================== 主流程 ====================

main() {
    log_info "开始部署 ${PROJECT_NAME}..."
    log_info "分支: ${GIT_BRANCH}"
    log_info "Node.js 版本: ${NODE_VERSION}"

    # 检查系统要求
    if ! command_exists git; then
        log_error "Git 未安装，请先安装 Git"
        exit 1
    fi

    # 安装 Node.js 和 PM2
    install_nodejs
    install_pm2

    # 创建必要的目录
    create_dir "${DEPLOY_DIR}"
    create_dir "${DEPLOY_DIR}/releases"
    create_dir "${LOG_DIR}"
    create_dir "${BACKUP_DIR}"

    # 备份当前版本
    backup_current_version

    # 更新代码
    clone_or_pull

    # 安装依赖并构建
    install_dependencies
    build_project

    # 部署新版本
    deploy_new_version

    # 重启应用
    restart_app

    # 健康检查
    if health_check; then
        # 清理旧版本
        cleanup_old_releases
        log_success "部署成功！"
    else
        log_error "部署失败，正在回滚..."
        rollback
        exit 1
    fi
}

# 回滚到上一个版本
rollback() {
    log_warn "回滚到上一个版本..."
    if [ -d "${BACKUP_DIR}" ]; then
        local last_backup=$(ls -t ${BACKUP_DIR} | head -n 1)
        if [ -n "${last_backup}" ]; then
            sudo cp -r "${BACKUP_DIR}/${last_backup}"/* "${DEPLOY_DIR}/current/"
            restart_app
            log_success "回滚完成"
        else
            log_error "没有可用的备份"
        fi
    else
        log_error "备份目录不存在"
    fi
}

# ==================== 脚本入口 ====================

case "${1:-deploy}" in
    deploy)
        main
        ;;
    rollback)
        rollback
        ;;
    health)
        health_check
        ;;
    *)
        echo "用法: $0 {deploy|rollback|health}"
        echo ""
        echo "命令:"
        echo "  deploy   - 部署应用"
        echo "  rollback - 回滚到上一个版本"
        echo "  health   - 执行健康检查"
        exit 1
        ;;
esac
