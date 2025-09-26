#!/bin/bash

# 育婴宝后端服务 Docker 构建和推送脚本
# 目标：阿里云容器镜像服务
# 集成功能：镜像构建、PostgreSQL镜像处理、推送到阿里云、Docker镜像源配置

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置变量
APP_NAME="yuyingbao-server"
VERSION="v0.5.0"
BUILD_DATE=$(date +"%Y%m%d%H%M%S")
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

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
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            if command -v brew >/dev/null 2>&1; then
                brew install jq
            else
                echo -e "${RED}❌ 未安装Homebrew，请手动安装jq${NC}"
                echo -e "${YELLOW}💡 macOS安装命令: brew install jq${NC}"
                echo -e "${YELLOW}💡 或者先安装Homebrew: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"${NC}"
                exit 1
            fi
        elif [[ -f /etc/redhat-release ]]; then
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
            echo -e "${YELLOW}💡 macOS安装命令: brew install jq${NC}"
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
    else
        echo -e "${RED}❌ jq不可用，无法解析JSON配置文件${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  未找到阿里云配置文件 ${CONFIG_FILE}${NC}"
    echo -e "${YELLOW}💡 请复制 aliyun-config.json.example 为 aliyun-config.json 并填写您的配置信息${NC}"
    echo ""
fi

# 完整镜像名称
FULL_IMAGE_NAME="${ALIYUN_REGISTRY}/${ALIYUN_NAMESPACE}/${ALIYUN_REPO}"

echo -e "${BLUE}=== 育婴宝后端服务 Docker 构建和推送 ===${NC}"
echo -e "${YELLOW}应用名称: ${APP_NAME}${NC}"
echo -e "${YELLOW}版本: ${VERSION}${NC}"
echo -e "${YELLOW}构建时间: ${BUILD_DATE}${NC}"
echo -e "${YELLOW}Git提交: ${GIT_COMMIT}${NC}"
echo -e "${YELLOW}目标仓库: ${FULL_IMAGE_NAME}${NC}"
echo ""

