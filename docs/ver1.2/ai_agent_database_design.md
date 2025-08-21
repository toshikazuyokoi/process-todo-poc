# AIエージェント機能 - データベース設計書 v1.2

## 概要

本ドキュメントは、AIエージェント支援テンプレート作成機能で使用する新規テーブル設計を定義します。
既存のprocess-todoシステムとの整合性を保ちながら、AI機能に必要なデータ構造を追加します。

## 新規テーブル設計

### 1. ai_interview_sessions テーブル

AIエージェントとのインタビューセッション情報を管理

```sql
CREATE TABLE ai_interview_sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(36) UNIQUE NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  context JSONB,
  conversation JSONB DEFAULT '[]',
  extracted_requirements JSONB DEFAULT '[]',
  generated_template JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  CONSTRAINT chk_session_status CHECK (status IN ('active', 'completed', 'paused', 'expired', 'cancelled')),
  CONSTRAINT chk_expires_at CHECK (expires_at > created_at)
);

-- インデックス
CREATE INDEX idx_ai_interview_sessions_session_id ON ai_interview_sessions(session_id);
CREATE INDEX idx_ai_interview_sessions_user_id ON ai_interview_sessions(user_id);
CREATE INDEX idx_ai_interview_sessions_status ON ai_interview_sessions(status);
CREATE INDEX idx_ai_interview_sessions_expires_at ON ai_interview_sessions(expires_at);
CREATE INDEX idx_ai_interview_sessions_created_at ON ai_interview_sessions(created_at);

-- 部分インデックス（アクティブセッション用）
CREATE INDEX idx_ai_interview_sessions_active ON ai_interview_sessions(user_id, created_at) 
WHERE status = 'active';
```

### 2. ai_background_jobs テーブル

バックグラウンドジョブの管理

```sql
CREATE TABLE ai_background_jobs (
  id SERIAL PRIMARY KEY,
  job_id VARCHAR(36) UNIQUE NOT NULL,
  job_type VARCHAR(50) NOT NULL,
  job_data JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  session_id VARCHAR(36) REFERENCES ai_interview_sessions(session_id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  result JSONB,
  
  CONSTRAINT chk_job_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'retrying')),
  CONSTRAINT chk_job_type CHECK (job_type IN ('web_research', 'template_generation', 'requirement_analysis', 'knowledge_base_update')),
  CONSTRAINT chk_retry_count CHECK (retry_count >= 0 AND retry_count <= max_retries)
);

-- インデックス
CREATE INDEX idx_ai_background_jobs_job_id ON ai_background_jobs(job_id);
CREATE INDEX idx_ai_background_jobs_status ON ai_background_jobs(status);
CREATE INDEX idx_ai_background_jobs_session_id ON ai_background_jobs(session_id);
CREATE INDEX idx_ai_background_jobs_user_id ON ai_background_jobs(user_id);
CREATE INDEX idx_ai_background_jobs_job_type ON ai_background_jobs(job_type);
CREATE INDEX idx_ai_background_jobs_created_at ON ai_background_jobs(created_at);

-- 部分インデックス（処理待ちジョブ用）
CREATE INDEX idx_ai_background_jobs_pending ON ai_background_jobs(created_at) 
WHERE status IN ('pending', 'retrying');
```

### 3. ai_process_knowledge テーブル

プロセス知識ベースの管理

```sql
CREATE TABLE ai_process_knowledge (
  id SERIAL PRIMARY KEY,
  category VARCHAR(50) NOT NULL,
  industry VARCHAR(100),
  process_type VARCHAR(100),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  content JSONB NOT NULL,
  best_practices JSONB DEFAULT '[]',
  compliance_requirements JSONB DEFAULT '[]',
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  confidence_score DECIMAL(3,2) DEFAULT 0.5,
  source VARCHAR(255),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT chk_confidence_score CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
  CONSTRAINT chk_version CHECK (version > 0)
);

-- インデックス
CREATE INDEX idx_ai_process_knowledge_category ON ai_process_knowledge(category);
CREATE INDEX idx_ai_process_knowledge_industry ON ai_process_knowledge(industry);
CREATE INDEX idx_ai_process_knowledge_process_type ON ai_process_knowledge(process_type);
CREATE INDEX idx_ai_process_knowledge_active ON ai_process_knowledge(is_active);
CREATE INDEX idx_ai_process_knowledge_confidence ON ai_process_knowledge(confidence_score);

-- 複合インデックス
CREATE INDEX idx_ai_process_knowledge_lookup ON ai_process_knowledge(industry, process_type, is_active);

-- 全文検索インデックス
CREATE INDEX idx_ai_process_knowledge_search ON ai_process_knowledge 
USING gin(to_tsvector('english', title || ' ' || description));
```

