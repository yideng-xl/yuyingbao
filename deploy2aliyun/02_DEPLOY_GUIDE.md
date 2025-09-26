# 🚀 育婴宝项目ECS部署指南

## 📋 脚本功能

[`02_deploy-ecs.sh`] 是育婴宝项目的一键ECS部署脚本，集成了以下功能：

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
scp 02_deploy-ecs.sh user@your-ecs-ip:/home/user/

# 2. 登录ECS服务器
ssh user@your-ecs-ip

# 3. 复制阿里云配置示例文件并填写您的配置信息
cp aliyun-config.json.example aliyun-config.json
# 编辑 aliyun-config.json 文件，填写您的阿里云配置信息

# 4. 给脚本执行权限
chmod +x 02_deploy-ecs.sh

# 5. 执行部署
./02_deploy-ecs.sh
```

### 一键部署

```bash
# 下载并执行（推荐）
curl -fsSL https://raw.githubusercontent.com/westxixia/yuyingbao/main/deploy2aliyun/02_deploy-ecs.sh | bash
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
- **彻底清理旧容器**：停止并删除所有相关容器
- **本地数据持久化**：创建`./postgres_data`目录并设置正确权限
- 创建PostgreSQL容器（512M内存限制）
- 数据目录映射：`./postgres_data:/var/lib/postgresql/data`
- 等待数据库完全初始化就绪（2-4分钟）
- 进行数据库连接和功能性验证

### 6. 应用部署
- **等待数据库完全准备好**（关键步骤）
- 停止旧版本容器
- 再次验证数据库连接
- 创建应用容器（1.5G内存限制）
- 配置环境变量和网络
- 启动健康检查（等待4-6分钟）

### 7. 网络配置
- 配置防火墙规则（开放8080端口）
- 验证服务可访问性

## 🗄️ 数据持久化配置

### 本地目录映射

脚本使用本地目录映射而不是Docker卷，确保数据安全：

```bash
# 数据目录
./postgres_data  # PostgreSQL数据存储目录

# 目录权限
所有者: postgres (999:999)
权限: 700 (rwx------)
```

### 数据安全保障

1. **容器删除数据不丢失**：即使删除PostgreSQL容器，数据仍保存在本地目录
2. **可视化数据管理**：可直接查看和备份`./postgres_data`目录
3. **便于迁移**：复制`postgres_data`目录即可迁移数据

### 数据管理命令

```bash
# 查看数据目录大小
du -sh ./postgres_data

# 备份数据
tar -czf postgres_backup_$(date +%Y%m%d).tar.gz postgres_data/

# 恢复数据（需先停止容器）
./02_deploy-ecs.sh stop-all
tar -xzf postgres_backup_20240905.tar.gz
./02_deploy-ecs.sh deploy

# 彻底清理所有数据（危险操作）
./02_deploy-ecs.sh reset-data
```

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

脚本会自动创建 `.env` 文件，并支持自定义数据库配置：

```bash
# 数据库配置
DB_HOST=yuyingbao-postgres
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

**自定义数据库配置：**

您可以修改 `.env` 文件中的数据库配置信息，脚本会自动使用这些配置来：
1. 创建PostgreSQL容器时设置数据库名称、用户名和密码
2. 应用容器启动时使用相同的数据库连接信息

修改后，请重新运行部署脚本以应用新的配置：
```bash
./02_deploy-ecs.sh stop-all
./02_deploy-ecs.sh deploy
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

5. **数据库连接错误 (UnknownHostException: postgres)**
   现已从根本上解决了这个问题：
   
   **根本原因：** 应用配置中使用了`postgres`作为数据库主机名，但实际的PostgreSQL容器名是`yuyingbao-postgres`。
   
   **解决方案：** 已修改`application-prod.yml`中的数据库连接URL:
   ```yaml
   # 修改前
   url: jdbc:postgresql://postgres:5432/yuyingbao
   
   # 修改后
   url: jdbc:postgresql://yuyingbao-postgres:5432/yuyingbao
   ```
   
   **诊断命令：**
   ```bash
   # 检查应用配置
   grep "postgresql://" server/src/main/resources/application-prod.yml
   
   # 测试容器间连接
   docker exec yuyingbao-server nslookup yuyingbao-postgres
   docker exec yuyingbao-server ping -c 2 yuyingbao-postgres
   
   # 如果仍有问题，使用诊断脚本
   ./fix-postgres-connection.sh
   ./02_deploy-ecs.sh diagnose
   ```
   
   这个修改解决了DNS解析问题，现在应用可以直接通过Docker内部网络找到PostgreSQL容器。

