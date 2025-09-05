#!/bin/bash

# 快速测试hosts映射配置的脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}    Hosts映射配置测试脚本${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# 检查当前的容器状态
check_current_state() {
    echo -e "${BLUE}🔍 检查当前容器状态...${NC}"
    
    if docker ps | grep -q "yuyingbao-postgres"; then
        echo -e "${GREEN}✅ PostgreSQL容器正在运行${NC}"
        local postgres_ip=$(docker inspect yuyingbao-postgres --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')
        echo -e "   PostgreSQL IP: ${postgres_ip}"
    else
        echo -e "${RED}❌ PostgreSQL容器未运行${NC}"
        return 1
    fi
    
    if docker ps | grep -q "yuyingbao-server"; then
        echo -e "${GREEN}✅ 应用容器正在运行${NC}"
        
        # 检查容器的hosts映射
        echo -e "${CYAN}🔍 检查应用容器的DNS解析:${NC}"
        docker exec yuyingbao-server cat /etc/hosts | grep -E "(postgres|yuyingbao-postgres)" || echo "  未找到postgres相关的hosts映射"
        
        # 测试DNS解析
        echo -e "${CYAN}🔍 测试DNS解析:${NC}"
        if docker exec yuyingbao-server nslookup yuyingbao-postgres &>/dev/null; then
            local resolved_ip=$(docker exec yuyingbao-server nslookup yuyingbao-postgres | grep "Address:" | tail -1 | awk '{print $2}')
            echo -e "  yuyingbao-postgres解析到: ${resolved_ip}"
        else
            echo -e "  ${RED}DNS解析失败${NC}"
        fi
        
        # 测试连接
        echo -e "${CYAN}🔍 测试网络连接:${NC}"
        if docker exec yuyingbao-server ping -c 1 yuyingbao-postgres &>/dev/null; then
            echo -e "  ${GREEN}✅ ping yuyingbao-postgres 成功${NC}"
        else
            echo -e "  ${RED}❌ ping yuyingbao-postgres 失败${NC}"
        fi
        
        if docker exec yuyingbao-server nc -z yuyingbao-postgres 5432 &>/dev/null; then
            echo -e "  ${GREEN}✅ 端口5432连接成功${NC}"
        else
            echo -e "  ${RED}❌ 端口5432连接失败${NC}"
        fi
        
    else
        echo -e "${RED}❌ 应用容器未运行${NC}"
        return 1
    fi
    
    echo ""
}

# 显示修复建议
show_fix_suggestions() {
    echo -e "${BLUE}💡 修复建议:${NC}"
    echo ""
    
    local postgres_ip=$(docker inspect yuyingbao-postgres --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null)
    
    if [[ -n "$postgres_ip" ]]; then
        echo -e "${YELLOW}如果应用容器没有正确的hosts映射，可以手动重新创建:${NC}"
        echo ""
        echo "# 1. 停止并删除应用容器"
        echo "docker stop yuyingbao-server"
        echo "docker rm yuyingbao-server"
        echo ""
        echo "# 2. 重新创建带hosts映射的容器"
        echo "docker run -d \\"
        echo "    --name yuyingbao-server \\"
        echo "    --network yuyingbao-network \\"
        echo "    --add-host=\"postgres:${postgres_ip}\" \\"
        echo "    --env-file .env \\"
        echo "    -p 8080:8080 \\"
        echo "    --memory=1.5g \\"
        echo "    --cpus=1.5 \\"
        echo "    [您的应用镜像]"
        echo ""
        echo "# 3. 或者直接使用部署脚本"
        echo "./deploy-ecs.sh stop"
        echo "./deploy-ecs.sh deploy"
    else
        echo -e "${RED}无法获取PostgreSQL容器IP地址${NC}"
    fi
    
    echo ""
}

# 主函数
main() {
    if check_current_state; then
        echo -e "${GREEN}🎉 基本检查完成${NC}"
    else
        echo -e "${YELLOW}⚠️  发现问题，显示修复建议${NC}"
        show_fix_suggestions
    fi
}

main