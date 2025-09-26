# 阿里云ECS HTTPS配置指南

## 概述

本文档说明如何在阿里云ECS上为育婴宝后端服务配置HTTPS支持，使用Let's Encrypt免费SSL证书。

## 配置文件说明

1. `yuyingbao.conf` - Nginx HTTPS配置文件
2. `03_setup-nginx-https.sh` - 自动化配置脚本

## 部署步骤

### 1. 前置条件

确保满足以下条件：
- 域名已正确解析到阿里云ECS服务器IP
- 服务器80和443端口已开放
- 应用服务正常运行在8080端口

### 2. 上传配置文件

将以下文件上传到阿里云ECS服务器：
```bash
yuyingbao.conf
03_setup-nginx-https.sh
```

### 3. 运行配置脚本

```bash
# 给脚本添加执行权限
chmod +x 03_setup-nginx-https.sh

# 运行配置脚本（需要root权限）
sudo ./03_setup-nginx-https.sh
```

### 4. 脚本执行过程

脚本将自动执行以下操作：
1. 检查并安装Nginx
2. 安装Certbot (Let's Encrypt客户端)
3. 配置防火墙允许HTTP/HTTPS流量
4. 部署Nginx配置文件
5. 获取SSL证书
6. 设置证书自动续期

## 手动配置方式

如果需要手动配置，可以按照以下步骤：

### 1. 安装Nginx和Certbot

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx

# CentOS/RHEL/阿里云Linux
sudo yum install nginx
# 如果遇到EPEL包冲突问题，脚本会自动处理
sudo ./setup-nginx-https.sh
```

### 2. 配置Nginx

将`yuyingbao.conf`复制到Nginx配置目录：
```bash
sudo cp yuyingbao.conf /etc/nginx/conf.d/
```

### 3. 获取SSL证书

```bash
sudo certbot --nginx -d yuyingbao.yideng.ltd
```

### 4. 测试并重新加载Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 验证配置

配置完成后，可以通过以下方式验证：

1. 访问 `http://yuyingbao.yideng.ltd`，应该自动重定向到HTTPS
2. 访问 `https://yuyingbao.yideng.ltd`，应该能正常访问应用
3. 检查证书信息，确保证书有效

## 故障排除

### 1. 域名解析问题

确保域名已正确解析到服务器IP：
```bash
nslookup yuyingbao.yideng.ltd
```

### 2. 端口问题

检查80和443端口是否开放：
```bash
sudo netstat -tlnp | grep ':80\|:443'
```

### 3. Nginx配置问题

检查Nginx配置和日志：
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

### 4. 证书问题

检查证书状态和续期：
```bash
sudo certbot certificates
sudo certbot renew --dry-run
```

### 5. 阿里云ECS特定问题

如果在阿里云ECS上遇到Certbot安装问题（EPEL包冲突），主脚本会自动处理：
- 检测并解决EPEL包冲突问题
- 自动更新系统包
- 安装Certbot及其Nginx插件

## 自动续期

脚本已设置每周自动续期SSL证书。您也可以手动测试续期：
```bash
sudo certbot renew --dry-run
```

## 注意事项

1. Let's Encrypt证书每90天需要续期，已配置自动续期
2. 确保服务器时间正确，否则会影响证书验证
3. 如果更换域名，需要重新获取证书
4. 配置完成后，建议禁用HTTP访问，强制使用HTTPS