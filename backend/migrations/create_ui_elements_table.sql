-- 创建UI元素表
CREATE TABLE IF NOT EXISTS ui_elements (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    page_object_id INTEGER NOT NULL,
    locator_type VARCHAR(50) NOT NULL,
    locator_value VARCHAR(500) NOT NULL,
    locator_alternative JSONB DEFAULT '[]',
    element_type VARCHAR(50),
    is_required BOOLEAN DEFAULT FALSE,
    default_value VARCHAR(500),
    wait_strategy JSONB DEFAULT '{}',
    operations JSONB DEFAULT '{}',
    tags JSONB DEFAULT '[]',
    created_by INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_ui_elements_page_object FOREIGN KEY (page_object_id) REFERENCES page_objects(id) ON DELETE CASCADE,
    CONSTRAINT fk_ui_elements_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_ui_elements_name ON ui_elements(name);
CREATE INDEX IF NOT EXISTS idx_ui_elements_page_object_id ON ui_elements(page_object_id);
CREATE INDEX IF NOT EXISTS idx_ui_elements_locator_type ON ui_elements(locator_type);
CREATE INDEX IF NOT EXISTS idx_ui_elements_element_type ON ui_elements(element_type);
CREATE INDEX IF NOT EXISTS idx_ui_elements_created_at ON ui_elements(created_at DESC);

-- 添加注释
COMMENT ON TABLE ui_elements IS 'UI元素表';
COMMENT ON COLUMN ui_elements.name IS '元素名称';
COMMENT ON COLUMN ui_elements.description IS '元素描述';
COMMENT ON COLUMN ui_elements.page_object_id IS '所属页面对象ID';
COMMENT ON COLUMN ui_elements.locator_type IS '定位策略：id/css/xpath/text/link_text/partial_link_text/tag_name/name/class_name/combined';
COMMENT ON COLUMN ui_elements.locator_value IS '定位值';
COMMENT ON COLUMN ui_elements.locator_alternative IS '备用定位策略列表JSON';
COMMENT ON COLUMN ui_elements.element_type IS '元素类型：button/input/select/checkbox/radio/link/image/text/div/span/other';
COMMENT ON COLUMN ui_elements.is_required IS '是否必填';
COMMENT ON COLUMN ui_elements.default_value IS '默认值';
COMMENT ON COLUMN ui_elements.wait_strategy IS '等待策略配置JSON';
COMMENT ON COLUMN ui_elements.operations IS '操作封装配置JSON';
COMMENT ON COLUMN ui_elements.tags IS '标签列表JSON';

