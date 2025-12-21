-- 添加directory_id字段到test_cases表
ALTER TABLE test_cases 
ADD COLUMN directory_id INTEGER REFERENCES directories(id) ON DELETE SET NULL;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_test_cases_directory_id ON test_cases(directory_id);

