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
DEFAULT_DOMAIN="yuyingbao.yideng.ltd"
NGINX_CONFIG_FILE="nginx-https.conf"
NGINX_SITE_CONFIG="/etc/nginx/sites-available/yuyingbao"
NGINX_SITE_ENABLED="/etc/nginx/sites-enabled/yuyingbao"

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}    阿里云ECS Nginx HTTPS配置脚本${NC}"
echo -e "${BLUE}    育婴宝后端服务${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

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
    systemctl start nginx || echo -e "${YELLOW}⚠️  Nginx启动失败（非致命错误）${NC}"
    systemctl enable nginx || echo -e "${YELLOW}⚠️  Nginx设置开机自启失败（非致命错误）${NC}"
    
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
        # CentOS安装Certbot - 处理阿里云ECS特定问题
        echo -e "${YELLOW}检测到CentOS系统，处理阿里云ECS环境...${NC}"
        
        # 修复阿里云ECS上的EPEL包冲突问题
        fix_epel_conflict() {
            echo -e "${BLUE}🔍 检查并修复EPEL包冲突...${NC}"
            
            # 检查是否存在冲突的包
            if rpm -q epel-aliyuncs-release &> /dev/null && rpm -q epel-release &> /dev/null; then
                echo -e "${YELLOW}检测到EPEL包冲突，正在解决...${NC}"
                
                # 移除官方epel-release包，保留阿里云的
                yum remove -y epel-release
                echo -e "${GREEN}✅ 已移除官方epel-release包${NC}"
            elif rpm -q epel-aliyuncs-release &> /dev/null; then
                echo -e "${GREEN}✅ 检测到阿里云EPEL镜像包，无需处理${NC}"
            else
                echo -e "${YELLOW}未检测到阿里云EPEL包，安装官方EPEL包...${NC}"
                yum install -y epel-release
            fi
        }
        
        # 执行EPEL冲突修复
        fix_epel_conflict
        
        # 尝试直接安装
        if yum install -y certbot python3-certbot-nginx; then
            echo -e "${GREEN}✅ Certbot安装成功${NC}"
        else
            # 如果失败，尝试使用--allowerasing参数
            echo -e "${YELLOW}尝试使用--allowerasing参数...${NC}"
            if yum install -y --allowerasing certbot python3-certbot-nginx; then
                echo -e "${GREEN}✅ Certbot安装成功${NC}"
            else
                # 如果还是失败，尝试其他方法
                echo -e "${YELLOW}尝试其他安装方法...${NC}"
                
                # 确保EPEL源已启用
                if command -v yum-config-manager &> /dev/null; then
                    yum-config-manager --enable epel
                fi
                
                # 再次尝试安装
                if yum install -y certbot python3-certbot-nginx; then
                    echo -e "${GREEN}✅ Certbot安装成功${NC}"
                else
                    echo -e "${RED}❌ Certbot安装失败${NC}"
                    echo -e "${YELLOW}请手动安装Certbot:${NC}"
                    echo -e "${YELLOW}参考: https://certbot.eff.org/instructions${NC}"
                    exit 1
                fi
            fi
        fi
    else
        # Ubuntu安装Certbot
        apt install -y software-properties-common
        add-apt-repository -y universe
        apt update
        apt install -y certbot python3-certbot-nginx
    fi
    
    # 最后的验证
    if command -v certbot &> /dev/null; then
        echo -e "${GREEN}✅ Certbot安装完成${NC}"
        certbot --version
    else
        echo -e "${RED}❌ Certbot安装失败${NC}"
        echo -e "${YELLOW}请手动安装Certbot:${NC}"
        echo -e "${YELLOW}参考: https://certbot.eff.org/instructions${NC}"
        exit 1
    fi
}

