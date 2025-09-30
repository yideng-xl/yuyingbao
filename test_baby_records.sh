#!/bin/bash

# 测试新的基于babyId的记录查询功能
# 需要先启动服务器 (mvn spring-boot:run)

BASE_URL="http://localhost:8080/api"

echo "=== 育婴宝多宝宝记录查询功能测试 ==="
echo

# 1. 用户登录
echo "1. 用户登录..."
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/wechat/login" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "test_code_001",
    "userInfo": {
      "nickName": "测试用户",
      "avatarUrl": "https://example.com/avatar.jpg"
    }
  }')

echo "Login response: $LOGIN_RESPONSE"

# 提取token
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "Token: $TOKEN"
echo

if [ -z "$TOKEN" ]; then
  echo "❌ 登录失败，无法获取token"
  exit 1
fi

# 2. 创建家庭
echo "2. 创建家庭..."
FAMILY_RESPONSE=$(curl -s -X POST "${BASE_URL}/families" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "测试家庭"
  }')

echo "Family response: $FAMILY_RESPONSE"

# 提取familyId
FAMILY_ID=$(echo $FAMILY_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo "Family ID: $FAMILY_ID"
echo

if [ -z "$FAMILY_ID" ]; then
  echo "❌ 创建家庭失败"
  exit 1
fi

# 3. 创建第一个宝宝
echo "3. 创建第一个宝宝..."
BABY1_RESPONSE=$(curl -s -X POST "${BASE_URL}/families/${FAMILY_ID}/babies" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "宝宝1",
    "gender": "BOY",
    "birthDate": "2024-01-15",
    "avatarUrl": "https://example.com/baby1.jpg",
    "birthHeightCm": 50.0,
    "birthWeightKg": 3.2
  }')

echo "Baby1 response: $BABY1_RESPONSE"

# 提取baby1Id
BABY1_ID=$(echo $BABY1_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo "Baby1 ID: $BABY1_ID"
echo

# 4. 创建第二个宝宝
echo "4. 创建第二个宝宝..."
BABY2_RESPONSE=$(curl -s -X POST "${BASE_URL}/families/${FAMILY_ID}/babies" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "宝宝2",
    "gender": "GIRL",
    "birthDate": "2024-06-01",
    "avatarUrl": "https://example.com/baby2.jpg",
    "birthHeightCm": 48.0,
    "birthWeightKg": 3.0
  }')

echo "Baby2 response: $BABY2_RESPONSE"

# 提取baby2Id
BABY2_ID=$(echo $BABY2_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo "Baby2 ID: $BABY2_ID"
echo

if [ -z "$BABY1_ID" ] || [ -z "$BABY2_ID" ]; then
  echo "❌ 创建宝宝失败"
  exit 1
fi

# 5. 为宝宝1创建记录
echo "5. 为宝宝1创建母乳亲喂记录..."
RECORD1_RESPONSE=$(curl -s -X POST "${BASE_URL}/babies/${BABY1_ID}/records" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "type": "BREASTFEEDING",
    "happenedAt": "2024-09-30T10:00:00Z",
    "durationMin": 15,
    "breastfeedingSide": "LEFT",
    "note": "宝宝1的母乳记录"
  }')

echo "Record1 response: $RECORD1_RESPONSE"
echo

# 6. 为宝宝2创建记录
echo "6. 为宝宝2创建瓶喂记录..."
RECORD2_RESPONSE=$(curl -s -X POST "${BASE_URL}/babies/${BABY2_ID}/records" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "type": "BOTTLE",
    "happenedAt": "2024-09-30T11:00:00Z",
    "amountMl": 120,
    "note": "宝宝2的瓶喂记录"
  }')

echo "Record2 response: $RECORD2_RESPONSE"
echo

# 7. 测试基于babyId的记录查询
echo "7. 查询宝宝1的记录..."
BABY1_RECORDS=$(curl -s -X GET "${BASE_URL}/babies/${BABY1_ID}/records" \
  -H "Authorization: Bearer $TOKEN")

echo "Baby1 records: $BABY1_RECORDS"
echo

echo "8. 查询宝宝2的记录..."
BABY2_RECORDS=$(curl -s -X GET "${BASE_URL}/babies/${BABY2_ID}/records" \
  -H "Authorization: Bearer $TOKEN")

echo "Baby2 records: $BABY2_RECORDS"
echo

# 9. 测试基于babyId的记录筛选
echo "9. 按条件筛选宝宝1的记录..."
BABY1_FILTERED=$(curl -s -X GET "${BASE_URL}/babies/${BABY1_ID}/records/filter?type=BREASTFEEDING" \
  -H "Authorization: Bearer $TOKEN")

echo "Baby1 filtered records: $BABY1_FILTERED"
echo

# 验证结果
echo "=== 测试结果验证 ==="
echo

# 检查宝宝1的记录是否只包含宝宝1的数据
if echo "$BABY1_RECORDS" | grep -q "宝宝1的母乳记录" && ! echo "$BABY1_RECORDS" | grep -q "宝宝2的瓶喂记录"; then
  echo "✅ 宝宝1记录查询正确：只返回宝宝1的记录"
else
  echo "❌ 宝宝1记录查询错误：包含其他宝宝的记录或缺少自己的记录"
fi

# 检查宝宝2的记录是否只包含宝宝2的数据
if echo "$BABY2_RECORDS" | grep -q "宝宝2的瓶喂记录" && ! echo "$BABY2_RECORDS" | grep -q "宝宝1的母乳记录"; then
  echo "✅ 宝宝2记录查询正确：只返回宝宝2的记录"
else
  echo "❌ 宝宝2记录查询错误：包含其他宝宝的记录或缺少自己的记录"
fi

# 检查筛选功能
if echo "$BABY1_FILTERED" | grep -q "BREASTFEEDING" && echo "$BABY1_FILTERED" | grep -q "宝宝1的母乳记录"; then
  echo "✅ 宝宝记录筛选功能正常"
else
  echo "❌ 宝宝记录筛选功能异常"
fi

echo
echo "=== 测试完成 ==="