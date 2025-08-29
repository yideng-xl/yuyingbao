# 数据库设计文档 v0.5

## 概述

本文档描述了育婴宝系统v0.5版本的数据库设计，包括表结构、索引、约束和数据字典。

## 技术选型

- **数据库**: PostgreSQL 17
- **字符集**: UTF-8
- **时区**: UTC
- **连接池**: HikariCP

## 数据库架构

### 核心业务表
- `users` - 用户信息表
- `families` - 家庭信息表
- `family_members` - 家庭成员关系表
- `babies` - 宝宝信息表
- `records` - 记录信息表

### 配置和扩展表
- 未来版本将包括知识库、通知等扩展表

## 表结构设计

### 1. 用户表 (users)

存储用户基本信息和微信授权信息。

```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    openid VARCHAR(128) UNIQUE NOT NULL,
    nickname VARCHAR(100),
    avatar_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_users_openid ON users(openid);
CREATE INDEX idx_users_created_at ON users(created_at);

-- 注释
COMMENT ON TABLE users IS '用户信息表';
COMMENT ON COLUMN users.id IS '用户ID';
COMMENT ON COLUMN users.openid IS '微信OpenID';
COMMENT ON COLUMN users.nickname IS '用户昵称';
COMMENT ON COLUMN users.avatar_url IS '头像URL';
COMMENT ON COLUMN users.created_at IS '创建时间';
COMMENT ON COLUMN users.updated_at IS '更新时间';
```

### 2. 家庭表 (families)

存储家庭基本信息和邀请码。

```sql
CREATE TABLE families (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    invite_code VARCHAR(20) UNIQUE NOT NULL,
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 索引
CREATE UNIQUE INDEX idx_families_invite_code ON families(invite_code);
CREATE INDEX idx_families_created_by ON families(created_by);
CREATE INDEX idx_families_created_at ON families(created_at);

-- 注释
COMMENT ON TABLE families IS '家庭信息表';
COMMENT ON COLUMN families.id IS '家庭ID';
COMMENT ON COLUMN families.name IS '家庭名称';
COMMENT ON COLUMN families.invite_code IS '邀请码';
COMMENT ON COLUMN families.created_by IS '创建者用户ID';
COMMENT ON COLUMN families.created_at IS '创建时间';
```

### 3. 家庭成员表 (family_members)

存储家庭成员关系和角色权限。

```sql
CREATE TYPE family_role AS ENUM ('ADMIN', 'MEMBER');

CREATE TABLE family_members (
    id BIGSERIAL PRIMARY KEY,
    family_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role family_role NOT NULL DEFAULT 'MEMBER',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(family_id, user_id)
);

-- 索引
CREATE INDEX idx_family_members_family_id ON family_members(family_id);
CREATE INDEX idx_family_members_user_id ON family_members(user_id);
CREATE INDEX idx_family_members_role ON family_members(role);

-- 注释
COMMENT ON TABLE family_members IS '家庭成员关系表';
COMMENT ON COLUMN family_members.id IS '关系ID';
COMMENT ON COLUMN family_members.family_id IS '家庭ID';
COMMENT ON COLUMN family_members.user_id IS '用户ID';
COMMENT ON COLUMN family_members.role IS '角色 (ADMIN/MEMBER)';
COMMENT ON COLUMN family_members.joined_at IS '加入时间';
```

### 4. 宝宝表 (babies)

存储宝宝基本信息和出生数据。

```sql
CREATE TYPE gender AS ENUM ('BOY', 'GIRL');

CREATE TABLE babies (
    id BIGSERIAL PRIMARY KEY,
    family_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    gender gender NOT NULL,
    birth_date DATE NOT NULL,
    avatar_url VARCHAR(500),
    birth_height_cm DECIMAL(5,2),
    birth_weight_kg DECIMAL(4,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_babies_family_id ON babies(family_id);
CREATE INDEX idx_babies_birth_date ON babies(birth_date);
CREATE INDEX idx_babies_created_at ON babies(created_at);

-- 注释
COMMENT ON TABLE babies IS '宝宝信息表';
COMMENT ON COLUMN babies.id IS '宝宝ID';
COMMENT ON COLUMN babies.family_id IS '家庭ID';
COMMENT ON COLUMN babies.name IS '宝宝姓名';
COMMENT ON COLUMN babies.gender IS '性别 (BOY/GIRL)';
COMMENT ON COLUMN babies.birth_date IS '出生日期';
COMMENT ON COLUMN babies.avatar_url IS '头像URL';
COMMENT ON COLUMN babies.birth_height_cm IS '出生身高(cm)';
COMMENT ON COLUMN babies.birth_weight_kg IS '出生体重(kg)';
COMMENT ON COLUMN babies.created_at IS '创建时间';
```

### 5. 记录表 (records)

存储所有类型的宝宝记录信息。

