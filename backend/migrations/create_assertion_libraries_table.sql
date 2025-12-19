-- 创建预设断言库表的SQL迁移脚本

CREATE TABLE IF NOT EXISTS assertion_libraries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    config JSONB,
    example TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    usage_count INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_assertion_libraries_name ON assertion_libraries(name);
CREATE INDEX IF NOT EXISTS idx_assertion_libraries_project_id ON assertion_libraries(project_id);
CREATE INDEX IF NOT EXISTS idx_assertion_libraries_type ON assertion_libraries(type);
CREATE INDEX IF NOT EXISTS idx_assertion_libraries_is_public ON assertion_libraries(is_public);

