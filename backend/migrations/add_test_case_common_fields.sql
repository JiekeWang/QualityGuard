-- 添加测试用例公共用例相关字段的SQL迁移脚本

-- 添加 is_template 字段
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE;

-- 添加 is_shared 字段
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT FALSE;

-- 添加 is_common 字段
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS is_common BOOLEAN DEFAULT FALSE;

-- 添加 usage_count 字段
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;