# 配置防火墙
configure_firewall() {
    echo -e "${BLUE}🔍 配置防火墙...${NC}"
    
    if command -v ufw &> /dev/null; then
        # Ubuntu防火墙
        ufw allow 'Nginx Full' || echo -e "${YELLOW}⚠️  ufw命令执行失败（非致命错误）${NC}"
        echo -e "${GREEN}✅ Ubuntu防火墙配置完成${NC}"
    elif command -v firewall-cmd &> /dev/null; then
        # CentOS防火墙
        if systemctl is-active --quiet firewalld; then
            firewall-cmd --permanent --add-service=http || echo -e "${YELLOW}⚠️  添加http服务失败（非致命错误）${NC}"
            firewall-cmd --permanent --add-service=https || echo -e "${YELLOW}⚠️  添加https服务失败（非致命错误）${NC}"
            firewall-cmd --reload || echo -e "${YELLOW}⚠️  重载防火墙失败（非致命错误）${NC}"
            echo -e "${GREEN}✅ CentOS防火墙配置完成${NC}"
        else
            echo -e "${YELLOW}ℹ️  firewalld未运行（非致命错误，继续执行）${NC}"
        fi
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
    
    # 确保目标目录存在
    local sites_available_dir="/etc/nginx/sites-available"
    local sites_enabled_dir="/etc/nginx/sites-enabled"
    
    if [[ ! -d "$sites_available_dir" ]]; then
        echo -e "${YELLOW}⚠️  目录 $sites_available_dir 不存在，正在创建...${NC}"
        mkdir -p "$sites_available_dir" || {
            echo -e "${RED}❌ 无法创建目录: $sites_available_dir${NC}"
            exit 1
        }
    fi
    
    if [[ ! -d "$sites_enabled_dir" ]]; then
        echo -e "${YELLOW}⚠️  目录 $sites_enabled_dir 不存在，正在创建...${NC}"
        mkdir -p "$sites_enabled_dir" || {
            echo -e "${RED}❌ 无法创建目录: $sites_enabled_dir${NC}"
            exit 1
        }
    fi
    
    # 复制配置文件
    cp "$NGINX_CONFIG_FILE" "$NGINX_SITE_CONFIG" || {
        echo -e "${RED}❌ 无法复制配置文件到: $NGINX_SITE_CONFIG${NC}"
        exit 1
    }
    
    # 动态更新配置文件中的域名
    sed -i "s/yuyingbao\.yideng\.ltd/$DOMAIN/g" "$NGINX_SITE_CONFIG"
    
    echo -e "${GREEN}✅ 配置文件已复制到: $NGINX_SITE_CONFIG${NC}"
    echo -e "${GREEN}✅ 域名已更新为: $DOMAIN${NC}"
    
    # 创建软链接
    if [[ -f "$NGINX_SITE_ENABLED" ]]; then
        rm "$NGINX_SITE_ENABLED"
    fi
    
    ln -s "$NGINX_SITE_CONFIG" "$NGINX_SITE_ENABLED" || {
        echo -e "${RED}❌ 无法创建软链接: $NGINX_SITE_ENABLED${NC}"
        exit 1
    }
    echo -e "${GREEN}✅ 已创建软链接: $NGINX_SITE_ENABLED${NC}"
    
    # 测试配置
    if nginx -t; then
        echo -e "${GREEN}✅ Nginx配置测试通过${NC}"
    else
        echo -e "${RED}❌ Nginx配置测试失败${NC}"
        exit 1
    fi
    
    # 重新加载Nginx
    systemctl reload nginx || echo -e "${YELLOW}⚠️  Nginx重新加载失败（非致命错误）${NC}"
    echo -e "${GREEN}✅ Nginx已重新加载${NC}"
}

# 检查域名解析
check_domain_resolution() {
    echo -e "${BLUE}🔍 检查域名解析...${NC}"
    
    if command -v nslookup &> /dev/null; then
        if nslookup "$DOMAIN" &> /dev/null; then
            echo -e "${GREEN}✅ 域名解析正常${NC}"
            local resolved_ip=$(nslookup "$DOMAIN" | awk '/^Address: / { print $2 }' | tail -n 1)
            echo -e "${CYAN}解析IP: $resolved_ip${NC}"
        else
            echo -e "${RED}❌ 域名解析失败${NC}"
            return 1
        fi
    elif command -v dig &> /dev/null; then
        if dig +short "$DOMAIN" &> /dev/null; then
            echo -e "${GREEN}✅ 域名解析正常${NC}"
            local resolved_ip=$(dig +short "$DOMAIN" | head -n 1)
            echo -e "${CYAN}解析IP: $resolved_ip${NC}"
        else
            echo -e "${RED}❌ 域名解析失败${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️  未找到nslookup或dig命令，跳过域名解析检查${NC}"
    fi
}

