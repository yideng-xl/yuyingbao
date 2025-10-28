-- 为用户表添加设备相关字段
ALTER TABLE app.users
ADD COLUMN device_id VARCHAR(128),
ADD COLUMN device_brand VARCHAR(64),
ADD COLUMN device_model VARCHAR(64),
ADD COLUMN system_version VARCHAR(64),
ADD COLUMN wechat_version VARCHAR(64),
ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN app.users.device_id IS '设备ID，用于追踪用户设备';
COMMENT ON COLUMN app.users.device_brand IS '设备品牌';
COMMENT ON COLUMN app.users.device_model IS '设备型号';
COMMENT ON COLUMN app.users.system_version IS '系统版本';
COMMENT ON COLUMN app.users.wechat_version IS '微信版本';
COMMENT ON COLUMN app.users.last_login_at IS '最后登录时间';
