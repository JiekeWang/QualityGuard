-- 创建测试用例版本表的SQL迁移脚本

CREATE TABLE IF NOT EXISTS test_case_versions (
    id SERIAL PRIMARY KEY,
    test_case_id INTEGER NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    name VARCHAR(200),
    description TEXT,
    content JSONB,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_test_case_versions_test_case_id ON test_case_versions(test_case_id);
CREATE INDEX IF NOT EXISTS idx_test_case_versions_version ON test_case_versions(version);

