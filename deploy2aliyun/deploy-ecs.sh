#!/bin/bash

# 阿里云ECS一键部署脚本 - 育婴宝后端服务
# 适用于2CPU 2G内存的阿里云ECS服务器
# 集成功能：Docker安装、镜像源配置、PostgreSQL部署、应用部署、防火墙配置
# 版本: v0.5.0

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 配置变量
DOCKER_IMAGE="crpi-zyq1wc1umfuictwx.cn-shanghai.personal.cr.aliyuncs.com/aires-docker/yuyingbao:latest"
CONTAINER_NAME="yuyingbao-server"
NETWORK_NAME="yuyingbao-network"
ALIYUN_REGISTRY="crpi-zyq1wc1umfuictwx.cn-shanghai.personal.cr.aliyuncs.com"
ALIYUN_NAMESPACE="aires-docker"
ALIYUN_USERNAME="xulei0331@126.com"
POSTGRES_IMAGE="postgres:16"  # 默认PostgreSQL镜像，会在拉取时动态更新

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}    阿里云ECS一键部署脚本${NC}"
echo -e "${BLUE}    育婴宝后端服务 v0.5.0${NC}"
echo -e "${BLUE}    针对2CPU 2G内存服务器优化${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# 检查是否为root用户
check_root() {
    if [[ $EUID -eq 0 ]]; then
        echo -e "${YELLOW}⚠️  检测到root用户，建议使用普通用户 + sudo${NC}"
        echo -e "${YELLOW}   继续部署？(y/N)${NC}"
        read -r root_confirm
        if [[ ! "$root_confirm" =~ ^[Yy]$ ]]; then
            echo -e "${RED}❌ 部署取消${NC}"
            exit 1
        fi
    fi
}

# 显示系统信息
show_system_info() {
    echo -e "${BLUE}🖥️  系统信息:${NC}"
    echo "操作系统: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)"
    echo "内核版本: $(uname -r)"
    echo "CPU信息: $(nproc) 核心"
    echo "内存信息: $(free -h | grep '^Mem:' | awk '{print $2}')"
    echo "磁盘空间: $(df -h / | awk 'NR==2 {print $4}') 可用"
    echo ""
}

# 检查系统资源
check_system_resources() {
    echo -e "${BLUE}🔍 检查系统资源...${NC}"
    
    # 检查内存
    TOTAL_MEM=$(free -m | grep '^Mem:' | awk '{print $2}')
    AVAILABLE_MEM=$(free -m | grep '^Mem:' | awk '{print $7}')
    
    echo "总内存: ${TOTAL_MEM}MB"
    echo "可用内存: ${AVAILABLE_MEM}MB"
    
    if [[ $TOTAL_MEM -lt 1800 ]]; then
        echo -e "${RED}⚠️  警告: 系统内存不足2G，可能影响应用性能${NC}"
        echo -e "${YELLOW}   是否继续部署？(y/N)${NC}"
        read -r mem_confirm
        if [[ ! "$mem_confirm" =~ ^[Yy]$ ]]; then
            echo -e "${RED}❌ 部署取消${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}✅ 内存资源充足${NC}"
    fi
    
    # 检查磁盘空间
    DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    DISK_AVAIL=$(df -h / | awk 'NR==2 {print $4}')
    
    echo "磁盘使用率: ${DISK_USAGE}%"
    echo "可用空间: ${DISK_AVAIL}"
    
    if [[ $DISK_USAGE -gt 85 ]]; then
        echo -e "${YELLOW}⚠️  警告: 磁盘使用率较高${NC}"
    fi
    
    echo -e "${GREEN}✅ 系统资源检查完成${NC}"
    echo ""
}