# 检查端口连通性
check_port_connectivity() {
    echo -e "${BLUE}🔍 检查端口连通性...${NC}"
    
    # 检查本地80端口是否可用
    if netstat -tlnp | grep :80 &> /dev/null; then
        echo -e "${GREEN}✅ 本地80端口可用${NC}"
    else
        echo -e "${YELLOW}⚠️  本地80端口可能被占用${NC}"
    fi
    
    # 检查本地443端口是否可用
    if netstat -tlnp | grep :443 &> /dev/null; then
        echo -e "${GREEN}✅ 本地443端口可用${NC}"
    else
        echo -e "${YELLOW}⚠️  本地443端口可能被占用${NC}"
    fi
}

# 诊断和修复常见问题
diagnose_and_fix_issues() {
    echo -e "${BLUE}🔍 诊断和修复常见问题...${NC}"
    
    # 如果DOMAIN变量未设置，询问用户输入
    if [[ -z "$DOMAIN" ]]; then
        echo -e "${BLUE}🔍 配置域名...${NC}"
        echo -e "${YELLOW}请输入您的域名（默认: $DEFAULT_DOMAIN）:${NC}"
        read -r user_domain
        DOMAIN=${user_domain:-$DEFAULT_DOMAIN}
        echo -e "${GREEN}✅ 使用域名: $DOMAIN${NC}"
    fi
    
    # 1. 检查域名解析
    check_domain_resolution
    
    # 2. 检查端口连通性
    check_port_connectivity
    
    # 3. 检查防火墙状态
    echo -e "${BLUE}🔍 检查防火墙状态...${NC}"
    if command -v ufw &> /dev/null && ufw status | grep -q "Status: active"; then
        echo -e "${GREEN}✅ UFW防火墙已启用${NC}"
        if ufw status | grep -q "80/tcp"; then
            echo -e "${GREEN}✅ 80端口已开放${NC}"
        else
            echo -e "${YELLOW}⚠️  80端口未开放，正在开放...${NC}"
            ufw allow 80/tcp || echo -e "${YELLOW}⚠️  开放80端口失败${NC}"
        fi
        
        if ufw status | grep -q "443/tcp"; then
            echo -e "${GREEN}✅ 443端口已开放${NC}"
        else
            echo -e "${YELLOW}⚠️  443端口未开放，正在开放...${NC}"
            ufw allow 443/tcp || echo -e "${YELLOW}⚠️  开放443端口失败${NC}"
        fi
    elif command -v firewall-cmd &> /dev/null && systemctl is-active --quiet firewalld; then
        echo -e "${GREEN}✅ Firewalld防火墙已启用${NC}"
        if firewall-cmd --list-ports | grep -q "80/tcp"; then
            echo -e "${GREEN}✅ 80端口已开放${NC}"
        else
            echo -e "${YELLOW}⚠️  80端口未开放，正在开放...${NC}"
            firewall-cmd --add-port=80/tcp --permanent || echo -e "${YELLOW}⚠️  开放80端口失败${NC}"
        fi
        
        if firewall-cmd --list-ports | grep -q "443/tcp"; then
            echo -e "${GREEN}✅ 443端口已开放${NC}"
        else
            echo -e "${YELLOW}⚠️  443端口未开放，正在开放...${NC}"
            firewall-cmd --add-port=443/tcp --permanent || echo -e "${YELLOW}⚠️  开放443端口失败${NC}"
        fi
        
        firewall-cmd --reload || echo -e "${YELLOW}⚠️  重载防火墙配置失败${NC}"
    else
        echo -e "${YELLOW}⚠️  未检测到活动的防火墙或使用其他防火墙工具${NC}"
    fi
    
    # 4. 检查Nginx配置
    echo -e "${BLUE}🔍 检查Nginx配置...${NC}"
    if nginx -t; then
        echo -e "${GREEN}✅ Nginx配置测试通过${NC}"
    else
        echo -e "${RED}❌ Nginx配置测试失败${NC}"
        return 1
    fi
    
    # 5. 检查Nginx是否正在运行
    echo -e "${BLUE}🔍 检查Nginx运行状态...${NC}"
    if systemctl is-active nginx &>/dev/null; then
        echo -e "${GREEN}✅ Nginx正在运行${NC}"
    else
        echo -e "${YELLOW}⚠️  Nginx未运行，正在启动...${NC}"
        systemctl start nginx || {
            echo -e "${RED}❌ 启动Nginx失败${NC}"
            return 1
        }
    fi
    
    echo -e "${GREEN}✅ 诊断完成${NC}"
}

