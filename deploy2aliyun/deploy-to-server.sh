#!/bin/bash

# 阿里云服务器部署脚本 - 2CPU 2G内存优化版本
# 适用于育婴宝后端服务在阿里云ECS上的自动化部署

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置变量
DOCKER_IMAGE="crpi-zyq1wc1umfuictwx.cn-shanghai.personal.cr.aliyuncs.com/aires-docker/yuyingbao:latest"
CONTAINER_NAME="yuyingbao-server"
NGINX_CONTAINER_NAME="yuyingbao-nginx"
NETWORK_NAME="yuyingbao-prod-network"

echo -e "${BLUE}=== 阿里云服务器部署脚本 (2CPU 2G内存优化) ===${NC}"
echo -e "${YELLOW}Docker镜像: ${DOCKER_IMAGE}${NC}"
echo ""

# 检查是否为root用户
check_root() {
    if [[ $EUID -eq 0 ]]; then
        echo -e "${YELLOW}⚠️ 检测到root用户，建议使用普通用户 + sudo${NC}"
    fi
}

# 检查Docker环境
check_docker() {
    echo -e "${BLUE}🔍 检查Docker环境...${NC}"
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker未安装，正在安装...${NC}"
        install_docker
    else
        echo -e "${GREEN}✅ Docker已安装${NC}"
    fi
    
    if ! docker info &> /dev/null; then
        echo -e "${YELLOW}🔄 启动Docker服务...${NC}"
        sudo systemctl start docker
        sudo systemctl enable docker
    fi
    
    echo -e "${GREEN}✅ Docker环境正常${NC}"
}

# 安装Docker (CentOS/Ubuntu)
install_docker() {
    echo -e "${BLUE}📦 安装Docker...${NC}"
    
    if command -v yum &> /dev/null; then
        # CentOS/RHEL
        sudo yum update -y
        sudo yum install -y yum-utils
        sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
        sudo yum install -y docker-ce docker-ce-cli containerd.io
    elif command -v apt &> /dev/null; then
        # Ubuntu/Debian
        sudo apt update
        sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
        echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
        sudo apt update
        sudo apt install -y docker-ce docker-ce-cli containerd.io
    else
        echo -e "${RED}❌ 不支持的系统，请手动安装Docker${NC}"
        exit 1
    fi
    
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker $USER
    
    echo -e "${GREEN}✅ Docker安装完成${NC}"
    echo -e "${YELLOW}💡 请重新登录以使用户组生效${NC}"
}

# 检查系统资源
check_system_resources() {
    echo -e "${BLUE}🔍 检查系统资源...${NC}"
    
    # 检查内存
    TOTAL_MEM=$(free -m | grep '^Mem:' | awk '{print $2}')
    AVAILABLE_MEM=$(free -m | grep '^Mem:' | awk '{print $7}')
    
    echo -e "${BLUE}💾 内存信息:${NC}"
    echo -e "总内存: ${TOTAL_MEM}MB"
    echo -e "可用内存: ${AVAILABLE_MEM}MB"
    
    if [[ $AVAILABLE_MEM -lt 512 ]]; then
        echo -e "${RED}⚠️ 可用内存不足512MB，可能影响应用性能${NC}"
    else
        echo -e "${GREEN}✅ 内存资源充足${NC}"
    fi
    
    # 检查CPU
    CPU_CORES=$(nproc)
    echo -e "${BLUE}🏃 CPU核心数: ${CPU_CORES}${NC}"
    
    # 检查磁盘空间
    DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    echo -e "${BLUE}💿 磁盘使用率: ${DISK_USAGE}%${NC}"
    
    if [[ $DISK_USAGE -gt 85 ]]; then
        echo -e "${YELLOW}⚠️ 磁盘使用率较高，建议清理空间${NC}"
    fi
}

# 登录阿里云镜像仓库
login_aliyun_registry() {
    echo -e "${BLUE}🔐 登录阿里云镜像仓库...${NC}"
    
    echo -e "${YELLOW}请输入阿里云镜像仓库登录信息:${NC}"
    echo -e "${YELLOW}用户名: xulei0331@126.com${NC}"
    echo -e "${YELLOW}密码: [请输入您的访问密码]${NC}"
    
    docker login crpi-zyq1wc1umfuictwx.cn-shanghai.personal.cr.aliyuncs.com -u xulei0331@126.com
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ 阿里云镜像仓库登录成功${NC}"
    else
        echo -e "${RED}❌ 登录失败，请检查用户名和密码${NC}"
        exit 1
    fi
}

# 拉取最新镜像
pull_latest_image() {
    echo -e "${BLUE}📥 拉取最新镜像...${NC}"
    
    docker pull ${DOCKER_IMAGE}
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ 镜像拉取成功${NC}"
    else
        echo -e "${RED}❌ 镜像拉取失败${NC}"
        exit 1
    fi
}

# 停止旧容器
stop_old_containers() {
    echo -e "${BLUE}🛑 停止旧容器...${NC}"
    
    if docker ps -q -f name=${CONTAINER_NAME} | grep -q .; then
        echo "停止容器: ${CONTAINER_NAME}"
        docker stop ${CONTAINER_NAME}
        docker rm ${CONTAINER_NAME}
    fi
    
    if docker ps -q -f name=${NGINX_CONTAINER_NAME} | grep -q .; then
        echo "停止容器: ${NGINX_CONTAINER_NAME}"
        docker stop ${NGINX_CONTAINER_NAME}
        docker rm ${NGINX_CONTAINER_NAME}
    fi
    
    echo -e "${GREEN}✅ 旧容器已停止${NC}"
}