# 检查Docker是否运行
check_docker() {
    echo -e "${BLUE}🔍 检查 Docker 环境...${NC}"
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker 未安装${NC}"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        echo -e "${RED}❌ Docker 未运行，请启动 Docker${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Docker 环境正常${NC}"
}

# 配置Docker镜像源（集成功能）
configure_docker_mirrors() {
    echo -e "${BLUE}🚀 配置Docker镜像源优化...${NC}"
    
    # 检查是否已配置镜像源
    if docker info 2>/dev/null | grep -q "Registry Mirrors"; then
        echo -e "${GREEN}✅ Docker镜像源已配置${NC}"
        return 0
    fi
    
    echo -e "${YELLOW}💡 检测到未配置镜像源，是否配置以提升拉取速度？(y/N)${NC}"
    read -r configure_mirrors
    
    if [[ "$configure_mirrors" =~ ^[Yy]$ ]]; then
        # 备份原有配置
        if [[ -f /etc/docker/daemon.json ]]; then
            sudo cp /etc/docker/daemon.json /etc/docker/daemon.json.backup.$(date +%Y%m%d_%H%M%S)
            echo -e "${GREEN}✅ 原配置已备份${NC}"
        fi
        
        # 创建配置目录
        sudo mkdir -p /etc/docker
        
        # 写入配置文件
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
        
        echo -e "${GREEN}✅ Docker配置文件已更新${NC}"
        
        # 重启Docker服务 - 根据操作系统类型选择正确的命令
        echo -e "${BLUE}🔄 重启Docker服务...${NC}"
        
        # 检测操作系统类型
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
            sudo systemctl daemon-reload
            sudo systemctl restart docker
        else
            echo -e "${YELLOW}⚠️  无法确定系统类型或缺少必要的服务管理工具${NC}"
            echo -e "${YELLOW}💡 请手动重启Docker服务${NC}"
        fi
        
        # 等待Docker服务重启
        sleep 3
        
        # 检查Docker服务状态
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS上检查Docker进程
            if pgrep -x "Docker" > /dev/null || docker info &> /dev/null; then
                echo -e "${GREEN}✅ Docker服务重启成功${NC}"
            else
                echo -e "${RED}❌ Docker服务重启失败${NC}"
                echo -e "${YELLOW}请检查Docker Desktop是否正常运行${NC}"
                exit 1
            fi
        elif command -v systemctl &> /dev/null; then
            # Linux系统检查
            if sudo systemctl is-active --quiet docker; then
                echo -e "${GREEN}✅ Docker服务重启成功${NC}"
            else
                echo -e "${RED}❌ Docker服务重启失败${NC}"
                echo -e "${YELLOW}请检查配置文件和系统日志${NC}"
                exit 1
            fi
        fi
    fi
    echo ""
}

check_aliyun_config() {
    echo -e "${BLUE}🔍 检查阿里云配置...${NC}"
    
    echo -e "${GREEN}✅ 阿里云镜像仓库配置检查通过${NC}"
    echo -e "${YELLOW}镜像仓库: ${FULL_IMAGE_NAME}${NC}"
    echo -e "${YELLOW}用户名: ${ALIYUN_USERNAME}${NC}"
}

# 构建镜像
build_image() {
    echo -e "${BLUE}🔨 构建 Docker 镜像...${NC}"
    
    # 切换到项目根目录
    cd "$(dirname "$0")/.."
    
    # 构建镜像，使用多个标签 - 针对2G内存服务器优化
    docker build \
        -f deploy2aliyun/Dockerfile \
        -t "${FULL_IMAGE_NAME}:${VERSION}" \
        -t "${FULL_IMAGE_NAME}:${VERSION}-${BUILD_DATE}" \
        -t "${FULL_IMAGE_NAME}:latest" \
        --build-arg BUILD_DATE="${BUILD_DATE}" \
        --build-arg GIT_COMMIT="${GIT_COMMIT}" \
        --platform linux/amd64 \
        .
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ 镜像构建成功${NC}"
    else
        echo -e "${RED}❌ 镜像构建失败${NC}"
        exit 1
    fi
}

# 拉取并打标签PostgreSQL镜像
build_postgres_image() {
    echo -e "${BLUE}📥 处理PostgreSQL镜像...${NC}"
    
    local postgres_image="postgres:16"
    local pulled_image=""
    
    # 首先检查本地是否已有PostgreSQL镜像
    echo -e "${CYAN}检查本地PostgreSQL镜像: ${postgres_image}${NC}"
    
    if docker images "$postgres_image" | grep -q "postgres"; then
        echo -e "${GREEN}✅ 发现本地PostgreSQL镜像: ${postgres_image}${NC}"
        pulled_image="$postgres_image"
    else
        echo -e "${YELLOW}⚠️  本地未找到PostgreSQL镜像，尝试拉取...${NC}"
        
        # 尝试拉取PostgreSQL 16镜像，最多重试3次
        echo -e "${CYAN}拉取PostgreSQL 16镜像: ${postgres_image}${NC}"
        
        local attempts=0
        local max_attempts=3
        
        while [ $attempts -lt $max_attempts ]; do
            echo -e "${YELLOW}尝试 $((attempts + 1))/$max_attempts${NC}"
            
            if timeout 300 docker pull "$postgres_image"; then
                echo -e "${GREEN}✅ 拉取成功: ${postgres_image}${NC}"
                pulled_image="$postgres_image"
                break
            else
                attempts=$((attempts + 1))
                echo -e "${YELLOW}⚠️  拉取失败 (${attempts}/${max_attempts}): ${postgres_image}${NC}"
                
                if [ $attempts -lt $max_attempts ]; then
                    echo -e "${BLUE}等待5秒后重试...${NC}"
                    sleep 5
                fi
            fi
        done
    fi
    
    if [[ -z "$pulled_image" ]]; then
        echo -e "${RED}❌ PostgreSQL镜像获取失败！${NC}"
        echo -e "${YELLOW}💡 解决建议:${NC}"
        echo -e "1. 检查网络连接: ping registry-1.docker.io"
        echo -e "2. 检查Docker镜像源配置: docker info | grep 'Registry Mirrors'"
        echo -e "3. 重新运行本脚本并选择配置镜像源"
        echo -e "4. 手动拉取镜像: docker pull postgres:16"
        echo -e "${CYAN}🚀 将继续构建应用镜像，但不包含PostgreSQL镜像${NC}"
        return 1
    fi
    
    # 为PostgreSQL镜像打标签
    local postgres_tag="${ALIYUN_REGISTRY}/${ALIYUN_NAMESPACE}/postgres:${pulled_image##*:}"
    
    echo -e "${BLUE}🏷️  为PostgreSQL镜像打标签...${NC}"
    echo -e "${CYAN}原始镜像: ${pulled_image}${NC}"
    echo -e "${CYAN}目标标签: ${postgres_tag}${NC}"
    
    if docker tag "$pulled_image" "$postgres_tag"; then
        echo -e "${GREEN}✅ PostgreSQL镜像打标签成功${NC}"
        POSTGRES_TAG="$postgres_tag"
        
        # 显示本地镜像信息
        echo -e "${BLUE}📋 PostgreSQL本地镜像信息:${NC}"
        docker images "$postgres_tag" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
        
        return 0
    else
        echo -e "${RED}❌ PostgreSQL镜像打标签失败${NC}"
        return 1
    fi
}

# 测试镜像
test_image() {
    echo -e "${BLUE}🧪 测试镜像...${NC}"
    
    # 简单的镜像测试
    docker inspect "${FULL_IMAGE_NAME}:${VERSION}" > /dev/null
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ 镜像测试通过${NC}"
        
        # 显示镜像信息
        echo -e "${BLUE}📊 镜像信息:${NC}"
        docker images "${FULL_IMAGE_NAME}" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
    else
        echo -e "${RED}❌ 镜像测试失败${NC}"
        exit 1
    fi
}

login_aliyun() {
    echo -e "${BLUE}🔐 登录阿里云容器镜像服务...${NC}"
    
    echo -e "${YELLOW}💡 请输入阿里云容器镜像服务的登录信息：${NC}"
    echo -e "${YELLOW}   用户名：${ALIYUN_USERNAME}${NC}"
    echo -e "${YELLOW}   密码：访问凭证密码或Personal Access Token${NC}"
    echo ""
    
    docker login "${ALIYUN_REGISTRY}" -u "${ALIYUN_USERNAME}"
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ 阿里云登录成功${NC}"
    else
        echo -e "${RED}❌ 阿里云登录失败${NC}"
        exit 1
    fi
}

# 推送镜像
push_image() {
    echo -e "${BLUE}📤 推送镜像到阿里云...${NC}"
    
    # 推送所有标签
    echo "推送版本标签: ${VERSION}"
    docker push "${FULL_IMAGE_NAME}:${VERSION}"
    
    echo "推送构建标签: ${VERSION}-${BUILD_DATE}"
    docker push "${FULL_IMAGE_NAME}:${VERSION}-${BUILD_DATE}"
    
    echo "推送最新标签: latest"
    docker push "${FULL_IMAGE_NAME}:latest"
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ 镜像推送成功${NC}"
    else
        echo -e "${RED}❌ 镜像推送失败${NC}"
        exit 1
    fi
}

# 推送PostgreSQL镜像
push_postgres_image() {
    echo -e "${BLUE}🚀 推送PostgreSQL镜像...${NC}"
    
    if [[ -n "$POSTGRES_TAG" ]]; then
        echo -e "${CYAN}推送到: ${POSTGRES_TAG}${NC}"
        
        # 检查本地是否有该镜像（使用更宽松的匹配）
        if docker images --format "table {{.Repository}}:{{.Tag}}" | grep -q "${POSTGRES_TAG}"; then
            echo -e "${GREEN}✅ 本地镜像存在，开始推送...${NC}"
            
            # 显示镜像详细信息
            echo -e "${BLUE}📋 准备推送的镜像信息:${NC}"
            docker images "${POSTGRES_TAG}" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
            
            if docker push "$POSTGRES_TAG"; then
                echo -e "${GREEN}✅ PostgreSQL镜像推送成功！${NC}"
                echo -e "${CYAN}推送地址: ${POSTGRES_TAG}${NC}"
            else
                echo -e "${RED}❌ PostgreSQL镜像推送失败${NC}"
                echo -e "${YELLOW}请检查网络连接和阿里云登录状态${NC}"
            fi
        else
            echo -e "${RED}❌ 本地没有找到PostgreSQL镜像: ${POSTGRES_TAG}${NC}"
            echo -e "${YELLOW}💡 调试信息：${NC}"
            echo -e "${CYAN}本地所有PostgreSQL相关镜像：${NC}"
            docker images | grep postgres
            echo -e "${YELLOW}请检查PostgreSQL镜像构建是否成功${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  没有PostgreSQL镜像需要推送${NC}"
        echo -e "${CYAN}原因： PostgreSQL镜像拉取或打标签失败${NC}"
        echo -e "${YELLOW}💡 如需PostgreSQL镜像，请检查网络后重试${NC}"
    fi
    
    echo ""
}

# 清理本地镜像（可选）
cleanup() {
    echo -e "${BLUE}🧹 是否清理本地镜像？ (y/N)${NC}"
    read -r cleanup_choice
    
    if [[ "$cleanup_choice" =~ ^[Yy]$ ]]; then
        echo "清理本地镜像..."
        docker rmi "${FULL_IMAGE_NAME}:${VERSION}-${BUILD_DATE}" 2>/dev/null || true
        echo -e "${GREEN}✅ 清理完成${NC}"
    fi
}

# 显示部署信息
show_deploy_info() {
    echo ""
    echo -e "${GREEN}🎉 构建和推送完成！${NC}"
    echo ""
    echo -e "${BLUE}📋 部署信息：${NC}"
    echo -e "镜像地址: ${FULL_IMAGE_NAME}:${VERSION}"
    echo -e "构建版本: ${FULL_IMAGE_NAME}:${VERSION}-${BUILD_DATE}"
    echo -e "最新版本: ${FULL_IMAGE_NAME}:latest"
    
    if [[ -n "$POSTGRES_TAG" ]]; then
        echo -e "PostgreSQL镜像: ${POSTGRES_TAG}"
    fi
    echo ""
    echo -e "${BLUE}🚀 2G内存服务器部署命令示例：${NC}"
    echo "docker run -d \\"
    echo "  --name yuyingbao-server \\"
    echo "  --restart unless-stopped \\"
    echo "  -p 8080:8080 \\"
    echo "  --memory=1.5g \\"
    echo "  --cpus=1.5 \\"
    echo "  -e SPRING_PROFILES_ACTIVE=prod \\"
    echo "  -e SERVER_TOMCAT_THREADS_MAX=50 \\"
    echo "  -e SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE=10 \\"
    echo "  -e SPRING_DATASOURCE_HIKARI_MINIMUM_IDLE=2 \\"
    echo "  -e DB_HOST=your-db-host \\"
    echo "  -e DB_USERNAME=your-db-user \\"
    echo "  -e DB_PASSWORD=your-db-password \\"
    echo "  ${FULL_IMAGE_NAME}:${VERSION}"
    echo ""
    echo -e "${BLUE}📖 更多信息请查看：${NC}"
    echo "- 阿里云容器镜像服务控制台"
    echo "- 项目文档: document/v0.5/"
}



# 显示帮助信息
show_help() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help     显示帮助信息"
    echo "  -v, --version  显示版本信息"
    echo "  --skip-postgres 跳过PostgreSQL镜像处理"
    echo "  --force-postgres 强制重新拉取PostgreSQL镜像"
    echo ""
    echo "环境变量:"
    echo "  ALIYUN_NAMESPACE  阿里云镜像仓库命名空间"
    echo "  ALIYUN_REGISTRY   阿里云镜像仓库地址"
    echo ""
    echo "示例:"
    echo "  $0                    # 执行完整的构建和推送流程"
    echo "  $0 --skip-postgres    # 跳过PostgreSQL镜像处理"
    echo "  $0 --force-postgres   # 强制重新拉取PostgreSQL镜像"
    echo "  ALIYUN_NAMESPACE=my-namespace $0  # 使用自定义命名空间"
}

