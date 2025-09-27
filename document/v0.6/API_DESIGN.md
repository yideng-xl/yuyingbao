# 育婴宝API接口设计文档 v0.6

## 文档信息

- **文档版本**: v0.6.0
- **创建日期**: 2024年9月27日
- **API设计师**: westxixia
- **目标版本**: v0.6
- **文档状态**: 开发中

## 1. 概述

### 1.1 API设计原则

- **RESTful风格**: 遵循RESTful设计规范
- **安全性**: 所有接口都需要JWT认证
- **一致性**: 统一的响应格式和错误处理
- **可扩展性**: 接口设计考虑未来扩展
- **文档化**: 完整的接口文档和示例

### 1.2 认证机制

所有API接口都需要通过JWT Token进行认证，请求头中需要包含：
```
Authorization: Bearer <token>
```

### 1.3 响应格式

#### 成功响应
```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

#### 错误响应
```json
{
  "code": 400,
  "message": "错误描述",
  "data": null
}
```

## 2. 认证相关 API

### 2.1 微信登录
```
POST /api/auth/wechat/login
```

**请求参数**
```json
{
  "code": "微信登录凭证",
  "userInfo": {
    "nickName": "用户昵称",
    "avatarUrl": "头像URL"
  }
}
```

**响应示例**
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "jwt_token",
    "user": {
      "id": 1,
      "nickname": "用户昵称",
      "avatar": "头像URL"
    }
  }
}
```

### 2.2 刷新Token
```
POST /api/auth/refresh
```

**请求参数**
```json
{
  "refreshToken": "refresh_token"
}
```

**响应示例**
```json
{
  "code": 200,
  "message": "刷新成功",
  "data": {
    "token": "new_jwt_token"
  }
}
```

## 3. 家庭管理 API

### 3.1 创建家庭
```
POST /api/families
```

**请求参数**
```json
{
  "name": "家庭名称"
}
```

**响应示例**
```json
{
  "code": 200,
  "message": "创建成功",
  "data": {
    "id": 1,
    "name": "家庭名称",
    "inviteCode": "123456",
    "createdAt": "2024-09-27T10:00:00Z"
  }
}
```

### 3.2 加入家庭
```
POST /api/families/join
```

**请求参数**
```json
{
  "inviteCode": "邀请码"
}
```

**响应示例**
```json
{
  "code": 200,
  "message": "加入成功",
  "data": {
    "family": {
      "id": 1,
      "name": "家庭名称"
    },
    "role": "MEMBER"
  }
}
```

### 3.3 获取家庭详情
```
GET /api/families/{id}
```

**响应示例**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "name": "家庭名称",
    "members": [
      {
        "id": 1,
        "nickname": "用户1",
        "avatar": "头像URL",
        "role": "ADMIN"
      }
    ],
    "babies": [
      {
        "id": 1,
        "name": "宝宝1",
        "gender": "MALE",
        "age": "3个月5天"
      }
    ]
  }
}
```

### 3.4 获取家庭成员列表
```
GET /api/families/{id}/members
```

**响应示例**
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": 1,
      "nickname": "用户1",
      "avatar": "头像URL",
      "role": "ADMIN",
      "joinedAt": "2024-09-27T10:00:00Z"
    }
  ]
}
```

## 4. 宝宝管理 API (v0.6新增)

### 4.1 创建宝宝
```
POST /api/babies
```

**请求参数**
```json
{
  "familyId": 1,
  "name": "宝宝姓名",
  "gender": "MALE",
  "birthDate": "2024-06-01",
  "avatar": "头像URL",
  "height": 50.5,
  "weight": 3.2
}
```

**响应示例**
```json
{
  "code": 200,
  "message": "创建成功",
  "data": {
    "id": 1,
    "familyId": 1,
    "name": "宝宝姓名",
    "gender": "MALE",
    "birthDate": "2024-06-01",
    "avatar": "头像URL",
    "height": 50.5,
    "weight": 3.2,
    "age": "3个月26天",
    "createdAt": "2024-09-27T10:00:00Z"
  }
}
```

### 4.2 获取家庭宝宝列表
```
GET /api/families/{familyId}/babies
```

**响应示例**
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": 1,
      "name": "宝宝1",
      "gender": "MALE",
      "birthDate": "2024-06-01",
      "avatar": "头像URL",
      "age": "3个月26天"
    },
    {
      "id": 2,
      "name": "宝宝2",
      "gender": "FEMALE",
      "birthDate": "2024-08-15",
      "avatar": "头像URL",
      "age": "1个月12天"
    }
  ]
}
```

### 4.3 获取宝宝详情
```
GET /api/babies/{id}
```

**响应示例**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "familyId": 1,
    "name": "宝宝姓名",
    "gender": "MALE",
    "birthDate": "2024-06-01",
    "avatar": "头像URL",
    "height": 50.5,
    "weight": 3.2,
    "age": "3个月26天",
    "createdAt": "2024-09-27T10:00:00Z",
    "updatedAt": "2024-09-27T10:00:00Z"
  }
}
```