# 检查并安装Docker
install_docker() {
    echo -e "${BLUE}🔍 检查Docker环境...${NC}"
    
    if ! command -v docker &> /dev/null; then
        echo -e "${YELLOW}📦 Docker未安装，正在安装...${NC}"
        
        # 检测操作系统
        if [[ -f /etc/redhat-release ]]; then
            # CentOS/RHEL/AliyunOS
            echo "检测到CentOS/RHEL系统，使用yum安装Docker..."
            sudo yum update -y
            sudo yum install -y yum-utils device-mapper-persistent-data lvm2
            sudo yum-config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
            sudo yum install -y docker-ce docker-ce-cli containerd.io
        elif [[ -f /etc/debian_version ]]; then
            # Ubuntu/Debian
            echo "检测到Ubuntu/Debian系统，使用apt安装Docker..."
            sudo apt update
            sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release
            curl -fsSL https://mirrors.aliyun.com/docker-ce/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
            echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://mirrors.aliyun.com/docker-ce/linux/ubuntu \$(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
            sudo apt update
            sudo apt install -y docker-ce docker-ce-cli containerd.io
        else
            echo -e "${RED}❌ 不支持的操作系统，请手动安装Docker${NC}"
            exit 1
        fi
        
        # 启动Docker服务
        sudo systemctl start docker
        sudo systemctl enable docker
        
        # 添加当前用户到docker组
        sudo usermod -aG docker $USER
        
        echo -e "${GREEN}✅ Docker安装完成${NC}"
        echo -e "${YELLOW}💡 请重新登录以使docker用户组生效，或运行: newgrp docker${NC}"
        
        # 配置Docker镜像加速器（阿里云）
        echo -e "${BLUE}🚀 配置Docker镜像加速器...${NC}"
        sudo mkdir -p /etc/docker
        sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'
{
  "registry-mirrors": [
    "https://dockerproxy.com",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com",
    "https://ccr.ccs.tencentyun.com"
  ],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "max-concurrent-downloads": 10,
  "max-concurrent-uploads": 5,
  "experimental": false
}
EOF
        sudo systemctl restart docker
        echo -e "${GREEN}✅ Docker镜像加速器配置完成${NC}"
        
        # 等待Docker服务重启
        sleep 5
        
        # 验证镜像源配置
        echo -e "${BLUE}🔍 验证镜像源配置...${NC}"
        if docker info | grep -q "Registry Mirrors"; then
            echo -e "${GREEN}✅ 镜像源配置生效${NC}"
            docker info | grep -A 10 "Registry Mirrors" | head -6
        else
            echo -e "${YELLOW}⚠️  镜像源配置未生效，将使用默认源${NC}"
        fi
    else
        echo -e "${GREEN}✅ Docker已安装${NC}"
    fi
    
    # 检查Docker服务状态
    if ! docker info &> /dev/null; then
        echo -e "${YELLOW}🔄 启动Docker服务...${NC}"
        sudo systemctl start docker
        sudo systemctl enable docker
        
        # 等待Docker服务启动
        sleep 3
        if ! docker info &> /dev/null; then
            echo -e "${RED}❌ Docker服务启动失败${NC}"
            exit 1
        fi
    fi
    
    echo -e "${GREEN}✅ Docker环境正常${NC}"
    echo ""
}

# 登录阿里云镜像仓库
login_aliyun_registry() {
    echo -e "${BLUE}🔐 登录阿里云镜像仓库...${NC}"
    echo -e "${CYAN}镜像仓库: ${ALIYUN_REGISTRY}${NC}"
    echo -e "${CYAN}用户名: ${ALIYUN_USERNAME}${NC}"
    echo ""
    echo -e "${YELLOW}请输入阿里云容器镜像服务的访问密码:${NC}"
    
    # 尝试登录，最多3次
    local attempts=0
    local max_attempts=3
    
    while [ $attempts -lt $max_attempts ]; do
        if docker login ${ALIYUN_REGISTRY} -u ${ALIYUN_USERNAME}; then
            echo -e "${GREEN}✅ 阿里云镜像仓库登录成功${NC}"
            echo ""
            return 0
        else
            attempts=$((attempts + 1))
            echo -e "${RED}❌ 登录失败，请检查密码 (尝试 $attempts/$max_attempts)${NC}"
            if [ $attempts -eq $max_attempts ]; then
                echo -e "${RED}❌ 登录失败次数过多，请检查用户名和密码${NC}"
                exit 1
            fi
        fi
    done
}

# 拉取应用镜像
pull_image() {
    echo -e "${BLUE}📥 拉取应用镜像...${NC}"
    echo -e "${CYAN}镜像: ${DOCKER_IMAGE}${NC}"
    
    if docker pull ${DOCKER_IMAGE}; then
        echo -e "${GREEN}✅ 镜像拉取成功${NC}"
        
        # 显示镜像信息
        echo -e "${BLUE}📊 镜像信息:${NC}"
        docker images ${DOCKER_IMAGE} --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
    else
        echo -e "${RED}❌ 镜像拉取失败${NC}"
        exit 1
    fi
    echo ""
}

