# 阿里云部署指南

## 概述

本目录包含了将育婴宝后端服务部署到阿里云的完整配置和脚本，针对2CPU 2G内存服务器进行了专门优化。

## 📁 文件结构

```
deploy2aliyun/
├── Dockerfile                   # 多阶段构建Docker文件 (2G内存优化)
├── build-and-push.sh           # 自动化构建和推送脚本
├── deploy-ecs.sh               # 阿里云ECS一键部署脚本 (新增)
├── configure-docker-mirrors.sh # Docker镜像源配置脚本 (新增)
├── docker-compose.test.yml     # 本地测试配置
├── docker-compose.prod.yml     # 生产环境配置 (2G内存优化)
├── test-local.sh               # 本地测试脚本
├── deploy-to-server.sh         # 阿里云服务器部署脚本
├── ECS_DEPLOYMENT_GUIDE.md     # ECS详细部署指南 (新增)
├── QUICK_DEPLOY.md             # 快速部署说明 (新增)
└── README.md                   # 本文档
```

## 🚀 快速开始

### 1. 准备阿里云环境

#### 阿里云个人镜像仓库信息
- **镜像仓库地址**: `crpi-zyq1wc1umfuictwx.cn-shanghai.personal.cr.aliyuncs.com`
- **命名空间**: `aires-docker`
- **仓库名称**: `yuyingbao`
- **用户名**: `xulei0331@126.com`
- **完整镜像地址**: `crpi-zyq1wc1umfuictwx.cn-shanghai.personal.cr.aliyuncs.com/aires-docker/yuyingbao`

### 2. 2G内存服务器优化配置

本部署方案专门针对2CPU 2G内存的阿里云ECS进行了优化：

#### JVM参数优化
```bash
-Xms256m          # 初始堆内存256MB
-Xmx768m          # 最大堆内存768MB (预留系统内存)
-XX:+UseG1GC      # 使用G1垃圾收集器
-XX:MaxGCPauseMillis=100  # 最大GC暂停时间
```

#### 连接池优化
```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 10    # 最大连接池大小
      minimum-idle: 2          # 最小空闲连接
      connection-timeout: 30000
      idle-timeout: 300000
```

#### Tomcat优化
```yaml
server:
  tomcat:
    threads:
      max: 50              # 最大线程数
    accept-count: 100      # 最大等待队列
    max-connections: 200   # 最大连接数
```

编辑 `build-and-push.sh` 文件，配置已经更新为：

```bash
# 阿里云镜像仓库配置
ALIYUN_REGISTRY="crpi-zyq1wc1umfuictwx.cn-shanghai.personal.cr.aliyuncs.com"
ALIYUN_NAMESPACE="aires-docker"
ALIYUN_REPO="yuyingbao"
ALIYUN_USERNAME="xulei0331@126.com"
```

### 3. 一键部署到阿里云ECS (推荐)

**最简单的部署方式，适合新手：**

```bash
# 在阿里云ECS服务器上执行
wget https://raw.githubusercontent.com/westxixia/yuyingbao/main/deploy2aliyun/deploy-ecs.sh
chmod +x deploy-ecs.sh
./deploy-ecs.sh
```

脚本会自动完成：
1. ✅ 系统环境检查和Docker安装
2. ✅ Docker镜像源优化配置
3. ✅ 阿里云镜像仓库登录和镜像拉取
4. ✅ PostgreSQL数据库容器启动
5. ✅ 应用容器启动和健康检查
6. ✅ 防火墙配置和环境变量设置

详细说明请查看：[ECS部署指南](./ECS_DEPLOYMENT_GUIDE.md) | [快速部署](./QUICK_DEPLOY.md)

### 3.1. Docker镜像源配置（可选）

如果您的ECS服务器已安装Docker，可以单独配置镜像源加速：

```bash
# 下载镜像源配置脚本
wget https://raw.githubusercontent.com/westxixia/yuyingbao/main/deploy2aliyun/configure-docker-mirrors.sh
chmod +x configure-docker-mirrors.sh

# 配置镜像源
./configure-docker-mirrors.sh config

# 测试镜像拉取
./configure-docker-mirrors.sh test
```

