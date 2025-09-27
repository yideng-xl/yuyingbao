# 育婴宝数据库设计文档 v0.6

## 文档信息

- **文档版本**: v0.6.0
- **创建日期**: 2024年9月27日
- **数据库设计师**: westxixia
- **目标版本**: v0.6
- **文档状态**: 开发中

## 1. 概述

### 1.1 设计目标

育婴宝v0.6版本数据库设计在v0.5的基础上，增加了对多宝宝支持、数据导出、智能提醒等功能的支持，同时优化了数据结构以提升查询性能。

### 1.2 设计原则

- **数据一致性**: 确保数据的完整性和一致性
- **性能优化**: 通过索引和查询优化提升性能
- **可扩展性**: 支持未来功能扩展
- **安全性**: 保护用户隐私和数据安全
- **标准化**: 遵循数据库设计最佳实践

## 2. 表结构设计

### 2.1 核心表结构

#### 用户表 (users)
```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    openid VARCHAR(64) NOT NULL UNIQUE,
    nickname VARCHAR(64) NOT NULL,
    avatar TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_users_openid ON users(openid);
CREATE INDEX idx_users_nickname ON users(nickname);
```

**字段说明**
| 字段名 | 类型 | 约束 | 描述 |
|-------|------|------|------|
| id | BIGSERIAL | PK | 用户ID |
| openid | VARCHAR(64) | NOT NULL, UNIQUE | 微信openid |
| nickname | VARCHAR(64) | NOT NULL | 用户昵称 |
| avatar | TEXT | - | 用户头像URL |
| created_at | TIMESTAMP | NOT NULL | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL | 更新时间 |

#### 家庭表 (families)
```sql
CREATE TABLE families (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    invite_code VARCHAR(8) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_families_invite_code ON families(invite_code);
```

**字段说明**
| 字段名 | 类型 | 约束 | 描述 |
|-------|------|------|------|
| id | BIGSERIAL | PK | 家庭ID |
| name | VARCHAR(64) | NOT NULL | 家庭名称 |
| invite_code | VARCHAR(8) | NOT NULL, UNIQUE | 邀请码 |
| created_at | TIMESTAMP | NOT NULL | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL | 更新时间 |

#### 家庭成员表 (family_members)
```sql
CREATE TABLE family_members (
    id BIGSERIAL PRIMARY KEY,
    family_id BIGINT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(16) NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('ADMIN', 'MEMBER')),
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    UNIQUE(family_id, user_id)
);

-- 索引
CREATE INDEX idx_family_members_family_id ON family_members(family_id);
CREATE INDEX idx_family_members_user_id ON family_members(user_id);
CREATE INDEX idx_family_members_role ON family_members(role);
```

**字段说明**
| 字段名 | 类型 | 约束 | 描述 |
|-------|------|------|------|
| id | BIGSERIAL | PK | 成员ID |
| family_id | BIGINT | NOT NULL, FK | 家庭ID |
| user_id | BIGINT | NOT NULL, FK | 用户ID |
| role | VARCHAR(16) | NOT NULL, CHECK | 角色(ADMIN/MEMBER) |
| joined_at | TIMESTAMP | NOT NULL | 加入时间 |
| status | VARCHAR(16) | NOT NULL, CHECK | 状态(ACTIVE/INACTIVE) |

#### 宝宝表 (babies) - v0.6新增
```sql
CREATE TABLE babies (
    id BIGSERIAL PRIMARY KEY,
    family_id BIGINT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    name VARCHAR(64) NOT NULL,
    gender VARCHAR(8) NOT NULL CHECK (gender IN ('MALE', 'FEMALE')),
    birth_date DATE NOT NULL,
    avatar TEXT,
    height DECIMAL(5,2),
    weight DECIMAL(5,2),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_babies_family_id ON babies(family_id);
CREATE INDEX idx_babies_birth_date ON babies(birth_date);
```