# 拉取PostgreSQL镜像
pull_postgres_image() {
    echo -e "${BLUE}📥 拉取PostgreSQL镜像...${NC}"
    
    # 优先尝试从阿里云私有仓库拉取
    local aliyun_postgres_image="${ALIYUN_REGISTRY}/${ALIYUN_NAMESPACE}/postgres:16"
    
    # 备用公共镜像
    local public_postgres_image="postgres:16"
    
    local pulled_image=""
    
    # 先尝试阿里云私有仓库
    echo -e "${CYAN}尝试从阿里云私有仓库拉取PostgreSQL镜像...${NC}"
    echo -e "${CYAN}尝试拉取镜像: ${aliyun_postgres_image}${NC}"
    
    if timeout 180 docker pull "$aliyun_postgres_image"; then
        echo -e "${GREEN}✅ 从阿里云私有仓库拉取成功: ${aliyun_postgres_image}${NC}"
        pulled_image="$aliyun_postgres_image"
    else
        echo -e "${YELLOW}⚠️  从阿里云私有仓库拉取失败: ${aliyun_postgres_image}${NC}"
    fi
    
    # 如果私有仓库失败，尝试公共镜像
    if [[ -z "$pulled_image" ]]; then
        echo -e "${CYAN}尝试从公共仓库拉取PostgreSQL镜像...${NC}"
        echo -e "${CYAN}尝试拉取镜像: ${public_postgres_image}${NC}"
        
        if timeout 300 docker pull "$public_postgres_image"; then
            echo -e "${GREEN}✅ 从公共仓库拉取成功: ${public_postgres_image}${NC}"
            pulled_image="$public_postgres_image"
        else
            echo -e "${RED}❌ 从公共仓库拉取失败: ${public_postgres_image}${NC}"
        fi
    fi
    if [[ -z "$pulled_image" ]]; then
        echo -e "${RED}❌ PostgreSQL 16镜像拉取完全失败${NC}"
        echo -e "${YELLOW}💡 解决建议:${NC}"
        echo -e "1. 检查网络连接: ping registry-1.docker.io"
        echo -e "2. 检查Docker镜像源配置: docker info | grep 'Registry Mirrors'"
        echo -e "3. 手动配置镜像源或重新运行本脚本"
        echo -e "4. 尝试重新启动Docker: sudo systemctl restart docker"
        return 1
    fi
    
    # 更新全局PostgreSQL镜像变量
    POSTGRES_IMAGE="$pulled_image"
    echo -e "${GREEN}✅ 将使用PostgreSQL镜像: ${POSTGRES_IMAGE}${NC}"
    echo ""
}

# 停止并清理所有相关容器
stop_and_remove_containers() {
    echo -e "${BLUE}🧹 清理旧容器...${NC}"
    
    # 定义要清理的容器
    local containers=("yuyingbao-server" "yuyingbao-postgres")
    
    for container in "${containers[@]}"; do
        # 检查容器是否存在（运行中或已停止）
        if docker ps -a --format "table {{.Names}}" | grep -q "^${container}$"; then
            echo -e "${YELLOW}🔍 发现容器: ${container}${NC}"
            
            # 检查容器是否正在运行
            if docker ps --format "table {{.Names}}" | grep -q "^${container}$"; then
                echo -e "${BLUE}🛑 停止运行中的容器: ${container}${NC}"
                docker stop "${container}"
            else
                echo -e "${YELLOW}ℹ️  容器已停止: ${container}${NC}"
            fi
            
            # 删除容器
            echo -e "${BLUE}🗑️  删除容器: ${container}${NC}"
            docker rm "${container}"
            echo -e "${GREEN}✅ 容器删除成功: ${container}${NC}"
        else
            echo -e "${GREEN}✅ 容器不存在: ${container}${NC}"
        fi
    done
    
    echo -e "${GREEN}✅ 容器清理完成${NC}"
    echo ""
}

# 创建Docker网络和数据目录
create_network_and_data_dirs() {
    echo -e "${BLUE}🌐 创建Docker网络和数据目录...${NC}"
    
    # 创建网络
    if docker network ls | grep -q ${NETWORK_NAME}; then
        echo -e "${GREEN}✅ 网络已存在: ${NETWORK_NAME}${NC}"
    else
        docker network create ${NETWORK_NAME}
        echo -e "${GREEN}✅ 网络创建成功: ${NETWORK_NAME}${NC}"
    fi
    
    # 创建本地数据目录（用于数据持久化）
    local data_dir="./postgres_data"
    if [[ ! -d "$data_dir" ]]; then
        echo -e "${BLUE}📁 创建本地数据目录...${NC}"
        mkdir -p "$data_dir"
        
        # 设置目录权限（PostgreSQL需要999:999权限）
        sudo chown 999:999 "$data_dir"
        sudo chmod 700 "$data_dir"
        
        echo -e "${GREEN}✅ 本地数据目录创建成功: $(pwd)/$data_dir${NC}"
    else
        echo -e "${GREEN}✅ 本地数据目录已存在: $(pwd)/$data_dir${NC}"
        
        # 检查权限
        local dir_owner=$(stat -c "%U:%G" "$data_dir" 2>/dev/null || stat -f "%Su:%Sg" "$data_dir" 2>/dev/null)
        if [[ "$dir_owner" != "999:999" ]] && [[ "$dir_owner" != "postgres:postgres" ]]; then
            echo -e "${YELLOW}🔧 修正数据目录权限...${NC}"
            sudo chown 999:999 "$data_dir"
            sudo chmod 700 "$data_dir"
        fi
    fi
    
    # 显示数据目录信息
    echo -e "${CYAN}ℹ️  PostgreSQL数据将存储在: $(pwd)/$data_dir${NC}"
    echo -e "${CYAN}ℹ️  即使删除容器，数据也不会丢失${NC}"
    
    echo ""
}

