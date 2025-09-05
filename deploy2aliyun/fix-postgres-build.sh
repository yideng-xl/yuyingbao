#!/bin/bash

# PostgreSQL镜像构建诊断脚本
# 用于诊断和修复PostgreSQL镜像拉取问题

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 阿里云配置
ALIYUN_REGISTRY="crpi-zyq1wc1umfuictwx.cn-shanghai.personal.cr.aliyuncs.com"
ALIYUN_NAMESPACE="aires-docker"

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}    PostgreSQL镜像构建诊断脚本${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# 诊断函数
diagnose_environment() {
    echo -e "${BLUE}🔍 环境诊断...${NC}"
    
    # 检查Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker未安装${NC}"
        return 1
    fi
    
    if ! docker info &> /dev/null; then
        echo -e "${RED}❌ Docker未运行${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ Docker环境正常${NC}"
    
    # 检查网络连接
    echo -e "${BLUE}🌐 检查网络连接...${NC}"
    if ping -c 1 registry-1.docker.io &>/dev/null; then
        echo -e "${GREEN}✅ 网络连接正常${NC}"
    else
        echo -e "${YELLOW}⚠️  网络连接可能有问题${NC}"
    fi
    
    # 检查镜像源配置
    echo -e "${BLUE}📋 检查Docker镜像源配置...${NC}"
    if docker info | grep -q "Registry Mirrors"; then
        echo -e "${GREEN}✅ 已配置镜像源${NC}"
        docker info | grep -A 5 "Registry Mirrors" | head -6
    else
        echo -e "${YELLOW}⚠️  未配置镜像源${NC}"
    fi
    
    echo ""
}

# 尝试拉取PostgreSQL镜像
pull_postgres_manual() {
    echo -e "${BLUE}📥 手动拉取PostgreSQL镜像...${NC}"
    
    local postgres_images=(
        "postgres:16"
        "postgres:15"
        "postgres:14"
    )
    
    local success=false
    local pulled_image=""
    
    for image in "${postgres_images[@]}"; do
        echo -e "${CYAN}尝试拉取: ${image}${NC}"
        
        local attempts=0
        local max_attempts=3
        
        while [ $attempts -lt $max_attempts ]; do
            echo -e "${YELLOW}尝试 $((attempts + 1))/$max_attempts${NC}"
            
            if timeout 300 docker pull "$image"; then
                echo -e "${GREEN}✅ 拉取成功: ${image}${NC}"
                pulled_image="$image"
                success=true
                break 2
            else
                attempts=$((attempts + 1))
                if [ $attempts -lt $max_attempts ]; then
                    echo -e "${YELLOW}等待5秒后重试...${NC}"
                    sleep 5
                fi
            fi
        done
        
        echo -e "${YELLOW}⚠️  镜像 ${image} 拉取失败${NC}"
    done
    
    if [[ "$success" == true ]]; then
        echo -e "${GREEN}🎉 PostgreSQL镜像拉取成功！${NC}"
        echo -e "${CYAN}成功镜像: ${pulled_image}${NC}"
        
        # 显示镜像信息
        echo -e "${BLUE}📊 镜像信息:${NC}"
        docker images "$pulled_image" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
        
        return 0
    else
        echo -e "${RED}❌ 所有PostgreSQL镜像拉取失败${NC}"
        return 1
    fi
}

# 打标签并推送
tag_and_push() {
    echo -e "${BLUE}🏷️  标记并推送PostgreSQL镜像...${NC}"
    
    # 检查本地是否有PostgreSQL镜像
    local local_postgres=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep "^postgres:" | head -1)
    
    if [[ -z "$local_postgres" ]]; then
        echo -e "${RED}❌ 本地没有PostgreSQL镜像${NC}"
        return 1
    fi
    
    echo -e "${CYAN}找到本地镜像: ${local_postgres}${NC}"
    
    # 创建标签
    local postgres_tag="${ALIYUN_REGISTRY}/${ALIYUN_NAMESPACE}/postgres:${local_postgres##*:}"
    
    echo -e "${BLUE}创建标签: ${postgres_tag}${NC}"
    
    if docker tag "$local_postgres" "$postgres_tag"; then
        echo -e "${GREEN}✅ 标签创建成功${NC}"
        
        # 推送到阿里云
        echo -e "${BLUE}🚀 推送到阿里云...${NC}"
        
        if docker push "$postgres_tag"; then
            echo -e "${GREEN}🎉 PostgreSQL镜像推送成功！${NC}"
            echo -e "${CYAN}推送地址: ${postgres_tag}${NC}"
            return 0
        else
            echo -e "${RED}❌ 推送失败${NC}"
            echo -e "${YELLOW}请检查阿里云登录状态${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ 标签创建失败${NC}"
        return 1
    fi
}