**字段说明**
| 字段名 | 类型 | 约束 | 描述 |
|-------|------|------|------|
| id | BIGSERIAL | PK | 宝宝ID |
| family_id | BIGINT | NOT NULL, FK | 家庭ID |
| name | VARCHAR(64) | NOT NULL | 宝宝姓名 |
| gender | VARCHAR(8) | NOT NULL, CHECK | 性别(MALE/FEMALE) |
| birth_date | DATE | NOT NULL | 出生日期 |
| avatar | TEXT | - | 宝宝头像URL |
| height | DECIMAL(5,2) | - | 出生身高(cm) |
| weight | DECIMAL(5,2) | - | 出生体重(kg) |
| created_at | TIMESTAMP | NOT NULL | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL | 更新时间 |

#### 母乳亲喂记录表 (breast_feeding_records)
```sql
CREATE TABLE breast_feeding_records (
    id BIGSERIAL PRIMARY KEY,
    baby_id BIGINT NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    side VARCHAR(8) CHECK (side IN ('LEFT', 'RIGHT', 'BOTH')),
    duration INTEGER NOT NULL,
    note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_breast_feeding_baby_id ON breast_feeding_records(baby_id);
CREATE INDEX idx_breast_feeding_time ON breast_feeding_records(start_time, end_time);
```

**字段说明**
| 字段名 | 类型 | 约束 | 描述 |
|-------|------|------|------|
| id | BIGSERIAL | PK | 记录ID |
| baby_id | BIGINT | NOT NULL, FK | 宝宝ID |
| start_time | TIMESTAMP | NOT NULL | 开始时间 |
| end_time | TIMESTAMP | NOT NULL | 结束时间 |
| side | VARCHAR(8) | CHECK | 喂养侧(LEFT/RIGHT/BOTH) |
| duration | INTEGER | NOT NULL | 持续时间(秒) |
| note | TEXT | - | 备注 |
| created_at | TIMESTAMP | NOT NULL | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL | 更新时间 |

#### 瓶喂记录表 (bottle_feeding_records)
```sql
CREATE TABLE bottle_feeding_records (
    id BIGSERIAL PRIMARY KEY,
    baby_id BIGINT NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
    feeding_time TIMESTAMP NOT NULL,
    amount INTEGER NOT NULL,
    note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_bottle_feeding_baby_id ON bottle_feeding_records(baby_id);
CREATE INDEX idx_bottle_feeding_time ON bottle_feeding_records(feeding_time);
```

**字段说明**
| 字段名 | 类型 | 约束 | 描述 |
|-------|------|------|------|
| id | BIGSERIAL | PK | 记录ID |
| baby_id | BIGINT | NOT NULL, FK | 宝宝ID |
| feeding_time | TIMESTAMP | NOT NULL | 喂养时间 |
| amount | INTEGER | NOT NULL | 奶量(ml) |
| note | TEXT | - | 备注 |
| created_at | TIMESTAMP | NOT NULL | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL | 更新时间 |

#### 配方奶记录表 (formula_feeding_records)
```sql
CREATE TABLE formula_feeding_records (
    id BIGSERIAL PRIMARY KEY,
    baby_id BIGINT NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
    feeding_time TIMESTAMP NOT NULL,
    amount INTEGER NOT NULL,
    note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_formula_feeding_baby_id ON formula_feeding_records(baby_id);
CREATE INDEX idx_formula_feeding_time ON formula_feeding_records(feeding_time);
```

**字段说明**
| 字段名 | 类型 | 约束 | 描述 |
|-------|------|------|------|
| id | BIGSERIAL | PK | 记录ID |
| baby_id | BIGINT | NOT NULL, FK | 宝宝ID |
| feeding_time | TIMESTAMP | NOT NULL | 喂养时间 |
| amount | INTEGER | NOT NULL | 奶量(ml) |
| note | TEXT | - | 备注 |
| created_at | TIMESTAMP | NOT NULL | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL | 更新时间 |