# 启动PostgreSQL数据库容器
start_database() {
    echo -e "${BLUE}🐘 启动PostgreSQL数据库容器...${NC}"
    
    # 检查是否已有数据库容器运行
    if docker ps | grep -q "yuyingbao-postgres"; then
        echo -e "${GREEN}✅ PostgreSQL容器已在运行，检查数据库连接...${NC}"
        # 验证数据库是否真正可用
        if docker exec yuyingbao-postgres pg_isready -U yuyingbao -d yuyingbao &>/dev/null; then
            echo -e "${GREEN}✅ 数据库连接正常${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠️  数据库连接异常，重新启动...${NC}"
            docker stop yuyingbao-postgres || true
            docker rm yuyingbao-postgres || true
        fi
    fi
    
    # 停止旧的数据库容器
    if docker ps -a | grep -q "yuyingbao-postgres"; then
        echo "停止旧的PostgreSQL容器..."
        docker stop yuyingbao-postgres || true
        docker rm yuyingbao-postgres || true
    fi
    
    # 启动PostgreSQL容器
    echo -e "${BLUE}🚀 启动新的PostgreSQL容器...${NC}"
    docker run -d \
        --name yuyingbao-postgres \
        --restart unless-stopped \
        --network ${NETWORK_NAME} \
        -p 5432:5432 \
        --memory=512m \
        --cpus=0.5 \
        -e POSTGRES_DB=yuyingbao \
        -e POSTGRES_USER=yuyingbao \
        -e POSTGRES_PASSWORD=YuyingBao2024@Database \
        -e POSTGRES_INITDB_ARGS="--encoding=UTF-8 --lc-collate=C --lc-ctype=C" \
        -v "$(pwd)/postgres_data":/var/lib/postgresql/data \
        ${POSTGRES_IMAGE}
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ PostgreSQL容器启动成功${NC}"
        
        # 等待数据库启动 - 增加等待时间和更全面的检查
        echo -e "${BLUE}⏳ 等待数据库完全初始化...${NC}"
        echo -e "${CYAN}   这可能需要30-60秒，请耐心等待...${NC}"
        
        local db_attempts=0
        local max_db_attempts=60  # 增加到60次（2分钟）
        
        while [ $db_attempts -lt $max_db_attempts ]; do
            # 首先检查容器是否还在运行
            if ! docker ps | grep -q "yuyingbao-postgres"; then
                echo ""
                echo -e "${RED}❌ PostgreSQL容器已停止运行${NC}"
                echo -e "${YELLOW}查看容器日志:${NC}"
                docker logs --tail=20 yuyingbao-postgres
                return 1
            fi
            
            # 检查数据库是否可以接受连接
            if docker exec yuyingbao-postgres pg_isready -U yuyingbao -d yuyingbao &>/dev/null; then
                echo ""
                echo -e "${GREEN}✅ 数据库接受连接，继续检查完整性...${NC}"
                
                # 进一步验证数据库是否完全可用
                if docker exec yuyingbao-postgres psql -U yuyingbao -d yuyingbao -c "SELECT 1;" &>/dev/null; then
                    echo -e "${GREEN}✅ 数据库完全可用！${NC}"
                    
                    # 额外等待5秒确保稳定
                    echo -e "${BLUE}⏳ 额外等待5秒确保数据库稳定...${NC}"
                    sleep 5
                    
                    return 0
                else
                    echo -e "${YELLOW}⚠️  数据库尚未完全准备好，继续等待...${NC}"
                fi
            fi
            
            echo -n "."
            sleep 2
            db_attempts=$((db_attempts + 1))
        done
        
        echo ""
        echo -e "${RED}❌ 数据库启动超时${NC}"
        echo -e "${YELLOW}查看PostgreSQL日志:${NC}"
        docker logs --tail=30 yuyingbao-postgres
        return 1
    else
        echo -e "${RED}❌ PostgreSQL容器启动失败${NC}"
        return 1
    fi
    echo ""
}

# 配置环境变量
configure_environment() {
    echo -e "${BLUE}⚙️  配置环境变量...${NC}"
    
    # 检查是否存在环境变量文件
    if [[ ! -f ".env" ]]; then
        echo -e "${YELLOW}📝 创建环境变量配置文件...${NC}"
        cat > .env << 'EOF'
# 数据库配置 (请修改为实际的数据库信息)
DB_HOST=postgres
DB_PORT=5432
DB_NAME=yuyingbao
DB_USERNAME=yuyingbao
DB_PASSWORD=YuyingBao2024@Database

# JWT配置
JWT_SECRET=your_jwt_secret_key_32_characters_long
JWT_EXPIRATION=86400000

# 微信小程序配置
WECHAT_APP_ID=your_wechat_app_id
WECHAT_APP_SECRET=your_wechat_app_secret

# 服务配置
SERVER_PORT=8080
SPRING_PROFILES_ACTIVE=prod

# 日志配置
LOGGING_LEVEL_ROOT=INFO
EOF
        echo -e "${GREEN}✅ 环境变量文件创建完成: .env${NC}"
        echo -e "${YELLOW}🔧 请编辑 .env 文件配置实际的数据库和微信信息${NC}"
        echo -e "${YELLOW}   编辑命令: nano .env 或 vim .env${NC}"
        echo ""
        echo -e "${CYAN}按任意键继续，或按Ctrl+C退出编辑环境变量...${NC}"
        read -n 1 -s
    else
        echo -e "${GREEN}✅ 环境变量文件已存在${NC}"
    fi
    echo ""
}

