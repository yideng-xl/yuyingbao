#!/bin/bash

# PostgreSQL镜像拉取脚本 - 网络优化版本
# 适用于网络连接不稳定的服务器环境

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}    PostgreSQL镜像拉取脚本${NC}"
echo -e "${BLUE}    网络优化版本${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# PostgreSQL镜像列表（按优先级排序）
POSTGRES_IMAGES=(
    "postgres:17"
    "postgres:16"
    "postgres:15"
    "postgres:14"
)

# 拉取PostgreSQL镜像
pull_postgres_image() {
    echo -e "${BLUE}📥 拉取PostgreSQL镜像...${NC}"
    
    local pulled_image=""
    local success=false
    
    for image in "${POSTGRES_IMAGES[@]}"; do
        echo -e "${CYAN}尝试拉取镜像: ${image}${NC}"
        
        # 设置超时时间并重试
        local attempts=0
        local max_attempts=3
        
        while [ $attempts -lt $max_attempts ]; do
            echo -e "${YELLOW}尝试 $((attempts + 1))/$max_attempts${NC}"
            
            # 使用timeout命令限制拉取时间（5分钟超时）
            if timeout 300 docker pull "$image"; then
                echo -e "${GREEN}✅ 镜像拉取成功: ${image}${NC}"
                pulled_image="$image"
                success=true
                break 2  # 跳出两层循环
            else
                attempts=$((attempts + 1))
                echo -e "${YELLOW}⚠️  镜像拉取失败，重试 $attempts/$max_attempts${NC}"
                
                if [ $attempts -lt $max_attempts ]; then
                    echo -e "${BLUE}等待5秒后重试...${NC}"
                    sleep 5
                fi
            fi
        done
        
        echo -e "${YELLOW}⚠️  镜像 ${image} 拉取失败，尝试下一个版本...${NC}"
        echo ""
    done
    
    if [[ "$success" == true ]]; then
        echo -e "${GREEN}🎉 PostgreSQL镜像拉取成功！${NC}"
        echo -e "${CYAN}使用镜像: ${pulled_image}${NC}"
        
        # 显示镜像信息
        echo -e "${BLUE}📊 镜像信息:${NC}"
        docker images "$pulled_image" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
        
        return 0
    else
        echo -e "${RED}❌ 所有PostgreSQL镜像拉取失败${NC}"
        return 1
    fi
}

# 显示网络诊断信息
show_network_diagnosis() {
    echo -e "${BLUE}🔍 网络诊断信息:${NC}"
    echo ""
    
    # 检查DNS解析
    echo -e "${CYAN}1. DNS解析测试:${NC}"
    if ping -c 1 registry-1.docker.io &>/dev/null; then
        echo -e "   ${GREEN}✅ registry-1.docker.io 可达${NC}"
    else
        echo -e "   ${RED}❌ registry-1.docker.io 不可达${NC}"
    fi
    
    # 检查Docker镜像源配置
    echo -e "${CYAN}2. Docker镜像源配置:${NC}"
    if docker info | grep -q "Registry Mirrors"; then
        echo -e "   ${GREEN}✅ 已配置镜像源${NC}"
        docker info | grep -A 10 "Registry Mirrors" | head -6 | sed 's/^/   /'
    else
        echo -e "   ${YELLOW}⚠️  未配置镜像源${NC}"
    fi
    
    # 检查Docker服务状态
    echo -e "${CYAN}3. Docker服务状态:${NC}"
    if systemctl is-active --quiet docker; then
        echo -e "   ${GREEN}✅ Docker服务运行正常${NC}"
    else
        echo -e "   ${RED}❌ Docker服务异常${NC}"
    fi
    
    echo ""
}

# 显示解决建议
show_solutions() {
    echo -e "${YELLOW}💡 镜像拉取失败解决建议:${NC}"
    echo ""
    echo -e "${CYAN}1. 配置Docker镜像源（推荐）:${NC}"
    echo "   wget https://raw.githubusercontent.com/westxixia/yuyingbao/main/deploy2aliyun/configure-docker-mirrors.sh"
    echo "   chmod +x configure-docker-mirrors.sh"
    echo "   ./configure-docker-mirrors.sh config"
    echo ""
    echo -e "${CYAN}2. 重启Docker服务:${NC}"
    echo "   sudo systemctl restart docker"
    echo ""
    echo -e "${CYAN}3. 手动配置镜像源:${NC}"
    echo "   sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'"
    echo "   {"
    echo '     "registry-mirrors": ['
    echo '       "https://dockerproxy.com",'
    echo '       "https://hub-mirror.c.163.com"'
    echo "     ]"
    echo "   }"
    echo "   EOF"
    echo "   sudo systemctl restart docker"
    echo ""
    echo -e "${CYAN}4. 检查网络连接:${NC}"
    echo "   ping registry-1.docker.io"
    echo "   curl -I https://registry-1.docker.io/v2/"
    echo ""
    echo -e "${CYAN}5. 使用本地镜像（如果已下载）:${NC}"
    echo "   docker images | grep postgres"
    echo ""
}

# 主执行流程
main() {
    show_network_diagnosis
    
    if pull_postgres_image; then
        echo -e "${GREEN}🎊 镜像拉取完成！${NC}"
    else
        show_solutions
        exit 1
    fi
}

# 显示帮助信息
show_help() {
    echo "PostgreSQL镜像拉取脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  pull      拉取PostgreSQL镜像 (默认)"
    echo "  test      测试网络连接"
    echo "  list      显示本地PostgreSQL镜像"
    echo "  clean     清理失败的镜像拉取"
    echo "  help      显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 pull     # 拉取PostgreSQL镜像"
    echo "  $0 test     # 测试网络连接"
    echo "  $0 list     # 显示本地镜像"
    echo ""
}

# 测试网络连接
test_network() {
    echo -e "${BLUE}🔍 测试网络连接...${NC}"
    show_network_diagnosis
    
    echo -e "${BLUE}🧪 测试镜像拉取（小镜像）...${NC}"
    if timeout 60 docker pull hello-world:latest; then
        echo -e "${GREEN}✅ 网络连接正常${NC}"
        docker rmi hello-world:latest &>/dev/null || true
    else
        echo -e "${RED}❌ 网络连接异常${NC}"
        show_solutions
    fi
}

# 显示本地镜像
list_images() {
    echo -e "${BLUE}📋 本地PostgreSQL镜像:${NC}"
    if docker images | grep postgres | head -10; then
        echo ""
        echo -e "${GREEN}✅ 找到本地PostgreSQL镜像${NC}"
    else
        echo -e "${YELLOW}⚠️  未找到本地PostgreSQL镜像${NC}"
        echo -e "${CYAN}建议运行: $0 pull${NC}"
    fi
}

# 清理失败的镜像拉取
clean_failed() {
    echo -e "${BLUE}🧹 清理失败的镜像拉取...${NC}"
    
    # 清理dangling镜像
    if docker images -f "dangling=true" -q | grep -q .; then
        docker rmi $(docker images -f "dangling=true" -q) 2>/dev/null || true
        echo -e "${GREEN}✅ 已清理dangling镜像${NC}"
    else
        echo -e "${GREEN}✅ 无需清理${NC}"
    fi
    
    # 清理Docker缓存
    docker system prune -f &>/dev/null || true
    echo -e "${GREEN}✅ Docker缓存清理完成${NC}"
}

# 命令行参数处理
case "${1:-pull}" in
    "pull")
        main
        ;;
    "test")
        test_network
        ;;
    "list")
        list_images
        ;;
    "clean")
        clean_failed
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