6. **Docker模板解析错误 (template parsing error: template: :1: bad character U+002D '-')**
   
   **问题描述：** 在执行网络诊断命令时出现此错误，这是由于在Docker的Go模板中使用了包含连字符的格式字符串。
   
   **解决方案：** 已修复所有相关脚本中的模板格式问题：
   ```bash
   # 修复前（错误的格式）
   docker network inspect ${NETWORK_NAME} --format='{{.Name}}: {{.Driver}} - {{range .IPAM.Config}}{{.Subnet}}{{end}}'
   
   # 修复后（正确的格式）
   docker network inspect ${NETWORK_NAME} --format='{{.Name}}: {{.Driver}} {{range .IPAM.Config}}{{.Subnet}}{{end}}'
   ```
   
   **涉及文件：**
   - [`02_deploy-ecs.sh`](./02_deploy-ecs.sh)
   - [`fix-postgres-connection.sh`](./fix-postgres-connection.sh)
   
   **验证修复：**
   ```bash
   # 执行网络诊断
   ./02_deploy-ecs.sh diagnose
   
   # 或使用专用诊断脚本
   ./fix-postgres-connection.sh
   ```

6. **数据目录权限问题**
   ```bash
   # 检查数据目录权限
   ls -la postgres_data/
   
   # 修复数据目录权限
   sudo chown -R 999:999 postgres_data/
   sudo chmod 700 postgres_data/
   
   # 重新启动数据库
   docker restart yuyingbao-postgres
   ```

7. **数据库初始化失败**
   ```bash
   # 检查数据目录是否为空
   ls -la postgres_data/
   
   # 如果目录不为空但初始化失败，清空重新初始化
   ./02_deploy-ecs.sh stop-all
   sudo rm -rf postgres_data/*
   ./02_deploy-ecs.sh deploy
   
   # 如果需要完全重置（数据将丢失）
   ./02_deploy-ecs.sh reset-data
   ```

8. **防火墙配置问题**
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
./02_deploy-ecs.sh

# 手动更新镜像
docker pull crpi-zyq1wc1umfuictwx.cn-shanghai.personal.cr.aliyuncs.com/aires-docker/yuyingbao:latest
docker stop yuyingbao-server
docker rm yuyingbao-server
# 然后重新运行02_deploy-ecs.sh
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
    server_name yuyingbao.yideng.ltd;
    
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

## 8. 配置HTTPS (可选但推荐)

为了提高安全性，建议为您的服务配置HTTPS。我们提供了自动化脚本来配置Let's Encrypt免费SSL证书。

### 8.1 使用自动化脚本配置HTTPS

1. 确保域名已正确解析到您的阿里云ECS服务器IP
2. 确保服务器80和443端口已开放
3. 上传HTTPS配置文件：
   ```bash
   # 上传以下文件到服务器
   nginx-https.conf
   03_setup-nginx-https.sh
   ```
4. 运行HTTPS配置脚本：
   ```bash
   chmod +x 03_setup-nginx-https.sh
   
   # 运行主配置脚本（会自动处理阿里云ECS特定问题）
   sudo ./03_setup-nginx-https.sh
   ```

### 8.2 手动配置HTTPS

如果您需要手动配置，请参考 [HTTPS_SETUP.md](HTTPS_SETUP.md) 文件。

## 9. 验证部署

部署完成后，您可以通过以下方式验证服务：

```
# 检查服务状态
curl http://localhost:8080/api/actuator/health

# 检查容器状态
docker ps
docker stats yuyingbao-server yuyingbao-postgres

# 检查数据库连接
docker exec yuyingbao-postgres pg_isready -U yuyingbao -d yuyingbao
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