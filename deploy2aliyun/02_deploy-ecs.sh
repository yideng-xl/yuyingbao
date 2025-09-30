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
DOCKER_IMAGE="latest"
CONTAINER_NAME="yuyingbao-server"
NETWORK_NAME="yuyingbao-network"
POSTGRES_IMAGE="postgres:16"  # 默认PostgreSQL镜像，会在拉取时动态更新

# 默认阿里云镜像仓库配置（示例值）
ALIYUN_REGISTRY="your-registry.cn-shanghai.personal.cr.aliyuncs.com"
ALIYUN_NAMESPACE="your-namespace"
ALIYUN_REPO="yuyingbao"
ALIYUN_USERNAME="your-email@example.com"

# 检查并加载阿里云配置文件
CONFIG_FILE="$(dirname "$0")/aliyun-config.json"
if [[ -f "$CONFIG_FILE" ]]; then
    echo -e "${BLUE}🔍 加载阿里云配置文件...${NC}"
    # 检查并安装jq（如果缺少）
    if ! command -v jq >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  未安装 jq，正在尝试自动安装...${NC}"
        
        # 检测操作系统类型并安装jq
        if [[ -f /etc/redhat-release ]]; then
            # CentOS/RHEL/Alibaba Cloud Linux
            if command -v dnf >/dev/null 2>&1; then
                sudo dnf install -y jq
            elif command -v yum >/dev/null 2>&1; then
                sudo yum install -y jq
            else
                echo -e "${RED}❌ 无法自动安装jq，请手动安装${NC}"
                echo -e "${YELLOW}💡 CentOS/RHEL系统安装命令: sudo yum install -y jq${NC}"
                echo -e "${YELLOW}💡 或者: sudo dnf install -y jq${NC}"
                exit 1
            fi
        elif [[ -f /etc/debian_version ]]; then
            # Ubuntu/Debian
            sudo apt update
            sudo apt install -y jq
        else
            echo -e "${RED}❌ 无法识别操作系统类型，请手动安装jq${NC}"
            echo -e "${YELLOW}💡 Ubuntu/Debian系统安装命令: sudo apt install -y jq${NC}"
            echo -e "${YELLOW}💡 CentOS/RHEL系统安装命令: sudo yum install -y jq${NC}"
            exit 1
        fi
        
        # 验证安装
        if command -v jq >/dev/null 2>&1; then
            echo -e "${GREEN}✅ jq安装成功${NC}"
        else
            echo -e "${RED}❌ jq安装失败，请手动安装${NC}"
            exit 1
        fi
    fi
    
    # 使用jq解析JSON配置文件
    if command -v jq >/dev/null 2>&1; then
        ALIYUN_REGISTRY=$(jq -r '.aliyun.registry' "$CONFIG_FILE" 2>/dev/null || echo "$ALIYUN_REGISTRY")
        ALIYUN_NAMESPACE=$(jq -r '.aliyun.namespace' "$CONFIG_FILE" 2>/dev/null || echo "$ALIYUN_NAMESPACE")
        ALIYUN_USERNAME=$(jq -r '.aliyun.username' "$CONFIG_FILE" 2>/dev/null || echo "$ALIYUN_USERNAME")
        # 更新DOCKER_IMAGE变量以使用实际配置
        DOCKER_IMAGE="${ALIYUN_REGISTRY}/${ALIYUN_NAMESPACE}/${ALIYUN_REPO}:latest"
    else
        echo -e "${RED}❌ jq不可用，无法解析JSON配置文件${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  未找到阿里云配置文件 ${CONFIG_FILE}${NC}"
    echo -e "${YELLOW}💡 请复制 aliyun-config.json.example 为 aliyun-config.json 并填写您的配置信息${NC}"
    echo ""
