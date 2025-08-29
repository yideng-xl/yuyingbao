-- Initial schema for Yuyingbao (PostgreSQL 17)
CREATE SCHEMA IF NOT EXISTS app;
CREATE TABLE IF NOT EXISTS app.users (
  id BIGSERIAL PRIMARY KEY,
  open_id VARCHAR(64) NOT NULL UNIQUE,
  nickname VARCHAR(64) NOT NULL,
  avatar_url VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app.families (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  invite_code VARCHAR(12) NOT NULL,
  creator_user_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app.family_members (
  id BIGSERIAL PRIMARY KEY,
  family_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  role VARCHAR(16) NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uk_family_user UNIQUE (family_id, user_id)
);

CREATE TABLE IF NOT EXISTS app.babies (
  id BIGSERIAL PRIMARY KEY,
  family_id BIGINT NOT NULL,
  name VARCHAR(100) NOT NULL,
  gender VARCHAR(16) NOT NULL,
  birth_date DATE NOT NULL,
  avatar_url VARCHAR(255),
  birth_height_cm DOUBLE PRECISION,
  birth_weight_kg DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app.records (
  id BIGSERIAL PRIMARY KEY,
  family_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  baby_id BIGINT NOT NULL,
  type VARCHAR(32) NOT NULL,
  happened_at TIMESTAMPTZ NOT NULL,
  note VARCHAR(255),
  amount_ml DOUBLE PRECISION,
  duration_min INT,
  breastfeeding_side VARCHAR(16),
  solid_type VARCHAR(32),
  diaper_texture VARCHAR(16),
  diaper_color VARCHAR(16),
  has_urine BOOLEAN,
  height_cm DOUBLE PRECISION,
  weight_kg DOUBLE PRECISION
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_records_family_time ON app.records(family_id, happened_at);
CREATE INDEX IF NOT EXISTS idx_records_family_type_time ON app.records(family_id, type, happened_at);
