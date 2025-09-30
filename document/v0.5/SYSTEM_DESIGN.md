# 育婴宝系统设计文档 v0.5

## 版本信息

- **版本号**: v0.5
- **发布日期**: 2024年8月
- **文档作者**: yideng-xl
- **项目仓库**: https://github.com/yideng-xl/yuyingbao

## 1. 项目概述

### 1.1 项目介绍

育婴宝是一个专为0-2岁宝宝家庭设计的智能育儿管理系统，旨在帮助新手父母科学记录和管理宝宝的成长数据，提供个性化的育儿建议和家庭协作功能。

### 1.2 核心价值

- **科学记录**: 标准化的宝宝成长数据记录
- **智能分析**: 基于数据的个性化育儿建议
- **家庭协作**: 多人共享，实时同步宝宝信息
- **专业指导**: 分月龄的科学育儿知识库

### 1.3 目标用户

- 0-2岁宝宝的家庭
- 新手父母和照护者
- 需要科学育儿指导的家庭
- 多人协作照护宝宝的家庭

## 2. 技术架构

### 2.1 总体架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   微信小程序     │    │   Spring Boot   │    │   PostgreSQL    │
│   (前端展示)     │◄──►│   (业务逻辑)     │◄──►│   (数据存储)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 2.2 技术栈

#### 前端技术栈
- **框架**: 微信小程序原生开发
- **组件**: 原生组件 + 自定义组件
- **状态管理**: 本地存储 + 全局数据管理
- **网络请求**: wx.request + 统一封装

#### 后端技术栈
- **框架**: Spring Boot 3.3.2
- **数据库**: PostgreSQL 16
- **ORM**: Spring Data JPA
- **认证**: JWT + 微信OAuth2
- **构建工具**: Maven 3.9.11
- **Java版本**: OpenJDK 17

#### 部署技术栈
- **容器化**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **云服务**: 支持阿里云等主流云平台
- **监控**: 应用监控和日志管理

### 2.3 开发环境

- **Java**: OpenJDK 17.0.16
- **Maven**: 3.9.11 (配置阿里云镜像)
- **包管理**: Homebrew (配置清华大学镜像)
- **IDE**: 微信开发者工具 + 任意Java IDE
- **版本控制**: Git + GitHub

## 3. 系统设计

### 3.1 核心功能模块

#### 3.1.1 用户体系与家庭管理
- **微信授权登录**: 安全便捷的第三方登录
- **家庭共享机制**: 多人协作管理宝宝信息
- **邀请码分享**: 简单的家庭成员邀请
- **权限管理**: 不同角色的操作权限控制

#### 3.1.2 宝宝信息管理
- **基础信息**: 姓名、性别、出生日期、头像
- **出生数据**: 出生身高、体重记录
- **自动年龄计算**: 实时计算月龄和天数
- **成长档案**: 完整的成长历程记录

#### 3.1.3 六大核心记录类型

##### 喂养记录
1. **母乳亲喂**
   - 喂养时长记录
   - 左右侧选择
   - 喂养时间记录

2. **瓶喂记录**
   - 奶量记录 (ml)
   - 喂养时间
   - 备注信息

3. **配方奶记录**
   - 奶量记录 (ml)
   - 配方奶类型
   - 喂养时间

4. **辅食记录**
   - 辅食类型选择
   - 食用分量
   - 添加时间

##### 生理记录
5. **大便记录**
   - 质地选择（稀、软、成形、干硬）
   - 颜色记录（黄、绿、棕、黑）
   - 时间记录
   - 备注信息

6. **成长记录**
   - 身高记录 (cm)
   - 体重记录 (kg)
   - 测量日期
   - 成长曲线分析

#### 3.1.4 数据统计与分析
- **今日概览**: 总喂养量、喂养次数、大便次数统计
- **智能建议**: 基于宝宝月龄的个性化喂养建议
- **历史记录**: 时间轴展示、筛选功能、编辑删除
- **趋势分析**: 数据图表和成长趋势

#### 3.1.5 知识库系统
- **分月龄推荐**: 0-6个月、6-12个月等不同阶段的喂养建议
- **育儿知识**: 专业的育儿文章和指导
- **常见问题**: FAQ解答新手父母疑惑
- **科学依据**: 基于权威育儿指南

### 3.2 用户界面设计

#### 3.2.1 页面架构
系统采用Tab导航架构，包含5个核心页面：

1. **首页** - 今日统计 + 快捷记录 + 智能建议
2. **记录页** - 历史记录查看 + 筛选功能
3. **统计页** - 数据图表 + 趋势分析
4. **知识页** - 育儿知识 + 推荐值
5. **个人中心** - 用户管理 + 家庭管理 + 宝宝信息

#### 3.2.2 交互设计
- **简洁易用**: 一键记录，操作简单
- **直观反馈**: 实时数据更新和状态提示
- **智能提示**: 个性化建议和贴心提醒
- **协作体验**: 多人操作的实时同步

## 4. 数据库设计

### 4.1 核心数据表