fi

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
        
        # 启动Docker服务 - 根据操作系统类型选择正确的命令
        echo -e "${BLUE}🔄 启动Docker服务...${NC}"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            echo -e "${BLUE}💻 检测到macOS系统${NC}"
            echo -e "${YELLOW}💡 请确保Docker Desktop已安装并运行${NC}"
        elif command -v systemctl &> /dev/null; then
            # Linux系统使用systemctl
            echo -e "${BLUE}🐧 检测到Linux系统${NC}"
            sudo systemctl start docker
            sudo systemctl enable docker
        else
            echo -e "${YELLOW}⚠️  无法确定系统类型或缺少必要的服务管理工具${NC}"
            echo -e "${YELLOW}💡 请手动启动Docker服务${NC}"
        fi
        
        # 添加当前用户到docker组
        if [[ "$OSTYPE" != "darwin"* ]] && getent group docker > /dev/null; then
            sudo usermod -aG docker $USER
        fi
        
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
        # 重启Docker服务 - 根据操作系统类型选择正确的命令
        echo -e "${BLUE}🔄 重启Docker服务以应用配置...${NC}"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            echo -e "${BLUE}💻 检测到macOS系统${NC}"
            if command -v brew &> /dev/null; then
                echo -e "${BLUE}🔄 使用Homebrew重启Docker...${NC}"
                brew services restart docker || echo -e "${YELLOW}⚠️  Homebrew重启Docker失败${NC}"
            else
                echo -e "${YELLOW}⚠️  未检测到Homebrew，请手动重启Docker Desktop${NC}"
            fi
        elif command -v systemctl &> /dev/null; then
            # Linux系统使用systemctl
            echo -e "${BLUE}🐧 检测到Linux系统${NC}"
            sudo systemctl restart docker
        else
            echo -e "${YELLOW}⚠️  无法确定系统类型或缺少必要的服务管理工具${NC}"
            echo -e "${YELLOW}💡 请手动重启Docker服务${NC}"
        fi
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
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            echo -e "${BLUE}💻 检测到macOS系统${NC}"
            echo -e "${YELLOW}💡 请确保Docker Desktop已启动${NC}"
        elif command -v systemctl &> /dev/null; then
            # Linux系统使用systemctl
            echo -e "${BLUE}🐧 检测到Linux系统${NC}"
            sudo systemctl start docker
            sudo systemctl enable docker
        else
            echo -e "${YELLOW}⚠️  无法确定系统类型或缺少必要的服务管理工具${NC}"
            echo -e "${YELLOW}💡 请手动启动Docker服务${NC}"
        fi
        
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
pull_images() {
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
    
    # 仅从阿里云私有仓库拉取
    local aliyun_postgres_image="${ALIYUN_REGISTRY}/${ALIYUN_NAMESPACE}/postgres:16"
    
    local pulled_image=""
    
    # 尝试从阿里云私有仓库拉取
    echo -e "${CYAN}尝试从阿里云私有仓库拉取PostgreSQL镜像...${NC}"
    echo -e "${CYAN}尝试拉取镜像: ${aliyun_postgres_image}${NC}"
    
    if timeout 180 docker pull "$aliyun_postgres_image"; then
        echo -e "${GREEN}✅ 从阿里云私有仓库拉取成功: ${aliyun_postgres_image}${NC}"
        pulled_image="$aliyun_postgres_image"
    else
        echo -e "${RED}❌ 从阿里云私有仓库拉取失败: ${aliyun_postgres_image}${NC}"
        echo -e "${YELLOW}💡 请确保已将PostgreSQL镜像推送到阿里云私有仓库${NC}"
        echo -e "${YELLOW}💡 或检查网络连接和阿里云认证信息${NC}"
        # 即使拉取失败，也尝试使用本地已有的镜像
        if docker images "$aliyun_postgres_image" --format "table {{.Repository}}:{{.Tag}}" | grep -q "$aliyun_postgres_image"; then
            echo -e "${GREEN}✅ 使用本地已有的镜像: ${aliyun_postgres_image}${NC}"
            pulled_image="$aliyun_postgres_image"
        else
            # 如果阿里云私有仓库拉取失败且本地没有镜像，尝试使用默认的官方镜像
            echo -e "${YELLOW}⚠️  尝试使用默认的官方PostgreSQL镜像${NC}"
            local default_postgres_image="postgres:16"
            if timeout 180 docker pull "$default_postgres_image"; then
                echo -e "${GREEN}✅ 拉取默认PostgreSQL镜像成功: ${default_postgres_image}${NC}"
                pulled_image="$default_postgres_image"
            else
                echo -e "${RED}❌ 拉取默认PostgreSQL镜像失败${NC}"
                return 1
            fi
        fi
    fi
    
    # 更新全局PostgreSQL镜像变量
    POSTGRES_IMAGE="$pulled_image"
    echo -e "${GREEN}✅ 将使用PostgreSQL镜像: ${POSTGRES_IMAGE}${NC}"
    echo ""
}

# 创建Docker网络和数据目录
setup_data_directory() {
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
    
    # 检查.env文件是否存在
    if [[ ! -f "deploy2aliyun/.env" ]]; then
        echo -e "${RED}❌ 未找到 deploy2aliyun/.env 文件${NC}"
        echo -e "${YELLOW}💡 请先复制 deploy2aliyun/.env.example 为 deploy2aliyun/.env 并填写您的配置信息${NC}"
        echo -e "${YELLOW}💡 或参考部署文档中的基本使用步骤${NC}"
        exit 1
    fi
    
    # 显示数据目录信息
    echo -e "${CYAN}ℹ️  PostgreSQL数据将存储在: $(pwd)/$data_dir${NC}"
    echo -e "${CYAN}ℹ️  即使删除容器，数据也不会丢失${NC}"
    
    echo ""
}