```sql
CREATE TYPE record_type AS ENUM (
    'BREASTFEEDING',  -- 母乳亲喂
    'BOTTLE',         -- 瓶喂
    'FORMULA',        -- 配方奶
    'SOLID',          -- 辅食
    'DIAPER',         -- 大便
    'GROWTH'          -- 成长
);

CREATE TYPE solid_type AS ENUM (
    'RICE_CEREAL',    -- 米糊
    'VEGETABLE_PUREE',-- 蔬菜泥
    'FRUIT_PUREE',    -- 水果泥
    'MEAT_PUREE',     -- 肉泥
    'EGG_YOLK',       -- 蛋黄
    'OTHER'           -- 其他
);

CREATE TYPE diaper_texture AS ENUM (
    'WATERY',         -- 稀
    'SOFT',           -- 软
    'NORMAL',         -- 成形
    'HARD'            -- 干硬
);

CREATE TYPE diaper_color AS ENUM (
    'YELLOW',         -- 黄色
    'GREEN',          -- 绿色
    'BROWN',          -- 棕色
    'BLACK'           -- 黑色
);

CREATE TABLE records (
    id BIGSERIAL PRIMARY KEY,
    family_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    baby_id BIGINT NOT NULL,
    type record_type NOT NULL,
    happened_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- 喂养相关字段
    amount_ml DECIMAL(6,2),                    -- 奶量(ml)
    duration_min INTEGER,                      -- 持续时间(分钟)
    breastfeeding_side VARCHAR(16),            -- 母乳喂养侧 (LEFT/RIGHT/BOTH)
    solid_type solid_type,                     -- 辅食类型
    
    -- 大便相关字段
    diaper_texture diaper_texture,             -- 大便质地
    diaper_color diaper_color,                 -- 大便颜色
    has_urine BOOLEAN,                         -- 是否有尿
    
    -- 成长相关字段
    height_cm DECIMAL(5,2),                    -- 身高(cm)
    weight_kg DECIMAL(4,2),                    -- 体重(kg)
    
    -- 通用字段
    note VARCHAR(255),                         -- 备注
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (baby_id) REFERENCES babies(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_records_family_id ON records(family_id);
CREATE INDEX idx_records_baby_id ON records(baby_id);
CREATE INDEX idx_records_user_id ON records(user_id);
CREATE INDEX idx_records_type ON records(type);
CREATE INDEX idx_records_happened_at ON records(happened_at);
CREATE INDEX idx_records_created_at ON records(created_at);

-- 复合索引（用于查询优化）
CREATE INDEX idx_records_family_baby_time ON records(family_id, baby_id, happened_at DESC);
CREATE INDEX idx_records_family_type_time ON records(family_id, type, happened_at DESC);

-- 注释
COMMENT ON TABLE records IS '记录信息表';
COMMENT ON COLUMN records.id IS '记录ID';
COMMENT ON COLUMN records.family_id IS '家庭ID';
COMMENT ON COLUMN records.user_id IS '创建者用户ID';
COMMENT ON COLUMN records.baby_id IS '宝宝ID';
COMMENT ON COLUMN records.type IS '记录类型';
COMMENT ON COLUMN records.happened_at IS '发生时间';
COMMENT ON COLUMN records.amount_ml IS '奶量(ml)';
COMMENT ON COLUMN records.duration_min IS '持续时间(分钟)';
COMMENT ON COLUMN records.breastfeeding_side IS '母乳喂养侧';
COMMENT ON COLUMN records.solid_type IS '辅食类型';
COMMENT ON COLUMN records.diaper_texture IS '大便质地';
COMMENT ON COLUMN records.diaper_color IS '大便颜色';
COMMENT ON COLUMN records.has_urine IS '是否有尿';
COMMENT ON COLUMN records.height_cm IS '身高(cm)';
COMMENT ON COLUMN records.weight_kg IS '体重(kg)';
COMMENT ON COLUMN records.note IS '备注';
COMMENT ON COLUMN records.created_at IS '创建时间';
```

## 数据约束和验证

### 业务约束

1. **用户约束**
   - OpenID 必须唯一
   - 昵称长度限制 1-100 字符

2. **家庭约束**
   - 邀请码必须唯一，6位随机字符串
   - 家庭名称不能为空

3. **宝宝约束**
   - 出生日期不能晚于当前日期
   - 身高范围：20-200 cm
   - 体重范围：0.5-50 kg

4. **记录约束**
   - 发生时间不能晚于当前时间
   - 奶量范围：1-1000 ml
   - 持续时间范围：1-180 分钟

### 数据完整性约束

