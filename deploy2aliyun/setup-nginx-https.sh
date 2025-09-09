#!/bin/bash

# 阿里云ECS Nginx HTTPS配置脚本
# 用于为育婴宝后端服务配置HTTPS支持

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置变量
DOMAIN="yuyingbao.yideng.ltd"
NGINX_CONFIG_FILE="nginx-https.conf"
NGINX_SITE_CONFIG="/etc/nginx/sites-available/yuyingbao"
NGINX_SITE_ENABLED="/etc/nginx/sites-enabled/yuyingbao"

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}    阿里云ECS Nginx HTTPS配置脚本${NC}"
echo -e "${BLUE}    育婴宝后端服务${NC}"
echo -e "${BLUE}======================================${NC}"

# 检查是否为root用户
check_root() {
    if [[ $EUID -ne 0 ]]; then
        echo -e "${RED}❌ 此脚本需要root权限运行${NC}"
        echo "请使用 sudo 运行此脚本"
        exit 1
    fi
}

# 检查系统类型
check_os() {
    if [[ -f /etc/redhat-release ]]; then
        OS="centos"
        echo -e "${GREEN}✅ 检测到CentOS/RHEL系统${NC}"
    elif [[ -f /etc/debian_version ]]; then
        OS="ubuntu"
        echo -e "${GREEN}✅ 检测到Ubuntu/Debian系统${NC}"
    else
        echo -e "${RED}❌ 不支持的操作系统${NC}"
        exit 1
    fi
}

# 安装Nginx
install_nginx() {
    echo -e "${BLUE}🔍 检查Nginx安装...${NC}"
    
    if command -v nginx &> /dev/null; then
        echo -e "${GREEN}✅ Nginx已安装${NC}"
        nginx -v
    else
        echo -e "${YELLOW}📦 安装Nginx...${NC}"
        
        if [[ $OS == "centos" ]]; then
            yum update -y
            yum install -y nginx
        else
            apt update
            apt install -y nginx
        fi
        
        echo -e "${GREEN}✅ Nginx安装完成${NC}"
    fi
    
    # 启动Nginx服务
    systemctl start nginx
    systemctl enable nginx
    
    echo -e "${GREEN}✅ Nginx服务已启动并设置为开机自启${NC}"
}

# 安装Certbot (Let's Encrypt)
install_certbot() {
    echo -e "${BLUE}🔍 安装Certbot (Let's Encrypt)...${NC}"
    
    if command -v certbot &> /dev/null; then
        echo -e "${GREEN}✅ Certbot已安装${NC}"
        certbot --version
        return
    fi
    
    if [[ $OS == "centos" ]]; then
        # CentOS安装Certbot
        yum install -y epel-release
        yum install -y certbot python3-certbot-nginx
    else
        # Ubuntu安装Certbot
        apt install -y software-properties-common
        add-apt-repository -y universe
        apt update
        apt install -y certbot python3-certbot-nginx
    fi
    
    echo -e "${GREEN}✅ Certbot安装完成${NC}"
}

# 配置防火墙
configure_firewall() {
    echo -e "${BLUE}🔍 配置防火墙...${NC}"
    
    if command -v ufw &> /dev/null; then
        # Ubuntu防火墙
        ufw allow 'Nginx Full'
        echo -e "${GREEN}✅ Ubuntu防火墙配置完成${NC}"
    elif command -v firewall-cmd &> /dev/null; then
        # CentOS防火墙
        firewall-cmd --permanent --add-service=http
        firewall-cmd --permanent --add-service=https
        firewall-cmd --reload
        echo -e "${GREEN}✅ CentOS防火墙配置完成${NC}"
    else
        echo -e "${YELLOW}⚠️  未检测到防火墙，跳过配置${NC}"
    fi
}

# 部署Nginx配置文件
deploy_nginx_config() {
    echo -e "${BLUE}🔍 部署Nginx配置...${NC}"
    
    # 检查配置文件是否存在
    if [[ ! -f "$NGINX_CONFIG_FILE" ]]; then
        echo -e "${RED}❌ Nginx配置文件不存在: $NGINX_CONFIG_FILE${NC}"
        echo "请确保在当前目录下有nginx-https.conf文件"
        exit 1
    fi
    
    # 复制配置文件
    cp "$NGINX_CONFIG_FILE" "$NGINX_SITE_CONFIG"
    echo -e "${GREEN}✅ 配置文件已复制到: $NGINX_SITE_CONFIG${NC}"
    
    # 创建软链接
    if [[ -f "$NGINX_SITE_ENABLED" ]]; then
        rm "$NGINX_SITE_ENABLED"
    fi
    
    ln -s "$NGINX_SITE_CONFIG" "$NGINX_SITE_ENABLED"
    echo -e "${GREEN}✅ 已创建软链接: $NGINX_SITE_ENABLED${NC}"
    
    # 测试配置
    if nginx -t; then
        echo -e "${GREEN}✅ Nginx配置测试通过${NC}"
    else
        echo -e "${RED}❌ Nginx配置测试失败${NC}"
        exit 1
    fi
    
    # 重新加载Nginx
    systemctl reload nginx
    echo -e "${GREEN}✅ Nginx已重新加载${NC}"
}

