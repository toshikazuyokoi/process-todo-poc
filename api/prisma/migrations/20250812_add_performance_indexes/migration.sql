-- Phase 1.3: Performance Optimization Indexes

-- 1. Cases table: Frequent queries by status
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);

-- 2. Cases table: Queries by created_by
CREATE INDEX IF NOT EXISTS idx_cases_created_by ON cases(created_by);

-- 3. Cases table: Date range queries
CREATE INDEX IF NOT EXISTS idx_cases_goal_date ON cases(goal_date_utc);

-- 4. StepInstance table: Queries by status
CREATE INDEX IF NOT EXISTS idx_step_instances_status ON step_instances(status);

-- 5. StepInstance table: Queries by assignee
CREATE INDEX IF NOT EXISTS idx_step_instances_assignee ON step_instances(assignee_id);

-- 6. StepInstance table: Due date queries (single column for better selectivity)
CREATE INDEX IF NOT EXISTS idx_step_instances_due_date ON step_instances(due_date_utc);

-- 7. ProcessTemplate table: Active templates query
CREATE INDEX IF NOT EXISTS idx_process_templates_active ON process_templates(is_active);

-- 8. Artifacts table: Queries by step
CREATE INDEX IF NOT EXISTS idx_artifacts_step ON artifacts(step_id);

-- 9. AuditLog table: Queries by resource
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- 10. AuditLog table: Queries by actor and date
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_date ON audit_logs(actor_id, created_at DESC);

-- 11. Holiday table: Date range queries
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);

-- 12. Notification table: Unread notifications query (already exists but let's ensure)
-- Already covered by composite index on (userId, isRead, createdAt)

-- 13. Comment table: Thread queries
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id) WHERE parent_id IS NOT NULL;

-- Analyze tables to update statistics
ANALYZE cases;
ANALYZE step_instances;
ANALYZE process_templates;
ANALYZE step_templates;
ANALYZE artifacts;
ANALYZE audit_logs;
ANALYZE holidays;
ANALYZE notifications;
ANALYZE comments;