# 阿里云ECS快速部署 - 育婴宝后端服务

## 🚀 一键部署命令

```bash
# 1. 下载部署脚本
wget https://raw.githubusercontent.com/westxixia/yuyingbao/main/deploy2aliyun/deploy-ecs.sh

# 2. 添加执行权限
chmod +x deploy-ecs.sh

# 3. 执行一键部署
./deploy-ecs.sh
```

## 📋 部署前准备

### 服务器要求
- **CPU**: 2核心或以上
- **内存**: 2GB或以上  
- **操作系统**: CentOS 7+, Ubuntu 18.04+
- **网络**: 具备公网IP

### 阿里云容器镜像服务
- **镜像仓库**: `crpi-zyq1wc1umfuictwx.cn-shanghai.personal.cr.aliyuncs.com/aires-docker/yuyingbao`
- **用户名**: `xulei0331@126.com`
- **密码**: 访问凭证密码（部署时输入）

## 🔧 部署过程

脚本会自动完成：

1. ✅ **系统检查** - 检查CPU、内存、磁盘空间
2. ✅ **Docker安装** - 自动安装并配置Docker环境
3. ✅ **镜像拉取** - 登录阿里云并拉取最新镜像
4. ✅ **应用部署** - 启动优化后的容器服务
5. ✅ **健康检查** - 验证应用是否正常运行
6. ✅ **防火墙配置** - 自动开放8080端口

## ⚙️ 环境配置

首次部署会创建 `.env` 配置文件，请编辑以下关键信息：

```bash
# 编辑环境变量
nano .env
```

**必须配置的项目**：
- `DB_HOST` - 数据库主机地址
- `DB_USERNAME` - 数据库用户名  
- `DB_PASSWORD` - 数据库密码
- `JWT_SECRET` - JWT密钥（32位字符）
- `WECHAT_APP_ID` - 微信小程序AppID
- `WECHAT_APP_SECRET` - 微信小程序AppSecret

## 🔍 验证部署

部署完成后，访问以下地址验证：

- **应用地址**: `http://your-server-ip:8080`
- **API地址**: `http://your-server-ip:8080/api`
- **健康检查**: `http://your-server-ip:8080/api/actuator/health`

## 📊 管理命令

```bash
# 查看状态
./deploy-ecs.sh status

# 查看日志
./deploy-ecs.sh logs

# 重启应用
./deploy-ecs.sh restart

# 停止应用
./deploy-ecs.sh stop
```

## 🛡️ 安全配置

### 阿里云安全组
在阿里云控制台添加安全组规则：
- **端口**: 8080
- **协议**: TCP
- **授权对象**: 0.0.0.0/0

### 防火墙
脚本会自动配置系统防火墙，如手动配置：

```bash
# CentOS/RHEL
firewall-cmd --permanent --add-port=8080/tcp
firewall-cmd --reload

# Ubuntu/Debian
ufw allow 8080/tcp
```

## 🐛 常见问题

### Docker安装失败
```bash
# 手动安装Docker
curl -fsSL https://get.docker.com | bash -s docker --mirror Aliyun
sudo systemctl start docker
```

### 应用启动失败
```bash
# 查看详细日志
docker logs -f yuyingbao-server

# 检查环境变量配置
cat .env
```

### 内存不足
确保服务器至少有2GB内存，检查：
```bash
free -h
```

## 🔄 更新应用

```bash
# 拉取最新镜像并重新部署
docker pull crpi-zyq1wc1umfuictwx.cn-shanghai.personal.cr.aliyuncs.com/aires-docker/yuyingbao:latest
./deploy-ecs.sh restart
```

## 📞 技术支持

- **项目仓库**: https://github.com/westxixia/yuyingbao
- **问题反馈**: 提交GitHub Issue
- **邮箱支持**: xulei0331@126.com

---

*快速部署指南 v0.5.0 | 最后更新: 2024年8月30日*