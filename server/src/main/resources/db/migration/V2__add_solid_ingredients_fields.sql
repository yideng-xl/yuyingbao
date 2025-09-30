-- 添加辅食记录增强字段
ALTER TABLE app.records 
ADD COLUMN solid_ingredients TEXT,
ADD COLUMN solid_brand VARCHAR(100),
ADD COLUMN solid_origin VARCHAR(100);

-- 添加字段注释
COMMENT ON COLUMN app.records.solid_ingredients IS '辅食多种食材信息';
COMMENT ON COLUMN app.records.solid_brand IS '辅食品牌';
COMMENT ON COLUMN app.records.solid_origin IS '辅食产地';