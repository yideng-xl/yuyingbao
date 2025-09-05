# 育婴宝 后端服务 (Spring Boot + PostgreSQL 16)

## 技术栈
- Spring Boot 3 (Web, Validation, Data JPA, Security)
- PostgreSQL 16
- Flyway 数据库迁移
- JWT 鉴权

## 快速开始

1. 安装 JDK 17 和 Maven（或使用 IDE 内置 Maven）
2. 创建数据库：
```sql
CREATE DATABASE yuyingbao;
```
3. 配置 `src/main/resources/application.yml` 中的数据库用户名和密码
4. 运行服务：
```bash
mvn spring-boot:run
```
服务将运行在 `http://localhost:8080/api`

## 主要接口

- 认证
  - POST `/api/auth/wechat/login` { code, nickname?, avatarUrl? } -> 返回 { token, tokenType }
- 家庭
  - POST `/api/families` { name } -> 创建家庭（需携带 Authorization: Bearer <token>）
  - POST `/api/families/join` { inviteCode } -> 加入家庭
  - GET `/api/families/{familyId}/members` -> 成员列表
- 宝宝
  - POST `/api/families/{familyId}/babies` -> 创建宝宝
  - GET `/api/families/{familyId}/babies` -> 宝宝列表
- 记录
  - POST `/api/families/{familyId}/records` -> 创建记录（喂养/尿布/成长）
  - GET `/api/families/{familyId}/records?start=...&end=...&type=...` -> 查询记录

## 说明
- `/auth/**` 开放，其余接口需要 Bearer Token
- Flyway 会在首次启动时自动创建表结构
- 当前 WeChat 登录为模拟实现，生产环境需接入微信服务器换取 `openid`

## 环境变量（可选）
- `APP_JWT_SECRET` 替换 `application.yml` 中的密钥（建议）