# 网络诊断和修复功能
diagnose_and_fix_network() {
    echo -e "${BLUE}🔍 进行网络诊断...${NC}"
    
    # 检查网络是否存在
    if ! docker network ls | grep -q ${NETWORK_NAME}; then
        echo -e "${RED}❌ 网络不存在，重新创建...${NC}"
        docker network create ${NETWORK_NAME}
    fi
    
    # 显示网络详细信息
    echo -e "${CYAN}🌐 网络信息:${NC}"
    docker network inspect ${NETWORK_NAME} --format='{{.Name}}: {{.Driver}} - {{range .IPAM.Config}}{{.Subnet}}{{end}}'
    
    # 检查容器网络连接
    echo -e "${CYAN}🔗 检查容器网络连接:${NC}"
    
    # 检查PostgreSQL容器网络
    if docker ps | grep -q "yuyingbao-postgres"; then
        local postgres_networks=$(docker inspect yuyingbao-postgres --format='{{range $net, $conf := .NetworkSettings.Networks}}{{$net}} {{end}}')
        echo -e "  PostgreSQL容器网络: ${postgres_networks}"
        
        if echo "$postgres_networks" | grep -q "${NETWORK_NAME}"; then
            echo -e "  ${GREEN}✅ PostgreSQL已加入正确网络${NC}"
        else
            echo -e "  ${RED}❌ PostgreSQL未加入正确网络，正在修复...${NC}"
            docker network connect ${NETWORK_NAME} yuyingbao-postgres
            sleep 3
        fi
    fi
    
    # 检查应用容器网络
    if docker ps | grep -q "${CONTAINER_NAME}"; then
        local app_networks=$(docker inspect ${CONTAINER_NAME} --format='{{range $net, $conf := .NetworkSettings.Networks}}{{$net}} {{end}}')
        echo -e "  应用容器网络: ${app_networks}"
        
        if echo "$app_networks" | grep -q "${NETWORK_NAME}"; then
            echo -e "  ${GREEN}✅ 应用已加入正确网络${NC}"
        else
            echo -e "  ${RED}❌ 应用未加入正确网络，正在修复...${NC}"
            docker network connect ${NETWORK_NAME} ${CONTAINER_NAME}
            sleep 3
        fi
    fi
    
    # 检查网络内部连接
    if docker ps | grep -q "yuyingbao-postgres" && docker ps | grep -q "${CONTAINER_NAME}"; then
        echo -e "${BLUE}🔎 测试网络内部连接...${NC}"
        
        # 从应用容器ping数据库容器
        if docker exec ${CONTAINER_NAME} ping -c 2 postgres &>/dev/null; then
            echo -e "  ${GREEN}✅ 应用可以ping通数据库${NC}"
        else
            echo -e "  ${RED}❌ 应用无法ping通数据库${NC}"
        fi
        
        # 从应用容器测试数据库端口
        if docker exec ${CONTAINER_NAME} nc -z postgres 5432 &>/dev/null; then
            echo -e "  ${GREEN}✅ 应用可以连接数据库端口${NC}"
        else
            echo -e "  ${RED}❌ 应用无法连接数据库端口${NC}"
        fi
    fi
    
    echo ""
}
start_application() {
    echo -e "${BLUE}🚀 启动应用容器 (2G内存优化)...${NC}"
    
    # 再次验证数据库连接
    echo -e "${BLUE}🔍 启动前再次验证数据库连接...${NC}"
    if ! docker exec yuyingbao-postgres pg_isready -U yuyingbao -d yuyingbao &>/dev/null; then
        echo -e "${RED}❌ 数据库连接验证失败，无法启动应用${NC}"
        return 1
    fi
    echo -e "${GREEN}✅ 数据库连接验证通过${NC}"
    
    # 增强网络诊断
    echo -e "${BLUE}🌐 检查Docker网络连接...${NC}"
    
    # 检查数据库容器是否在网络中
    if docker network inspect ${NETWORK_NAME} | grep -q "yuyingbao-postgres"; then
        echo -e "${GREEN}✅ PostgreSQL容器已加入网络: ${NETWORK_NAME}${NC}"
    else
        echo -e "${RED}❌ PostgreSQL容器未加入网络，正在修复...${NC}"
        docker network connect ${NETWORK_NAME} yuyingbao-postgres
    fi
    
    # 等待一下确保网络配置生效
    echo -e "${BLUE}⏳ 等徆10秒确保网络配置生效...${NC}"
    sleep 10
    
    # 启动应用容器，针对2G内存优化
    docker run -d \
        --name ${CONTAINER_NAME} \
        --restart unless-stopped \
        --network ${NETWORK_NAME} \
        -p 8080:8080 \
        --memory=1.5g \
        --cpus=1.5 \
        --env-file .env \
        -e SPRING_PROFILES_ACTIVE=prod \
        -e SERVER_TOMCAT_THREADS_MAX=50 \
        -e SERVER_TOMCAT_ACCEPT_COUNT=100 \
        -e SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE=10 \
        -e SPRING_DATASOURCE_HIKARI_MINIMUM_IDLE=2 \
        -e JAVA_OPTS="-Xms256m -Xmx768m -XX:+UseG1GC -XX:MaxGCPauseMillis=100" \
        ${DOCKER_IMAGE}
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ 应用容器启动成功${NC}"
        echo -e "${CYAN}容器名称: ${CONTAINER_NAME}${NC}"
        echo -e "${CYAN}端口映射: 8080:8080${NC}"
        echo -e "${CYAN}内存限制: 1.5GB${NC}"
        echo -e "${CYAN}CPU限制: 1.5核心${NC}"
    else
        echo -e "${RED}❌ 应用容器启动失败${NC}"
        echo -e "${YELLOW}查看错误日志: docker logs ${CONTAINER_NAME}${NC}"
        exit 1
    fi
    echo ""
}

