# 🚀 育婴宝项目ECS部署指南

## 📋 脚本功能

[`deploy-ecs.sh`] 是育婴宝项目的一键ECS部署脚本，集成了以下功能：

- ✅ **系统环境检查**：自动检测操作系统、内存、磁盘空间
- ✅ **Docker自动安装**：支持CentOS/Ubuntu系统的Docker安装和配置
- ✅ **镜像源优化**：自动配置阿里云等高速镜像源
- ✅ **PostgreSQL数据库**：自动部署PostgreSQL 16容器
- ✅ **应用部署**：部署Spring Boot应用（2G内存优化）
- ✅ **网络配置**：创建专用Docker网络
- ✅ **防火墙配置**：自动配置iptables/ufw防火墙规则
- ✅ **健康检查**：应用启动状态监控

## 🛠️ 使用方法

### 基本使用

```bash
# 1. 上传脚本到ECS服务器
scp deploy-ecs.sh user@your-ecs-ip:/home/user/

# 2. 登录ECS服务器
ssh user@your-ecs-ip

# 3. 给脚本执行权限
chmod +x deploy-ecs.sh

# 4. 执行部署
./deploy-ecs.sh
```

### 一键部署

```bash
# 下载并执行（推荐）
curl -fsSL https://raw.githubusercontent.com/westxixia/yuyingbao/main/deploy2aliyun/deploy-ecs.sh | bash
```

## 📊 部署流程

### 1. 系统检查阶段
- 检查用户权限（建议非root用户）
- 显示系统信息（CPU、内存、磁盘）
- 验证系统资源是否满足要求

### 2. Docker环境配置
- 自动检测并安装Docker（CentOS/Ubuntu）
- 配置Docker镜像加速器
- 启动并验证Docker服务

### 3. 阿里云镜像仓库登录
- 交互式登录阿里云容器镜像服务
- 验证登录状态

### 4. 镜像拉取阶段
- 智能拉取PostgreSQL镜像（优先私有仓库）
- 拉取应用镜像
- 验证镜像完整性

### 5. 数据库部署
- 创建PostgreSQL容器（512M内存限制）
- 配置数据持久化存储
- 等待数据库启动就绪

### 6. 应用部署
- 停止旧版本容器
- 创建应用容器（1.5G内存限制）
- 配置环境变量和网络
- 启动健康检查

### 7. 网络配置
- 配置防火墙规则（开放8080端口）
- 验证服务可访问性

## ⚙️ 配置说明

### 服务器要求

**最低配置：**
- CPU: 1核心
- 内存: 2GB
- 磁盘: 20GB
- 网络: 1Mbps

**推荐配置：**
- CPU: 2核心
- 内存: 2GB
- 磁盘: 40GB SSD
- 网络: 5Mbps

### 资源分配（2G内存服务器）

```bash
# 应用容器
内存限制: 1.5GB
CPU限制: 1.5核心
JVM堆内存: 768MB

# PostgreSQL容器
内存限制: 512MB
CPU限制: 0.5核心
连接数限制: 50
```

### 网络配置

```bash
# Docker网络
网络名称: yuyingbao-network
驱动类型: bridge

# 端口映射
应用端口: 8080
数据库端口: 5432 (内部访问)
```

### 环境变量配置

脚本会自动创建 `.env` 文件：

```bash
# 数据库配置
DB_HOST=postgres
DB_PORT=5432
DB_NAME=yuyingbao
DB_USERNAME=yuyingbao
DB_PASSWORD=YuyingBao2024@Database

# JWT配置
JWT_SECRET=your_jwt_secret_key_32_characters_long
JWT_EXPIRATION=86400000

# 微信小程序配置
WECHAT_APP_ID=your_wechat_app_id
WECHAT_APP_SECRET=your_wechat_app_secret

# 服务配置
SERVER_PORT=8080
SPRING_PROFILES_ACTIVE=prod
```

## 🔧 故障排除

### 常见问题

1. **Docker安装失败**
   ```bash
   # 手动安装Docker
   # CentOS
   sudo yum install -y docker-ce
   sudo systemctl start docker
   
   # Ubuntu
   sudo apt install -y docker.io
   sudo systemctl start docker
   ```