#### 辅食记录表 (solid_food_records)
```sql
CREATE TABLE solid_food_records (
    id BIGSERIAL PRIMARY KEY,
    baby_id BIGINT NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
    feeding_time TIMESTAMP NOT NULL,
    food_type VARCHAR(64) NOT NULL,
    amount DECIMAL(6,2),
    note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_solid_food_baby_id ON solid_food_records(baby_id);
CREATE INDEX idx_solid_food_time ON solid_food_records(feeding_time);
CREATE INDEX idx_solid_food_type ON solid_food_records(food_type);
```

**字段说明**
| 字段名 | 类型 | 约束 | 描述 |
|-------|------|------|------|
| id | BIGSERIAL | PK | 记录ID |
| baby_id | BIGINT | NOT NULL, FK | 宝宝ID |
| feeding_time | TIMESTAMP | NOT NULL | 喂养时间 |
| food_type | VARCHAR(64) | NOT NULL | 辅食类型 |
| amount | DECIMAL(6,2) | - | 分量(g) |
| note | TEXT | - | 备注 |
| created_at | TIMESTAMP | NOT NULL | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL | 更新时间 |

#### 大便记录表 (diaper_records)
```sql
CREATE TABLE diaper_records (
    id BIGSERIAL PRIMARY KEY,
    baby_id BIGINT NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
    record_time TIMESTAMP NOT NULL,
    consistency VARCHAR(16) CHECK (consistency IN ('HARD', 'NORMAL', 'SOFT', 'WATERY')),
    color VARCHAR(16) CHECK (color IN ('YELLOW', 'GREEN', 'BROWN', 'BLACK')),
    urine BOOLEAN,
    note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_diaper_baby_id ON diaper_records(baby_id);
CREATE INDEX idx_diaper_time ON diaper_records(record_time);
```

**字段说明**
| 字段名 | 类型 | 约束 | 描述 |
|-------|------|------|------|
| id | BIGSERIAL | PK | 记录ID |
| baby_id | BIGINT | NOT NULL, FK | 宝宝ID |
| record_time | TIMESTAMP | NOT NULL | 记录时间 |
| consistency | VARCHAR(16) | CHECK | 质地(HARD/NORMAL/SOFT/WATERY) |
| color | VARCHAR(16) | CHECK | 颜色(YELLOW/GREEN/BROWN/BLACK) |
| urine | BOOLEAN | - | 是否有尿液 |
| note | TEXT | - | 备注 |
| created_at | TIMESTAMP | NOT NULL | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL | 更新时间 |

#### 成长记录表 (growth_records)
```sql
CREATE TABLE growth_records (
    id BIGSERIAL PRIMARY KEY,
    baby_id BIGINT NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
    record_time TIMESTAMP NOT NULL,
    height DECIMAL(5,2) NOT NULL,
    weight DECIMAL(5,2) NOT NULL,
    note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_growth_baby_id ON growth_records(baby_id);
CREATE INDEX idx_growth_time ON growth_records(record_time);
```

**字段说明**
| 字段名 | 类型 | 约束 | 描述 |
|-------|------|------|------|
| id | BIGSERIAL | PK | 记录ID |
| baby_id | BIGINT | NOT NULL, FK | 宝宝ID |
| record_time | TIMESTAMP | NOT NULL | 记录时间 |
| height | DECIMAL(5,2) | NOT NULL | 身高(cm) |
| weight | DECIMAL(5,2) | NOT NULL | 体重(kg) |
| note | TEXT | - | 备注 |
| created_at | TIMESTAMP | NOT NULL | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL | 更新时间 |

#### 提醒设置表 (reminders) - v0.6新增
```sql
CREATE TABLE reminders (
    id BIGSERIAL PRIMARY KEY,
    baby_id BIGINT NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(32) NOT NULL CHECK (type IN ('FEEDING', 'CHECKUP', 'VACCINE', 'CUSTOM')),
    time TIME NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_reminders_baby_id ON reminders(baby_id);
CREATE INDEX idx_reminders_user_id ON reminders(user_id);
CREATE INDEX idx_reminders_type ON reminders(type);
CREATE INDEX idx_reminders_time ON reminders(time);
```