# 等待应用启动
wait_for_application() {
    echo -e "${BLUE}⏳ 等待应用启动...${NC}"
    echo -e "${CYAN}   这可能需要60-120秒，包括数据库连接和Flyway迁移...${NC}"
    echo -n "启动中"
    
    local max_attempts=80  # 增加等待时间到4分钟
    local attempts=0
    local last_log_check=0
    
    while [ $attempts -lt $max_attempts ]; do
        # 每10次尝试检查一次容器状态和日志
        if [ $((attempts % 10)) -eq 0 ] && [ $attempts -gt 0 ]; then
            echo ""
            echo -e "${BLUE}🔍 检查应用状态 (${attempts}/${max_attempts})...${NC}"
            
            # 检查容器是否还在运行
            if ! docker ps | grep -q ${CONTAINER_NAME}; then
                echo -e "${RED}❌ 容器意外停止${NC}"
                echo -e "${YELLOW}查看容器日志:${NC}"
                docker logs --tail=30 ${CONTAINER_NAME}
                return 1
            fi
            
            # 显示最近的日志
            echo -e "${YELLOW}最近的应用日志:${NC}"
            docker logs --tail=5 ${CONTAINER_NAME} 2>/dev/null | sed 's/^/  /'
            echo -n "继续等待"
        fi
        
        # 检查应用健康状态
        if curl -f -s http://localhost:8080/api/actuator/health &>/dev/null; then
            echo ""
            echo -e "${GREEN}✅ 应用启动成功！${NC}"
            
            # 获取应用信息
            local health_response=$(curl -s http://localhost:8080/api/actuator/health 2>/dev/null)
            if echo "$health_response" | grep -q '"status":"UP"'; then
                echo -e "${GREEN}✅ 应用健康检查通过${NC}"
            else
                echo -e "${YELLOW}⚠️  应用健康状态未知: $health_response${NC}"
            fi
            return 0
        elif docker ps | grep -q ${CONTAINER_NAME}; then
            echo -n "."
            sleep 3
            attempts=$((attempts + 1))
        else
            echo ""
            echo -e "${RED}❌ 容器意外停止${NC}"
            echo -e "${YELLOW}查看容器日志:${NC}"
            docker logs --tail=20 ${CONTAINER_NAME}
            return 1
        fi
    done
    
    echo ""
    echo -e "${YELLOW}⚠️  应用启动超时，请检查日志${NC}"
    echo -e "${YELLOW}查看日志命令: docker logs -f ${CONTAINER_NAME}${NC}"
    
    # 显示详细的错误信息
    echo -e "${BLUE}🔍 最近的50行日志:${NC}"
    docker logs --tail=50 ${CONTAINER_NAME} 2>/dev/null | sed 's/^/  /'
    
    return 1
}

# 健康检查
health_check() {
    echo -e "${BLUE}🏥 执行健康检查...${NC}"
    
    # 检查容器状态
    if docker ps | grep -q ${CONTAINER_NAME}; then
        echo -e "${GREEN}✅ 容器运行正常${NC}"
    else
        echo -e "${RED}❌ 容器未运行${NC}"
        return 1
    fi
    
    # 检查应用健康状态
    if curl -f -s http://localhost:8080/api/actuator/health &>/dev/null; then
        echo -e "${GREEN}✅ 应用健康检查通过${NC}"
    else
        echo -e "${YELLOW}⚠️  应用健康检查失败，可能还在启动中${NC}"
    fi
    
    # 检查端口
    if netstat -tuln | grep -q ":8080 "; then
        echo -e "${GREEN}✅ 端口8080正在监听${NC}"
    else
        echo -e "${YELLOW}⚠️  端口8080未监听${NC}"
    fi
    
    echo ""
}

# 显示部署信息
show_deployment_info() {
    local server_ip=$(curl -s ifconfig.me 2>/dev/null || echo "无法获取公网IP")
    
    echo -e "${GREEN}🎉 部署完成！${NC}"
    echo ""
    echo -e "${BLUE}📋 服务信息:${NC}"
    echo -e "${CYAN}应用地址: http://${server_ip}:8080${NC}"
    echo -e "${CYAN}API地址: http://${server_ip}:8080/api${NC}"
    echo -e "${CYAN}健康检查: http://${server_ip}:8080/api/actuator/health${NC}"
    echo -e "${CYAN}容器名称: ${CONTAINER_NAME}${NC}"
    echo -e "${CYAN}镜像版本: ${DOCKER_IMAGE}${NC}"
    echo ""
    echo -e "${BLUE}🔧 管理命令:${NC}"
    echo -e "查看日志: ${CYAN}docker logs -f ${CONTAINER_NAME}${NC}"
    echo -e "重启应用: ${CYAN}docker restart ${CONTAINER_NAME}${NC}"
    echo -e "停止应用: ${CYAN}docker stop ${CONTAINER_NAME}${NC}"
    echo -e "查看状态: ${CYAN}docker ps${NC}"
    echo -e "进入容器: ${CYAN}docker exec -it ${CONTAINER_NAME} bash${NC}"
    echo ""
    echo -e "${BLUE}📊 资源使用:${NC}"
    docker stats --no-stream ${CONTAINER_NAME} 2>/dev/null || echo "容器状态获取失败"
    echo ""
    echo -e "${YELLOW}📝 重要提醒:${NC}"
    echo -e "1. 请确保已配置正确的数据库连接信息 (.env文件)"
    echo -e "2. 请确保防火墙已开放8080端口"
    echo -e "3. 请定期备份数据和更新镜像"
    echo ""
}

# 配置防火墙
configure_firewall() {
    echo -e "${BLUE}🔥 配置防火墙...${NC}"
    
    if command -v firewall-cmd &> /dev/null; then
        # CentOS/RHEL - firewalld
        if systemctl is-active --quiet firewalld; then
            echo "配置firewalld防火墙..."
            sudo firewall-cmd --permanent --add-port=8080/tcp
            sudo firewall-cmd --reload
            echo -e "${GREEN}✅ firewalld端口8080已开放${NC}"
        else
            echo -e "${YELLOW}ℹ️  firewalld未运行${NC}"
        fi
    elif command -v ufw &> /dev/null; then
        # Ubuntu/Debian - ufw
        if ufw status | grep -q "Status: active"; then
            echo "配置ufw防火墙..."
            sudo ufw allow 8080/tcp
            echo -e "${GREEN}✅ ufw端口8080已开放${NC}"
        else
            echo -e "${YELLOW}ℹ️  ufw未启用${NC}"
        fi
    elif command -v iptables &> /dev/null; then
        # 通用iptables
        echo "配置iptables防火墙..."
        sudo iptables -A INPUT -p tcp --dport 8080 -j ACCEPT
        # 尝试保存规则
        if command -v iptables-save &> /dev/null; then
            sudo iptables-save > /etc/iptables/rules.v4 2>/dev/null || true
        fi
        echo -e "${GREEN}✅ iptables端口8080已开放${NC}"
    else
        echo -e "${YELLOW}ℹ️  未检测到防火墙管理工具${NC}"
    fi
    
    echo -e "${YELLOW}💡 请确保阿里云安全组也已开放8080端口${NC}"
    echo ""
}

# 主执行流程
main() {
    check_root
    show_system_info
    check_system_resources
    install_docker
    login_aliyun_registry
    pull_image
    pull_postgres_image
    stop_and_remove_containers
    create_network_and_data_dirs
    configure_environment
    start_database
    
    # 在数据库启动后额外等待10秒确保稳定
    if [[ $? -eq 0 ]]; then
        echo -e "${BLUE}⏳ 数据库启动成功，等待15秒后启动应用...${NC}"
        sleep 15
        
        # 进行网络诊断
        diagnose_and_fix_network
        
        start_application
    else
        echo -e "${RED}❌ 数据库启动失败，停止部署${NC}"
        exit 1
    fi
    
    if wait_for_application; then
        # 部署成功后再次进行网络诊断
        diagnose_and_fix_network
        health_check
        configure_firewall
        show_deployment_info
        echo -e "${GREEN}🎊 部署成功完成！${NC}"
    else
        echo -e "${RED}❌ 部署失败，请检查日志${NC}"
        echo -e "${YELLOW}查看日志: docker logs -f ${CONTAINER_NAME}${NC}"
        exit 1
    fi
}

# 清理函数
cleanup() {
    echo -e "${BLUE}🧹 清理旧镜像...${NC}"
    docker image prune -f
    echo -e "${GREEN}✅ 清理完成${NC}"
}

# 显示帮助信息
show_help() {
    echo "阿里云ECS部署脚本 - 育婴宝后端服务"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  deploy    执行完整部署 (默认)"
    echo "  cleanup   清理旧镜像"
    echo "  logs      查看应用日志"
    echo "  status    查看部署状态"
    echo "  restart   重启应用"
    echo "  stop      停止应用"
    echo "  stop-all  停止所有服务（包括数据库）"
    echo "  reset-data 彻底清理所有数据（危险操作）"
    echo "  diagnose  网络诊断和修复"
    echo "  help      显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 deploy     # 执行完整部署"
    echo "  $0 logs       # 查看应用日志"
    echo "  $0 status     # 查看部署状态"
    echo "  $0 diagnose   # 网络问题诊断"
    echo ""
}

# 命令行参数处理
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "cleanup")
        cleanup
        ;;
    "logs")
        docker logs -f ${CONTAINER_NAME}
        ;;
    "status")
        echo -e "${BLUE}📊 部署状态:${NC}"
        echo -e "${CYAN}应用容器:${NC}"
        docker ps -f name=${CONTAINER_NAME}
        echo ""
        echo -e "${CYAN}数据库容器:${NC}"
        docker ps -f name=yuyingbao-postgres
        echo ""
        echo -e "${CYAN}资源使用:${NC}"
        docker stats --no-stream ${CONTAINER_NAME} yuyingbao-postgres 2>/dev/null || echo "容器未运行"
        echo ""
        echo -e "${CYAN}数据存储信息:${NC}"
        if [[ -d "./postgres_data" ]]; then
            local data_size=$(du -sh "./postgres_data" 2>/dev/null | cut -f1)
            echo -e "数据目录: $(pwd)/postgres_data (大小: ${data_size})"
            echo -e "数据状态: ✅ 持久化存储已配置"
        else
            echo -e "数据目录: 未创建"
        fi
        ;;
    "restart")
        echo -e "${BLUE}🔄 重启应用...${NC}"
        docker restart ${CONTAINER_NAME}
        echo -e "${GREEN}✅ 应用已重启${NC}"
        ;;
    "stop")
        echo -e "${BLUE}🛑 停止应用...${NC}"
        docker stop ${CONTAINER_NAME}
        echo -e "${GREEN}✅ 应用已停止${NC}"
        ;;
    "stop-all")
        echo -e "${BLUE}🛑 停止所有服务...${NC}"
        docker stop ${CONTAINER_NAME} yuyingbao-postgres
        echo -e "${GREEN}✅ 所有服务已停止${NC}"
        ;;
    "reset-data")
        echo -e "${RED}⚠️  危险操作：彻底清理所有数据${NC}"
        echo -e "${YELLOW}该操作将删除：${NC}"
        echo -e "  - 所有容器（应用和数据库）"
        echo -e "  - 所有数据文件（./postgres_data目录）"
        echo -e "  - Docker网络和卷"
        echo ""
        echo -e "${RED}请确认您要继续：输入 'DELETE_ALL' 继续${NC}"
        read -r confirm
        if [[ "$confirm" == "DELETE_ALL" ]]; then
            echo -e "${BLUE}🔥 开始清理所有数据...${NC}"
            
            # 停止并删除所有容器
            echo "1. 停止并删除容器..."
            docker stop ${CONTAINER_NAME} yuyingbao-postgres 2>/dev/null || true
            docker rm ${CONTAINER_NAME} yuyingbao-postgres 2>/dev/null || true
            
            # 删除网络
            echo "2. 删除Docker网络..."
            docker network rm ${NETWORK_NAME} 2>/dev/null || true
            
            # 删除数据目录
            echo "3. 删除本地数据目录..."
            if [[ -d "./postgres_data" ]]; then
                sudo rm -rf "./postgres_data"
                echo "✅ 数据目录已删除"
            fi
            
            # 清理Docker卷（如果存在）
            echo "4. 清理Docker卷..."
            docker volume rm postgres_data 2>/dev/null || true
            
            # 清理环境变量文件
            echo "5. 清理环境变量文件..."
            rm -f .env
            
            echo -e "${GREEN}✅ 所有数据清理完成！${NC}"
            echo -e "${YELLOW}下次部署将是全新环境${NC}"
        else
            echo -e "${YELLOW}操作取消${NC}"
        fi
        ;;
    "diagnose")
        echo -e "${BLUE}🔍 开始网络诊断...${NC}"
        diagnose_and_fix_network
        
        # 额外的详细诊断
        echo -e "${BLUE}🔎 详细环境诊断...${NC}"
        echo -e "${CYAN}容器状态:${NC}"
        docker ps -a --filter "name=yuyingbao"
        echo ""
        echo -e "${CYAN}Docker网络:${NC}"
        docker network ls | grep -E "(NETWORK|${NETWORK_NAME})"
        echo ""
        echo -e "${CYAN}网络详情:${NC}"
        docker network inspect ${NETWORK_NAME} 2>/dev/null || echo "网络不存在"
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        echo -e "${RED}❌ 未知命令: $1${NC}"
        echo "使用 $0 help 查看帮助"
        exit 1
        ;;
esac