# 育婴宝 - 微信小程序

## 项目简介

育婴宝是一款基于微信小程序的智能育儿工具，专为0-2岁宝宝家庭设计。通过提供喂养、大便、成长等核心数据记录功能，并结合智能化的喂养知识库，旨在帮助父母科学管理宝宝成长数据，缓解育儿焦虑。

## 功能特性

### 🏠 用户体系与家庭共享
- **微信授权登录**：自动获取微信登录凭证
- **用户信息授权**：获取用户昵称和头像
- **智能授权流程**：支持自动登录和手动授权
- 家庭创建与管理
- 邀请码分享功能
- 家庭成员管理

### 📝 数据记录模块
- **喂养记录**：母乳亲喂、瓶喂、配方奶、辅食
- **大便记录**：性状、颜色、备注
- **成长记录**：身高、体重追踪
- **快捷记录**：一键快速记录

### 📊 数据统计与展示
- 今日概览统计
- 时间轴历史记录
- 喂养趋势图表
- 成长曲线分析
- 智能数据分析

### 📚 知识库与智能建议
- 分月龄喂养推荐值
- 专业育儿知识文章
- 常见问题解答
- 个性化智能建议

## 技术架构

### 前端技术栈
- **框架**：微信小程序原生开发
- **样式**：WXSS + 响应式设计
- **状态管理**：全局数据管理
- **存储**：微信小程序本地存储

### 项目结构
```
育婴宝/
├── app.js                 # 小程序入口文件
├── app.json              # 小程序配置文件
├── app.wxss              # 全局样式文件
├── pages/                # 页面目录
│   ├── index/           # 首页
│   ├── record/          # 记录页面
│   ├── statistics/      # 统计页面
│   ├── knowledge/       # 知识库页面
│   └── profile/         # 个人中心页面
├── images/              # 图片资源
├── project.config.json  # 项目配置
└── sitemap.json         # 站点地图
```

## 页面功能详解

### 首页 (pages/index)
- 今日概览统计
- 快捷记录按钮
- 最近记录展示
- 智能建议提示

### 记录页面 (pages/record)
- 时间轴记录展示
- 按类型筛选记录
- 按日期筛选记录
- 记录编辑与删除

### 统计页面 (pages/statistics)
- 喂养数据统计
- 大便数据统计
- 成长数据统计
- 智能分析报告

### 知识库页面 (pages/knowledge)
- 分月龄推荐值
- 育儿知识文章
- 常见问题解答
- 搜索功能

### 个人中心页面 (pages/profile)
- **用户信息授权**：智能检测和引导用户授权
- **用户信息管理**：显示微信昵称和头像
- 家庭管理功能
- 宝宝信息管理
- 系统设置

## 用户授权功能

### 授权流程
1. **自动登录**：小程序启动时自动尝试登录
2. **用户信息检测**：检测用户信息是否完整
3. **引导授权**：显示友好的授权提示
4. **信息获取**：使用 getUserProfile API 获取用户信息
5. **数据更新**：自动更新本地和服务器端数据

### 授权组件
提供了通用的 `auth-button` 组件，可在任意页面使用：

```javascript
// 在页面 JSON 中注册组件
{
  "usingComponents": {
    "auth-button": "/components/auth-button/auth-button"
  }
}

// 在 WXML 中使用
<auth-button
  need-auth="{{needUserAuth}}"
  title="完善用户信息"
  desc="获取您的微信昵称和头像"
  button-text="立即授权"
  bindauthsuccess="onAuthSuccess"
  bindauthfail="onAuthFail">
</auth-button>
```

### API 接口

#### 登录接口
- `POST /auth/wechat/login`：简化登录（兼容性）
- `POST /auth/wechat/login-complete`：完整登录（推荐）

#### 请求示例
```javascript
// 完整登录请求
{
  "code": "wx_login_code",
  "nickname": "用户昵称",
  "avatarUrl": "https://avatar.url",
  "gender": 1,
  "country": "中国",
  "province": "广东省",
  "city": "深圳市"
}

// 登录响应
{
  "token": "jwt_token",
  "tokenType": "Bearer",
  "userInfo": {
    "id": 1,
    "nickname": "用户昵称",
    "avatarUrl": "https://avatar.url",
    "openId": "wx_open_id"
  }
}
```

## 数据模型

### 记录数据结构
```javascript
{
  id: 'record_1234567890',
  type: 'breastfeeding', // 记录类型
  startTime: '14:30',    // 开始时间
  duration: 15,          // 时长（分钟）
  amount: 150,           // 数量（ml）
  breast: 'left',        // 乳房选择
  texture: '软',         // 大便性状
  color: '黄',          // 大便颜色
  note: '备注信息',      // 备注
  createTime: '2024-01-15T14:30:00.000Z',
  userId: 'user_123'
}
```

### 知识库数据结构
```javascript
{
  '0-6': {
    feeding: { min: 600, max: 900, frequency: 6 },
    growth: { weightGain: { min: 0.5, max: 1.0 } }
  },
  '6-12': {
    feeding: { min: 800, max: 1200, frequency: 5 },
    growth: { weightGain: { min: 0.3, max: 0.6 } }
  }
}
```

## 安装与运行

### 环境要求
- 微信开发者工具
- 微信小程序账号

### 安装步骤
1. 克隆项目到本地
2. 使用微信开发者工具打开项目
3. 在 `project.config.json` 中配置您的 AppID
4. 编译运行项目

### 配置说明
1. **AppID配置**：在 `project.config.json` 中修改 `appid` 字段
2. **后端接口**：在 `app.js` 中配置后端API地址
3. **图片资源**：在 `images/` 目录下添加所需图片

## 开发指南

### 添加新页面
1. 在 `pages/` 目录下创建新页面文件夹
2. 创建对应的 `.wxml`、`.js`、`.wxss` 文件
3. 在 `app.json` 的 `pages` 数组中添加页面路径

### 添加新功能
1. 在对应的页面文件中添加功能代码
2. 更新数据模型和存储逻辑
3. 添加相应的样式和交互

### 样式规范
- 使用 rpx 作为单位，适配不同屏幕
- 遵循 BEM 命名规范
- 使用 CSS Grid 和 Flexbox 布局
- 保持响应式设计

## 部署说明

### 开发环境
1. 在微信开发者工具中预览
2. 使用真机调试功能测试
3. 检查各功能模块是否正常

### 生产环境
1. 上传代码到微信小程序后台
2. 提交审核
3. 发布上线

## 注意事项

### 数据安全
- 敏感数据加密存储
- 用户隐私保护
- 数据备份机制

### 性能优化
- 图片资源压缩
- 代码分包加载
- 内存使用优化

### 兼容性
- 支持微信版本 7.0.0 及以上
- 适配不同屏幕尺寸
- 考虑网络环境差异

## 版本历史

### v1.0.0 (2024-01-15)
- 初始版本发布
- 基础功能实现
- 用户体系建立

## 贡献指南

欢迎提交 Issue 和 Pull Request 来改进项目。

## 许可证

本项目采用 MIT 许可证。

## 联系方式

如有问题或建议，请联系开发团队。
