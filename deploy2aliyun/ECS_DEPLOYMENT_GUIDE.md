# 阿里云ECS部署指南

## 概述

本指南详细介绍如何使用一键部署脚本在阿里云ECS服务器上部署育婴宝后端服务。脚本已针对2CPU 2G内存的服务器进行优化。

## 📋 前置条件

### 1. 阿里云ECS服务器要求
- **CPU**: 最低2核心
- **内存**: 最低2GB
- **磁盘**: 最低20GB可用空间
- **操作系统**: CentOS 7+, Ubuntu 18.04+, 或其他主流Linux发行版
- **网络**: 具备公网IP，可访问互联网

### 2. 阿里云容器镜像服务
- 已开通阿里云容器镜像服务个人版
- 获取访问凭证密码
- 镜像仓库地址: `crpi-zyq1wc1umfuictwx.cn-shanghai.personal.cr.aliyuncs.com/aires-docker/yuyingbao`

### 3. 数据库准备（可选）
- PostgreSQL数据库实例（推荐阿里云RDS）
- 数据库连接信息：主机地址、端口、用户名、密码

## 🚀 快速部署

### 步骤1: 上传部署脚本
```bash
# 方法1: 直接下载（如果服务器可访问GitHub）
wget https://raw.githubusercontent.com/westxixia/yuyingbao/main/deploy2aliyun/deploy-ecs.sh

# 方法2: 使用scp上传
scp deploy-ecs.sh user@your-server-ip:/home/user/

# 方法3: 手动创建文件
nano deploy-ecs.sh
# 复制脚本内容并保存
```

### 步骤2: 添加执行权限
```bash
chmod +x deploy-ecs.sh
```

### 步骤3: 执行一键部署
```bash
# 执行完整部署
./deploy-ecs.sh deploy

# 或者直接执行（默认为deploy）
./deploy-ecs.sh
```

### 步骤4: 按提示配置
脚本会引导您完成以下配置：
1. 系统资源检查
2. Docker安装和配置
3. 阿里云镜像仓库登录
4. 环境变量配置
5. 应用部署

## 📝 详细部署步骤

### 1. 系统检查
脚本会自动检查：
- 操作系统类型和版本
- CPU核心数和内存大小
- 磁盘可用空间
- 网络连接状态

### 2. Docker环境配置
如果系统未安装Docker，脚本会：
- 根据操作系统类型选择合适的安装方法
- 配置阿里云Docker镜像加速器
- 启动Docker服务并设置开机自启
- 将当前用户添加到docker组

### 3. 镜像拉取和部署
- 登录阿里云容器镜像服务
- 拉取最新的应用镜像
- 停止旧容器（如果存在）
- 启动新容器，应用2G内存优化配置

### 4. 健康检查和验证
- 等待应用启动（最多3分钟）
- 检查容器运行状态
- 验证应用健康检查端点
- 配置防火墙规则

## ⚙️ 环境变量配置

首次部署时，脚本会创建 `.env` 文件，包含以下配置：

```bash
# 数据库配置 (必须修改)
DB_HOST=localhost                    # 数据库主机地址
DB_PORT=5432                        # 数据库端口
DB_NAME=yuyingbao                   # 数据库名称
DB_USERNAME=yuyingbao               # 数据库用户名
DB_PASSWORD=your_database_password   # 数据库密码

# JWT配置
JWT_SECRET=your_jwt_secret_key_32_characters_long  # JWT密钥（32位）
JWT_EXPIRATION=86400000             # JWT过期时间（毫秒）

# 微信小程序配置
WECHAT_APP_ID=your_wechat_app_id         # 微信AppID
WECHAT_APP_SECRET=your_wechat_app_secret # 微信AppSecret

# 服务配置
SERVER_PORT=8080                    # 服务端口
SPRING_PROFILES_ACTIVE=prod         # Spring配置文件

# 日志配置
LOGGING_LEVEL_ROOT=INFO             # 日志级别
```

### 编辑环境变量
```bash
# 使用nano编辑器
nano .env

# 或使用vim编辑器
vim .env
```

## 🔧 管理命令

### 查看应用状态
```bash
./deploy-ecs.sh status
```

### 查看应用日志
```bash
./deploy-ecs.sh logs

# 或直接使用docker命令
docker logs -f yuyingbao-server
```

### 重启应用
```bash
./deploy-ecs.sh restart

# 或直接使用docker命令
docker restart yuyingbao-server
```

### 停止应用
```bash
./deploy-ecs.sh stop

# 或直接使用docker命令
docker stop yuyingbao-server
```

### 清理旧镜像
```bash
./deploy-ecs.sh cleanup
```

### 进入容器
```bash
docker exec -it yuyingbao-server bash
```

## 🔐 安全配置

### 1. 防火墙配置
脚本会自动配置防火墙开放8080端口，但您也需要：

**阿里云安全组配置**:
1. 登录阿里云控制台
2. 进入ECS实例管理
3. 点击"安全组配置"
4. 添加入方向规则：
   - 端口范围: 8080/8080
   - 协议类型: TCP
   - 授权对象: 0.0.0.0/0

