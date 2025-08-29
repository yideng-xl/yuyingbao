# API设计文档 v0.5

## 概述

本文档描述了育婴宝系统v0.5版本的API接口设计，包括所有的RESTful API端点、请求/响应格式和错误处理机制。

## 基础信息

- **Base URL**: `https://api.yuyingbao.com/v1`
- **认证方式**: JWT Bearer Token
- **内容类型**: `application/json`
- **字符编码**: UTF-8

## 认证机制

### JWT Token 格式
```
Authorization: Bearer <JWT_TOKEN>
```

### Token 刷新机制
- Token 有效期：24小时
- 自动刷新：在Token过期前30分钟自动刷新
- 手动刷新：通过刷新接口获取新Token

## 1. 认证相关 API

### 1.1 微信登录
```
POST /auth/wechat-login
```

**请求参数:**
```json
{
  "code": "string",           // 微信登录code
  "userInfo": {
    "nickName": "string",     // 微信昵称
    "avatarUrl": "string"     // 微信头像URL
  }
}
```

**响应示例:**
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "def502...",
    "user": {
      "id": 1,
      "openid": "o6_bmjrPTlm6_2sgVt7hMZOPfL2M",
      "nickname": "用户昵称",
      "avatarUrl": "https://...",
      "createdAt": "2024-08-29T10:00:00Z"
    },
    "family": {
      "id": 1,
      "name": "我的家庭",
      "inviteCode": "ABC123"
    }
  }
}
```

### 1.2 刷新Token
```
POST /auth/refresh
```

**请求参数:**
```json
{
  "refreshToken": "def502..."
}
```

**响应示例:**
```json
{
  "code": 200,
  "message": "Token刷新成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "def502..."
  }
}
```

## 2. 家庭管理 API

### 2.1 创建家庭
```
POST /families
```

**请求参数:**
```json
{
  "name": "我的家庭"
}
```

**响应示例:**
```json
{
  "code": 200,
  "message": "家庭创建成功",
  "data": {
    "id": 1,
    "name": "我的家庭",
    "inviteCode": "ABC123",
    "createdBy": 1,
    "createdAt": "2024-08-29T10:00:00Z"
  }
}
```

### 2.2 获取我的家庭
```
GET /families/my
```

**响应示例:**
```json
{
  "code": 200,
  "message": "获取成功",
  "data": [
    {
      "id": 1,
      "name": "我的家庭",
      "inviteCode": "ABC123",
      "role": "ADMIN",
      "memberCount": 2,
      "babyCount": 1,
      "createdAt": "2024-08-29T10:00:00Z"
    }
  ]
}
```

### 2.3 加入家庭
```
POST /families/join
```

**请求参数:**
```json
{
  "inviteCode": "ABC123"
}
```

### 2.4 获取家庭成员
```
GET /families/{familyId}/members
```

**响应示例:**
```json
{
  "code": 200,
  "message": "获取成功",
  "data": [
    {
      "id": 1,
      "user": {
        "id": 1,
        "nickname": "爸爸",
        "avatarUrl": "https://..."
      },
      "role": "ADMIN",
      "joinedAt": "2024-08-29T10:00:00Z"
    },
    {
      "id": 2,
      "user": {
        "id": 2,
        "nickname": "妈妈",
        "avatarUrl": "https://..."
      },
      "role": "MEMBER",
      "joinedAt": "2024-08-29T11:00:00Z"
    }
  ]
}
```

## 3. 宝宝管理 API

### 3.1 添加宝宝
```
POST /families/{familyId}/babies
```

**请求参数:**
```json
{
  "name": "小宝",
  "gender": "BOY",           // BOY, GIRL
  "birthDate": "2024-01-15",
  "avatarUrl": "https://...",
  "birthHeightCm": 50.5,
  "birthWeightKg": 3.2
}
```

**响应示例:**
```json
{
  "code": 200,
  "message": "宝宝添加成功",
  "data": {
    "id": 1,
    "familyId": 1,
    "name": "小宝",
    "gender": "BOY",
    "birthDate": "2024-01-15",
    "avatarUrl": "https://...",
    "birthHeightCm": 50.5,
    "birthWeightKg": 3.2,
    "ageText": "7个月零14天",
    "createdAt": "2024-08-29T10:00:00Z"
  }
}
```

### 3.2 获取宝宝列表
```
GET /families/{familyId}/babies
```

### 3.3 更新宝宝信息
```
PUT /families/{familyId}/babies/{babyId}
```

## 4. 记录管理 API

### 4.1 创建记录
```
POST /families/{familyId}/records
```

**母乳亲喂记录:**
```json
{
  "type": "BREASTFEEDING",
  "babyId": 1,
  "happenedAt": "2024-08-29T14:30:00Z",
  "durationMin": 20,
  "breastfeedingSide": "LEFT",  // LEFT, RIGHT, BOTH
  "note": "宝宝很配合"
}
```

**瓶喂/配方奶记录:**
```json
{
  "type": "BOTTLE",              // BOTTLE, FORMULA
  "babyId": 1,
  "happenedAt": "2024-08-29T14:30:00Z",
  "amountMl": 120,
  "note": "喝得很香"
}
```

**辅食记录:**
```json
{
  "type": "SOLID",
  "babyId": 1,
  "happenedAt": "2024-08-29T12:00:00Z",
  "solidType": "OTHER",
  "note": "米糊 50g"
}
```

**大便记录:**
```json
{
  "type": "DIAPER",
  "babyId": 1,
  "happenedAt": "2024-08-29T15:00:00Z",
  "diaperTexture": "SOFT",       // WATERY, SOFT, NORMAL, HARD
  "diaperColor": "YELLOW",       // YELLOW, GREEN, BROWN, BLACK
  "hasUrine": true,
  "note": "正常"
}
```

**成长记录:**
```json
{
  "type": "GROWTH",
  "babyId": 1,
  "happenedAt": "2024-08-29T10:00:00Z",
  "heightCm": 70.5,
  "weightKg": 8.2,
  "note": "体检记录"
}
```

### 4.2 获取记录列表
```
GET /families/{familyId}/records
```

**查询参数:**
```
?page=1&size=20&babyId=1&type=BREASTFEEDING
```

**响应示例:**
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "content": [
      {
        "id": 1,
        "type": "BREASTFEEDING",
        "baby": {
          "id": 1,
          "name": "小宝"
        },
        "creator": {
          "id": 1,
          "nickname": "妈妈"
        },
        "happenedAt": "2024-08-29T14:30:00Z",
        "durationMin": 20,
        "breastfeedingSide": "LEFT",
        "note": "宝宝很配合",
        "createdAt": "2024-08-29T14:31:00Z"
      }
    ],
    "page": 1,
    "size": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### 4.3 筛选记录
```
GET /families/{familyId}/records/filter
```

**查询参数:**
```
?start=2024-08-29T00:00:00Z&end=2024-08-29T23:59:59Z&type=BREASTFEEDING
```

### 4.4 更新记录
```
PUT /families/{familyId}/records/{recordId}
```

### 4.5 删除记录
```
DELETE /families/{familyId}/records/{recordId}
```

## 5. 统计分析 API

### 5.1 今日统计
```
GET /families/{familyId}/statistics/today
```

**响应示例:**
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "date": "2024-08-29",
    "feedingStats": {
      "totalAmount": 680,        // 总奶量(ml)
      "feedingCount": 6,         // 喂养次数
      "breastfeedingCount": 4,   // 母乳次数
      "bottleCount": 2,          // 瓶喂次数
      "avgInterval": 180         // 平均间隔(分钟)
    },
    "diaperStats": {
      "totalCount": 5,           // 总次数
      "normalCount": 4,          // 正常次数
      "abnormalCount": 1         // 异常次数
    },
    "suggestion": "今日喂养量正常，建议保持规律"
  }
}
```