**字段说明**
| 字段名 | 类型 | 约束 | 描述 |
|-------|------|------|------|
| id | BIGSERIAL | PK | 提醒ID |
| baby_id | BIGINT | NOT NULL, FK | 宝宝ID |
| user_id | BIGINT | NOT NULL, FK | 用户ID |
| type | VARCHAR(32) | NOT NULL, CHECK | 提醒类型 |
| time | TIME | NOT NULL | 提醒时间 |
| enabled | BOOLEAN | NOT NULL | 是否启用 |
| description | TEXT | - | 描述 |
| created_at | TIMESTAMP | NOT NULL | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL | 更新时间 |

#### 导出记录表 (export_records) - v0.6新增
```sql
CREATE TABLE export_records (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    baby_id BIGINT REFERENCES babies(id) ON DELETE SET NULL,
    format VARCHAR(16) NOT NULL CHECK (format IN ('PDF', 'EXCEL')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    file_path TEXT,
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- 索引
CREATE INDEX idx_export_user_id ON export_records(user_id);
CREATE INDEX idx_export_baby_id ON export_records(baby_id);
CREATE INDEX idx_export_status ON export_records(status);
CREATE INDEX idx_export_created_at ON export_records(created_at);
```

**字段说明**
| 字段名 | 类型 | 约束 | 描述 |
|-------|------|------|------|
| id | BIGSERIAL | PK | 导出记录ID |
| user_id | BIGINT | NOT NULL, FK | 用户ID |
| baby_id | BIGINT | FK | 宝宝ID |
| format | VARCHAR(16) | NOT NULL, CHECK | 导出格式(PDF/EXCEL) |
| start_date | DATE | NOT NULL | 开始日期 |
| end_date | DATE | NOT NULL | 结束日期 |
| file_path | TEXT | - | 文件路径 |
| status | VARCHAR(16) | NOT NULL, CHECK | 状态 |
| created_at | TIMESTAMP | NOT NULL | 创建时间 |
| completed_at | TIMESTAMP | - | 完成时间 |

### 2.2 数据关系

#### 实体关系图
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

## 3. 性能优化

### 3.1 索引策略

#### 核心查询索引
```sql
-- 用户相关查询
CREATE INDEX idx_users_openid ON users(openid);
CREATE INDEX idx_users_nickname ON users(nickname);

-- 家庭相关查询
CREATE INDEX idx_families_invite_code ON families(invite_code);
CREATE INDEX idx_family_members_family_id ON family_members(family_id);
CREATE INDEX idx_family_members_user_id ON family_members(user_id);

-- 宝宝相关查询
CREATE INDEX idx_babies_family_id ON babies(family_id);
CREATE INDEX idx_babies_birth_date ON babies(birth_date);

-- 记录相关查询
CREATE INDEX idx_breast_feeding_baby_id ON breast_feeding_records(baby_id);
CREATE INDEX idx_breast_feeding_time ON breast_feeding_records(start_time, end_time);
CREATE INDEX idx_bottle_feeding_baby_id ON bottle_feeding_records(baby_id);
CREATE INDEX idx_bottle_feeding_time ON bottle_feeding_records(feeding_time);
CREATE INDEX idx_formula_feeding_baby_id ON formula_feeding_records(baby_id);
CREATE INDEX idx_formula_feeding_time ON formula_feeding_records(feeding_time);
CREATE INDEX idx_solid_food_baby_id ON solid_food_records(baby_id);
CREATE INDEX idx_solid_food_time ON solid_food_records(feeding_time);
CREATE INDEX idx_diaper_baby_id ON diaper_records(baby_id);
CREATE INDEX idx_diaper_time ON diaper_records(record_time);
CREATE INDEX idx_growth_baby_id ON growth_records(baby_id);
CREATE INDEX idx_growth_time ON growth_records(record_time);

-- 提醒相关查询
CREATE INDEX idx_reminders_baby_id ON reminders(baby_id);
CREATE INDEX idx_reminders_user_id ON reminders(user_id);
CREATE INDEX idx_reminders_time ON reminders(time);

-- 导出相关查询
CREATE INDEX idx_export_user_id ON export_records(user_id);
CREATE INDEX idx_export_status ON export_records(status);
CREATE INDEX idx_export_created_at ON export_records(created_at);
```

