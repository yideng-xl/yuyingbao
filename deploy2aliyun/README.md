# 阿里云部署指南

## 概述

本目录包含了将育婴宝后端服务部署到阿里云的完整配置和脚本。

## 📁 文件结构

```
deploy2aliyun/
├── Dockerfile                 # 优化的多阶段构建Docker文件
├── build-and-push.sh         # 自动化构建和推送脚本
├── docker-compose.test.yml   # 本地测试配置
├── test-local.sh             # 本地测试脚本
└── README.md                 # 本文档
```

## 🚀 快速开始

### 1. 准备阿里云环境

#### 开通容器镜像服务
1. 登录阿里云控制台
2. 开通 **容器镜像服务ACR** (免费版即可)
3. 创建命名空间 (如: `yuyingbao-prod`)
4. 创建镜像仓库 `yuyingbao-server`

#### 获取访问凭证
1. 进入容器镜像服务控制台
2. 访问凭证 → 设置Registry登录密码
3. 记录用户名和密码

### 2. 配置部署脚本

编辑 `build-and-push.sh` 文件，修改以下配置：

```bash
# 阿里云镜像仓库配置
ALIYUN_REGISTRY="registry.cn-hangzhou.aliyuncs.com"  # 选择就近地域
ALIYUN_NAMESPACE="your-namespace"                    # 替换为您的命名空间
ALIYUN_REPO="yuyingbao-server"                      # 镜像仓库名称
```

### 3. 本地测试（推荐）

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

### 4. 构建和推送到阿里云

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

### 多阶段构建
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

### 1. 云服务器ECS部署

```bash
# 拉取镜像
docker pull registry.cn-hangzhou.aliyuncs.com/your-namespace/yuyingbao-server:v0.5.0

# 运行容器
docker run -d \
  --name yuyingbao-server \
  --restart unless-stopped \
  -p 8080:8080 \
  -e SPRING_PROFILES_ACTIVE=prod \
  -e DB_HOST=your-rds-host \
  -e DB_USERNAME=your-db-user \
  -e DB_PASSWORD=your-db-password \
  registry.cn-hangzhou.aliyuncs.com/your-namespace/yuyingbao-server:v0.5.0
```

### 2. 容器服务ACK部署

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
        image: registry.cn-hangzhou.aliyuncs.com/your-namespace/yuyingbao-server:v0.5.0
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
            memory: "1Gi"
            cpu: "500m"
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

### 3. Serverless应用引擎SAE部署

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

#### JVM参数调优
```bash
-Xms512m -Xmx1024m
-XX:+UseG1GC
-XX:MaxGCPauseMillis=100
-XX:+HeapDumpOnOutOfMemoryError
```

#### 数据库连接池
```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      connection-timeout: 30000
      idle-timeout: 600000
      max-lifetime: 1800000
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