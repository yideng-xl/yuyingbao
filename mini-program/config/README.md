# 环境配置说明

## 概述

本项目支持多环境配置，可以根据微信小程序的运行环境自动切换 API 地址和其他配置。

## 环境类型

### 1. 开发环境 (develop)
- **API 地址**: `http://localhost:8080/api`
- **用途**: 本地开发调试
- **特点**: 开启详细日志，便于调试

### 2. 体验版环境 (trial)
- **API 地址**: `https://yuyingbao.yideng.ltd/api`
- **用途**: 内部测试和体验
- **特点**: 开启基础日志，便于问题排查

### 3. 正式版环境 (release)
- **API 地址**: `https://yuyingbao.yideng.ltd/api`
- **用途**: 生产环境
- **特点**: 关闭调试日志，优化性能

## 配置方式

### 自动配置
小程序会根据 `wx.getAccountInfoSync()` 返回的环境版本自动选择对应的配置：

```javascript
const accountInfo = wx.getAccountInfoSync();
const envVersion = accountInfo.miniProgram.envVersion;
```

### 手动配置
如需手动指定环境，可以修改 `config/env.js` 文件中的 `ENV_CONFIG` 对象。

## 使用方法

### 1. 获取 API 地址
```javascript
const { getApiBaseUrl } = require('./config/env.js');
const apiUrl = getApiBaseUrl();
```

### 2. 获取环境信息
```javascript
const { getEnvInfo } = require('./config/env.js');
const envInfo = getEnvInfo();
console.log('当前环境:', envInfo.envVersion);
console.log('API 地址:', envInfo.apiBaseUrl);
```

### 3. 检查调试模式
```javascript
const { isDebugMode } = require('./config/env.js');
if (isDebugMode()) {
  console.log('调试模式已开启');
}
```

## 环境切换

### 开发环境
- 在微信开发者工具中运行
- 自动使用本地 API 地址
- 开启详细日志输出

### 体验版
- 上传代码到微信后台
- 设置为体验版
- 自动使用生产 API 地址

### 正式版
- 提交审核并发布
- 自动使用生产 API 地址
- 关闭调试日志

## 注意事项

1. **网络请求域名配置**: 需要在微信小程序后台配置合法域名
   - 开发环境: 需要配置 `localhost:8080`
   - 生产环境: 需要配置 `yuyingbao.yideng.ltd`

2. **HTTPS 要求**: 生产环境必须使用 HTTPS 协议

3. **域名备案**: 生产环境域名需要完成备案

## 调试技巧

### 查看当前环境
在 `app.js` 的 `onLaunch` 方法中会输出当前环境信息：

```javascript
console.log('App Launch, 环境信息:', envInfo);
```

### 强制使用特定环境
如需在开发环境中测试生产 API，可以临时修改 `config/env.js` 中的配置。

## 故障排除

### 常见问题

1. **API 请求失败**
   - 检查域名是否在微信后台配置
   - 确认网络连接正常
   - 查看控制台错误信息

2. **环境判断错误**
   - 确认微信开发者工具版本
   - 检查 `wx.getAccountInfoSync()` 返回值

3. **配置不生效**
   - 清除小程序缓存
   - 重新编译项目
   - 检查配置文件语法

### 调试命令

```javascript
// 查看当前环境信息
console.log('环境信息:', getEnvInfo());

// 查看 API 地址
console.log('API 地址:', getApiBaseUrl());

// 检查调试模式
console.log('调试模式:', isDebugMode());
```
