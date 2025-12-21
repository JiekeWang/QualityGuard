-- 创建Token配置表
CREATE TABLE IF NOT EXISTS token_configs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    project_id INTEGER,
    config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT fk_token_configs_project FOREIGN KEY (project_id) 
        REFERENCES projects(id) ON DELETE SET NULL,
    CONSTRAINT fk_token_configs_creator FOREIGN KEY (created_by) 
        REFERENCES users(id) ON DELETE SET NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_token_configs_name ON token_configs(name);
CREATE INDEX IF NOT EXISTS idx_token_configs_project_id ON token_configs(project_id);
CREATE INDEX IF NOT EXISTS idx_token_configs_is_active ON token_configs(is_active);
CREATE INDEX IF NOT EXISTS idx_token_configs_created_at ON token_configs(created_at DESC);

-- 添加注释
COMMENT ON TABLE token_configs IS 'Token配置表';
COMMENT ON COLUMN token_configs.name IS 'Token配置名称';
COMMENT ON COLUMN token_configs.description IS '描述';
COMMENT ON COLUMN token_configs.project_id IS '所属项目ID，NULL表示全局配置';
COMMENT ON COLUMN token_configs.config IS 'Token配置内容（JSON格式），包含url、method、headers、body、params、extractors、retry_status_codes等';
COMMENT ON COLUMN token_configs.is_active IS '是否启用';
COMMENT ON COLUMN token_configs.created_by IS '创建人ID';
COMMENT ON COLUMN token_configs.created_at IS '创建时间';
COMMENT ON COLUMN token_configs.updated_at IS '更新时间';

