-- 创建测试用例评审相关表的SQL迁移脚本

-- 测试用例评审表
CREATE TABLE IF NOT EXISTS test_case_reviews (
    id SERIAL PRIMARY KEY,
    test_case_id INTEGER NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    reviewer_ids JSONB DEFAULT '[]'::jsonb,
    created_by INTEGER NOT NULL REFERENCES users(id),
    reviewed_by INTEGER REFERENCES users(id),
    review_comments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE,
    reviewed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_test_case_reviews_test_case_id ON test_case_reviews(test_case_id);
CREATE INDEX IF NOT EXISTS idx_test_case_reviews_project_id ON test_case_reviews(project_id);
CREATE INDEX IF NOT EXISTS idx_test_case_reviews_status ON test_case_reviews(status);
CREATE INDEX IF NOT EXISTS idx_test_case_reviews_created_by ON test_case_reviews(created_by);

-- 评审意见表
CREATE TABLE IF NOT EXISTS review_comments (
    id SERIAL PRIMARY KEY,
    review_id INTEGER NOT NULL REFERENCES test_case_reviews(id) ON DELETE CASCADE,
    commenter_id INTEGER NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'comment',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_review_comments_review_id ON review_comments(review_id);
CREATE INDEX IF NOT EXISTS idx_review_comments_commenter_id ON review_comments(commenter_id);

