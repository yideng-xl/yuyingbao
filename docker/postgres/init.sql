-- PostgreSQL 初始化脚本
-- 为育婴宝项目创建数据库和schema

-- 创建app schema（如果不存在）
CREATE SCHEMA IF NOT EXISTS app;

-- 设置默认schema
ALTER DATABASE yuyingbao SET search_path TO app,public;

-- 创建扩展（如果需要）
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 设置时区
SET timezone = 'Asia/Shanghai';

-- 优化配置
-- 这些设置将在数据库层面生效
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET log_statement = 'none';
ALTER SYSTEM SET log_min_duration_statement = 1000;