#!/bin/bash

# 育婴宝后端服务本地测试脚本
# 在推送到阿里云之前进行本地验证

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== 育婴宝后端服务本地测试 ===${NC}"
echo ""

# 检查Docker环境
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
    
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}❌ Docker Compose 未安装${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Docker 环境正常${NC}"
}

# 启动测试环境
start_test_env() {
    echo -e "${BLUE}🚀 启动测试环境...${NC}"
    
    cd "$(dirname "$0")"
    
    # 先停止可能存在的容器
    docker-compose -f docker-compose.test.yml down --remove-orphans 2>/dev/null || true
    
    # 构建并启动服务
    docker-compose -f docker-compose.test.yml up --build -d
    
    echo -e "${GREEN}✅ 测试环境启动成功${NC}"
}

# 等待服务就绪
wait_for_services() {
    echo -e "${BLUE}⏳ 等待服务就绪...${NC}"
    
    # 等待数据库就绪
    echo "等待 PostgreSQL 启动..."
    for i in {1..30}; do
        if docker-compose -f docker-compose.test.yml exec -T postgres pg_isready -U yuyingbao -d yuyingbao &>/dev/null; then
            echo -e "${GREEN}✅ PostgreSQL 就绪${NC}"
            break
        fi
        echo -n "."
        sleep 2
    done
    
    # 等待应用启动
    echo "等待应用启动..."
    for i in {1..60}; do
        if curl -f http://localhost:8080/actuator/health &>/dev/null; then
            echo -e "${GREEN}✅ 应用服务就绪${NC}"
            break
        fi
        echo -n "."
        sleep 3
    done
}

# 运行健康检查
health_check() {
    echo -e "${BLUE}🏥 运行健康检查...${NC}"
    
    # 检查健康端点
    echo "检查健康端点..."
    HEALTH_RESPONSE=$(curl -s http://localhost:8080/api/actuator/health || echo "ERROR")
    
    if [[ "$HEALTH_RESPONSE" == *"UP"* ]]; then
        echo -e "${GREEN}✅ 健康检查通过${NC}"
        echo "响应: $HEALTH_RESPONSE"
    else
        echo -e "${RED}❌ 健康检查失败${NC}"
        echo "响应: $HEALTH_RESPONSE"
        return 1
    fi
    
    # 检查API端点
    echo "检查API端点..."
    API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/auth/test 2>/dev/null || echo "000")
    
    if [[ "$API_RESPONSE" == "200" ]] || [[ "$API_RESPONSE" == "404" ]]; then
        echo -e "${GREEN}✅ API端点可访问${NC}"
    else
        echo -e "${YELLOW}⚠️ API端点响应异常: $API_RESPONSE${NC}"
    fi
}

# 查看服务状态
show_status() {
    echo -e "${BLUE}📊 服务状态:${NC}"
    docker-compose -f docker-compose.test.yml ps
    
    echo ""
    echo -e "${BLUE}📊 服务日志 (最近10行):${NC}"
    docker-compose -f docker-compose.test.yml logs --tail=10 yuyingbao-server
}

# 运行简单的API测试
run_api_tests() {
    echo -e "${BLUE}🧪 运行API测试...${NC}"
    
    # 测试健康检查端点
    echo "测试健康检查端点..."
    if curl -f http://localhost:8080/actuator/health &>/dev/null; then
        echo -e "${GREEN}✅ 健康检查端点正常${NC}"
    else
        echo -e "${RED}❌ 健康检查端点异常${NC}"
    fi
    
    # 测试信息端点
    echo "测试信息端点..."
    INFO_RESPONSE=$(curl -s http://localhost:8080/actuator/info 2>/dev/null || echo "ERROR")
    if [[ "$INFO_RESPONSE" != "ERROR" ]]; then
        echo -e "${GREEN}✅ 信息端点正常${NC}"
    else
        echo -e "${YELLOW}⚠️ 信息端点可能未配置${NC}"
    fi
}

# 停止测试环境
stop_test_env() {
    echo -e "${BLUE}🛑 停止测试环境...${NC}"
    
    cd "$(dirname "$0")"
    docker-compose -f docker-compose.test.yml down --remove-orphans
    
    echo -e "${GREEN}✅ 测试环境已停止${NC}"
}

# 清理测试环境
cleanup_test_env() {
    echo -e "${BLUE}🧹 清理测试环境...${NC}"
    
    cd "$(dirname "$0")"
    docker-compose -f docker-compose.test.yml down --volumes --remove-orphans
    
    # 清理镜像（可选）
    echo -e "${YELLOW}是否清理构建的镜像？ (y/N)${NC}"
    read -r cleanup_choice
    
    if [[ "$cleanup_choice" =~ ^[Yy]$ ]]; then
        docker image prune -f
        echo -e "${GREEN}✅ 镜像清理完成${NC}"
    fi
    
    echo -e "${GREEN}✅ 测试环境清理完成${NC}"
}

# 显示测试结果
show_test_result() {
    echo ""
    echo -e "${GREEN}🎉 本地测试完成！${NC}"
    echo ""
    echo -e "${BLUE}📋 测试访问地址：${NC}"
    echo "- 应用健康检查: http://localhost:8080/actuator/health"
    echo "- 应用信息: http://localhost:8080/actuator/info"
    echo "- PostgreSQL: localhost:5432"
    echo "- Redis: localhost:6379"
    echo ""
    echo -e "${BLUE}🔧 管理命令：${NC}"
    echo "- 查看日志: docker-compose -f docker-compose.test.yml logs -f"
    echo "- 停止服务: docker-compose -f docker-compose.test.yml down"
    echo "- 重启服务: docker-compose -f docker-compose.test.yml restart"
    echo ""
    echo -e "${GREEN}✅ 如果测试通过，可以运行 ./build-and-push.sh 推送到阿里云${NC}"
}

# 主执行流程
main() {
    case "${1:-test}" in
        "start")
            check_docker
            start_test_env
            wait_for_services
            show_status
            ;;
        "test")
            check_docker
            start_test_env
            wait_for_services
            health_check
            run_api_tests
            show_test_result
            ;;
        "stop")
            stop_test_env
            ;;
        "cleanup")
            cleanup_test_env
            ;;
        "status")
            show_status
            ;;
        "logs")
            cd "$(dirname "$0")"
            docker-compose -f docker-compose.test.yml logs -f yuyingbao-server
            ;;
        "help"|"-h"|"--help")
            echo "用法: $0 [命令]"
            echo ""
            echo "命令:"
            echo "  test     运行完整测试 (默认)"
            echo "  start    仅启动测试环境"
            echo "  stop     停止测试环境"
            echo "  cleanup  清理测试环境"
            echo "  status   查看服务状态"
            echo "  logs     查看应用日志"
            echo "  help     显示帮助信息"
            ;;
        *)
            echo -e "${RED}❌ 未知命令: $1${NC}"
            echo "使用 $0 help 查看帮助信息"
            exit 1
            ;;
    esac
}

# 执行主逻辑
main "$@"