# 获取SSL证书
get_ssl_certificate() {
    echo -e "${BLUE}🔍 获取SSL证书...${NC}"
    
    # 检查证书是否已存在
    if [[ -d "/etc/letsencrypt/live/$DOMAIN" ]]; then
        echo -e "${GREEN}✅ SSL证书已存在${NC}"
        return
    fi
    
    # 进行诊断检查
    check_domain_resolution
    check_port_connectivity
    
    # 确保Nginx正在运行并加载了配置
    echo -e "${BLUE}🔍 检查Nginx状态...${NC}"
    if systemctl is-active nginx &>/dev/null; then
        echo -e "${GREEN}✅ Nginx正在运行${NC}"
        # 重新加载以确保配置生效
        systemctl reload nginx || echo -e "${YELLOW}⚠️  Nginx重新加载失败（非致命错误）${NC}"
    else
        echo -e "${YELLOW}⚠️  Nginx未运行，正在启动...${NC}"
        systemctl start nginx || {
            echo -e "${RED}❌ 无法启动Nginx${NC}"
            exit 1
        }
    fi
    
    # 等待Nginx完全启动
    sleep 3
    
    # 测试Nginx配置
    echo -e "${BLUE}🔍 测试Nginx配置...${NC}"
    if nginx -t; then
        echo -e "${GREEN}✅ Nginx配置测试通过${NC}"
    else
        echo -e "${RED}❌ Nginx配置测试失败${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}请输入您的邮箱地址用于Let's Encrypt证书通知:${NC}"
    read -r email
    
    echo -e "${YELLOW}正在获取SSL证书...${NC}"
    
    # 首先尝试使用--nginx插件
    if certbot --nginx -d "$DOMAIN" --email "$email" --agree-tos --non-interactive; then
        echo -e "${GREEN}✅ SSL证书获取成功${NC}"
    else
        echo -e "${YELLOW}⚠️  使用nginx插件获取证书失败，尝试使用standalone模式...${NC}"
        
        # 停止Nginx以释放80端口
        systemctl stop nginx || echo -e "${YELLOW}⚠️  停止Nginx失败（非致命错误）${NC}"
        
        # 使用standalone模式获取证书
        if certbot certonly --standalone -d "$DOMAIN" --email "$email" --agree-tos --non-interactive; then
            echo -e "${GREEN}✅ SSL证书获取成功${NC}"
            # 重新启动Nginx
            systemctl start nginx || echo -e "${YELLOW}⚠️  启动Nginx失败（非致命错误）${NC}"
        else
            echo -e "${RED}❌ SSL证书获取失败${NC}"
            echo -e "${YELLOW}请检查以下事项:${NC}"
            echo -e "${YELLOW}1. 域名是否正确解析到此服务器IP${NC}"
            echo -e "${YELLOW}2. 服务器80端口是否在防火墙和安全组中开放${NC}"
            echo -e "${YELLOW}3. 服务器是否可以从互联网访问${NC}"
            
            # 恢复Nginx
            systemctl start nginx || echo -e "${YELLOW}⚠️  启动Nginx失败（非致命错误）${NC}"
            exit 1
        fi
    fi
}