#### Users (用户表)
```sql
id: BIGINT PRIMARY KEY
openid: VARCHAR(128) UNIQUE
nickname: VARCHAR(100)
avatar_url: VARCHAR(255)
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

#### Families (家庭表)
```sql
id: BIGINT PRIMARY KEY
name: VARCHAR(100)
invite_code: VARCHAR(20) UNIQUE
created_by: BIGINT
created_at: TIMESTAMP
```

#### Babies (宝宝表)
```sql
id: BIGINT PRIMARY KEY
family_id: BIGINT
name: VARCHAR(100)
gender: ENUM('BOY', 'GIRL')
birth_date: DATE
avatar_url: VARCHAR(255)
birth_height_cm: DECIMAL(5,2)
birth_weight_kg: DECIMAL(4,2)
created_at: TIMESTAMP
```

#### Records (记录表)
```sql
id: BIGINT PRIMARY KEY
family_id: BIGINT
user_id: BIGINT
baby_id: BIGINT
type: ENUM('BREASTFEEDING', 'BOTTLE', 'FORMULA', 'SOLID', 'DIAPER', 'GROWTH', 'WATER')
happened_at: TIMESTAMP
-- 喂养相关字段
amount_ml: DECIMAL(6,2)
duration_min: INTEGER
breastfeeding_side: VARCHAR(16)
solid_type: ENUM
-- 大便相关字段
diaper_texture: ENUM('WATERY', 'SOFT', 'NORMAL', 'HARD')
diaper_color: ENUM('YELLOW', 'GREEN', 'BROWN', 'BLACK')
has_urine: BOOLEAN
-- 成长相关字段
height_cm: DECIMAL(5,2)
weight_kg: DECIMAL(4,2)
-- 通用字段
note: VARCHAR(255)
created_at: TIMESTAMP
```

### 4.2 数据关系
- Users ←→ FamilyMembers ←→ Families (多对多)
- Families → Babies (一对多)
- Babies → Records (一对多)
- Users → Records (一对多, 记录创建者)

## 5. API设计

### 5.1 认证相关
```
POST /auth/wechat-login    # 微信登录
POST /auth/refresh         # 刷新Token
```

### 5.2 家庭管理
```
POST /families             # 创建家庭
GET /families/my           # 获取我的家庭
POST /families/join        # 加入家庭
GET /families/{id}/members # 获取家庭成员
```

### 5.3 宝宝管理
```
POST /families/{familyId}/babies      # 添加宝宝
GET /families/{familyId}/babies       # 获取宝宝列表
PUT /families/{familyId}/babies/{id}  # 更新宝宝信息
```

### 5.4 记录管理
```
POST /families/{familyId}/records           # 创建记录
GET /families/{familyId}/records            # 获取记录列表
GET /families/{familyId}/records/filter     # 筛选记录
PUT /families/{familyId}/records/{id}       # 更新记录
DELETE /families/{familyId}/records/{id}    # 删除记录
```

## 6. 安全特性

### 6.1 认证安全
- **JWT认证**: 安全的无状态认证机制
- **微信官方授权**: 可靠的第三方身份验证
- **Token刷新**: 自动刷新机制保证安全性

### 6.2 数据安全
- **家庭权限隔离**: 严格的数据访问控制
- **操作权限验证**: 每个操作都进行权限检查
- **数据加密**: 敏感数据加密存储

### 6.3 接口安全
- **请求验证**: 参数校验和格式检查
- **异常处理**: 统一的异常处理机制
- **日志审计**: 重要操作的日志记录

## 7. 智能化特性

### 7.1 个性化推荐
- **基于月龄的喂养建议**: 根据宝宝年龄提供科学建议
- **智能提醒**: 基于历史数据的喂养提醒
- **异常检测**: 识别异常的喂养或生长模式

### 7.2 数据分析
- **趋势分析**: 成长曲线和喂养趋势
- **模式识别**: 识别宝宝的生活规律
- **协作优化**: 避免重复记录和遗漏

## 8. 版本规划

### 8.1 当前版本 (v0.5)
- ✅ 基础功能完整实现
- ✅ 六大核心记录类型
- ✅ 家庭协作功能
- ✅ 基础数据统计
- ✅ 微信小程序客户端
- ✅ Spring Boot后端API

### 8.2 未来版本规划

#### v0.6 计划
- 🔄 优化用户体验
- 🔄 增强数据分析功能
- 🔄 完善知识库内容
- 🔄 添加更多智能建议

#### v1.0 目标
- 🎯 AI智能分析和建议
- 🎯 多宝宝支持
- 🎯 数据导出功能
- 🎯 社区分享功能

## 9. 技术债务和优化方向

### 9.1 性能优化
- 数据库查询优化
- 缓存策略实施
- 前端资源优化

### 9.2 功能增强
- 更丰富的统计图表
- 更智能的数据分析
- 更完善的知识库

### 9.3 用户体验
- 界面交互优化
- 操作流程简化
- 响应速度提升

## 10. 部署和运维

### 10.1 开发环境
- 本地开发环境配置
- 自动化测试集成
- 代码质量检查

### 10.2 生产环境
- Docker容器化部署
- 数据库备份策略
- 监控和日志系统

---

*本文档版本: v0.5*  
*更新时间: 2024年8月29日*  
*文档维护: westxixia*