### 4.4 更新宝宝信息
```
PUT /api/babies/{id}
```

**请求参数**
```json
{
  "name": "新宝宝姓名",
  "gender": "FEMALE",
  "birthDate": "2024-06-01",
  "avatar": "新头像URL",
  "height": 52.0,
  "weight": 3.5
}
```

**响应示例**
```json
{
  "code": 200,
  "message": "更新成功",
  "data": {
    "id": 1,
    "familyId": 1,
    "name": "新宝宝姓名",
    "gender": "FEMALE",
    "birthDate": "2024-06-01",
    "avatar": "新头像URL",
    "height": 52.0,
    "weight": 3.5,
    "age": "3个月26天",
    "createdAt": "2024-09-27T10:00:00Z",
    "updatedAt": "2024-09-27T11:00:00Z"
  }
}
```

### 4.5 删除宝宝
```
DELETE /api/babies/{id}
```

**响应示例**
```json
{
  "code": 200,
  "message": "删除成功",
  "data": null
}
```

## 5. 记录管理 API

### 5.1 创建母乳亲喂记录
```
POST /api/records/breast-feeding
```

**请求参数**
```json
{
  "babyId": 1,
  "startTime": "2024-09-27T10:00:00Z",
  "endTime": "2024-09-27T10:15:00Z",
  "side": "LEFT",
  "note": "宝宝吃得很好"
}
```

**响应示例**
```json
{
  "code": 200,
  "message": "记录成功",
  "data": {
    "id": 1,
    "babyId": 1,
    "startTime": "2024-09-27T10:00:00Z",
    "endTime": "2024-09-27T10:15:00Z",
    "side": "LEFT",
    "duration": 900,
    "note": "宝宝吃得很好",
    "createdAt": "2024-09-27T10:15:00Z"
  }
}
```

### 5.2 创建瓶喂记录
```
POST /api/records/bottle-feeding
```

**请求参数**
```json
{
  "babyId": 1,
  "feedingTime": "2024-09-27T11:00:00Z",
  "amount": 120,
  "note": "配方奶"
}
```

**响应示例**
```json
{
  "code": 200,
  "message": "记录成功",
  "data": {
    "id": 1,
    "babyId": 1,
    "feedingTime": "2024-09-27T11:00:00Z",
    "amount": 120,
    "note": "配方奶",
    "createdAt": "2024-09-27T11:00:00Z"
  }
}
```

### 5.3 获取宝宝记录列表
```
GET /api/babies/{babyId}/records
```

**查询参数**
```
?type=breast_feeding,bottle_feeding  # 记录类型，可多选
&startDate=2024-09-01              # 开始日期
&endDate=2024-09-30                # 结束日期
&page=1                            # 页码
&size=20                           # 每页大小
```

**响应示例**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "content": [
      {
        "id": 1,
        "type": "breast_feeding",
        "babyId": 1,
        "data": {
          "startTime": "2024-09-27T10:00:00Z",
          "endTime": "2024-09-27T10:15:00Z",
          "side": "LEFT",
          "duration": 900,
          "note": "宝宝吃得很好"
        },
        "createdAt": "2024-09-27T10:15:00Z"
      }
    ],
    "page": 1,
    "size": 20,
    "total": 100
  }
}
```

## 6. 数据统计 API

### 6.1 获取今日统计
```
GET /api/statistics/today?babyId=1
```

**响应示例**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "babyId": 1,
    "date": "2024-09-27",
    "statistics": {
      "breastFeeding": {
        "count": 3,
        "totalDuration": 1800
      },
      "bottleFeeding": {
        "count": 2,
        "totalAmount": 240
      },
      "formulaFeeding": {
        "count": 1,
        "totalAmount": 120
      },
      "solidFood": {
        "count": 1
      },
      "diaper": {
        "count": 5
      },
      "growth": {
        "latest": {
          "height": 52.0,
          "weight": 3.5
        }
      }
    },
    "suggestions": [
      "宝宝今天喂养次数正常，继续保持",
      "建议明天上午测量体重"
    ]
  }
}
```

### 6.2 获取历史趋势
```
GET /api/statistics/trend?babyId=1&type=weight&days=30
```