### 2. 数据库安全
- 使用强密码
- 限制数据库访问IP
- 启用SSL连接
- 定期备份数据

### 3. 应用安全
- 定期更新镜像
- 使用HTTPS（配置Nginx反向代理）
- 监控应用日志
- 设置资源限制

## 📊 性能优化

### 2G内存服务器优化配置
- **JVM堆内存**: 768MB
- **JVM参数**: `-XX:+UseG1GC -XX:MaxGCPauseMillis=100`
- **Tomcat线程池**: 最大50线程
- **数据库连接池**: 最大10连接
- **Docker资源限制**: 1.5G内存，1.5CPU核心

### 监控指标
```bash
# 查看容器资源使用
docker stats yuyingbao-server

# 查看系统资源
htop
free -h
df -h
```

## 🐛 故障排除

### 常见问题

#### 1. Docker安装失败
```bash
# 检查系统版本
cat /etc/os-release

# 手动安装Docker
curl -fsSL https://get.docker.com | bash -s docker --mirror Aliyun

# 启动Docker服务
sudo systemctl start docker
sudo systemctl enable docker
```

#### 2. 镜像拉取失败
```bash
# 检查网络连接
ping registry.cn-hangzhou.aliyuncs.com

# 检查登录状态
docker login crpi-zyq1wc1umfuictwx.cn-shanghai.personal.cr.aliyuncs.com

# 手动拉取镜像
docker pull crpi-zyq1wc1umfuictwx.cn-shanghai.personal.cr.aliyuncs.com/aires-docker/yuyingbao:latest
```

#### 3. 应用启动失败
```bash
# 查看详细日志
docker logs -f yuyingbao-server

# 检查容器状态
docker ps -a

# 检查端口占用
netstat -tuln | grep 8080

# 检查环境变量
docker inspect yuyingbao-server | grep -A 20 "Env"
```

#### 4. 内存不足
```bash
# 查看内存使用
free -h

# 清理系统缓存
sudo sync && sudo sysctl vm.drop_caches=3

# 停止不必要的服务
sudo systemctl list-units --type=service --state=running
```

#### 5. 数据库连接失败
- 检查数据库服务状态
- 验证连接信息（主机、端口、用户名、密码）
- 检查网络连通性
- 确认数据库防火墙设置

### 日志位置
- **应用日志**: `docker logs yuyingbao-server`
- **Docker日志**: `/var/log/docker.log`
- **系统日志**: `/var/log/messages` 或 `/var/log/syslog`

## 🔄 更新部署

### 更新应用镜像
```bash
# 拉取最新镜像
docker pull crpi-zyq1wc1umfuictwx.cn-shanghai.personal.cr.aliyuncs.com/aires-docker/yuyingbao:latest

# 停止当前容器
docker stop yuyingbao-server
docker rm yuyingbao-server

# 重新部署
./deploy-ecs.sh deploy
```

### 更新脚本
```bash
# 下载最新脚本
wget -O deploy-ecs.sh https://raw.githubusercontent.com/westxixia/yuyingbao/main/deploy2aliyun/deploy-ecs.sh
chmod +x deploy-ecs.sh
```

## 📈 性能监控

### 应用性能监控
```bash
# 查看JVM内存使用
docker exec yuyingbao-server jstat -gc 1

# 查看线程使用
docker exec yuyingbao-server jstack 1

# 查看应用指标（如果启用了actuator）
curl http://localhost:8080/api/actuator/metrics
```

### 系统性能监控
```bash
# 安装监控工具
sudo yum install -y htop iotop nethogs   # CentOS
sudo apt install -y htop iotop nethogs   # Ubuntu

# 查看系统负载
htop
iotop
nethogs
```

## 🚀 高级配置

### Nginx反向代理
如需配置HTTPS和域名访问，可安装Nginx：

```bash
# 安装Nginx
sudo yum install -y nginx    # CentOS
sudo apt install -y nginx    # Ubuntu

# 配置反向代理
sudo nano /etc/nginx/sites-available/yuyingbao
```

Nginx配置示例：
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### SSL证书配置
使用Let's Encrypt免费SSL证书：
```bash
# 安装certbot
sudo yum install -y certbot python3-certbot-nginx    # CentOS
sudo apt install -y certbot python3-certbot-nginx    # Ubuntu

# 获取证书
sudo certbot --nginx -d your-domain.com
```

## 📞 技术支持

如果在部署过程中遇到问题：

1. **查看部署日志**: 脚本会显示详细的错误信息
2. **检查系统要求**: 确保服务器满足最低配置要求
3. **查看应用日志**: `docker logs -f yuyingbao-server`
4. **提交问题**: 在GitHub仓库提交Issue
5. **联系支持**: xulei0331@126.com

## 📚 相关文档

- [项目文档](/document/v0.5/)
- [API文档](/document/v0.5/API_DESIGN.md)
- [数据库设计](/document/v0.5/DATABASE_DESIGN.md)
- [系统设计](/document/v0.5/SYSTEM_DESIGN.md)

---

*部署指南版本: v0.5.0*  
*最后更新: 2024年8月30日*  
*维护人员: westxixia*