# 配置镜像源
configure_mirror() {
    echo -e "${BLUE}🔧 配置Docker镜像源...${NC}"
    
    if [[ -f "./configure-docker-mirrors.sh" ]]; then
        echo -e "${CYAN}使用项目镜像源配置脚本...${NC}"
        ./configure-docker-mirrors.sh config
    else
        echo -e "${YELLOW}未找到镜像源配置脚本，手动配置...${NC}"
        
        sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'
{
  "registry-mirrors": [
    "https://dockerproxy.com",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ],
  "max-concurrent-downloads": 10
}
EOF
        
        echo -e "${GREEN}✅ 镜像源配置完成${NC}"
        echo -e "${YELLOW}重启Docker服务...${NC}"
        sudo systemctl restart docker
        
        # 等待Docker重启
        sleep 5
        
        if docker info &> /dev/null; then
            echo -e "${GREEN}✅ Docker重启成功${NC}"
        else
            echo -e "${RED}❌ Docker重启失败${NC}"
            return 1
        fi
    fi
}

# 显示解决建议
show_solutions() {
    echo -e "${YELLOW}💡 PostgreSQL镜像问题解决方案:${NC}"
    echo ""
    echo -e "${CYAN}1. 配置Docker镜像源（推荐首选）:${NC}"
    echo "   $0 mirror"
    echo ""
    echo -e "${CYAN}2. 手动拉取PostgreSQL镜像:${NC}"
    echo "   $0 pull"
    echo ""
    echo -e "${CYAN}3. 标记并推送现有镜像:${NC}"
    echo "   $0 push"
    echo ""
    echo -e "${CYAN}4. 完整流程（推荐）:${NC}"
    echo "   $0 fix"
    echo ""
    echo -e "${CYAN}5. 检查阿里云登录状态:${NC}"
    echo "   docker login ${ALIYUN_REGISTRY} -u xulei0331@126.com"
    echo ""
}

# 完整修复流程
fix_all() {
    echo -e "${BLUE}🔧 执行完整修复流程...${NC}"
    echo ""
    
    # 1. 诊断环境
    if ! diagnose_environment; then
        echo -e "${RED}❌ 环境诊断失败${NC}"
        return 1
    fi
    
    # 2. 配置镜像源
    echo -e "${BLUE}步骤1: 配置镜像源${NC}"
    configure_mirror
    
    # 3. 拉取镜像
    echo -e "${BLUE}步骤2: 拉取PostgreSQL镜像${NC}"
    if ! pull_postgres_manual; then
        echo -e "${RED}❌ 镜像拉取失败${NC}"
        return 1
    fi
    
    # 4. 推送镜像
    echo -e "${BLUE}步骤3: 推送到阿里云${NC}"
    if tag_and_push; then
        echo -e "${GREEN}🎉 PostgreSQL镜像修复完成！${NC}"
        echo -e "${CYAN}现在可以重新运行 ./build-and-push.sh${NC}"
    else
        echo -e "${RED}❌ 推送失败，请检查阿里云登录${NC}"
        return 1
    fi
}

# 主函数
main() {
    case "${1:-help}" in
        "diagnose"|"diag")
            diagnose_environment
            ;;
        "pull")
            pull_postgres_manual
            ;;
        "push")
            tag_and_push
            ;;
        "mirror")
            configure_mirror
            ;;
        "fix")
            fix_all
            ;;
        "help"|"-h"|"--help")
            show_solutions
            ;;
        *)
            echo -e "${RED}❌ 未知命令: $1${NC}"
            show_solutions
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"