-- 添加测试用例新字段的SQL迁移脚本

-- 添加 created_by 字段
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);

-- 添加 owner_id 字段
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES users(id);

-- 添加 status 字段
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- 添加 module 字段
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS module VARCHAR(100);

-- 添加 is_favorite 字段
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS is_favorite JSON;