### 3.2 查询优化

#### 常用查询优化示例

##### 获取宝宝今日统计
```sql
-- 优化前
SELECT COUNT(*) as count, SUM(duration) as total_duration 
FROM breast_feeding_records 
WHERE baby_id = 1 
AND DATE(start_time) = CURRENT_DATE;

-- 优化后
SELECT COUNT(*) as count, SUM(duration) as total_duration 
FROM breast_feeding_records 
WHERE baby_id = 1 
AND start_time >= CURRENT_DATE 
AND start_time < CURRENT_DATE + INTERVAL '1 day';
```

##### 获取宝宝历史趋势
```sql
-- 按月统计体重变化
SELECT 
    DATE_TRUNC('month', record_time) as month,
    AVG(weight) as avg_weight
FROM growth_records 
WHERE baby_id = 1 
AND record_time >= CURRENT_DATE - INTERVAL '1 year'
GROUP BY DATE_TRUNC('month', record_time)
ORDER BY month;
```

## 4. 数据安全

### 4.1 数据加密

#### 敏感数据加密存储
```sql
-- 用户头像URL加密存储（示例）
ALTER TABLE users ADD COLUMN avatar_encrypted BYTEA;
ALTER TABLE babies ADD COLUMN avatar_encrypted BYTEA;
```

### 4.2 访问控制

#### 行级安全策略
```sql
-- 启用行级安全
ALTER TABLE babies ENABLE ROW LEVEL SECURITY;
ALTER TABLE breast_feeding_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE bottle_feeding_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE formula_feeding_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE solid_food_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE diaper_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_records ENABLE ROW LEVEL SECURITY;

-- 创建策略函数
CREATE OR REPLACE FUNCTION family_member_check(family_id BIGINT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM family_members fm
        JOIN users u ON fm.user_id = u.id
        WHERE fm.family_id = family_member_check.family_id
        AND u.openid = current_setting('app.current_user_openid')
        AND fm.status = 'ACTIVE'
    );
END;
$$ LANGUAGE plpgsql;

-- 创建行级安全策略
CREATE POLICY babies_policy ON babies
    FOR ALL TO PUBLIC
    USING (family_member_check(family_id));

CREATE POLICY breast_feeding_records_policy ON breast_feeding_records
    FOR ALL TO PUBLIC
    USING (EXISTS (
        SELECT 1 FROM babies b
        WHERE b.id = breast_feeding_records.baby_id
        AND family_member_check(b.family_id)
    ));
```

### 4.3 数据备份

#### 备份策略
```bash
# 每日全量备份
pg_dump -h localhost -U yuyingbao -d yuyingbao > backup_$(date +%Y%m%d).sql

# 每小时增量备份
pg_dump -h localhost -U yuyingbao -d yuyingbao --table=breast_feeding_records --table=bottle_feeding_records > incremental_$(date +%Y%m%d_%H).sql
```

## 5. 运维管理

### 5.1 监控指标

#### 数据库性能监控
```sql
-- 慢查询监控
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;

-- 连接数监控
SELECT count(*) as connections FROM pg_stat_activity;

-- 表大小监控
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 5.2 维护脚本

#### 定期清理脚本
```sql
-- 清理30天前的日志记录
DELETE FROM audit_logs WHERE created_at < CURRENT_DATE - INTERVAL '30 days';

