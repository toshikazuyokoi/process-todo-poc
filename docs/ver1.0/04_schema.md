# 04 DBスキーマ（DDLドラフト v4）

```sql
-- Process templates
CREATE TABLE process_templates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE step_templates (
  id SERIAL PRIMARY KEY,
  process_id INT NOT NULL REFERENCES process_templates(id),
  seq INT NOT NULL,
  name TEXT NOT NULL,
  basis TEXT NOT NULL CHECK (basis IN ('goal','prev')),
  offset_days INT NOT NULL DEFAULT 0,
  required_artifacts_json JSONB NOT NULL DEFAULT '[]',
  depends_on_json JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Cases and steps
CREATE TABLE cases (
  id SERIAL PRIMARY KEY,
  process_id INT NOT NULL REFERENCES process_templates(id),
  title TEXT NOT NULL,
  goal_date_utc TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_by INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE step_instances (
  id SERIAL PRIMARY KEY,
  case_id INT NOT NULL REFERENCES cases(id),
  template_id INT REFERENCES step_templates(id),
  name TEXT NOT NULL,
  due_date_utc TIMESTAMPTZ,
  assignee_id INT,
  status TEXT NOT NULL DEFAULT 'todo',
  locked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE artifacts (
  id SERIAL PRIMARY KEY,
  step_id INT NOT NULL REFERENCES step_instances(id),
  kind TEXT NOT NULL,
  s3_key TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'member',
  timezone TEXT NOT NULL DEFAULT 'Asia/Tokyo'
);

CREATE TABLE holidays (
  country_code TEXT NOT NULL,
  date DATE NOT NULL,
  name TEXT,
  PRIMARY KEY (country_code, date)
);

CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  actor_id INT REFERENCES users(id),
  resource_type TEXT NOT NULL,
  resource_id INT NOT NULL,
  action TEXT NOT NULL,
  diff_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_step_instances_case_due ON step_instances(case_id, due_date_utc);
CREATE INDEX idx_step_templates_process_seq ON step_templates(process_id, seq);
CREATE INDEX idx_cases_process_status ON cases(process_id, status);
```
**備考**：将来のULID/BIGINT移行、JSONB正規化、アーカイブ方針は19章参照。