# 解析命令行参数
SKIP_POSTGRES=false
FORCE_POSTGRES=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--version)
            echo "育婴宝 Docker 构建脚本 ${VERSION}"
            exit 0
            ;;
        --skip-postgres)
            SKIP_POSTGRES=true
            shift
            ;;
        --force-postgres)
            FORCE_POSTGRES=true
            shift
            ;;
        *)
            echo "未知参数: $1"
            show_help
            exit 1
            ;;
    esac
done

# 主执行流程
main() {
    echo -e "${BLUE}开始构建和推送流程...${NC}"
    echo ""
    
    check_docker
    configure_docker_mirrors
    check_aliyun_config
    build_image
    
    # PostgreSQL镜像构建（根据参数决定是否处理）
    if [[ "$SKIP_POSTGRES" == true ]]; then
        echo -e "${YELLOW}⚠️  跳过PostgreSQL镜像处理（用户要求）${NC}"
    else
        if [[ "$FORCE_POSTGRES" == true ]]; then
            echo -e "${BLUE}🔄 强制重新处理PostgreSQL镜像${NC}"
            # 删除本地PostgreSQL镜像（如果存在）
            docker rmi postgres:16 2>/dev/null || true
        fi
        
        if build_postgres_image; then
            echo -e "${GREEN}✅ PostgreSQL镜像处理成功${NC}"
        else
            echo -e "${YELLOW}⚠️  PostgreSQL镜像处理失败，将继续构建应用镜像${NC}"
        fi
    fi
    
    test_image
    login_aliyun
    push_image
    
    # 只有在未跳过PostgreSQL处理时才推送
    if [[ "$SKIP_POSTGRES" != true ]]; then
        push_postgres_image
    fi
    
    cleanup
    show_deploy_info
    
    echo ""
    echo -e "${GREEN}🎊 所有操作完成！${NC}"
}

# 执行主函数
main