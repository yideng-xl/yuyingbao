# 统计页面真实数据测试指南

## 修复内容总结

### 1. 数据获取优化
- ✅ 直接使用wx.request获取真实API数据
- ✅ 使用提供的真实API地址和授权token
- ✅ 添加详细的请求和响应日志
- ✅ 处理不同的数据格式（直接数组或包装在data字段中）

### 2. 错误处理增强
- ✅ API请求失败时自动降级到测试数据
- ✅ 显示用户友好的错误提示
- ✅ 完整的错误日志记录

### 3. 调试功能添加
- ✅ 在页面上添加测试按钮
- ✅ 可手动加载真实数据或测试数据
- ✅ 详细的图表初始化日志

## API配置信息

```javascript
// API端点
URL: http://localhost:8080/api/families/15/records
Method: GET

// 授权头
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJvcGVuSWQiOiJtb2NrLTBhMVpoaTJ3MzJQM0c1M2w4eDN3M3pNeE13MlpoaTJLIiwibmlja25hbWUiOiLlvq7kv6HnlKjmiLciLCJzdWIiOiI3NyIsImlzcyI6Inl1eWluZ2JhbyIsImlhdCI6MTc1OTA1OTAwMywiZXhwIjoxNzYxNjUxMDAzfQ.-2fWnR8205BMEjhyhaJZ8fbIjWq3HlHlhloqrDayYgA
```

## 测试步骤

### 第一步：确认后端服务
1. 确保后端服务在 `http://localhost:8080` 运行
2. 使用Postman或curl测试API是否正常响应：
```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJvcGVuSWQiOiJtb2NrLTBhMVpoaTJ3MzJQM0c1M2w4eDN3M3pNeE13MlpoaTJLIiwibmlja25hbWUiOiLlvq7kv6HnlKjmiLciLCJzdWIiOiI3NyIsImlzcyI6Inl1eWluZ2JhbyIsImlhdCI6MTc1OTA1OTAwMywiZXhwIjoxNzYxNjUxMDAzfQ.-2fWnR8205BMEjhyhaJZ8fbIjWq3HlHlhloqrDayYgA" \
http://localhost:8080/api/families/15/records
```

### 第二步：检查小程序设置
1. 在微信开发者工具中打开项目
2. 检查"详情 -> 本地设置"：
   - ✅ 勾选"不校验合法域名"
   - ✅ 勾选"不校验TLS版本"

### 第三步：测试数据加载
1. 打开统计页面
2. 点击"🔄 加载真实数据"按钮
3. 观察控制台日志：
```javascript
// 应该看到的日志
从服务器获取记录数据, familyId: 15
API响应状态: 200
API响应数据: [...]
解析后的记录数据: [...]
记录数量: X
```

### 第四步：验证图表显示
1. 检查是否有统计数据显示
2. 检查图表是否正常渲染
3. 如果图表不显示，点击"🧪 加载测试数据"验证图表功能

## 故障排查

### 问题1：API请求失败
**症状**: 控制台显示"获取记录数据失败"
**检查**:
- 后端服务是否启动
- API地址是否正确
- Token是否有效（未过期）
- 网络连接是否正常

### 问题2：图表不显示
**症状**: 页面显示但图表区域空白
**检查**:
```javascript
// 在控制台检查
console.log('records数据:', app.globalData.records);
console.log('feedingStats:', this.data.feedingStats);
console.log('feedingChartOption:', this.data.feedingChartOption);
```

### 问题3：数据格式错误
**症状**: API返回数据但图表计算错误
**检查**:
- 记录的type字段是否正确
- 日期格式是否标准ISO字符串
- 数值字段（amountMl, durationMin等）是否为数字

## 期望的数据格式

```json
[
  {
    "id": 1,
    "type": "BREASTFEEDING",
    "happenedAt": "2024-09-30T10:00:00.000Z",
    "durationMin": 15,
    "amountMl": null,
    "note": "左侧母乳喂养"
  },
  {
    "id": 2,
    "type": "BOTTLE",
    "happenedAt": "2024-09-30T14:00:00.000Z",
    "durationMin": null,
    "amountMl": 120,
    "note": "配方奶瓶喂"
  },
  {
    "id": 3,
    "type": "DIAPER",
    "happenedAt": "2024-09-30T12:00:00.000Z",
    "diaperTexture": "SOFT",
    "note": "正常大便"
  },
  {
    "id": 4,
    "type": "GROWTH",
    "happenedAt": "2024-09-30T09:00:00.000Z",
    "heightCm": 65.5,
    "weightKg": 7.2,
    "note": "定期体检"
  }
]
```

## 支持的记录类型

- `BREASTFEEDING`: 母乳亲喂（需要durationMin）
- `BOTTLE`: 瓶喂（需要amountMl）
- `FORMULA`: 配方奶（需要amountMl）
- `SOLID`: 辅食（需要amountMl）
- `DIAPER`: 大便记录（需要diaperTexture: SOFT/NORMAL/WATERY/HARD）
- `GROWTH`: 成长记录（需要heightCm和weightKg）

## 图表展示规则

### 时间范围聚合
- **本周**: 按日显示，最多7天
- **本月**: 按周聚合显示
- **本季度**: 按月聚合显示

### 图表类型
1. **喂养趋势图**: 柱状图 - 按时间显示喂养量
2. **喂养类型分布**: 饼图 - 不同喂养方式占比
3. **大便性状分布**: 饼图 - 不同性状分布
4. **成长曲线图**: 折线图 - 身高体重变化
5. **记录时间轴**: 折线图 - 每日记录数量

如果按照这个指南测试后图表仍不显示，请提供控制台的完整日志信息以便进一步诊断。