2. **内存不足**
   ```bash
   # 检查内存使用
   free -h
   docker stats
   
   # 清理系统缓存
   sudo sync && sudo sysctl vm.drop_caches=3
   ```

3. **镜像拉取失败**
   ```bash
   # 检查网络连接
   ping registry-1.docker.io
   
   # 检查Docker镜像源
   docker info | grep "Registry Mirrors"
   
   # 手动拉取镜像
   docker pull postgres:16
   ```

4. **应用启动失败**
   ```bash
   # 查看容器日志
   docker logs yuyingbao-server
   docker logs yuyingbao-postgres
   
   # 检查容器状态
   docker ps -a
   ```

5. **防火墙配置问题**
   ```bash
   # CentOS/RHEL
   sudo firewall-cmd --zone=public --add-port=8080/tcp --permanent
   sudo firewall-cmd --reload
   
   # Ubuntu
   sudo ufw allow 8080/tcp
   sudo ufw reload
   ```

### 健康检查

```bash
# 检查服务状态
curl http://localhost:8080/api/actuator/health

# 检查容器状态
docker ps
docker stats yuyingbao-server yuyingbao-postgres

# 检查数据库连接
docker exec yuyingbao-postgres pg_isready -U yuyingbao -d yuyingbao
```

### 日志查看

```bash
# 应用日志
docker logs -f yuyingbao-server

# 数据库日志
docker logs -f yuyingbao-postgres

# 系统日志
journalctl -u docker.service -f
```

## 🔄 维护操作

### 更新应用

```bash
# 重新部署（自动停止旧版本）
./deploy-ecs.sh

# 手动更新镜像
docker pull crpi-zyq1wc1umfuictwx.cn-shanghai.personal.cr.aliyuncs.com/aires-docker/yuyingbao:latest
docker stop yuyingbao-server
docker rm yuyingbao-server
# 然后重新运行deploy-ecs.sh
```

### 备份数据库

```bash
# 创建数据库备份
docker exec yuyingbao-postgres pg_dump -U yuyingbao yuyingbao > backup.sql

# 恢复数据库
docker exec -i yuyingbao-postgres psql -U yuyingbao yuyingbao < backup.sql
```

### 清理资源

```bash
# 清理未使用的镜像
docker image prune -a

# 清理未使用的容器
docker container prune

# 清理未使用的卷
docker volume prune
```

## 📊 监控指标

### 系统监控

```bash
# CPU使用率
top -p $(pgrep -f yuyingbao-server)

# 内存使用
docker stats yuyingbao-server --no-stream

# 磁盘使用
df -h
docker system df
```

### 应用监控

```bash
# 健康检查
curl http://localhost:8080/api/actuator/health

# 应用信息
curl http://localhost:8080/api/actuator/info

# JVM指标
curl http://localhost:8080/api/actuator/metrics
```

## 🌐 外网访问配置

### 阿里云安全组

在阿里云控制台配置安全组规则：

```
入方向规则:
端口范围: 8080/8080
授权对象: 0.0.0.0/0
协议类型: TCP
```

### 域名配置（可选）

```bash
# 使用Nginx反向代理
sudo apt install nginx
sudo tee /etc/nginx/sites-available/yuyingbao << 'EOF'
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
EOF

sudo ln -s /etc/nginx/sites-available/yuyingbao /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 📋 部署检查清单

- [ ] 服务器满足最低配置要求
- [ ] 网络连接正常
- [ ] Docker服务运行正常
- [ ] 阿里云镜像仓库可访问
- [ ] 安全组/防火墙规则配置正确
- [ ] 应用健康检查通过
- [ ] 数据库连接正常
- [ ] 外网访问测试通过

## 💡 最佳实践

1. **定期备份**：设置定时任务备份数据库
2. **监控告警**：配置资源使用监控和告警
3. **日志轮转**：定期清理Docker日志文件
4. **安全更新**：定期更新系统和Docker
5. **性能优化**：根据实际负载调整资源配置