# 04 DBスキーマ（DDL v1.1 - 実装反映版）

## 概要
本ドキュメントは、プロセス指向ToDoアプリケーションの実装されたデータベーススキーマを反映したものです。
v1.0から大幅に拡張され、認証・認可システム、組織・チーム管理、通知システムなどが追加されています。

## 基本テーブル（プロセス管理）

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
  created_by INT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE step_instances (
  id SERIAL PRIMARY KEY,
  case_id INT NOT NULL REFERENCES cases(id),
  template_id INT REFERENCES step_templates(id),
  name TEXT NOT NULL,
  start_date_utc TIMESTAMPTZ,
  due_date_utc TIMESTAMPTZ,
  assignee_id INT REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'todo',
  locked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE artifacts (
  id SERIAL PRIMARY KEY,
  step_id INT NOT NULL REFERENCES step_instances(id),
  kind TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INT NOT NULL,
  mime_type TEXT NOT NULL,
  s3_key TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_by INT REFERENCES users(id),
  uploaded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## ユーザー管理・認証テーブル

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  timezone TEXT NOT NULL DEFAULT 'Asia/Tokyo',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  email_verified_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  failed_login_attempts INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ
);
```

## RBAC（Role-Based Access Control）テーブル

```sql
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  UNIQUE(resource, action)
);

CREATE TABLE role_permissions (
  role_id INT NOT NULL REFERENCES roles(id),
  permission_id INT NOT NULL REFERENCES permissions(id),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  role_id INT NOT NULL REFERENCES roles(id),
  team_id INT REFERENCES teams(id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  granted_by INT REFERENCES users(id),
  UNIQUE(user_id, role_id, team_id)
);
```

## 組織・チーム管理テーブル

```sql
CREATE TABLE organizations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  organization_id INT NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE team_members (
  user_id INT NOT NULL REFERENCES users(id),
  team_id INT NOT NULL REFERENCES teams(id),
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, team_id)
);
```

## 機能拡張テーブル

```sql
CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  step_id INT NOT NULL REFERENCES step_instances(id),
  parent_id INT REFERENCES comments(id),
  user_id INT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
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
```

## インデックス

```sql
-- 基本テーブルのインデックス
CREATE INDEX idx_step_instances_case_due ON step_instances(case_id, due_date_utc);
CREATE INDEX idx_step_templates_process_seq ON step_templates(process_id, seq);
CREATE INDEX idx_cases_process_status ON cases(process_id, status);

-- ユーザー・認証関連のインデックス
CREATE INDEX idx_users_email_active ON users(email, is_active);
CREATE INDEX idx_refresh_tokens_token_expires ON refresh_tokens(token, expires_at);

-- 通知・コメント関連のインデックス
CREATE INDEX idx_notifications_user_read_created ON notifications(user_id, is_read, created_at);
CREATE INDEX idx_comments_step_created ON comments(step_id, created_at);
```

## 変更履歴

### v1.1での主要な変更点

1. **認証・セキュリティ機能の追加**
   - `refresh_tokens`: JWTリフレッシュトークン管理
   - `users`テーブルの拡張（パスワード、アカウントロック、メール認証）

2. **RBAC システムの追加**
   - `roles`, `permissions`, `role_permissions`, `user_roles`テーブル

3. **組織・チーム管理機能の追加**
   - `organizations`, `teams`, `team_members`テーブル

4. **機能拡張**
   - `comments`: ステップへのコメント機能
   - `notifications`: 通知システム
   - `artifacts`テーブルの拡張（ファイル詳細情報）
   - `step_instances`テーブルの拡張（開始日追加）

5. **外部キー制約の強化**
   - 参照整合性の向上

**備考**：将来のULID/BIGINT移行、JSONB正規化、アーカイブ方針は19章参照。