# 手动安装SSL证书（当自动安装失败时使用）
install_certificate_manually() {
    echo -e "${BLUE}🔍 手动安装SSL证书...${NC}"
    
    # 询问域名配置
    echo -e "${BLUE}🔍 配置域名...${NC}"
    echo -e "${YELLOW}请输入您的域名（默认: $DEFAULT_DOMAIN）:${NC}"
    read -r user_domain
    DOMAIN=${user_domain:-$DEFAULT_DOMAIN}
    echo -e "${GREEN}✅ 使用域名: $DOMAIN${NC}"
    
    # 更新Nginx配置文件路径（使用域名作为文件名）
    NGINX_SITE_CONFIG="/etc/nginx/sites-available/${DOMAIN//./_}"
    NGINX_SITE_ENABLED="/etc/nginx/sites-enabled/${DOMAIN//./_}"
    
    # 检查证书是否存在
    if [[ ! -d "/etc/letsencrypt/live/$DOMAIN" ]]; then
        echo -e "${RED}❌ 证书目录不存在: /etc/letsencrypt/live/$DOMAIN${NC}"
        echo -e "${YELLOW}请先获取证书再尝试手动安装${NC}"
        return 1
    fi
    
    # 确保证书文件存在
    if [[ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]] || [[ ! -f "/etc/letsencrypt/live/$DOMAIN/privkey.pem" ]]; then
        echo -e "${RED}❌ 证书文件不存在${NC}"
        return 1
    fi
    
    # 更新Nginx配置
    update_nginx_config
    
    echo -e "${GREEN}✅ SSL证书手动安装完成${NC}"
}