### 4. ai_web_research_cache テーブル

Web検索結果のキャッシュ

```sql
CREATE TABLE ai_web_research_cache (
  id SERIAL PRIMARY KEY,
  query_hash VARCHAR(64) UNIQUE NOT NULL,
  query_text TEXT NOT NULL,
  search_parameters JSONB,
  results JSONB NOT NULL,
  source_reliability JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  hit_count INTEGER DEFAULT 1,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT chk_expires_at CHECK (expires_at > created_at),
  CONSTRAINT chk_hit_count CHECK (hit_count > 0)
);

-- インデックス
CREATE INDEX idx_ai_web_research_cache_query_hash ON ai_web_research_cache(query_hash);
CREATE INDEX idx_ai_web_research_cache_expires_at ON ai_web_research_cache(expires_at);
CREATE INDEX idx_ai_web_research_cache_created_at ON ai_web_research_cache(created_at);

-- 部分インデックス（有効なキャッシュ用）
CREATE INDEX idx_ai_web_research_cache_valid ON ai_web_research_cache(last_accessed_at) 
WHERE expires_at > CURRENT_TIMESTAMP;
```

### 5. ai_template_generation_history テーブル

テンプレート生成履歴とフィードバック

```sql
CREATE TABLE ai_template_generation_history (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL REFERENCES ai_interview_sessions(session_id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  process_template_id INTEGER REFERENCES process_templates(id) ON DELETE SET NULL,
  generated_template JSONB NOT NULL,
  requirements_used JSONB NOT NULL,
  knowledge_sources JSONB DEFAULT '[]',
  research_sources JSONB DEFAULT '[]',
  confidence_score DECIMAL(3,2),
  user_feedback JSONB,
  feedback_rating INTEGER,
  was_used BOOLEAN DEFAULT false,
  modifications JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  finalized_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT chk_confidence_score CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
  CONSTRAINT chk_feedback_rating CHECK (feedback_rating >= 1 AND feedback_rating <= 5)
);

-- インデックス
CREATE INDEX idx_ai_template_generation_history_session_id ON ai_template_generation_history(session_id);
CREATE INDEX idx_ai_template_generation_history_user_id ON ai_template_generation_history(user_id);
CREATE INDEX idx_ai_template_generation_history_template_id ON ai_template_generation_history(process_template_id);
CREATE INDEX idx_ai_template_generation_history_created_at ON ai_template_generation_history(created_at);
CREATE INDEX idx_ai_template_generation_history_was_used ON ai_template_generation_history(was_used);
CREATE INDEX idx_ai_template_generation_history_rating ON ai_template_generation_history(feedback_rating);
```

### 6. ai_usage_statistics テーブル

AI機能の利用統計

```sql
CREATE TABLE ai_usage_statistics (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  session_id VARCHAR(36) REFERENCES ai_interview_sessions(session_id) ON DELETE SET NULL,
  tokens_used INTEGER DEFAULT 0,
  cost_usd DECIMAL(10,4) DEFAULT 0.0000,
  processing_time_ms INTEGER,
  model_used VARCHAR(50),
  success BOOLEAN DEFAULT true,
  error_code VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT chk_tokens_used CHECK (tokens_used >= 0),
  CONSTRAINT chk_cost_usd CHECK (cost_usd >= 0),
  CONSTRAINT chk_processing_time CHECK (processing_time_ms >= 0)
);

-- インデックス
CREATE INDEX idx_ai_usage_statistics_user_id ON ai_usage_statistics(user_id);
CREATE INDEX idx_ai_usage_statistics_action_type ON ai_usage_statistics(action_type);
CREATE INDEX idx_ai_usage_statistics_created_at ON ai_usage_statistics(created_at);
CREATE INDEX idx_ai_usage_statistics_success ON ai_usage_statistics(success);

-- 複合インデックス（統計レポート用）
CREATE INDEX idx_ai_usage_statistics_report ON ai_usage_statistics(user_id, action_type, created_at);
```

