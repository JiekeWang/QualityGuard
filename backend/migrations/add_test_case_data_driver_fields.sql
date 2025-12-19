-- 添加测试用例数据驱动相关字段的SQL迁移脚本

-- 添加 data_driver 字段
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS data_driver JSON;

-- 添加 is_data_driven 字段
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS is_data_driven BOOLEAN DEFAULT FALSE;

