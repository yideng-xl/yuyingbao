-- 添加营养素记录字段
ALTER TABLE app.records 
ADD COLUMN nutrition_types TEXT;

-- 添加字段注释
COMMENT ON COLUMN app.records.nutrition_types IS '营养素类型，用逗号分隔，如：AD,D3,CALCIUM,DHA';