# 启动PostgreSQL数据库容器
deploy_postgres() {
    echo -e "${BLUE}🐘 启动PostgreSQL数据库容器...${NC}"
    
    # 确保环境变量已加载，如果未设置则使用默认值
    local db_name="${DB_NAME:-yuyingbao}"
    local db_user="${DB_USERNAME:-yuyingbao}"
    local db_password="${DB_PASSWORD:-YuyingBao2024@Database}"
    
    # 检查是否已有数据库容器运行
    if docker ps | grep -q "yuyingbao-postgres"; then
        echo -e "${GREEN}✅ PostgreSQL容器已在运行，检查数据库连接...${NC}"
        # 验证数据库是否真正可用
        if docker exec yuyingbao-postgres pg_isready -U "${db_user}" -d "${db_name}" &>/dev/null; then
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
    echo -e "${CYAN}  数据库名称: ${db_name}${NC}"
    echo -e "${CYAN}  数据库用户: ${db_user}${NC}"
    echo -e "${CYAN}  数据库密码: ${db_password}${NC}"
    echo -e "${CYAN}  镜像: ${POSTGRES_IMAGE}${NC}"
    
    docker run -d \
        --name yuyingbao-postgres \
        --restart unless-stopped \
        --network ${NETWORK_NAME} \
        -p 5432:5432 \
        --memory=512m \
        --cpus=0.5 \
        -e POSTGRES_DB="${db_name}" \
        -e POSTGRES_USER="${db_user}" \
        -e POSTGRES_PASSWORD="${db_password}" \
        -e POSTGRES_INITDB_ARGS="--encoding=UTF8 --lc-collate=C --lc-ctype=C" \
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
            if docker exec yuyingbao-postgres pg_isready -U "${db_user}" -d "${db_name}" &>/dev/null; then
                echo ""
                echo -e "${GREEN}✅ 数据库接受连接，继续检查完整性...${NC}"
                
                # 进一步验证数据库是否完全可用
                echo -e "${BLUE}🔍 执行数据库连接测试查询...${NC}"
                echo -e "${CYAN}  命令: docker exec yuyingbao-postgres psql -U \"${db_user}\" -d \"${db_name}\" -c \"SELECT 1;\"${NC}"
                local psql_result=$(docker exec yuyingbao-postgres psql -U "${db_user}" -d "${db_name}" -c "SELECT 1;" 2>&1)
                local psql_exit_code=$?
                
                if [[ $psql_exit_code -eq 0 ]]; then
                    echo -e "${GREEN}✅ 数据库完全可用！${NC}"
                    echo -e "${CYAN}  查询结果:${NC}"
                    echo "$psql_result" | sed 's/^/    /'
                    
                    # 额外等待5秒确保稳定
                    echo -e "${BLUE}⏳ 额外等待5秒确保数据库稳定...${NC}"
                    sleep 5
                    
                    return 0
                else
                    echo -e "${RED}❌ 数据库连接测试失败${NC}"
                    echo -e "${CYAN}  退出码: $psql_exit_code${NC}"
                    echo -e "${CYAN}  错误信息:${NC}"
                    echo "$psql_result" | sed 's/^/    /'
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

# 等待PostgreSQL数据库启动
wait_for_postgres() {
    echo -e "${BLUE}⏳ 等待PostgreSQL数据库启动...${NC}"
    echo -e "${CYAN}   这可能需要30-60秒，请耐心等待...${NC}"
    
    # 确保环境变量已加载，如果未设置则使用默认值
    local db_name=${DB_NAME:-yuyingbao}
    local db_user=${DB_USERNAME:-yuyingbao}
    local db_password=${DB_PASSWORD:-YuyingBao2024@Database}
    
    echo -e "${CYAN}  等待数据库启动 - 数据库用户: ${db_user}${NC}"
    echo -e "${CYAN}  等待数据库启动 - 数据库名称: ${db_name}${NC}"
    
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
        if docker exec yuyingbao-postgres pg_isready -U "${db_user}" -d "${db_name}" &>/dev/null; then
            echo ""
            echo -e "${GREEN}✅ 数据库接受连接，继续检查完整性...${NC}"
            
            # 进一步验证数据库是否完全可用
            echo -e "${BLUE}🔍 执行数据库连接测试查询...${NC}"
            echo -e "${CYAN}  命令: docker exec yuyingbao-postgres psql -U \"${db_user}\" -d \"${db_name}\" -c \"SELECT 1;\"${NC}"
            local psql_result=$(docker exec yuyingbao-postgres psql -U "${db_user}" -d "${db_name}" -c "SELECT 1;" 2>&1)
            local psql_exit_code=$?
            
            if [[ $psql_exit_code -eq 0 ]]; then
                echo -e "${GREEN}✅ 数据库完全可用！${NC}"
                echo -e "${CYAN}  查询结果:${NC}"
                echo "$psql_result" | sed 's/^/    /'
                
                # 额外等待5秒确保稳定
                echo -e "${BLUE}⏳ 额外等待5秒确保数据库稳定...${NC}"
                sleep 5
                
                return 0
            else
                echo -e "${RED}❌ 数据库连接测试失败${NC}"
                echo -e "${CYAN}  退出码: $psql_exit_code${NC}"
                echo -e "${CYAN}  错误信息:${NC}"
                echo "$psql_result" | sed 's/^/    /'
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
}

# 启动应用容器
start_application() {
    echo -e "${BLUE}🚀 启动应用容器 (2G内存优化)...${NC}"
    
    # 确保环境变量已加载，如果未设置则使用默认值
    local db_name=${DB_NAME:-yuyingbao}
    local db_user=${DB_USERNAME:-yuyingbao}
    local db_password=${DB_PASSWORD:-YuyingBao2024@Database}
    
    # 再次验证数据库连接
    echo -e "${BLUE}🔍 启动前再次验证数据库连接...${NC}"
    echo -e "${CYAN}  数据库用户: ${db_user}${NC}"
    echo -e "${CYAN}  数据库名称: ${db_name}${NC}"
    if ! docker exec yuyingbao-postgres pg_isready -U "${db_user}" -d "${db_name}" &>/dev/null; then
        echo -e "${RED}❌ 数据库连接验证失败，无法启动应用${NC}"
        echo -e "${YELLOW}  尝试使用默认用户验证...${NC}"
        # 尝试使用默认用户验证
        if docker exec yuyingbao-postgres pg_isready &>/dev/null; then
            echo -e "${GREEN}✅ 数据库接受默认连接${NC}"
        else
            echo -e "${RED}❌ 数据库连接完全失败${NC}"
            echo -e "${YELLOW}查看PostgreSQL日志:${NC}"
            docker logs --tail=20 yuyingbao-postgres
            return 1
        fi
    fi
    echo -e "${GREEN}✅ 数据库连接验证通过${NC}"
    
    # 检查网络配置
    echo -e "${BLUE}🌐 检查Docker网络连接...${NC}"
    
    # 检查数据库容器是否在网络中
    if docker network inspect ${NETWORK_NAME} | grep -q "yuyingbao-postgres"; then
        echo -e "${GREEN}✅ PostgreSQL容器已加入网络: ${NETWORK_NAME}${NC}"
    else
        echo -e "${RED}❌ PostgreSQL容器未加入网络，正在修复...${NC}"
        docker network connect ${NETWORK_NAME} yuyingbao-postgres
        sleep 5
    fi
    
    # 等待一下确保网络配置生效
    echo -e "${BLUE}⏳ 等待10秒确保网络配置生效...${NC}"
    sleep 10
    
    # 启动应用容器，针对2G内存优化
    echo -e "${BLUE}🚀 启动应用容器，使用容器名 yuyingbao-postgres 作为数据库主机...${NC}"
    docker run -d \
        --name ${CONTAINER_NAME} \
        --restart unless-stopped \
        --network ${NETWORK_NAME} \
        -p 8080:8080 \
        --memory=1.5g \
        --cpus=1.5 \
        --env-file deploy2aliyun/.env \
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
    docker network inspect ${NETWORK_NAME} --format='{{.Name}}: {{.Driver}} {{range .IPAM.Config}}{{.Subnet}}{{end}}'
    
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
        if docker exec ${CONTAINER_NAME} ping -c 2 yuyingbao-postgres &>/dev/null; then
            echo -e "  ${GREEN}✅ 应用可以ping通数据库${NC}"
        else
            echo -e "  ${RED}❌ 应用无法ping通数据库${NC}"
        fi
        
        # 从应用容器测试数据库端口
        if docker exec ${CONTAINER_NAME} nc -z yuyingbao-postgres 5432 &>/dev/null; then
            echo -e "  ${GREEN}✅ 应用可以连接数据库端口${NC}"
        else
            echo -e "  ${RED}❌ 应用无法连接数据库端口${NC}"
        fi
    fi
    
    echo ""
    
    # 增强的诊断功能 - 类似于fix-postgres-connection.sh的功能
    echo -e "${BLUE}🔍 增强诊断 - 容器状态检查...${NC}"
    
    echo -e "${CYAN}应用容器状态:${NC}"
    if docker ps | grep -q "${CONTAINER_NAME}"; then
        echo -e "${GREEN}✅ 应用容器正在运行${NC}"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep "${CONTAINER_NAME}"
    else
        echo -e "${RED}❌ 应用容器未运行${NC}"
        if docker ps -a | grep -q "${CONTAINER_NAME}"; then
            echo "容器存在但已停止，查看最近日志："
            docker logs --tail=10 "${CONTAINER_NAME}"
        fi
    fi
    
    echo ""
    echo -e "${CYAN}数据库容器状态:${NC}"
    if docker ps | grep -q "yuyingbao-postgres"; then
        echo -e "${GREEN}✅ 数据库容器正在运行${NC}"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep "yuyingbao-postgres"
    else
        echo -e "${RED}❌ 数据库容器未运行${NC}"
        if docker ps -a | grep -q "yuyingbao-postgres"; then
            echo "容器存在但已停止，查看最近日志："
            docker logs --tail=10 "yuyingbao-postgres"
        fi
    fi
    echo ""
    
    # 检查DNS解析和hosts映射 - 类似于test-hosts-mapping.sh的功能
    if docker ps | grep -q "yuyingbao-postgres"; then
        local postgres_ip=$(docker inspect yuyingbao-postgres --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')
        echo -e "${CYAN}PostgreSQL容器IP地址: ${postgres_ip}${NC}"
        
        if docker ps | grep -q "${CONTAINER_NAME}"; then
            # 检查应用容器的hosts配置
            echo -e "${CYAN}检查应用容器的DNS解析:${NC}"
            docker exec "${CONTAINER_NAME}" cat /etc/hosts | grep -E "(postgres|yuyingbao-postgres)" || echo "未找到postgres相关的hosts映射"
            
            # 测试DNS解析 - 使用实际的容器名
            echo -e "${CYAN}DNS解析测试 (yuyingbao-postgres):${NC}"
            if docker exec "${CONTAINER_NAME}" nslookup yuyingbao-postgres &>/dev/null; then
                echo -e "  ${GREEN}✅ 成功${NC}"
                # 显示解析结果
                local resolved_ip=$(docker exec "${CONTAINER_NAME}" nslookup yuyingbao-postgres | grep "Address:" | tail -1 | awk '{print $2}')
                echo "    解析IP: $resolved_ip"
                if [[ "$resolved_ip" == "$postgres_ip" ]]; then
                    echo -e "    ${GREEN}✅ IP地址匹配正确${NC}"
                else
                    echo -e "    ${YELLOW}⚠️  IP地址不匹配（期望: $postgres_ip，实际: $resolved_ip）${NC}"
                fi
            else
                echo -e "  ${RED}❌ 失败${NC}"
            fi
            
            # 测试ping
            echo -e "${CYAN}Ping测试:${NC}"
            if docker exec "${CONTAINER_NAME}" ping -c 2 yuyingbao-postgres &>/dev/null; then
                echo -e "  ${GREEN}✅ 成功${NC}"
            else
                echo -e "  ${RED}❌ 失败${NC}"
            fi
            
            # 测试端口连接
            echo -e "${CYAN}端口连接测试 (5432):${NC}"
            if docker exec "${CONTAINER_NAME}" nc -z yuyingbao-postgres 5432 &>/dev/null; then
                echo -e "  ${GREEN}✅ 成功${NC}"
            else
                echo -e "  ${RED}❌ 失败${NC}"
            fi
        fi
    fi
    
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
            echo -e "${YELLOW}ℹ️  firewalld未运行（非错误，继续执行）${NC}"
        fi
    elif command -v ufw &> /dev/null; then
        # Ubuntu/Debian - ufw
        if ufw status | grep -q "Status: active"; then
            echo "配置ufw防火墙..."
            sudo ufw allow 8080/tcp
            echo -e "${GREEN}✅ ufw端口8080已开放${NC}"
        else
            echo -e "${YELLOW}ℹ️  ufw未启用（非错误，继续执行）${NC}"
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
        echo -e "${YELLOW}ℹ️  未检测到防火墙管理工具（非错误，继续执行）${NC}"
    fi
    
    echo -e "${YELLOW}💡 请确保阿里云安全组也已开放8080端口${NC}"
    echo ""
}

# 显示部署信息
show_completion_message() {
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

# 容器清理功能
cleanup_containers() {
    echo -e "${BLUE}🧹 清理容器...${NC}"
    
    # 停止并删除应用容器
    if docker ps -a --format "table {{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
        echo -e "  停止并删除应用容器..."
        docker stop ${CONTAINER_NAME} 2>/dev/null || true
        docker rm ${CONTAINER_NAME} 2>/dev/null || true
    fi
    
    # 停止并删除PostgreSQL容器
    if docker ps -a --format "table {{.Names}}" | grep -q "^yuyingbao-postgres$"; then
        echo -e "  停止并删除PostgreSQL容器..."
        docker stop yuyingbao-postgres 2>/dev/null || true
        docker rm yuyingbao-postgres 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✅ 容器清理完成${NC}"
    echo ""
    
    # 增强的清理功能 - 类似于test-container-cleanup.sh的功能
    echo -e "${BLUE}🔍 模拟容器清理过程...${NC}"
    echo ""
    
    local containers=("yuyingbao-server" "yuyingbao-postgres")
    
    for container in "${containers[@]}"; do
        echo -e "${YELLOW}📋 检查容器: ${container}${NC}"
        
        if docker ps -a --format "table {{.Names}}" | grep -q "^${container}$"; then
            if docker ps --format "table {{.Names}}" | grep -q "^${container}$"; then
                echo -e "  ➜ 需要停止并删除运行中的容器"
            else
                echo -e "  ➜ 需要删除已停止的容器"
            fi
        else
            echo -e "  ➜ 容器不存在，无需清理"
        fi
        echo ""
    done
}

# 数据目录检查功能
check_data_directory() {
    echo -e "${BLUE}📁 检查数据目录...${NC}"
    
    if [[ -d "./postgres_data" ]]; then
        local size=$(du -sh "./postgres_data" 2>/dev/null | cut -f1 || echo "无法计算")
        local owner=$(stat -c "%U:%G" "./postgres_data" 2>/dev/null || stat -f "%Su:%Sg" "./postgres_data" 2>/dev/null || echo "未知")
        local perms=$(stat -c "%a" "./postgres_data" 2>/dev/null || stat -f "%A" "./postgres_data" 2>/dev/null || echo "未知")
        
        echo -e "${GREEN}✅ 数据目录存在${NC}"
        echo -e "  路径: $(pwd)/postgres_data"
        echo -e "  大小: ${size}"
        echo -e "  权限: ${owner} (${perms})"
        
        # 检查权限是否正确
        if [[ "$owner" == "999:999" ]] || [[ "$owner" == "postgres:postgres" ]]; then
            echo -e "  ${GREEN}✅ 权限配置正确${NC}"
        else
            echo -e "  ${YELLOW}⚠️  权限可能需要调整${NC}"
            echo -e "  ${YELLOW}建议执行: sudo chown 999:999 ./postgres_data${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  数据目录不存在: ./postgres_data${NC}"
        echo -e "  ${BLUE}部署时将自动创建${NC}"
    fi
    echo ""
}

# 升级部署功能
upgrade_application() {
    echo -e "${BLUE}🔄 开始升级部署...${NC}"
    echo -e "${CYAN}此操作将保留数据库数据，仅更新应用容器${NC}"
    echo ""
    
    # 检查当前运行状态
    echo -e "${BLUE}📊 检查当前部署状态...${NC}"
    
    local app_running=false
    local db_running=false
    
    if docker ps | grep -q "${CONTAINER_NAME}"; then
        app_running=true
        echo -e "${GREEN}✅ 应用容器正在运行${NC}"
    else
        echo -e "${YELLOW}⚠️  应用容器未运行${NC}"
    fi
    
    if docker ps | grep -q "yuyingbao-postgres"; then
        db_running=true
        echo -e "${GREEN}✅ 数据库容器正在运行${NC}"
    else
        echo -e "${YELLOW}⚠️  数据库容器未运行${NC}"
    fi
    
    # 如果数据库未运行，询问是否要启动
    if [ "$db_running" = false ]; then
        echo -e "${YELLOW}数据库容器未运行，升级过程需要数据库${NC}"
        echo -e "${YELLOW}是否启动数据库容器？(y/N)${NC}"
        read -r start_db
        if [[ "$start_db" =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}🐘 启动数据库容器...${NC}"
            if ! deploy_postgres; then
                echo -e "${RED}❌ 数据库启动失败，升级中止${NC}"
                return 1
            fi
            if ! wait_for_postgres; then
                echo -e "${RED}❌ 数据库启动超时，升级中止${NC}"
                return 1
            fi
        else
            echo -e "${RED}❌ 升级需要数据库运行，操作取消${NC}"
            return 1
        fi
    fi
    
    # 备份当前应用容器信息（如果存在）
    if [ "$app_running" = true ]; then
        echo -e "${BLUE}💾 备份当前应用容器信息...${NC}"
        local current_image=$(docker inspect ${CONTAINER_NAME} --format='{{.Config.Image}}' 2>/dev/null || echo "未知")
        local current_created=$(docker inspect ${CONTAINER_NAME} --format='{{.Created}}' 2>/dev/null || echo "未知")
        echo -e "${CYAN}当前镜像: ${current_image}${NC}"
        echo -e "${CYAN}创建时间: ${current_created}${NC}"
        echo ""
    fi
    
    # 拉取最新镜像
    echo -e "${BLUE}📥 拉取最新应用镜像...${NC}"
    echo -e "${CYAN}镜像: ${DOCKER_IMAGE}${NC}"
    
    local old_image_id=""
    if docker images ${DOCKER_IMAGE} --format "{{.ID}}" | head -1 >/dev/null 2>&1; then
        old_image_id=$(docker images ${DOCKER_IMAGE} --format "{{.ID}}" | head -1)
    fi
    
    if ! docker pull ${DOCKER_IMAGE}; then
        echo -e "${RED}❌ 镜像拉取失败，升级中止${NC}"
        return 1
    fi
    
    local new_image_id=$(docker images ${DOCKER_IMAGE} --format "{{.ID}}" | head -1)
    
    # 检查镜像是否有更新
    if [ "$old_image_id" = "$new_image_id" ] && [ -n "$old_image_id" ]; then
        echo -e "${YELLOW}⚠️  镜像无更新，但仍继续升级流程${NC}"
        echo -e "${CYAN}镜像ID: ${new_image_id}${NC}"
    else
        echo -e "${GREEN}✅ 发现镜像更新${NC}"
        if [ -n "$old_image_id" ]; then
            echo -e "${CYAN}旧镜像ID: ${old_image_id}${NC}"
        fi
        echo -e "${CYAN}新镜像ID: ${new_image_id}${NC}"
    fi
    
    # 停止当前应用容器
    if [ "$app_running" = true ]; then
        echo -e "${BLUE}⏹️  停止当前应用容器...${NC}"
        if docker stop ${CONTAINER_NAME}; then
            echo -e "${GREEN}✅ 应用容器已停止${NC}"
        else
            echo -e "${RED}❌ 应用容器停止失败${NC}"
            return 1
        fi
        
        # 删除旧容器
        echo -e "${BLUE}🗑️  删除旧应用容器...${NC}"
        if docker rm ${CONTAINER_NAME}; then
            echo -e "${GREEN}✅ 旧应用容器已删除${NC}"
        else
            echo -e "${RED}❌ 旧应用容器删除失败${NC}"
            return 1
        fi
    fi
    
    # 验证数据库连接
    echo -e "${BLUE}🔍 验证数据库连接...${NC}"
    local db_name=${DB_NAME:-yuyingbao}
    local db_user=${DB_USERNAME:-yuyingbao}
    
    if ! docker exec yuyingbao-postgres pg_isready -U "${db_user}" -d "${db_name}" &>/dev/null; then
        echo -e "${RED}❌ 数据库连接验证失败${NC}"
        echo -e "${YELLOW}尝试修复数据库连接...${NC}"
        diagnose_and_fix_network
        
        # 再次尝试连接
        if ! docker exec yuyingbao-postgres pg_isready -U "${db_user}" -d "${db_name}" &>/dev/null; then
            echo -e "${RED}❌ 数据库连接仍然失败，升级中止${NC}"
            return 1
        fi
    fi
    echo -e "${GREEN}✅ 数据库连接验证通过${NC}"
    
    # 启动新的应用容器
    echo -e "${BLUE}🚀 启动新的应用容器...${NC}"
    if ! start_application; then
        echo -e "${RED}❌ 新应用容器启动失败${NC}"
        return 1
    fi
    
    # 等待应用启动
    echo -e "${BLUE}⏳ 等待新应用启动...${NC}"
    if ! wait_for_application; then
        echo -e "${RED}❌ 新应用启动失败或超时${NC}"
        echo -e "${YELLOW}查看应用日志: docker logs -f ${CONTAINER_NAME}${NC}"
        return 1
    fi
    
    # 升级完成
    echo -e "${GREEN}🎉 升级部署完成！${NC}"
    echo ""
    echo -e "${BLUE}📋 升级后状态:${NC}"
    echo -e "${CYAN}新镜像: ${DOCKER_IMAGE}${NC}"
    echo -e "${CYAN}新镜像ID: ${new_image_id}${NC}"
    echo -e "${CYAN}容器名称: ${CONTAINER_NAME}${NC}"
    
    # 显示当前容器状态
    echo ""
    echo -e "${BLUE}📊 当前容器状态:${NC}"
    docker ps --filter "name=yuyingbao" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}"
    
    # 健康检查
    echo ""
    echo -e "${BLUE}🔍 健康检查...${NC}"
    sleep 5  # 等待几秒确保应用完全启动
    
    if curl -f -s http://localhost:8080/api/actuator/health &>/dev/null; then
        echo -e "${GREEN}✅ 应用健康检查通过${NC}"
        local health_response=$(curl -s http://localhost:8080/api/actuator/health 2>/dev/null)
        if echo "$health_response" | grep -q '"status":"UP"'; then
            echo -e "${GREEN}✅ 应用运行状态正常${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  健康检查暂时失败，应用可能仍在启动中${NC}"
        echo -e "${YELLOW}请稍后手动检查: curl http://localhost:8080/api/actuator/health${NC}"
    fi
    
    # 清理旧镜像（可选）
    if [ -n "$old_image_id" ] && [ "$old_image_id" != "$new_image_id" ]; then
        echo ""
        echo -e "${YELLOW}💡 检测到旧镜像，是否清理？(y/N)${NC}"
        read -r cleanup_old
        if [[ "$cleanup_old" =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}🧹 清理旧镜像...${NC}"
            if docker rmi "$old_image_id" 2>/dev/null; then
                echo -e "${GREEN}✅ 旧镜像已清理${NC}"
            else
                echo -e "${YELLOW}⚠️  旧镜像清理失败（可能被其他容器使用）${NC}"
            fi
        fi
    fi
    
    echo ""
    echo -e "${GREEN}🎯 升级部署成功完成！${NC}"
    echo -e "${CYAN}应用地址: http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP'):8080${NC}"
    echo -e "${CYAN}健康检查: http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP'):8080/api/actuator/health${NC}"
}

# 智能部署选择功能
smart_deploy() {
    echo -e "${BLUE}🤖 智能部署检测...${NC}"
    
    local app_exists=false
    local db_exists=false
    
    # 检查是否存在应用容器
    if docker ps -a --format "table {{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
        app_exists=true
    fi
    
    # 检查是否存在数据库容器
    if docker ps -a --format "table {{.Names}}" | grep -q "^yuyingbao-postgres$"; then
        db_exists=true
    fi
    
    if [ "$app_exists" = true ] || [ "$db_exists" = true ]; then
        echo -e "${YELLOW}🔍 检测到现有部署：${NC}"
        if [ "$app_exists" = true ]; then
            echo -e "  ✓ 应用容器存在"
        fi
        if [ "$db_exists" = true ]; then
            echo -e "  ✓ 数据库容器存在"
        fi
        echo ""
        echo -e "${YELLOW}选择部署模式：${NC}"
        echo -e "  1) 升级部署 (保留数据，仅更新应用) [推荐]"
        echo -e "  2) 全新部署 (完全重新部署，数据将丢失)"
        echo -e "  3) 取消操作"
        echo ""
        echo -n "请选择 [1]: "
        read -r deploy_choice
        
        case "${deploy_choice:-1}" in
            1)
                echo -e "${GREEN}📈 选择升级部署模式${NC}"
                upgrade_application
                ;;
            2)
                echo -e "${RED}⚠️  选择全新部署模式${NC}"
                echo -e "${YELLOW}这将删除所有现有容器和数据，是否确认？(y/N)${NC}"
                read -r confirm_fresh
                if [[ "$confirm_fresh" =~ ^[Yy]$ ]]; then
                    cleanup_containers
                    full_deploy
                else
                    echo -e "${YELLOW}操作取消${NC}"
                    exit 0
                fi
                ;;
            3)
                echo -e "${YELLOW}操作取消${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}❌ 无效选择，操作取消${NC}"
                exit 1
                ;;
        esac
    else
        echo -e "${GREEN}🆕 检测到首次部署，执行全新部署${NC}"
        full_deploy
    fi
}

# 完整部署功能（重构原有deploy功能）
full_deploy() {
    echo -e "${BLUE}🚀 执行完整部署...${NC}"
    check_root
    show_system_info
    check_system_resources
    install_docker
    login_aliyun_registry
    pull_images
    pull_postgres_image
    setup_data_directory
    deploy_postgres
    wait_for_postgres
    start_application
    wait_for_application
    configure_firewall
    show_completion_message
}

# 显示帮助信息
show_help() {
    echo "阿里云ECS部署脚本 - 育婴宝后端服务"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  deploy        智能部署 (默认) - 自动检测环境并选择部署模式"
    echo "  upgrade       升级部署 - 保留数据库，仅更新应用容器"
    echo "  fresh         全新部署 - 完全重新部署（数据将丢失）"
    echo "  stop          停止应用容器"
    echo "  stop-all      停止所有容器（包括数据库）"
    echo "  status        查看部署状态"
    echo "  reset-data    彻底清理所有数据（危险操作）"
    echo "  diagnose      网络诊断和修复（整合了网络连接问题诊断和hosts映射测试）"
    echo "  cleanup       清理旧镜像和容器（整合了容器清理功能）"
    echo "  check-data    检查数据目录（整合了数据目录检查功能）"
    echo "  help          显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0            # 智能部署（推荐）"
    echo "  $0 deploy     # 智能部署（推荐）"
    echo "  $0 upgrade    # 升级部署（保留数据）"
    echo "  $0 fresh      # 全新部署（数据将清空）"
    echo "  $0 stop       # 停止应用容器"
    echo "  $0 status     # 查看部署状态"
    echo "  $0 diagnose   # 网络问题诊断（包含增强的网络诊断和DNS解析测试）"
    echo "  $0 cleanup    # 清理容器（包含详细的容器状态检查）"
    echo "  $0 check-data # 检查数据目录（包含详细的权限和大小检查）"
    echo ""
    echo "部署模式说明:"
    echo "  🤖 智能部署: 自动检测现有部署，提供升级/全新部署选择"
    echo "  📈 升级部署: 保留PostgreSQL数据，仅更新应用容器"
    echo "  🆕 全新部署: 清空所有容器和数据，完全重新部署"
    echo ""
}

# 命令行参数处理
case "${1:-deploy}" in
    "deploy")
        smart_deploy
        ;;
    "upgrade")
        upgrade_application
        ;;
    "fresh")
        echo -e "${RED}⚠️  全新部署将删除所有现有容器和数据！${NC}"
        echo -e "${YELLOW}是否确认继续？(y/N)${NC}"
        read -r confirm_fresh
        if [[ "$confirm_fresh" =~ ^[Yy]$ ]]; then
            cleanup_containers
            full_deploy
        else
            echo -e "${YELLOW}操作取消${NC}"
            exit 0
        fi
        ;;
    "stop")
        echo -e "${BLUE}⏹️  停止应用容器...${NC}"
        docker stop ${CONTAINER_NAME} 2>/dev/null || echo -e "${YELLOW}应用容器未运行${NC}"
        ;;
    "stop-all")
        echo -e "${BLUE}⏹️  停止所有容器...${NC}"
        docker stop ${CONTAINER_NAME} yuyingbao-postgres 2>/dev/null || echo -e "${YELLOW}部分容器未运行${NC}"
        ;;
    "status")
        echo -e "${BLUE}📊 容器状态:${NC}"
        docker ps -a --filter "name=yuyingbao"
        echo ""
        check_data_directory
        ;;
    "reset-data")
        echo -e "${RED}🔥 警告: 此操作将删除所有数据!${NC}"
        echo -e "${YELLOW}是否继续？(y/N)${NC}"
        read -r confirm
        if [[ "$confirm" =~ ^[Yy]$ ]]; then
            cleanup_containers
            echo -e "${BLUE}🗑️  删除本地数据目录...${NC}"
            if [[ -d "./postgres_data" ]]; then
                sudo rm -rf "./postgres_data"
                echo -e "${GREEN}✅ 数据目录已删除${NC}"
            fi
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
    "cleanup")
        cleanup_containers
        ;;
    "check-data")
        check_data_directory
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