## JSONBスキーマ定義

### ai_interview_sessions.context
```json
{
  "type": "object",
  "properties": {
    "industry": {"type": "string"},
    "processType": {"type": "string"},
    "complexity": {"type": "string", "enum": ["simple", "medium", "complex", "very_complex"]},
    "teamSize": {"type": "integer", "minimum": 1},
    "duration": {"type": "string"},
    "compliance": {"type": "array", "items": {"type": "string"}},
    "region": {"type": "string"},
    "budget": {"type": "number", "minimum": 0},
    "timeline": {"type": "string"}
  }
}
```

### ai_interview_sessions.conversation
```json
{
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "id": {"type": "string"},
      "role": {"type": "string", "enum": ["user", "assistant", "system"]},
      "content": {"type": "string"},
      "timestamp": {"type": "string", "format": "date-time"},
      "metadata": {
        "type": "object",
        "properties": {
          "intent": {"type": "string"},
          "entities": {"type": "object"},
          "confidence": {"type": "number", "minimum": 0, "maximum": 1},
          "tokenCount": {"type": "integer", "minimum": 0}
        }
      }
    },
    "required": ["id", "role", "content", "timestamp"]
  }
}
```

### ai_interview_sessions.extracted_requirements
```json
{
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "id": {"type": "string"},
      "category": {"type": "string", "enum": ["goal", "constraint", "stakeholder", "deliverable", "timeline", "quality", "compliance", "risk"]},
      "description": {"type": "string"},
      "priority": {"type": "string", "enum": ["high", "medium", "low", "critical"]},
      "confidence": {"type": "number", "minimum": 0, "maximum": 1},
      "extractedFrom": {"type": "string"},
      "entities": {"type": "array", "items": {"type": "object"}}
    },
    "required": ["id", "category", "description", "priority", "confidence"]
  }
}
```

## データ保持ポリシー

### セッションデータ
- **アクティブセッション**: 60分で自動期限切れ
- **完了セッション**: 30日間保持後、アーカイブ
- **期限切れセッション**: 7日間保持後、削除

### キャッシュデータ
- **Web検索キャッシュ**: 24時間で期限切れ
- **未使用キャッシュ**: 7日間アクセスなしで削除

### 統計データ
- **利用統計**: 2年間保持
- **エラーログ**: 90日間保持

### バックグラウンドジョブ
- **完了ジョブ**: 30日間保持後、削除
- **失敗ジョブ**: 7日間保持後、削除

## パフォーマンス最適化

### パーティショニング
```sql
-- ai_usage_statistics テーブルの月次パーティショニング
CREATE TABLE ai_usage_statistics_y2024m01 PARTITION OF ai_usage_statistics
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE ai_usage_statistics_y2024m02 PARTITION OF ai_usage_statistics
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
```

### 自動クリーンアップ
```sql
-- 期限切れセッションの自動削除
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM ai_interview_sessions 
  WHERE status = 'expired' AND updated_at < CURRENT_TIMESTAMP - INTERVAL '7 days';
  
  DELETE FROM ai_web_research_cache 
  WHERE expires_at < CURRENT_TIMESTAMP;
  
  DELETE FROM ai_background_jobs 
  WHERE status IN ('completed', 'failed') AND created_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- 日次実行のcronジョブ設定
SELECT cron.schedule('cleanup-ai-data', '0 2 * * *', 'SELECT cleanup_expired_sessions();');
```

## セキュリティ考慮事項

### データ暗号化
- **機密データ**: conversation、extracted_requirements、generated_templateは暗号化
- **PII**: ユーザー固有情報は仮名化

### アクセス制御
- **行レベルセキュリティ**: ユーザーは自分のデータのみアクセス可能
- **監査ログ**: 全てのデータアクセスを記録

### データマスキング
```sql
-- 開発環境用のデータマスキング
CREATE OR REPLACE FUNCTION mask_sensitive_data()
RETURNS void AS $$
BEGIN
  UPDATE ai_interview_sessions 
  SET conversation = '[]'::jsonb,
      extracted_requirements = '[]'::jsonb
  WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;
```

---

**本データベース設計書は実装チームが参照する詳細仕様書です。データ整合性、パフォーマンス、セキュリティを考慮した設計となっています。**
