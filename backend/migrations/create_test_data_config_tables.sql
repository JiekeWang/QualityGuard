-- 创建测试数据配置相关表
-- 创建时间: 2024-12-20

-- 1. 创建测试数据配置表
CREATE TABLE IF NOT EXISTS test_data_configs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    data JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_test_data_configs_name ON test_data_configs(name);
CREATE INDEX IF NOT EXISTS idx_test_data_configs_project_id ON test_data_configs(project_id);
CREATE INDEX IF NOT EXISTS idx_test_data_configs_created_by ON test_data_configs(created_by);
CREATE INDEX IF NOT EXISTS idx_test_data_configs_is_active ON test_data_configs(is_active);

-- 2. 创建测试用例与测试数据配置关联表
CREATE TABLE IF NOT EXISTS test_case_test_data_configs (
    id SERIAL PRIMARY KEY,
    test_case_id INTEGER NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
    test_data_config_id INTEGER NOT NULL REFERENCES test_data_configs(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(test_case_id, test_data_config_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_test_case_test_data_configs_test_case_id ON test_case_test_data_configs(test_case_id);
CREATE INDEX IF NOT EXISTS idx_test_case_test_data_configs_config_id ON test_case_test_data_configs(test_data_config_id);

-- 添加注释
COMMENT ON TABLE test_data_configs IS '测试数据配置表，存储测试数据列表（每行包含request和assertions）';
COMMENT ON TABLE test_case_test_data_configs IS '测试用例与测试数据配置关联表（多对多关系）';
COMMENT ON COLUMN test_data_configs.data IS '测试数据数组，格式: [{"request": {...}, "assertions": [...]}, ...]';
COMMENT ON COLUMN test_data_configs.project_id IS '项目ID，null表示全局配置';

