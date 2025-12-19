-- 添加测试用例流程编排相关字段的SQL迁移脚本

-- 添加 workflow 字段
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS workflow JSON;

-- 添加 is_multi_interface 字段
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS is_multi_interface BOOLEAN DEFAULT FALSE;