**优化的镜像源列表：**
- `dockerproxy.com` - 高性能代理服务
- `hub-mirror.c.163.com` - 网易镜像源
- `mirror.baidubce.com` - 百度云镜像源
- `ccr.ccs.tencentyun.com` - 腾讯云镜像源

**镜像源管理命令：**
```bash
# 显示当前配置
./configure-docker-mirrors.sh show

# 恢复原始配置
./configure-docker-mirrors.sh restore

# 显示帮助信息
./configure-docker-mirrors.sh help
```

### 4. 手动部署到阿里云服务器

使用专门的服务器部署脚本：

```bash
# 上传部署脚本到服务器
scp deploy-to-server.sh user@your-server:/home/user/

# 在服务器上执行部署
ssh user@your-server
chmod +x deploy-to-server.sh
./deploy-to-server.sh deploy
```

部署脚本会自动完成：
1. ✅ 检查系统资源和Docker环境
2. ✅ 安装Docker (如果未安装)
3. ✅ 登录阿里云镜像仓库
4. ✅ 拉取最新镜像
5. ✅ 停止旧容器
6. ✅ 启动优化后的新容器
7. ✅ 执行健康检查
8. ✅ 显示部署信息

在推送到阿里云之前，建议先进行本地测试：

```bash
# 添加执行权限
chmod +x test-local.sh

# 运行完整测试
./test-local.sh test

# 仅启动测试环境
./test-local.sh start

# 查看服务状态
./test-local.sh status

# 查看日志
./test-local.sh logs

# 停止测试环境
./test-local.sh stop

# 清理测试环境
./test-local.sh cleanup
```

### 5. 手动构建和推送

```bash
# 添加执行权限
chmod +x build-and-push.sh

# 执行构建和推送
./build-and-push.sh
```

脚本会自动执行以下步骤：
1. ✅ 检查Docker环境
2. ✅ 检查阿里云配置
3. ✅ 构建Docker镜像
4. ✅ 测试镜像
5. ✅ 登录阿里云（需要输入凭证）
6. ✅ 推送镜像到阿里云
7. ✅ 显示部署信息

## 🐳 Docker镜像特性

### 2G内存服务器特殊优化

#### 内存分配策略
- **应用内存**: 1.5GB (JVM堆768MB + 非堆512MB + 缓冲区256MB)
- **系统内存**: 500MB (操作系统 + Docker + 其他进程)
- **总计**: 2GB

#### 性能调优
- 使用G1垃圾收集器，减少GC暂停时间
- 限制数据库连接池大小，避免连接过多
- 优化Tomcat线程池，平衡并发和资源使用
- 启用字符串去重，减少内存占用
- **构建阶段**: 使用Maven编译Java应用
- **运行阶段**: 使用轻量级JRE镜像

### 安全特性
- 非root用户运行
- 最小化镜像大小
- 健康检查配置

### 性能优化
- Maven依赖缓存
- JVM参数优化
- 阿里云镜像加速

### 镜像标签策略
- `latest` - 最新版本
- `v0.5.0` - 语义化版本
- `v0.5.0-20241201120000` - 版本+构建时间

## ⚙️ 环境变量配置

### 必需环境变量

| 变量名 | 描述 | 示例值 |
|--------|------|--------|
| `SPRING_PROFILES_ACTIVE` | Spring Profile | `prod` |
| `DB_HOST` | 数据库主机 | `rm-xxx.mysql.rds.aliyuncs.com` |
| `DB_USERNAME` | 数据库用户名 | `yuyingbao` |
| `DB_PASSWORD` | 数据库密码 | `your-password` |

### 可选环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `SERVER_PORT` | 服务端口 | `8080` |
| `DB_PORT` | 数据库端口 | `5432` |
| `DB_NAME` | 数据库名称 | `yuyingbao` |
| `JWT_SECRET` | JWT密钥 | 随机生成 |
| `JWT_EXPIRATION` | JWT过期时间(ms) | `86400000` |

## 🌐 部署到阿里云

### 1. 2G内存服务器直接部署