### 5.2 周统计
```
GET /families/{familyId}/statistics/week
```

### 5.3 月统计
```
GET /families/{familyId}/statistics/month
```

## 6. 错误处理

### 6.1 错误响应格式
```json
{
  "code": 400,
  "message": "请求参数错误",
  "details": [
    {
      "field": "name",
      "message": "宝宝姓名不能为空"
    }
  ],
  "timestamp": "2024-08-29T10:00:00Z"
}
```

### 6.2 常见错误码

| 错误码 | 说明 | 示例 |
|--------|------|------|
| 200 | 成功 | 操作成功 |
| 400 | 请求参数错误 | 缺少必填参数 |
| 401 | 未认证 | Token无效或过期 |
| 403 | 无权限 | 无家庭访问权限 |
| 404 | 资源不存在 | 宝宝信息不存在 |
| 409 | 资源冲突 | 邀请码已存在 |
| 500 | 服务器内部错误 | 系统异常 |

## 7. 数据模型

### 7.1 记录类型枚举
```json
{
  "RecordType": [
    "BREASTFEEDING",  // 母乳亲喂
    "BOTTLE",         // 瓶喂
    "FORMULA",        // 配方奶
    "SOLID",          // 辅食
    "DIAPER",         // 大便
    "GROWTH"          // 成长
  ]
}
```

### 7.2 性别枚举
```json
{
  "Gender": [
    "BOY",            // 男孩
    "GIRL"            // 女孩
  ]
}
```

### 7.3 大便质地枚举
```json
{
  "DiaperTexture": [
    "WATERY",         // 稀
    "SOFT",           // 软
    "NORMAL",         // 成形
    "HARD"            // 干硬
  ]
}
```

### 7.4 大便颜色枚举
```json
{
  "DiaperColor": [
    "YELLOW",         // 黄色
    "GREEN",          // 绿色
    "BROWN",          // 棕色
    "BLACK"           // 黑色
  ]
}
```

## 8. 接口测试

### 8.1 测试环境
- **测试地址**: `https://test-api.yuyingbao.com/v1`
- **Swagger UI**: `https://test-api.yuyingbao.com/swagger-ui.html`

### 8.2 测试用例
每个API都提供了完整的测试用例，包括：
- 正常场景测试
- 异常场景测试
- 边界值测试
- 权限验证测试

---

*文档版本: v0.5*  
*更新时间: 2024年8月29日*  
*维护人员: westxixia*