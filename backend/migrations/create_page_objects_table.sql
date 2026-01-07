-- 创建页面对象表
CREATE TABLE IF NOT EXISTS page_objects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    url VARCHAR(500),
    description TEXT,
    project_id INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    page_config JSONB DEFAULT '{}',
    tags JSONB DEFAULT '[]',
    module VARCHAR(100),
    created_by INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_page_objects_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_page_objects_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_page_objects_name ON page_objects(name);
CREATE INDEX IF NOT EXISTS idx_page_objects_project_id ON page_objects(project_id);
CREATE INDEX IF NOT EXISTS idx_page_objects_status ON page_objects(status);
CREATE INDEX IF NOT EXISTS idx_page_objects_created_at ON page_objects(created_at DESC);

-- 添加注释
COMMENT ON TABLE page_objects IS '页面对象表';
COMMENT ON COLUMN page_objects.name IS '页面对象名称';
COMMENT ON COLUMN page_objects.url IS '页面URL或路径';
COMMENT ON COLUMN page_objects.description IS '页面描述';
COMMENT ON COLUMN page_objects.project_id IS '所属项目ID';
COMMENT ON COLUMN page_objects.status IS '状态：active/inactive/deprecated';
COMMENT ON COLUMN page_objects.page_config IS '页面配置JSON';
COMMENT ON COLUMN page_objects.tags IS '标签列表JSON';
COMMENT ON COLUMN page_objects.module IS '模块名称';

