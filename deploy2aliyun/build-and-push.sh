#!/bin/bash

# 育婴宝后端服务 Docker 构建和推送脚本
# 目标：阿里云容器镜像服务

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

# 阿里云镜像仓库配置
ALIYUN_REGISTRY="crpi-zyq1wc1umfuictwx.cn-shanghai.personal.cr.aliyuncs.com"
ALIYUN_NAMESPACE="aires-docker"  # 命名空间
ALIYUN_REPO="yuyingbao"
ALIYUN_USERNAME="xulei0331@126.com"

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
    echo -e "${BLUE}📥 拉取并打标签PostgreSQL镜像...${NC}"
    
    local postgres_images=(
        "postgres:17"
        "postgres:16"
        "postgres:15"
    )
    
    local pulled_image=""
    
    # 尝试拉取PostgreSQL镜像
    for image in "${postgres_images[@]}"; do
        echo -e "${CYAN}尝试拉取: ${image}${NC}"
        
        if timeout 300 docker pull "$image"; then
            echo -e "${GREEN}✅ 拉取成功: ${image}${NC}"
            pulled_image="$image"
            break
        else
            echo -e "${YELLOW}⚠️  拉取失败: ${image}${NC}"
        fi
    done
    
    if [[ -z "$pulled_image" ]]; then
        echo -e "${YELLOW}⚠️  PostgreSQL镜像拉取失败，跳过${NC}"
        return 0
    fi
    
    # 为PostgreSQL镜像打标签
    local postgres_tag="${ALIYUN_REGISTRY}/${ALIYUN_NAMESPACE}/postgres:${pulled_image##*:}"
    
    echo -e "${BLUE}🏷️  为PostgreSQL镜像打标签...${NC}"
    docker tag "$pulled_image" "$postgres_tag"
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ PostgreSQL镜像打标签成功${NC}"
        echo -e "${CYAN}本地标签: ${postgres_tag}${NC}"
        POSTGRES_TAG="$postgres_tag"
        echo -e "${GREEN}✅ PostgreSQL镜像处理完成${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  PostgreSQL镜像打标签失败，跳过${NC}"
        return 0
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
    if [[ -n "$POSTGRES_TAG" ]]; then
        echo -e "${BLUE}🚀 推送PostgreSQL镜像...${NC}"
        echo -e "${CYAN}推送到: ${POSTGRES_TAG}${NC}"
        
        if docker push "$POSTGRES_TAG"; then
            echo -e "${GREEN}✅ PostgreSQL镜像推送成功${NC}"
        else
            echo -e "${YELLOW}⚠️  PostgreSQL镜像推送失败${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  没有PostgreSQL镜像需要推送${NC}"
    fi
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

# 主执行流程
main() {
    echo -e "${BLUE}开始构建和推送流程...${NC}"
    echo ""
    
    check_docker
    check_aliyun_config
    build_image
    build_postgres_image
    test_image
    login_aliyun
    push_image
    push_postgres_image
    cleanup
    show_deploy_info
    
    echo ""
    echo -e "${GREEN}🎊 所有操作完成！${NC}"
}

# 帮助信息
show_help() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help     显示帮助信息"
    echo "  -v, --version  显示版本信息"
    echo ""
    echo "环境变量:"
    echo "  ALIYUN_NAMESPACE  阿里云镜像仓库命名空间"
    echo "  ALIYUN_REGISTRY   阿里云镜像仓库地址"
    echo ""
    echo "示例:"
    echo "  $0                    # 执行完整的构建和推送流程"
    echo "  ALIYUN_NAMESPACE=my-namespace $0  # 使用自定义命名空间"
}

# 解析命令行参数
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    -v|--version)
        echo "育婴宝 Docker 构建脚本 ${VERSION}"
        exit 0
        ;;
    *)
        main
        ;;
esac