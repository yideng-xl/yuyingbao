# 育婴宝系统设计文档 v0.6

## 文档信息

- **文档版本**: v0.6.0
- **创建日期**: 2024年9月27日
- **系统架构师**: westxixia
- **目标版本**: v0.6
- **文档状态**: 开发中

## 1. 概述

### 1.1 系统目标

育婴宝v0.6版本在v0.5的基础上，增加了多宝宝支持、数据导出、离线功能等核心特性，旨在为更多家庭提供更全面的育儿记录和管理服务。

### 1.2 设计原则

- **可扩展性**: 系统架构支持未来功能扩展
- **高性能**: 保证系统响应速度和并发处理能力
- **高可用性**: 确保系统稳定运行
- **安全性**: 保护用户数据和隐私
- **易用性**: 提供良好的用户体验

## 2. 技术架构

### 2.1 整体架构图

```
graph TB
    A[微信小程序] --> B[API网关]
    B --> C[负载均衡器]
    C --> D[应用服务器集群]
    D --> E[数据库集群]
    D --> F[缓存集群]
    D --> G[文件存储]
    D --> H[消息队列]
    I[定时任务] --> D
    J[数据导出服务] --> D
    K[提醒服务] --> D
    
    style A fill:#ffe4c4,stroke:#333
    style B fill:#dda0dd,stroke:#333
    style C fill:#87ceeb,stroke:#333
    style D fill:#98fb98,stroke:#333
    style E fill:#ffb6c1,stroke:#333
    style F fill:#ffa07a,stroke:#333
    style G fill:#20b2aa,stroke:#333
    style H fill:#778899,stroke:#333
    style I fill:#d3d3d3,stroke:#333
    style J fill:#d3d3d3,stroke:#333
    style K fill:#d3d3d3,stroke:#333
```

### 2.2 技术栈

#### 后端技术栈
```
Spring Boot 3.3.2
├── Spring Security (JWT认证)
├── Spring Data JPA (数据访问)
├── Spring WebFlux (异步处理)
├── PostgreSQL 16 (主数据库)
├── Redis (缓存)
├── RabbitMQ (消息队列)
├── MinIO (文件存储)
└── Docker (容器化部署)
```

#### 前端技术栈
```
微信小程序
├── 原生小程序框架
├── 自定义组件库
├── Redux状态管理
├── 网络请求封装
└── 本地存储
```

#### 运维技术栈
```
阿里云ECS
├── Docker Compose (容器编排)
├── Nginx (反向代理)
├── Let's Encrypt (SSL证书)
├── Prometheus (监控)
└── ELK (日志分析)
```

## 3. 功能模块设计

### 3.1 核心功能模块

#### 用户认证模块
- 微信授权登录
- JWT Token管理
- 用户信息维护
- 权限控制

#### 家庭管理模块
- 家庭创建和加入
- 邀请码生成和验证
- 家庭成员管理
- 角色权限分配

#### 宝宝管理模块 (v0.6新增)
- 多宝宝档案管理
- 宝宝信息维护
- 年龄自动计算
- 宝宝切换功能

#### 记录管理模块
- 六大记录类型管理
- 离线记录支持
- 数据验证和清理
- 记录查询和统计

#### 数据统计模块
- 今日概览统计
- 历史趋势分析
- 多宝宝对比分析
- 智能建议生成

#### 数据导出模块 (v0.6新增)
- PDF格式导出
- Excel格式导出
- 自定义时间范围
- 导出模板管理

#### 智能提醒模块 (v0.6新增)
- 喂养提醒
- 体检提醒
- 疫苗提醒
- 自定义提醒

### 3.2 用户界面设计

#### 主要页面结构
```
首页
├── 宝宝切换器
├── 今日统计概览
├── 快捷记录入口
├── 智能建议
└── 家庭成员状态

记录页
├── 历史记录列表
├── 多条件筛选
├── 离线记录提示
└── 记录详情查看

统计页
├── 数据图表展示
├── 多宝宝对比
├── 趋势分析
└── 成长曲线

个人中心
├── 用户信息管理
├── 家庭管理
├── 数据导出
├── 提醒设置
└── 系统设置
```

## 4. 数据库设计

### 4.1 数据库架构

