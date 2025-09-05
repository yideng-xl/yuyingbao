#!/bin/bash

# 测试容器清理功能的脚本
# 用于验证 deploy-ecs.sh 中的容器检查和清理逻辑

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}    容器清理功能测试脚本${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# 测试函数：检查容器状态
check_container_status() {
    local container_name=$1
    echo -e "${BLUE}🔍 检查容器状态: ${container_name}${NC}"
    
    if docker ps -a --format "table {{.Names}}" | grep -q "^${container_name}$"; then
        if docker ps --format "table {{.Names}}" | grep -q "^${container_name}$"; then
            echo -e "${GREEN}✅ 容器正在运行: ${container_name}${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠️  容器已停止: ${container_name}${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ 容器不存在: ${container_name}${NC}"
        return 2
    fi
}

# 测试函数：模拟容器清理逻辑
simulate_cleanup() {
    echo -e "${BLUE}🧹 模拟容器清理过程...${NC}"
    echo ""
    
    local containers=("yuyingbao-server" "yuyingbao-postgres")
    
    for container in "${containers[@]}"; do
        echo -e "${YELLOW}📋 检查容器: ${container}${NC}"
        
        case $(check_container_status "$container"; echo $?) in
            0)
                echo -e "  ➜ 需要停止并删除运行中的容器"
                ;;
            1)
                echo -e "  ➜ 需要删除已停止的容器"
                ;;
            2)
                echo -e "  ➜ 容器不存在，无需清理"
                ;;
        esac
        echo ""
    done
}

# 检查 postgres_data 目录
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

# 主测试流程
main() {
    echo -e "${BLUE}开始测试...${NC}"
    echo ""
    
    simulate_cleanup
    check_data_directory
    
    echo -e "${GREEN}🎉 测试完成！${NC}"
    echo ""
    echo -e "${BLUE}💡 使用建议：${NC}"
    echo -e "1. 运行 './deploy-ecs.sh status' 查看当前状态"
    echo -e "2. 运行 './deploy-ecs.sh deploy' 开始部署"
    echo -e "3. 如需重置数据，运行 './deploy-ecs.sh reset-data'"
}

main