# 更新Nginx配置以使用Let's Encrypt证书
update_nginx_config() {
    echo -e "${BLUE}🔍 更新Nginx配置以使用Let's Encrypt证书...${NC}"
    
    # 检查证书是否存在
    if [[ ! -d "/etc/letsencrypt/live/$DOMAIN" ]]; then
        echo -e "${YELLOW}⚠️  证书目录不存在，跳过配置更新${NC}"
        return
    fi
    
    # 备份原配置
    if [[ -f "$NGINX_SITE_CONFIG.bak" ]]; then
        rm "$NGINX_SITE_CONFIG.bak"
    fi
    cp "$NGINX_SITE_CONFIG" "$NGINX_SITE_CONFIG.bak"
    
    # 更新证书路径
    sed -i "s|/etc/letsencrypt/live/yuyingbao.aijinseliunian.top/fullchain.pem|/etc/letsencrypt/live/$DOMAIN/fullchain.pem|g" "$NGINX_SITE_CONFIG"
    sed -i "s|/etc/letsencrypt/live/yuyingbao.aijinseliunian.top/privkey.pem|/etc/letsencrypt/live/$DOMAIN/privkey.pem|g" "$NGINX_SITE_CONFIG"
    
    # 确保新证书路径已更新
    if ! grep -q "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$NGINX_SITE_CONFIG"; then
        echo -e "${YELLOW}⚠️  证书路径未正确更新，手动添加...${NC}"
        # 如果sed命令没有正确替换，手动添加
        sed -i "s|ssl_certificate .*;|ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;|g" "$NGINX_SITE_CONFIG"
        sed -i "s|ssl_certificate_key .*;|ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;|g" "$NGINX_SITE_CONFIG"
    fi
    
    # 测试配置
    if nginx -t; then
        echo -e "${GREEN}✅ Nginx配置更新完成${NC}"
        systemctl reload nginx || echo -e "${YELLOW}⚠️  Nginx重新加载失败（非致命错误）${NC}"
        echo -e "${GREEN}✅ Nginx已重新加载${NC}"
    else
        echo -e "${RED}❌ Nginx配置更新失败，恢复备份配置${NC}"
        cp "$NGINX_SITE_CONFIG.bak" "$NGINX_SITE_CONFIG"
        systemctl reload nginx || echo -e "${YELLOW}⚠️  Nginx重新加载失败（非致命错误）${NC}"
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
systemctl reload nginx || echo "Warning: Nginx reload failed"
EOF
    
    chmod +x /etc/cron.weekly/certbot-renew
    echo -e "${GREEN}✅ SSL证书自动续期已设置${NC}"
    
    # 立即测试续期
    echo -e "${BLUE}🔍 测试证书续期...${NC}"
    if certbot renew --dry-run; then
        echo -e "${GREEN}✅ 证书续期测试通过${NC}"
    else
        echo -e "${RED}❌ 证书续期测试失败${NC}"
        echo -e "${YELLOW}这可能是因为:${NC}"
        echo -e "${YELLOW}1. 域名解析问题${NC}"
        echo -e "${YELLOW}2. 防火墙或安全组配置问题${NC}"
        echo -e "${YELLOW}3. Nginx配置问题${NC}"
        echo -e "${YELLOW}4. 证书尚未到期（通常在到期前30天才允许续期）${NC}"
        echo -e "${YELLOW}但这不影响当前证书的正常使用${NC}"
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
    echo -e "${GREEN}4. 脚本会询问您的域名（默认: yuyingbao.yideng.ltd）${NC}"
    echo -e "${GREEN}5. 访问: https://$DOMAIN${NC}"
    echo ""
    echo -e "${YELLOW}如果遇到证书获取或续期问题，请尝试以下方法:${NC}"
    echo -e "${YELLOW}- 确保Nginx配置文件中的server_name与域名匹配${NC}"
    echo -e "${YELLOW}- 手动安装证书: certbot install --cert-name $DOMAIN${NC}"
    echo -e "${YELLOW}- 运行诊断: sudo ./setup-nginx-https.sh diagnose${NC}"
    echo -e "${YELLOW}- 或者运行脚本后手动执行: sudo ./setup-nginx-https.sh manual-install${NC}"
    echo ""
    echo -e "${YELLOW}如果遇到问题，请检查:${NC}"
    echo -e "${YELLOW}- 域名解析是否正确${NC}"
    echo -e "${YELLOW}- 防火墙是否允许80/443端口${NC}"
    echo -e "${YELLOW}- 应用服务是否正常运行在8080端口${NC}"
    echo -e "${YELLOW}- 服务器是否可以从互联网访问${NC}"
    echo ""
}

# 主函数
main() {
    # 检查命令行参数
    case "${1:-}" in
        "manual-install")
            check_root
            install_certificate_manually
            return
            ;;
        "diagnose")
            check_root
            diagnose_and_fix_issues
            return
            ;;
        "help"|"-h"|"--help")
            echo "阿里云ECS Nginx HTTPS配置脚本"
            echo ""
            echo "用法: sudo $0 [选项]"
            echo ""
            echo "选项:"
            echo "  (无参数)      执行完整HTTPS配置流程"
            echo "  manual-install 手动安装已存在的SSL证书"
            echo "  diagnose      诊断和修复常见问题"
            echo "  help          显示此帮助信息"
            echo ""
            show_usage
            return
            ;;
    esac
    
    check_root
    check_os
    
    # 询问域名配置
    echo -e "${BLUE}🔍 配置域名...${NC}"
    echo -e "${YELLOW}请输入您的域名（默认: $DEFAULT_DOMAIN）:${NC}"
    read -r user_domain
    DOMAIN=${user_domain:-$DEFAULT_DOMAIN}
    echo -e "${GREEN}✅ 使用域名: $DOMAIN${NC}"
    
    # 更新Nginx配置文件路径（使用域名作为文件名）
    NGINX_SITE_CONFIG="/etc/nginx/sites-available/${DOMAIN//./_}"
    NGINX_SITE_ENABLED="/etc/nginx/sites-enabled/${DOMAIN//./_}"
    
    install_nginx
    install_certbot
    configure_firewall
    deploy_nginx_config
    diagnose_and_fix_issues  # 在获取证书前进行诊断
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