#### 核心表结构 (v0.6更新)
```
用户表 (users)
├── id (主键)
├── openid (微信openid)
├── nickname (昵称)
├── avatar (头像)
├── created_at (创建时间)
└── updated_at (更新时间)

家庭表 (families)
├── id (主键)
├── name (家庭名称)
├── invite_code (邀请码)
├── created_at (创建时间)
└── updated_at (更新时间)

家庭成员表 (family_members)
├── id (主键)
├── family_id (家庭ID)
├── user_id (用户ID)
├── role (角色: ADMIN/MEMBER)
├── joined_at (加入时间)
└── status (状态: ACTIVE/INACTIVE)

宝宝表 (babies) - v0.6新增
├── id (主键)
├── family_id (家庭ID)
├── name (宝宝姓名)
├── gender (性别)
├── birth_date (出生日期)
├── avatar (头像)
├── height (出生身高)
├── weight (出生体重)
├── created_at (创建时间)
└── updated_at (更新时间)

母乳亲喂记录表 (breast_feeding_records)
├── id (主键)
├── baby_id (宝宝ID)
├── start_time (开始时间)
├── end_time (结束时间)
├── side (左右侧)
├── duration (时长)
├── note (备注)
├── created_at (创建时间)
└── updated_at (更新时间)

瓶喂记录表 (bottle_feeding_records)
├── id (主键)
├── baby_id (宝宝ID)
├── feeding_time (喂养时间)
├── amount (奶量)
├── note (备注)
├── created_at (创建时间)
└── updated_at (更新时间)

配方奶记录表 (formula_feeding_records)
├── id (主键)
├── baby_id (宝宝ID)
├── feeding_time (喂养时间)
├── amount (奶量)
├── note (备注)
├── created_at (创建时间)
└── updated_at (更新时间)

辅食记录表 (solid_food_records)
├── id (主键)
├── baby_id (宝宝ID)
├── feeding_time (喂养时间)
├── food_type (辅食类型)
├── amount (分量)
├── note (备注)
├── created_at (创建时间)
└── updated_at (更新时间)

大便记录表 (diaper_records)
├── id (主键)
├── baby_id (宝宝ID)
├── record_time (记录时间)
├── consistency (质地)
├── color (颜色)
├── urine (尿液)
├── note (备注)
├── created_at (创建时间)
└── updated_at (更新时间)

成长记录表 (growth_records)
├── id (主键)
├── baby_id (宝宝ID)
├── record_time (记录时间)
├── height (身高)
├── weight (体重)
├── note (备注)
├── created_at (创建时间)
└── updated_at (更新时间)

提醒设置表 (reminders) - v0.6新增
├── id (主键)
├── baby_id (宝宝ID)
├── user_id (用户ID)
├── type (提醒类型)
├── time (提醒时间)
├── enabled (是否启用)
├── created_at (创建时间)
└── updated_at (更新时间)

导出记录表 (export_records) - v0.6新增
├── id (主键)
├── user_id (用户ID)
├── baby_id (宝宝ID)
├── format (导出格式)
├── start_date (开始日期)
├── end_date (结束日期)
├── file_path (文件路径)
├── status (状态)
├── created_at (创建时间)
└── completed_at (完成时间)
```

### 4.2 数据关系图

```
graph LR
    A[用户] --> B[家庭成员]
    C[家庭] --> B
    C --> D[宝宝]
    D --> E[母乳亲喂记录]
    D --> F[瓶喂记录]
    D --> G[配方奶记录]
    D --> H[辅食记录]
    D --> I[大便记录]
    D --> J[成长记录]
    D --> K[提醒设置]
    L[用户] --> M[导出记录]
    D --> M
    
    style A fill:#ffe4c4
    style B fill:#dda0dd
    style C fill:#87ceeb
    style D fill:#98fb98
    style E fill:#ffb6c1
    style F fill:#ffa07a
    style G fill:#20b2aa
    style H fill:#778899
    style I fill:#d3d3d3
    style J fill:#f0e68c
    style K fill:#dda0dd
    style L fill:#ffe4c4
    style M fill:#87ceeb
```

## 5. API设计

### 5.1 API端点设计

#### 宝宝管理API (v0.6新增)
```
GET    /api/babies              # 获取家庭所有宝宝列表
POST   /api/babies              # 创建新宝宝
GET    /api/babies/{id}         # 获取宝宝详情
PUT    /api/babies/{id}         # 更新宝宝信息
DELETE /api/babies/{id}         # 删除宝宝
```

#### 数据导出API (v0.6新增)
```
POST   /api/export/pdf          # 导出PDF格式数据
POST   /api/export/excel        # 导出Excel格式数据
GET    /api/export/{id}         # 获取导出记录状态
GET    /api/export/{id}/download # 下载导出文件
```

