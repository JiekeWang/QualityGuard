-- 创建数据驱动配置相关表的SQL迁移脚本

-- 数据源表
CREATE TABLE IF NOT EXISTS data_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    config JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_data_sources_name ON data_sources(name);
CREATE INDEX IF NOT EXISTS idx_data_sources_project_id ON data_sources(project_id);
CREATE INDEX IF NOT EXISTS idx_data_sources_type ON data_sources(type);

-- 数据模板表
CREATE TABLE IF NOT EXISTS data_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    data_source_id INTEGER NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    mapping JSONB,
    filters JSONB,
    loop_strategy VARCHAR(50) DEFAULT 'all',
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_data_templates_name ON data_templates(name);
CREATE INDEX IF NOT EXISTS idx_data_templates_data_source_id ON data_templates(data_source_id);
CREATE INDEX IF NOT EXISTS idx_data_templates_project_id ON data_templates(project_id);

-- 数据生成器表
CREATE TABLE IF NOT EXISTS data_generators (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    config JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_data_generators_name ON data_generators(name);
CREATE INDEX IF NOT EXISTS idx_data_generators_project_id ON data_generators(project_id);
CREATE INDEX IF NOT EXISTS idx_data_generators_type ON data_generators(type);