-- 更新宝宝年龄缓存
UPDATE babies 
SET updated_at = CURRENT_TIMESTAMP
WHERE DATE_PART('day', CURRENT_DATE - birth_date) % 7 = 0;
```

## 6. 版本迁移

### 6.1 v0.5到v0.6迁移脚本

#### 新增表结构
```sql
-- 创建宝宝表
CREATE TABLE babies (
    id BIGSERIAL PRIMARY KEY,
    family_id BIGINT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    name VARCHAR(64) NOT NULL,
    gender VARCHAR(8) NOT NULL CHECK (gender IN ('MALE', 'FEMALE')),
    birth_date DATE NOT NULL,
    avatar TEXT,
    height DECIMAL(5,2),
    weight DECIMAL(5,2),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 创建提醒设置表
CREATE TABLE reminders (
    id BIGSERIAL PRIMARY KEY,
    baby_id BIGINT NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(32) NOT NULL CHECK (type IN ('FEEDING', 'CHECKUP', 'VACCINE', 'CUSTOM')),
    time TIME NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 创建导出记录表
CREATE TABLE export_records (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    baby_id BIGINT REFERENCES babies(id) ON DELETE SET NULL,
    format VARCHAR(16) NOT NULL CHECK (format IN ('PDF', 'EXCEL')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    file_path TEXT,
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- 添加索引
CREATE INDEX idx_babies_family_id ON babies(family_id);
CREATE INDEX idx_babies_birth_date ON babies(birth_date);
CREATE INDEX idx_reminders_baby_id ON reminders(baby_id);
CREATE INDEX idx_reminders_user_id ON reminders(user_id);
CREATE INDEX idx_reminders_time ON reminders(time);
CREATE INDEX idx_export_user_id ON export_records(user_id);
CREATE INDEX idx_export_status ON export_records(status);
```

#### 数据迁移
```sql
-- 为现有家庭创建默认宝宝（假设每个家庭只有一个宝宝）
INSERT INTO babies (family_id, name, gender, birth_date, created_at, updated_at)
SELECT 
    f.id,
    '宝宝',
    'MALE',
    CURRENT_DATE - INTERVAL '3 months',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM families f
WHERE NOT EXISTS (
    SELECT 1 FROM babies b WHERE b.family_id = f.id
);

-- 更新现有记录关联到宝宝
UPDATE breast_feeding_records SET baby_id = (
    SELECT b.id FROM babies b 
    WHERE b.family_id = (
        SELECT fm.family_id FROM family_members fm 
        WHERE fm.user_id = (
            SELECT id FROM users WHERE openid = 'default_user'
        )
    )
    LIMIT 1
) WHERE baby_id IS NULL;

-- 为其他记录表执行类似更新...
```

## 7. 最佳实践

### 7.1 命名规范

#### 表名规范
- 使用复数形式命名表（如：users, families）
- 使用下划线分隔单词（如：breast_feeding_records）
- 表名简洁明了，能准确表达含义

#### 字段名规范
- 使用下划线分隔单词（如：created_at, family_id）
- 主键统一使用id
- 外键使用关联表名+id的形式（如：user_id, family_id）
- 时间字段使用_timestamp后缀（如：created_at, updated_at）

### 7.2 约束规范

#### 数据完整性约束
```sql
-- 非空约束
ALTER TABLE users ALTER COLUMN openid SET NOT NULL;
ALTER TABLE users ALTER COLUMN nickname SET NOT NULL;

-- 唯一约束
ALTER TABLE users ADD CONSTRAINT uk_users_openid UNIQUE (openid);
ALTER TABLE families ADD CONSTRAINT uk_families_invite_code UNIQUE (invite_code);

-- 检查约束
ALTER TABLE users ADD CONSTRAINT ck_users_nickname_length CHECK (LENGTH(nickname) > 0);
ALTER TABLE babies ADD CONSTRAINT ck_babies_gender CHECK (gender IN ('MALE', 'FEMALE'));
```

### 7.3 性能优化建议

#### 查询优化
1. 避免SELECT *，只查询需要的字段
2. 合理使用索引，避免过多索引影响写入性能
3. 使用LIMIT限制结果集大小
4. 避免在WHERE子句中使用函数

#### 存储优化
1. 定期清理无用数据
2. 使用合适的数据类型
3. 对大字段考虑分离存储
4. 合理设置表空间

---

*文档版本: v0.6.0*  
*更新时间: 2024年9月27日*  
*文档维护: westxixia*