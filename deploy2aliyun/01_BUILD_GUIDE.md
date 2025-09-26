# 🚀 育婴宝项目构建指南

## 📋 脚本功能

[`01_build-and-push.sh`] 是育婴宝项目的统一构建和推送脚本，集成了以下功能：

- ✅ **Docker环境检查**：自动检测Docker运行状态
- ✅ **镜像源优化**：可选配置Docker镜像源加速
- ✅ **应用镜像构建**：编译Java应用并构建Docker镜像
- ✅ **PostgreSQL镜像处理**：拉取、标记和推送PostgreSQL 16镜像
- ✅ **阿里云集成**：自动登录并推送到阿里云私有仓库
- ✅ **故障排除**：智能重试和详细错误诊断

## 🛠️ 使用方法

### 基本使用

```bash
# 进入部署目录
cd /path/to/yuyingbao/deploy2aliyun

# 执行构建和推送
./01_build-and-push.sh
```

### 交互式配置

脚本运行时会提示以下选项：

1. **Docker镜像源配置**：如未配置镜像源，脚本会询问是否配置以提升拉取速度
2. **阿里云登录**：需要输入阿里云容器镜像服务的登录凭证
3. **清理选项**：构建完成后可选择清理本地镜像

## 📊 构建流程

### 1. 环境检查阶段
- 检查Docker是否安装和运行
- 检查Docker镜像源配置
- 验证阿里云仓库配置

### 2. 镜像构建阶段
- 构建应用Docker镜像（多标签）
- 拉取PostgreSQL 16镜像
- 为PostgreSQL镜像添加私有仓库标签

### 3. 推送阶段
- 登录阿里云容器镜像服务
- 推送应用镜像（latest、版本号、构建号）
- 推送PostgreSQL镜像到私有仓库

### 4. 验证阶段
- 镜像完整性检查
- 显示推送结果和部署信息

## ⚙️ 配置说明

### 阿里云镜像仓库配置

```bash
# 镜像仓库地址
ALIYUN_REGISTRY="crpi-zyq1wc1umfuictwx.cn-shanghai.personal.cr.aliyuncs.com"
ALIYUN_NAMESPACE="aires-docker"
ALIYUN_USERNAME="xulei0331@126.com"
```

### Docker镜像源配置

脚本可自动配置以下高性能镜像源：
- `https://dockerproxy.com` - 高性能代理服务
- `https://hub-mirror.c.163.com` - 网易镜像源
- `https://mirror.baidubce.com` - 百度云镜像源
- `https://ccr.ccs.tencentyun.com` - 腾讯云镜像源

### 构建优化配置

针对2G内存服务器优化：
- JVM参数：`-Xms256m -Xmx768m -XX:+UseG1GC`
- Maven参数：`-DskipTests -Dmaven.test.skip=true`
- Docker平台：`linux/amd64`

## 🔧 故障排除

### 常见问题

1. **PostgreSQL镜像拉取失败**
   ```bash
   # 解决方案
   ping registry-1.docker.io  # 检查网络
   docker info | grep 'Registry Mirrors'  # 检查镜像源
   # 重新运行脚本并选择配置镜像源
   ```

2. **阿里云登录失败**
   ```bash
   # 确认登录信息
   用户名：xulei0331@126.com
   密码：访问凭证密码或Personal Access Token
   ```

3. **Docker构建失败**
   ```bash
   # 检查Docker状态
   docker info
   docker system df  # 检查磁盘空间
   docker system prune  # 清理空间
   ```

### 日志查看

构建过程中的详细日志会实时显示，包括：
- 🔍 环境检查结果
- 🔨 构建进度信息
- 📤 推送状态反馈
- ✅ 成功/失败状态

### 手动修复

如果自动修复失败，可手动执行：

```bash
# 手动配置Docker镜像源
sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'
{
  "registry-mirrors": [
    "https://dockerproxy.com",
    "https://hub-mirror.c.163.com"
  ]
}
EOF
sudo systemctl restart docker

# 手动拉取PostgreSQL镜像
docker pull postgres:16
docker tag postgres:16 crpi-zyq1wc1umfuictwx.cn-shanghai.personal.cr.aliyuncs.com/aires-docker/postgres:16

# 手动登录阿里云
docker login crpi-zyq1wc1umfuictwx.cn-shanghai.personal.cr.aliyuncs.com -u xulei0331@126.com
```

## 📋 输出信息

构建成功后，脚本会显示：

```
🎉 构建和推送完成！

📋 部署信息：
镜像地址: crpi-zyq1wc1umfuictwx.cn-shanghai.personal.cr.aliyuncs.com/aires-docker/yuyingbao:v0.5.0
构建版本: crpi-zyq1wc1umfuictwx.cn-shanghai.personal.cr.aliyuncs.com/aires-docker/yuyingbao:v0.5.0-20240905120000
最新版本: crpi-zyq1wc1umfuictwx.cn-shanghai.personal.cr.aliyuncs.com/aires-docker/yuyingbao:latest
PostgreSQL镜像: crpi-zyq1wc1umfuictwx.cn-shanghai.personal.cr.aliyuncs.com/aires-docker/postgres:16
```

## 🚀 下一步

构建完成后，使用 [`02_deploy-ecs.sh`] 脚本在阿里云ECS上部署应用。

## 💡 最佳实践

1. **首次使用**：选择配置Docker镜像源以提升后续构建速度
2. **定期清理**：定期清理本地镜像释放磁盘空间
3. **版本管理**：每次发布前更新VERSION变量
4. **日志保存**：重要构建可保存日志：`./01_build-and-push.sh 2>&1 | tee build.log`