```bash
# 拉取镜像
docker pull crpi-zyq1wc1umfuictwx.cn-shanghai.personal.cr.aliyuncs.com/aires-docker/yuyingbao:latest

# 运行容器 (2G内存优化)
docker run -d \
  --name yuyingbao-server \
  --restart unless-stopped \
  -p 8080:8080 \
  --memory=1.5g \
  --cpus=1.5 \
  -e SPRING_PROFILES_ACTIVE=prod \
  -e SERVER_TOMCAT_THREADS_MAX=50 \
  -e SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE=10 \
  -e SPRING_DATASOURCE_HIKARI_MINIMUM_IDLE=2 \
  -e DB_HOST=your-db-host \
  -e DB_USERNAME=your-db-user \
  -e DB_PASSWORD=your-db-password \
  crpi-zyq1wc1umfuictwx.cn-shanghai.personal.cr.aliyuncs.com/aires-docker/yuyingbao:latest
```

### 2. Docker Compose部署 (推荐)

```bash
# 使用优化的生产环境配置
docker-compose -f docker-compose.prod.yml up -d
```

创建Kubernetes部署配置：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: yuyingbao-server
spec:
  replicas: 2
  selector:
    matchLabels:
      app: yuyingbao-server
  template:
    metadata:
      labels:
        app: yuyingbao-server
    spec:
      containers:
      - name: yuyingbao-server
        image: crpi-zyq1wc1umfuictwx.cn-shanghai.personal.cr.aliyuncs.com/aires-docker/yuyingbao:latest
        ports:
        - containerPort: 8080
        env:
        - name: SPRING_PROFILES_ACTIVE
          value: "prod"
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: yuyingbao-secrets
              key: db-host
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1.5Gi"
            cpu: "1.5"
        livenessProbe:
          httpGet:
            path: /actuator/health
            port: 8080
          initialDelaySeconds: 60
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /actuator/health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
```

### 4. Serverless应用引擎SAE部署

1. 创建SAE应用
2. 选择镜像部署
3. 配置镜像地址和环境变量
4. 设置资源规格和弹性策略

## 📊 监控和日志

### 应用监控
- 使用阿里云应用实时监控服务(ARMS)
- 配置应用性能监控
- 设置告警规则

### 日志管理
- 使用阿里云日志服务(SLS)
- 配置日志收集
- 设置日志分析和检索

### 健康检查
- 应用健康检查: `/actuator/health`
- 应用信息: `/actuator/info`
- 应用指标: `/actuator/metrics`

## 🔧 故障排除

### 常见问题

#### 1. 镜像构建失败
```bash
# 检查Docker环境
docker version
docker info

# 清理Docker缓存
docker system prune -f

# 重新构建
./build-and-push.sh
```

#### 2. 推送失败
```bash
# 检查网络连接
ping registry.cn-hangzhou.aliyuncs.com

# 重新登录
docker login registry.cn-hangzhou.aliyuncs.com

# 检查镜像仓库权限
```

#### 3. 应用启动失败
```bash
# 查看容器日志
docker logs yuyingbao-server

# 检查环境变量
docker inspect yuyingbao-server

# 检查数据库连接
```

### 性能优化

#### JVM参数调优 (2G内存优化)
```bash
-Xms256m -Xmx768m
-XX:+UseG1GC
-XX:MaxGCPauseMillis=100
-XX:+UseStringDeduplication
-XX:+OptimizeStringConcat
```

#### 数据库连接池 (2G内存优化)
```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 10
      minimum-idle: 2
      connection-timeout: 30000
      idle-timeout: 300000
      max-lifetime: 600000
```

## 📋 部署检查清单

### 部署前检查
- [ ] 阿里云账号和权限配置
- [ ] 容器镜像服务配置
- [ ] RDS数据库配置
- [ ] VPC网络配置
- [ ] 安全组配置

### 部署后验证
- [ ] 应用健康检查通过
- [ ] 数据库连接正常
- [ ] API接口测试通过
- [ ] 日志输出正常
- [ ] 监控数据正常

### 生产环境配置
- [ ] HTTPS证书配置
- [ ] 域名解析配置
- [ ] CDN加速配置
- [ ] 备份策略配置
- [ ] 监控告警配置

## 📞 技术支持

如果在部署过程中遇到问题：

1. 查看项目文档: `document/v0.5/`
2. 检查阿里云服务状态
3. 提交GitHub Issue
4. 联系技术支持

---

*部署文档版本: v0.5.0*  
*最后更新: 2024年8月29日*  
*维护人员: westxixia*