# 创建Docker网络
create_network() {
    echo -e "${BLUE}🌐 创建Docker网络...${NC}"
    
    if ! docker network ls | grep -q ${NETWORK_NAME}; then
        docker network create ${NETWORK_NAME}
        echo -e "${GREEN}✅ 网络创建成功: ${NETWORK_NAME}${NC}"
    else
        echo -e "${GREEN}✅ 网络已存在: ${NETWORK_NAME}${NC}"
    fi
}

# 启动应用容器 (2G内存优化)
start_app_container() {
    echo -e "${BLUE}🚀 启动应用容器 (2G内存优化)...${NC}"
    
    # 检查环境变量文件
    if [[ ! -f ".env" ]]; then
        echo -e "${YELLOW}⚠️ 未找到.env文件，创建示例文件...${NC}"
        create_env_file
    fi
    
    # 启动应用容器
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
    else
        echo -e "${RED}❌ 应用容器启动失败${NC}"
        docker logs ${CONTAINER_NAME}
        exit 1
    fi
}

# 创建环境变量文件
create_env_file() {
    cat > .env << 'EOF'
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=yuyingbao
DB_USERNAME=your_db_username
DB_PASSWORD=your_db_password

# JWT配置
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRATION=86400000

# 微信小程序配置
WECHAT_APP_ID=your_wechat_app_id
WECHAT_APP_SECRET=your_wechat_app_secret

# 其他配置
SERVER_PORT=8080
LOGGING_LEVEL_ROOT=INFO
EOF

    echo -e "${YELLOW}📝 已创建.env文件模板，请编辑配置实际的环境变量${NC}"
    echo -e "${YELLOW}💡 编辑命令: nano .env 或 vim .env${NC}"
}

# 健康检查
health_check() {
    echo -e "${BLUE}🏥 执行健康检查...${NC}"
    
    echo "等待应用启动..."
    sleep 30
    
    for i in {1..12}; do
        if curl -f http://localhost:8080/actuator/health &>/dev/null; then
            echo -e "${GREEN}✅ 应用健康检查通过${NC}"
            return 0
        fi
        echo -n "."
        sleep 10
    done
    
    echo -e "${RED}❌ 健康检查失败，查看日志...${NC}"
    docker logs --tail=20 ${CONTAINER_NAME}
    return 1
}

# 显示部署信息
show_deployment_info() {
    echo ""
    echo -e "${GREEN}🎉 部署完成！${NC}"
    echo ""
    echo -e "${BLUE}📋 服务信息:${NC}"
    echo -e "应用地址: http://$(curl -s ifconfig.me):8080"
    echo -e "健康检查: http://$(curl -s ifconfig.me):8080/actuator/health"
    echo -e "容器名称: ${CONTAINER_NAME}"
    echo -e "镜像版本: ${DOCKER_IMAGE}"
    echo ""
    echo -e "${BLUE}🔧 管理命令:${NC}"
    echo -e "查看日志: docker logs -f ${CONTAINER_NAME}"
    echo -e "重启应用: docker restart ${CONTAINER_NAME}"
    echo -e "停止应用: docker stop ${CONTAINER_NAME}"
    echo -e "查看状态: docker ps"
    echo ""
    echo -e "${BLUE}📊 资源使用:${NC}"
    docker stats --no-stream ${CONTAINER_NAME}
}

# 清理旧镜像
cleanup_old_images() {
    echo -e "${BLUE}🧹 清理旧镜像...${NC}"
    
    # 清理无用的镜像
    docker image prune -f
    
    echo -e "${GREEN}✅ 清理完成${NC}"
}

# 主执行流程
main() {
    echo -e "${BLUE}开始部署流程...${NC}"
    echo ""
    
    check_root
    check_system_resources
    check_docker
    login_aliyun_registry
    pull_latest_image
    create_network
    stop_old_containers
    start_app_container
    
    if health_check; then
        show_deployment_info
        cleanup_old_images
        echo ""
        echo -e "${GREEN}🎊 部署成功完成！${NC}"
    else
        echo -e "${RED}❌ 部署失败，请检查日志${NC}"
        exit 1
    fi
}

# 其他命令处理
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "pull")
        login_aliyun_registry
        pull_latest_image
        ;;
    "restart")
        docker restart ${CONTAINER_NAME}
        echo -e "${GREEN}✅ 应用已重启${NC}"
        ;;
    "logs")
        docker logs -f ${CONTAINER_NAME}
        ;;
    "status")
        docker ps -f name=${CONTAINER_NAME}
        echo ""
        docker stats --no-stream ${CONTAINER_NAME}
        ;;
    "health")
        health_check
        ;;
    "cleanup")
        cleanup_old_images
        ;;
    "help"|"-h"|"--help")
        echo "用法: $0 [命令]"
        echo ""
        echo "命令:"
        echo "  deploy   完整部署 (默认)"
        echo "  pull     拉取最新镜像"
        echo "  restart  重启应用"
        echo "  logs     查看日志"
        echo "  status   查看状态"
        echo "  health   健康检查"
        echo "  cleanup  清理镜像"
        echo "  help     显示帮助"
        ;;
    *)
        echo -e "${RED}❌ 未知命令: $1${NC}"
        echo "使用 $0 help 查看帮助"
        exit 1
        ;;
esac