```sql
-- 检查约束
ALTER TABLE babies ADD CONSTRAINT chk_babies_birth_height 
    CHECK (birth_height_cm IS NULL OR (birth_height_cm >= 20 AND birth_height_cm <= 200));

ALTER TABLE babies ADD CONSTRAINT chk_babies_birth_weight 
    CHECK (birth_weight_kg IS NULL OR (birth_weight_kg >= 0.5 AND birth_weight_kg <= 50));

ALTER TABLE babies ADD CONSTRAINT chk_babies_birth_date 
    CHECK (birth_date <= CURRENT_DATE);

ALTER TABLE records ADD CONSTRAINT chk_records_amount_ml 
    CHECK (amount_ml IS NULL OR (amount_ml > 0 AND amount_ml <= 1000));

ALTER TABLE records ADD CONSTRAINT chk_records_duration_min 
    CHECK (duration_min IS NULL OR (duration_min > 0 AND duration_min <= 180));

ALTER TABLE records ADD CONSTRAINT chk_records_height_cm 
    CHECK (height_cm IS NULL OR (height_cm >= 20 AND height_cm <= 200));

ALTER TABLE records ADD CONSTRAINT chk_records_weight_kg 
    CHECK (weight_kg IS NULL OR (weight_kg >= 0.5 AND weight_kg <= 50));
```

## 初始化数据

### 系统默认数据

```sql
-- 插入测试用户（开发环境）
INSERT INTO users (openid, nickname, avatar_url) VALUES 
('test_openid_001', '测试用户1', 'https://example.com/avatar1.jpg'),
('test_openid_002', '测试用户2', 'https://example.com/avatar2.jpg');

-- 创建测试家庭
INSERT INTO families (name, invite_code, created_by) VALUES 
('测试家庭', 'TEST01', 1);

-- 添加家庭成员
INSERT INTO family_members (family_id, user_id, role) VALUES 
(1, 1, 'ADMIN'),
(1, 2, 'MEMBER');

-- 添加测试宝宝
INSERT INTO babies (family_id, name, gender, birth_date, birth_height_cm, birth_weight_kg) VALUES 
(1, '小测试', 'BOY', '2024-01-15', 50.0, 3.2);
```

## 数据库配置

### 连接配置

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/yuyingbao
    username: ${DB_USERNAME:yuyingbao}
    password: ${DB_PASSWORD:password}
    driver-class-name: org.postgresql.Driver
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      connection-timeout: 30000
      idle-timeout: 600000
      max-lifetime: 1800000
```

### JPA 配置

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        format_sql: true
        jdbc:
          time_zone: UTC
```

## 性能优化

### 索引策略

1. **主键索引**: 所有表都有主键自动索引
2. **外键索引**: 所有外键字段都建立索引
3. **查询索引**: 根据常用查询模式建立复合索引
4. **时间索引**: 按时间查询的字段建立索引

### 分页查询优化

```sql
-- 使用索引优化的分页查询
SELECT * FROM records 
WHERE family_id = ? AND baby_id = ?
ORDER BY happened_at DESC 
LIMIT 20 OFFSET ?;
```

### 统计查询优化

```sql
-- 今日统计查询（使用索引）
SELECT 
    type,
    COUNT(*) as count,
    SUM(amount_ml) as total_amount
FROM records 
WHERE family_id = ? 
    AND happened_at >= CURRENT_DATE 
    AND happened_at < CURRENT_DATE + INTERVAL '1 day'
GROUP BY type;
```

## 备份和恢复

### 备份策略

1. **全量备份**: 每日凌晨进行全量备份
2. **增量备份**: 每小时进行增量备份
3. **WAL归档**: 启用WAL日志归档
4. **跨区域备份**: 备份文件同步到多个区域

### 备份命令

```bash
# 全量备份
pg_dump -h localhost -U yuyingbao -d yuyingbao > backup_$(date +%Y%m%d_%H%M%S).sql

# 恢复数据库
psql -h localhost -U yuyingbao -d yuyingbao < backup_20240829_100000.sql
```

## 监控和维护

### 性能监控

1. **慢查询监控**: 记录执行时间超过1秒的查询
2. **连接池监控**: 监控连接池使用情况
3. **磁盘空间监控**: 监控数据库文件大小
4. **索引使用监控**: 检查未使用的索引

### 定期维护

```sql
-- 更新表统计信息
ANALYZE;

-- 清理死元组
VACUUM;

-- 重建索引（必要时）
REINDEX INDEX idx_records_family_baby_time;
```

## 版本管理

### 数据库版本控制

使用Flyway进行数据库版本管理：

- `V1__init.sql` - 初始化表结构
- `V2__add_indexes.sql` - 添加索引
- `V3__add_constraints.sql` - 添加约束

### 升级策略

1. **测试环境验证**: 所有变更先在测试环境验证
2. **备份数据**: 升级前进行完整备份
3. **滚动升级**: 逐步升级，保证服务可用性
4. **回滚准备**: 准备回滚脚本和流程

---

*文档版本: v0.5*  
*更新时间: 2024年8月29日*  
*维护人员: westxixia*