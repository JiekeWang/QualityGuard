-- 创建目录表的SQL迁移脚本

CREATE TABLE IF NOT EXISTS directories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_id INTEGER REFERENCES directories(id) ON DELETE SET NULL,
    "order" INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_directories_project_id ON directories(project_id);
CREATE INDEX IF NOT EXISTS idx_directories_parent_id ON directories(parent_id);
CREATE INDEX IF NOT EXISTS idx_directories_name ON directories(name);

