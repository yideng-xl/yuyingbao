#!/bin/bash

# Docker镜像源配置脚本 - 阿里云ECS优化版本
# 适用于已安装Docker的服务器，独立配置镜像加速器

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}    Docker镜像源配置脚本${NC}"
echo -e "${BLUE}    阿里云ECS优化版本${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# 检查Docker是否已安装
check_docker() {
    echo -e "${BLUE}🔍 检查Docker环境...${NC}"
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker未安装，请先安装Docker${NC}"
        echo -e "${YELLOW}安装命令参考:${NC}"
        echo "  CentOS/RHEL: sudo yum install -y docker-ce"
        echo "  Ubuntu/Debian: sudo apt install -y docker-ce"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Docker已安装${NC}"
    docker --version
    echo ""
}

# 备份原有配置
backup_config() {
    echo -e "${BLUE}💾 备份原有配置...${NC}"
    
    if [[ -f /etc/docker/daemon.json ]]; then
        sudo cp /etc/docker/daemon.json /etc/docker/daemon.json.backup.$(date +%Y%m%d_%H%M%S)
        echo -e "${GREEN}✅ 原配置已备份${NC}"
    else
        echo -e "${YELLOW}ℹ️  未发现原有配置文件${NC}"
    fi
    echo ""
}

# 配置Docker镜像加速器
configure_mirrors() {
    echo -e "${BLUE}🚀 配置Docker镜像加速器...${NC}"
    
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
    echo ""
}

# 显示配置内容
show_config() {
    echo -e "${BLUE}📋 当前Docker配置:${NC}"
    echo -e "${CYAN}文件位置: /etc/docker/daemon.json${NC}"
    echo ""
    cat /etc/docker/daemon.json | sed 's/^/  /'
    echo ""
}

# 重启Docker服务
restart_docker() {
    echo -e "${BLUE}🔄 重启Docker服务...${NC}"
    
    sudo systemctl daemon-reload
    sudo systemctl restart docker
    
    # 等待服务启动
    sleep 3
    
    if sudo systemctl is-active --quiet docker; then
        echo -e "${GREEN}✅ Docker服务重启成功${NC}"
    else
        echo -e "${RED}❌ Docker服务重启失败${NC}"
        echo -e "${YELLOW}请检查配置文件和系统日志${NC}"
        exit 1
    fi
    echo ""
}

# 测试镜像拉取
test_pull() {
    echo -e "${BLUE}🧪 测试镜像拉取...${NC}"
    
    # 测试拉取一个小镜像
    if docker pull hello-world:latest; then
        echo -e "${GREEN}✅ 镜像拉取测试成功${NC}"
        
        # 显示镜像信息
        echo -e "${CYAN}镜像信息:${NC}"
        docker images hello-world --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
        
        # 清理测试镜像
        docker rmi hello-world:latest &>/dev/null || true
    else
        echo -e "${YELLOW}⚠️  镜像拉取测试失败，但配置已生效${NC}"
        echo -e "${YELLOW}可能是网络问题，请稍后重试${NC}"
    fi
    echo ""
}

# 显示优化建议
show_optimization() {
    echo -e "${BLUE}💡 优化建议:${NC}"
    echo ""
    echo -e "${CYAN}1. 镜像源说明:${NC}"
    echo "   • dockerproxy.com - 高性能代理服务"
    echo "   • hub-mirror.c.163.com - 网易镜像源"
    echo "   • mirror.baidubce.com - 百度云镜像源"
    echo "   • ccr.ccs.tencentyun.com - 腾讯云镜像源"
    echo ""
    echo -e "${CYAN}2. 性能优化:${NC}"
    echo "   • max-concurrent-downloads: 10 (并发下载数)"
    echo "   • max-concurrent-uploads: 5 (并发上传数)"
    echo "   • log-opts: 限制日志文件大小"
    echo ""
    echo -e "${CYAN}3. 常用命令:${NC}"
    echo "   • 检查配置: docker info"
    echo "   • 拉取镜像: docker pull <image>"
    echo "   • 查看镜像: docker images"
    echo ""
}

# 主执行流程
main() {
    check_docker
    backup_config
    configure_mirrors
    show_config
    restart_docker
    test_pull
    show_optimization
    
    echo -e "${GREEN}🎉 Docker镜像源配置完成！${NC}"
    echo -e "${YELLOW}💡 现在可以更快地拉取Docker镜像了${NC}"
}

# 显示帮助信息
show_help() {
    echo "Docker镜像源配置脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  config    配置镜像源 (默认)"
    echo "  test      测试镜像拉取"
    echo "  show      显示当前配置"
    echo "  restore   恢复原始配置"
    echo "  help      显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 config   # 配置镜像源"
    echo "  $0 test     # 测试镜像拉取"
    echo "  $0 show     # 显示当前配置"
    echo ""
}

# 恢复原始配置
restore_config() {
    echo -e "${BLUE}🔄 恢复原始配置...${NC}"
    
    # 查找最新的备份文件
    backup_file=$(ls /etc/docker/daemon.json.backup.* 2>/dev/null | tail -1)
    
    if [[ -f "$backup_file" ]]; then
        sudo cp "$backup_file" /etc/docker/daemon.json
        echo -e "${GREEN}✅ 配置已恢复: $backup_file${NC}"
        restart_docker
    else
        echo -e "${YELLOW}⚠️  未找到备份文件${NC}"
        echo -e "${YELLOW}是否删除当前配置？(y/N)${NC}"
        read -r confirm
        if [[ "$confirm" =~ ^[Yy]$ ]]; then
            sudo rm -f /etc/docker/daemon.json
            echo -e "${GREEN}✅ 配置文件已删除${NC}"
            restart_docker
        fi
    fi
}

# 命令行参数处理
case "${1:-config}" in
    "config")
        main
        ;;
    "test")
        test_pull
        ;;
    "show")
        if [[ -f /etc/docker/daemon.json ]]; then
            show_config
        else
            echo -e "${YELLOW}⚠️  Docker配置文件不存在${NC}"
        fi
        ;;
    "restore")
        restore_config
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