**响应示例**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "babyId": 1,
    "type": "weight",
    "days": 30,
    "trend": [
      {
        "date": "2024-09-01",
        "value": 3.2
      },
      {
        "date": "2024-09-15",
        "value": 3.4
      },
      {
        "date": "2024-09-27",
        "value": 3.5
      }
    ]
  }
}
```

## 7. 数据导出 API (v0.6新增)

### 7.1 导出PDF格式
```
POST /api/export/pdf
```

**请求参数**
```json
{
  "babyId": 1,
  "startDate": "2024-09-01",
  "endDate": "2024-09-30",
  "includeCharts": true
}
```

**响应示例**
```json
{
  "code": 200,
  "message": "导出任务已创建",
  "data": {
    "id": 1,
    "status": "PROCESSING",
    "format": "PDF",
    "createdAt": "2024-09-27T10:00:00Z"
  }
}
```

### 7.2 导出Excel格式
```
POST /api/export/excel
```

**请求参数**
```json
{
  "babyId": 1,
  "startDate": "2024-09-01",
  "endDate": "2024-09-30"
}
```

**响应示例**
```json
{
  "code": 200,
  "message": "导出任务已创建",
  "data": {
    "id": 2,
    "status": "PROCESSING",
    "format": "EXCEL",
    "createdAt": "2024-09-27T10:00:00Z"
  }
}
```

### 7.3 查询导出状态
```
GET /api/export/{id}
```

**响应示例**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "babyId": 1,
    "userId": 1,
    "format": "PDF",
    "startDate": "2024-09-01",
    "endDate": "2024-09-30",
    "status": "COMPLETED",
    "filePath": "/exports/1_20240927.pdf",
    "createdAt": "2024-09-27T10:00:00Z",
    "completedAt": "2024-09-27T10:01:30Z"
  }
}
```

### 7.4 下载导出文件
```
GET /api/export/{id}/download
```

**响应**
```
文件下载流
```

## 8. 提醒管理 API (v0.6新增)

### 8.1 创建提醒
```
POST /api/reminders
```

**请求参数**
```json
{
  "babyId": 1,
  "type": "FEEDING",
  "time": "08:00",
  "enabled": true,
  "description": "上午喂养提醒"
}
```

**响应示例**
```json
{
  "code": 200,
  "message": "提醒创建成功",
  "data": {
    "id": 1,
    "babyId": 1,
    "userId": 1,
    "type": "FEEDING",
    "time": "08:00",
    "enabled": true,
    "description": "上午喂养提醒",
    "createdAt": "2024-09-27T10:00:00Z"
  }
}
```

### 8.2 获取用户提醒列表
```
GET /api/reminders
```

**响应示例**
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": 1,
      "babyId": 1,
      "babyName": "宝宝1",
      "type": "FEEDING",
      "time": "08:00",
      "enabled": true,
      "description": "上午喂养提醒",
      "createdAt": "2024-09-27T10:00:00Z"
    }
  ]
}
```

### 8.3 更新提醒
```
PUT /api/reminders/{id}
```

**请求参数**
```json
{
  "time": "09:00",
  "enabled": true,
  "description": "上午喂养提醒(调整)"
}
```

**响应示例**
```json
{
  "code": 200,
  "message": "提醒更新成功",
  "data": {
    "id": 1,
    "babyId": 1,
    "userId": 1,
    "type": "FEEDING",
    "time": "09:00",
    "enabled": true,
    "description": "上午喂养提醒(调整)",
    "createdAt": "2024-09-27T10:00:00Z",
    "updatedAt": "2024-09-27T11:00:00Z"
  }
}
```

### 8.4 删除提醒
```
DELETE /api/reminders/{id}
```

**响应示例**
```json
{
  "code": 200,
  "message": "提醒删除成功",
  "data": null
}
```

## 9. 错误码定义

### 9.1 通用错误码
| 错误码 | 描述 | 说明 |
|-------|------|------|
| 200 | 成功 | 请求成功 |
| 400 | 请求参数错误 | 请求参数不合法 |
| 401 | 未认证 | 未提供有效的认证信息 |
| 403 | 权限不足 | 没有操作权限 |
| 404 | 资源不存在 | 请求的资源不存在 |
| 500 | 服务器内部错误 | 服务器处理异常 |

### 9.2 业务错误码
| 错误码 | 描述 | 说明 |
|-------|------|------|
| 1001 | 家庭不存在 | 指定的家庭不存在 |
| 1002 | 宝宝不存在 | 指定的宝宝不存在 |
| 1003 | 记录不存在 | 指定的记录不存在 |
| 1004 | 邀请码无效 | 提供的邀请码无效 |
| 1005 | 宝宝数量超限 | 家庭宝宝数量已达上限 |
| 1006 | 导出任务不存在 | 指定的导出任务不存在 |
| 1007 | 提醒不存在 | 指定的提醒不存在 |

## 10. 版本兼容性

### 10.1 向后兼容
- v0.6版本API完全兼容v0.5版本
- 新增API不影响现有功能
- 数据结构扩展采用可选字段

### 10.2 迁移指南
从v0.5升级到v0.6:
1. 更新JWT Token获取方式（如需要）
2. 调整宝宝相关接口URL
3. 集成新的数据导出和提醒功能

---

*文档版本: v0.6.0*  
*更新时间: 2024年9月27日*  
*文档维护: westxixia*