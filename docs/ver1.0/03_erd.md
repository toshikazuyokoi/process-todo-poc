# 03 ERD（論理設計 v4）

```
ProcessTemplate (id, name, version, is_active, created_at, updated_at)
  1 - n StepTemplate (id, process_id, seq, name, basis, offset_days, required_artifacts_json, depends_on_json, created_at, updated_at)

Case (id, process_id, title, goal_date_utc, status, created_by, created_at, updated_at)
  1 - n StepInstance (id, case_id, template_id, name, due_date_utc, assignee_id, status, locked, created_at, updated_at)
  1 - n Artifact (id, step_id, kind, s3_key, required, created_at, updated_at)

User (id, name, email, role, timezone)
Holiday (country_code, date, name)

AuditLog (id, actor_id, resource_type, resource_id, action, diff_json, created_at)
```
**方針**：UTC列は `*_utc`、テンプレ依存は将来中間テーブル化可能（現状はJSONB）。