# 获取SSL证书
get_ssl_certificate() {
    echo -e "${BLUE}🔍 获取SSL证书...${NC}"
    
    # 检查证书是否已存在
    if [[ -d "/etc/letsencrypt/live/$DOMAIN" ]]; then
        echo -e "${GREEN}✅ SSL证书已存在${NC}"
        return
    fi
    
    echo -e "${YELLOW}请输入您的邮箱地址用于Let's Encrypt证书通知:${NC}"
    read -r email
    
    echo -e "${YELLOW}正在获取SSL证书...${NC}"
    certbot --nginx -d "$DOMAIN" --email "$email" --agree-tos --non-interactive
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ SSL证书获取成功${NC}"
    else
        echo -e "${RED}❌ SSL证书获取失败${NC}"
        exit 1
    fi
}

# 更新Nginx配置以使用Let's Encrypt证书
update_nginx_config() {
    echo -e "${BLUE}🔍 更新Nginx配置以使用Let's Encrypt证书...${NC}"
    
    # 备份原配置
    if [[ -f "$NGINX_SITE_CONFIG.bak" ]]; then
        rm "$NGINX_SITE_CONFIG.bak"
    fi
    cp "$NGINX_SITE_CONFIG" "$NGINX_SITE_CONFIG.bak"
    
    # 更新证书路径
    sed -i "s|/etc/letsencrypt/live/yuyingbao.aijinseliunian.top/fullchain.pem|/etc/letsencrypt/live/$DOMAIN/fullchain.pem|g" "$NGINX_SITE_CONFIG"
    sed -i "s|/etc/letsencrypt/live/yuyingbao.aijinseliunian.top/privkey.pem|/etc/letsencrypt/live/$DOMAIN/privkey.pem|g" "$NGINX_SITE_CONFIG"
    
    # 测试配置
    if nginx -t; then
        echo -e "${GREEN}✅ Nginx配置更新完成${NC}"
        systemctl reload nginx
        echo -e "${GREEN}✅ Nginx已重新加载${NC}"
    else
        echo -e "${RED}❌ Nginx配置更新失败，恢复备份配置${NC}"
        cp "$NGINX_SITE_CONFIG.bak" "$NGINX_SITE_CONFIG"
        systemctl reload nginx
        exit 1
    fi
}

# 设置自动续期
setup_auto_renewal() {
    echo -e "${BLUE}🔍 设置SSL证书自动续期...${NC}"
    
    # 创建续期脚本
    cat > /etc/cron.weekly/certbot-renew << 'EOF'
#!/bin/bash
# Certbot自动续期脚本
certbot renew --quiet
systemctl reload nginx
EOF
    
    chmod +x /etc/cron.weekly/certbot-renew
    echo -e "${GREEN}✅ SSL证书自动续期已设置${NC}"
    
    # 立即测试续期
    echo -e "${BLUE}🔍 测试证书续期...${NC}"
    certbot renew --dry-run
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ 证书续期测试通过${NC}"
    else
        echo -e "${YELLOW}⚠️  证书续期测试失败，但这不影响正常使用${NC}"
    fi
}

# 显示使用说明
show_usage() {
    echo -e "${BLUE}======================================${NC}"
    echo -e "${BLUE}    使用说明${NC}"
    echo -e "${BLUE}======================================${NC}"
    echo ""
    echo -e "${GREEN}1. 确保域名已正确解析到您的阿里云ECS服务器IP${NC}"
    echo -e "${GREEN}2. 确保服务器80和443端口已开放${NC}"
    echo -e "${GREEN}3. 运行此脚本: sudo ./setup-nginx-https.sh${NC}"
    echo -e "${GREEN}4. 访问: https://$DOMAIN${NC}"
    echo ""
    echo -e "${YELLOW}如果遇到问题，请检查:${NC}"
    echo -e "${YELLOW}- 域名解析是否正确${NC}"
    echo -e "${YELLOW}- 防火墙是否允许80/443端口${NC}"
    echo -e "${YELLOW}- 应用服务是否正常运行在8080端口${NC}"
    echo ""
}

# 主函数
main() {
    check_root
    check_os
    install_nginx
    install_certbot
    configure_firewall
    deploy_nginx_config
    get_ssl_certificate
    update_nginx_config
    setup_auto_renewal
    show_usage
    
    echo -e "${GREEN}======================================${NC}"
    echo -e "${GREEN}    HTTPS配置完成！${NC}"
    echo -e "${GREEN}    您可以通过 https://$DOMAIN 访问服务${NC}"
    echo -e "${GREEN}======================================${NC}"
}

# 执行主函数
main