#### 提醒管理API (v0.6新增)
```
GET    /api/reminders           # 获取用户提醒列表
POST   /api/reminders           # 创建新提醒
PUT    /api/reminders/{id}      # 更新提醒设置
DELETE /api/reminders/{id}      # 删除提醒
```

### 5.2 API安全设计

- 所有API请求都需要JWT Token认证
- 敏感操作需要二次验证
- 数据访问权限控制
- 请求频率限制

## 6. 离线功能设计

### 6.1 离线数据存储

#### 前端离线存储
```
本地存储结构
├── 用户信息缓存
├── 宝宝信息缓存
├── 本地记录队列
├── 同步状态标记
└── 设置信息缓存
```

### 6.2 数据同步机制

#### 同步流程
```
1. 网络状态检测
2. 本地数据检查
3. 数据上传到服务器
4. 服务器数据下载
5. 本地数据更新
6. 同步状态更新
```

## 7. 性能优化

### 7.1 数据库优化
- 索引优化
- 查询优化
- 分表分库策略
- 读写分离

### 7.2 缓存策略
- Redis缓存热点数据
- 页面静态化
- CDN加速静态资源
- 浏览器缓存优化

### 7.3 异步处理
- 消息队列处理耗时操作
- 定时任务异步执行
- 批量操作优化

## 8. 安全设计

### 8.1 数据安全
- 敏感数据加密存储
- 数据传输HTTPS加密
- SQL注入防护
- XSS攻击防护

### 8.2 访问控制
- JWT Token认证
- RBAC权限控制
- 数据隔离
- 操作审计

### 8.3 隐私保护
- 最小化数据收集
- 用户数据删除机制
- 隐私政策遵守
- 第三方数据共享控制

## 9. 部署架构

### 9.1 生产环境部署

#### 服务器配置
```
应用服务器 (2台)
├── CPU: 2核
├── 内存: 4GB
├── 存储: 50GB SSD
└── 带宽: 5Mbps

数据库服务器 (1台)
├── CPU: 2核
├── 内存: 4GB
├── 存储: 100GB SSD
└── 带宽: 5Mbps

缓存服务器 (1台)
├── CPU: 1核
├── 内存: 2GB
├── 存储: 20GB SSD
└── 带宽: 5Mbps
```

#### Docker部署配置
```yaml
version: '3.8'
services:
  app:
    image: yuyingbao/app:v0.6
    ports:
      - "8080:8080"
    environment:
      - SPRING_PROFILES_ACTIVE=prod
    depends_on:
      - db
      - redis
    deploy:
      replicas: 2

  db:
    image: postgres:16
    environment:
      - POSTGRES_DB=yuyingbao
      - POSTGRES_USER=yuyingbao
      - POSTGRES_PASSWORD=secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - app

volumes:
  postgres_data:
```

### 9.2 监控和日志

#### 监控指标
```
应用监控
├── JVM内存使用率
├── CPU使用率
├── 响应时间
├── 错误率
└── 并发用户数

数据库监控
├── 连接数
├── 查询性能
├── 磁盘使用率
└── 缓存命中率

业务监控
├── 用户活跃度
├── 功能使用率
├── 数据导出量
└── 提醒触发率
```

## 10. 版本规划

### 10.1 v0.6 计划
- ✅ 多宝宝支持
- ✅ 数据导出功能
- ✅ 离线记录支持
- ✅ 智能提醒功能
- ✅ 界面体验优化

### 10.2 v0.7 计划
- 🔄 AI智能分析和建议
- 🔄 社区分享功能
- 🔄 健康档案管理
- 🔄 成长里程碑记录

### 10.3 v1.0 目标
- 🎯 正式发布版本
- 🎯 完整的功能集
- 🎯 高性能和高可用
- 🎯 良好的用户体验

## 11. 技术债务和优化方向

### 11.1 性能优化
- 数据库查询优化
- 缓存策略完善
- 前端资源优化
- 异步处理增强

### 11.2 功能增强
- 更丰富的统计图表
- 更智能的数据分析
- 更完善的知识库
- 更多的提醒类型

### 11.3 用户体验
- 界面交互优化
- 操作流程简化
- 响应速度提升
- 个性化定制

## 12. 部署和运维

### 12.1 开发环境
- 本地开发环境配置
- 自动化测试集成
- 代码质量检查
- 持续集成/持续部署

### 12.2 生产环境
- Docker容器化部署
- 数据库备份策略
- 监控和日志系统
- 故障恢复预案

---

*本文档版本: v0.6.0*  
*更新时间: 2024年9月27日*  
*文档维护: westxixia*