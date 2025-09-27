# 育婴宝 - 智能育儿管理系统

> 0-2岁宝宝家庭智能育儿管理系统，帮助新手父母科学记录和管理宝宝的成长数据

## 📋 项目概述

育婴宝是一个专为0-2岁宝宝家庭设计的智能育儿管理系统，提供全面的宝宝成长记录和数据分析功能。

### ✨ 核心特性

- 🍼 **喂养记录**: 母乳亲喂、瓶喂、配方奶、辅食记录
- 💩 **生理记录**: 大便记录、成长记录（身高体重）
- 📊 **数据统计**: 今日概览、智能建议、历史记录分析
- 👨‍👩‍👧‍👦 **家庭共享**: 多人协作记录，实时同步
- 🤖 **智能建议**: 基于宝宝月龄的个性化喂养建议
- 📚 **知识库**: 分月龄育儿知识和专业指导

## 🏗️ 技术架构

### 前端 - 微信小程序
- **框架**: 微信小程序原生开发
- **UI组件**: 原生组件 + 自定义组件
- **状态管理**: 本地存储 + 全局数据

### 后端 - Spring Boot
- **框架**: Spring Boot 3.3.2
- **数据库**: PostgreSQL 16
- **认证**: JWT + 微信授权
- **API**: RESTful API 设计

### 部署
- **容器化**: Docker + Docker Compose
- **云服务**: 支持阿里云等主流云平台
- **监控**: 应用监控和日志管理

## 🚀 快速开始

### 环境要求

- **Java**: JDK 17+
- **Maven**: 3.9.11+
- **PostgreSQL**: 17+
- **Docker**: 最新版本（可选）

### 安装步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/westxixia/yuyingbao.git
   cd yuyingbao
   ```

2. **配置开发环境**
   ```bash
   # 使用自动化脚本配置环境（macOS）
   ../install-homebrew.sh
   ../switch-homebrew-mirror.sh
   ../install-java-maven.sh
   ../verify-java-maven.sh
   ```

3. **配置数据库**
   ```bash
   # 使用Docker启动PostgreSQL
   docker-compose up -d postgres
   ```

4. **配置环境变量**
   ```bash
   cp .env.example .env
   # 编辑.env文件，配置数据库连接等信息
   ```

5. **启动后端服务**
   ```bash
   cd server
   mvn clean install
   mvn spring-boot:run
   ```

6. **配置微信小程序**
   - 使用微信开发者工具导入 `mini-program` 目录
   - 配置小程序AppID
   - 修改API基础地址

## 📱 功能模块

### 核心页面

1. **首页** - 今日统计 + 快捷记录 + 智能建议
2. **记录页** - 历史记录查看 + 筛选功能
3. **统计页** - 数据图表 + 趋势分析
4. **知识页** - 育儿知识 + 推荐值
5. **个人中心** - 用户管理 + 家庭管理 + 宝宝信息

### 记录类型

- **母乳亲喂**: 时长、左右侧记录
- **瓶喂/配方奶**: 奶量记录
- **辅食**: 类型、分量记录
- **大便**: 质地、颜色、备注
- **成长**: 身高、体重记录

## 🛠️ 开发指南

### 后端开发

```bash
cd server
mvn clean compile          # 编译项目
mvn test                   # 运行测试
mvn spring-boot:run        # 启动开发服务器
```

### 前端开发

1. 使用微信开发者工具打开 `mini-program` 目录
2. 配置开发环境的API地址
3. 真机预览测试

### API文档

启动后端服务后，访问：
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- API文档: `http://localhost:8080/v3/api-docs`

## 🐳 Docker部署

### 开发环境
```bash
docker-compose up -d
```

### 生产环境
```bash
# 构建并推送镜像
./build-and-push.sh

# 部署到服务器
./deploy.sh
```

## 📊 项目结构

```
yuyingbao/
├── server/                 # Spring Boot后端
│   ├── src/main/java/     # Java源码
│   ├── src/main/resources/ # 配置文件
│   └── pom.xml            # Maven配置
├── mini-program/          # 微信小程序前端
│   ├── pages/             # 页面文件
│   ├── components/        # 组件
│   └── app.js             # 应用入口
├── docker/                # Docker配置
├── docs/                  # 项目文档
└── scripts/               # 部署脚本
```

## 🔒 安全特性

- **JWT认证**: 安全的用户认证机制
- **家庭权限隔离**: 数据隔离保护隐私
- **微信官方授权**: 可靠的第三方登录
- **数据加密**: 敏感数据加密存储

## 📈 版本发布

### 已发布版本

#### v0.5 MVP版本 (2024年8月29日)
- 🎯 **核心功能完成**: 完整的六大记录类型支持
- 🎯 **家庭协作**: 多人共享记录功能
- 🎯 **数据统计**: 基础统计分析和智能建议
- 🎯 **微信小程序**: 完整的前端实现
- 🎯 **后端服务**: Spring Boot + PostgreSQL完整实现

详细文档请查看: [/document/v0.5](document/v0.5)

#### v0.6 开发中 (预计2024年10月)
- 👥 **多宝宝支持**: 支持管理多个宝宝
- 📤 **数据导出**: PDF/Excel格式导出
- 📶 **离线支持**: 完整的离线记录功能
- 🔔 **智能提醒**: 基于宝宝作息的提醒功能
- 🎨 **界面优化**: 更美观的UI设计

详细规划请查看: [/document/v0.6](document/v0.6)

### 未来规划

#### v0.7 (计划中)
- 🤖 **AI智能分析**: 基于机器学习的智能分析
- 🌐 **社区分享**: 宝宝成长社区功能
- 🏥 **健康档案**: 完整的健康档案管理

#### v1.0 (长期目标)
- 🎯 **正式发布版**: 完整功能集
- 🎯 **高可用架构**: 生产环境部署
- 🎯 **商业服务**: 付费增值服务

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 联系我们

- 项目地址: [https://github.com/westxixia/yuyingbao](https://github.com/westxixia/yuyingbao)
- 问题反馈: [Issues](https://github.com/westxixia/yuyingbao/issues)

---

*让科技助力育儿，让爱更有温度* ❤️