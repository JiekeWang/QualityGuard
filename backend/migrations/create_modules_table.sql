-- 创建模块表的SQL迁移脚本

CREATE TABLE IF NOT EXISTS modules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_id INTEGER REFERENCES modules(id) ON DELETE SET NULL,
    "order" INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_modules_project_id ON modules(project_id);
CREATE INDEX IF NOT EXISTS idx_modules_parent_id ON modules(parent_id);
CREATE INDEX IF NOT EXISTS idx_modules_name ON modules(name);

