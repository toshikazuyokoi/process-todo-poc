# 30 運用・保守ガイド（v1.1）

## 概要
本ドキュメントは、プロセス指向ToDoアプリケーションの運用・保守に関するガイドラインを提供します。
ログ出力仕様、エラー監視・対応手順、パフォーマンス監視指標、バックアップ・復旧手順などを詳述します。

## ログ出力仕様

### ログレベル定義
```typescript
enum LogLevel {
  ERROR = 'error',    // エラー・例外
  WARN = 'warn',      // 警告・注意事項
  INFO = 'info',      // 一般情報・業務ログ
  DEBUG = 'debug',    // デバッグ情報
  TRACE = 'trace'     // 詳細トレース
}
```

### 構造化ログ形式
```json
{
  "timestamp": "2025-08-20T10:30:45.123Z",
  "level": "info",
  "message": "UseCase executed successfully",
  "service": "api",
  "version": "1.1.0",
  "environment": "production",
  "traceId": "trace_1234567890",
  "requestId": "req_abcdef123456",
  "userId": 123,
  "useCase": "CreateCaseUseCase",
  "duration": 1250,
  "context": {
    "caseId": 456,
    "processId": 789
  },
  "metadata": {
    "ip": "192.168.1.100",
    "userAgent": "Mozilla/5.0...",
    "method": "POST",
    "path": "/api/cases"
  }
}
```

### ログ出力カテゴリ

#### 1. 認証・認可ログ
```typescript
// ログイン成功
logger.info('User login successful', {
  category: 'auth',
  event: 'login_success',
  userId: user.id,
  email: user.email,
  ip: request.ip,
  userAgent: request.headers['user-agent']
});

// ログイン失敗
logger.warn('User login failed', {
  category: 'auth',
  event: 'login_failed',
  email: loginDto.email,
  reason: 'invalid_credentials',
  ip: request.ip,
  failedAttempts: user.failedLoginAttempts + 1
});

// 権限不足
logger.warn('Access denied', {
  category: 'auth',
  event: 'access_denied',
  userId: user.id,
  resource: 'cases',
  action: 'delete',
  resourceId: caseId
});
```

#### 2. ビジネスロジックログ
```typescript
// 案件作成
logger.info('Case created', {
  category: 'business',
  event: 'case_created',
  caseId: case.id,
  processId: case.processId,
  createdBy: case.createdBy,
  stepCount: case.stepInstances.length,
  goalDate: case.goalDateUtc
});

// 再計算実行
logger.info('Schedule recalculation completed', {
  category: 'business',
  event: 'replan_completed',
  caseId: caseId,
  changedSteps: changes.length,
  algorithm: 'v2',
  duration: calculationTime
});
```

#### 3. システムログ
```typescript
// データベース接続
logger.info('Database connection established', {
  category: 'system',
  event: 'db_connected',
  database: 'postgresql',
  host: config.database.host,
  connectionPool: config.database.maxConnections
});

// 外部API呼び出し
logger.info('External API call', {
  category: 'system',
  event: 'external_api_call',
  service: 'email_service',
  endpoint: '/send',
  method: 'POST',
  statusCode: 200,
  duration: 850
});
```

#### 4. エラーログ
```typescript
// アプリケーションエラー
logger.error('UseCase execution failed', {
  category: 'error',
  event: 'usecase_error',
  useCase: 'CreateCaseUseCase',
  error: {
    name: error.name,
    message: error.message,
    stack: error.stack
  },
  input: sanitizedInput,
  userId: user.id
});

// システムエラー
logger.error('Database query failed', {
  category: 'error',
  event: 'database_error',
  query: sanitizedQuery,
  error: error.message,
  duration: queryTime
});
```

## エラー監視・対応手順

### エラー分類・優先度

#### 優先度1（緊急）- 即座対応
- **システム停止**: アプリケーション全体が利用不可
- **データ損失**: データベース障害・データ破損
- **セキュリティ侵害**: 不正アクセス・情報漏洩
- **認証システム障害**: ログイン不可

**対応手順**:
1. インシデント宣言（5分以内）
2. 緊急対応チーム招集
3. 影響範囲特定・切り分け
4. 暫定対応実施
5. 根本原因調査・恒久対策

#### 優先度2（高）- 2時間以内対応
- **主要機能障害**: 案件作成・更新不可
- **パフォーマンス劣化**: レスポンス時間10秒超過
- **大量エラー発生**: エラー率5%超過

#### 優先度3（中）- 24時間以内対応
- **部分機能障害**: 検索・可視化機能の問題
- **軽微なパフォーマンス問題**: レスポンス時間5秒超過
- **UI/UX問題**: 表示崩れ・操作性問題

#### 優先度4（低）- 1週間以内対応
- **軽微な機能問題**: 非重要機能の不具合
- **改善要望**: ユーザビリティ向上

### アラート設定

#### システムメトリクス
```yaml
# CPU使用率
cpu_usage_high:
  condition: cpu_usage > 80%
  duration: 5m
  severity: warning
  
cpu_usage_critical:
  condition: cpu_usage > 95%
  duration: 2m
  severity: critical

# メモリ使用率
memory_usage_high:
  condition: memory_usage > 85%
  duration: 5m
  severity: warning

# ディスク使用率
disk_usage_high:
  condition: disk_usage > 90%
  duration: 10m
  severity: critical
```

#### アプリケーションメトリクス
```yaml
# エラー率
error_rate_high:
  condition: error_rate > 1%
  duration: 5m
  severity: warning

error_rate_critical:
  condition: error_rate > 5%
  duration: 2m
  severity: critical

# レスポンス時間
response_time_slow:
  condition: p95_response_time > 2s
  duration: 5m
  severity: warning

response_time_critical:
  condition: p95_response_time > 10s
  duration: 2m
  severity: critical
```

#### データベースメトリクス
```yaml
# 接続数
db_connections_high:
  condition: active_connections > 80% of max_connections
  duration: 5m
  severity: warning

# スロークエリ
slow_query_detected:
  condition: query_duration > 5s
  severity: warning

# デッドロック
deadlock_detected:
  condition: deadlock_count > 0
  severity: critical
```

### エラー対応フローチャート
```
エラー検知
    ↓
優先度判定
    ↓
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ 優先度1     │ 優先度2     │ 優先度3     │ 優先度4     │
│ (緊急)      │ (高)        │ (中)        │ (低)        │
└─────────────┴─────────────┴─────────────┴─────────────┘
    ↓             ↓             ↓             ↓
インシデント宣言   担当者アサイン   チケット作成   バックログ追加
    ↓             ↓             ↓             ↓
緊急対応チーム     影響範囲調査     原因調査       計画的対応
    ↓             ↓             ↓             ↓
暫定対応実施       対応実施         対応実施       対応実施
    ↓             ↓             ↓             ↓
根本原因調査       検証・リリース   検証・リリース  検証・リリース
    ↓             ↓             ↓             ↓
恒久対策実施       完了報告         完了報告       完了報告
    ↓
事後検証・改善
```

## パフォーマンス監視指標

### SLI（Service Level Indicators）

#### 可用性
- **目標**: 99.9%以上
- **測定**: `(総リクエスト数 - エラーレスポンス数) / 総リクエスト数 × 100`
- **監視間隔**: 1分

#### レスポンス時間
- **目標**: 95%のリクエストが2秒以内
- **測定**: P95レスポンス時間
- **監視間隔**: 1分

#### スループット
- **目標**: 1000 RPS以上
- **測定**: 1秒あたりのリクエスト数
- **監視間隔**: 1分

### APM（Application Performance Monitoring）

#### キーメトリクス
```typescript
interface PerformanceMetrics {
  // レスポンス時間
  responseTime: {
    p50: number;    // 中央値
    p95: number;    // 95パーセンタイル
    p99: number;    // 99パーセンタイル
    max: number;    // 最大値
  };
  
  // スループット
  throughput: {
    rps: number;           // リクエスト/秒
    rpm: number;           // リクエスト/分
    totalRequests: number; // 総リクエスト数
  };
  
  // エラー率
  errorRate: {
    percentage: number;    // エラー率(%)
    totalErrors: number;   // 総エラー数
    errorsByType: Record<string, number>; // エラー種別
  };
  
  // リソース使用量
  resources: {
    cpu: number;      // CPU使用率(%)
    memory: number;   // メモリ使用率(%)
    disk: number;     // ディスク使用率(%)
  };
}
```

#### データベースパフォーマンス
```typescript
interface DatabaseMetrics {
  // 接続
  connections: {
    active: number;     // アクティブ接続数
    idle: number;       // アイドル接続数
    max: number;        // 最大接続数
  };
  
  // クエリパフォーマンス
  queries: {
    totalQueries: number;      // 総クエリ数
    slowQueries: number;       // スロークエリ数
    averageQueryTime: number;  // 平均クエリ時間
    longestQueryTime: number;  // 最長クエリ時間
  };
  
  // ロック・デッドロック
  locks: {
    activeLocks: number;    // アクティブロック数
    deadlocks: number;      // デッドロック数
    lockWaitTime: number;   // ロック待機時間
  };
}
```

### パフォーマンス最適化指針

#### 1. データベース最適化
```sql
-- インデックス最適化
EXPLAIN ANALYZE SELECT * FROM cases WHERE status = 'open' AND created_at > '2025-01-01';

-- クエリ最適化
-- 悪い例
SELECT * FROM step_instances si 
JOIN cases c ON si.case_id = c.id 
WHERE c.status = 'open';

-- 良い例
SELECT si.id, si.name, si.status, si.due_date_utc 
FROM step_instances si 
JOIN cases c ON si.case_id = c.id 
WHERE c.status = 'open' 
AND si.status != 'done';
```

#### 2. キャッシュ戦略
```typescript
// Redis キャッシュ設定
const cacheConfig = {
  // 静的データ（長期キャッシュ）
  processTemplates: { ttl: 3600 }, // 1時間
  holidays: { ttl: 86400 },        // 24時間
  
  // 動的データ（短期キャッシュ）
  cases: { ttl: 300 },             // 5分
  searchResults: { ttl: 60 },      // 1分
  
  // セッションデータ
  userSessions: { ttl: 1800 },     // 30分
};
```

#### 3. 非同期処理
```typescript
// バックグラウンドジョブ
@Processor('notification')
export class NotificationProcessor {
  @Process('send-email')
  async sendEmail(job: Job<EmailData>) {
    const { to, subject, body } = job.data;
    
    try {
      await this.emailService.send(to, subject, body);
      this.logger.info('Email sent successfully', { to, subject });
    } catch (error) {
      this.logger.error('Email sending failed', { to, subject, error });
      throw error; // リトライ対象
    }
  }
}
```

## バックアップ・復旧手順

### バックアップ戦略

#### データベースバックアップ
```bash
#!/bin/bash
# 日次フルバックアップ
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME \
  --format=custom \
  --compress=9 \
  --file="/backup/$(date +%Y%m%d)_full_backup.dump"

# 時間次差分バックアップ
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME \
  --format=custom \
  --compress=9 \
  --incremental \
  --file="/backup/$(date +%Y%m%d_%H%M)_incremental_backup.dump"
```

#### ファイルバックアップ
```bash
#!/bin/bash
# S3ファイルのバックアップ
aws s3 sync s3://process-todo-files s3://process-todo-backup/$(date +%Y%m%d) \
  --delete \
  --storage-class GLACIER

# アプリケーションファイルのバックアップ
tar -czf "/backup/app_$(date +%Y%m%d).tar.gz" \
  /app \
  --exclude=/app/node_modules \
  --exclude=/app/.git
```

#### バックアップスケジュール
```yaml
# crontab設定
# 毎日2:00 フルバックアップ
0 2 * * * /scripts/full_backup.sh

# 毎時 差分バックアップ
0 * * * * /scripts/incremental_backup.sh

# 毎週日曜日 バックアップ検証
0 3 * * 0 /scripts/backup_verification.sh

# 毎月1日 古いバックアップ削除
0 4 1 * * /scripts/cleanup_old_backups.sh
```

### 災害復旧手順

#### RTO（Recovery Time Objective）: 4時間
#### RPO（Recovery Point Objective）: 1時間

#### 復旧手順
```bash
# 1. システム停止
systemctl stop process-todo-api
systemctl stop process-todo-web

# 2. データベース復旧
pg_restore -h $DB_HOST -U $DB_USER -d $DB_NAME \
  --clean --if-exists \
  /backup/latest_backup.dump

# 3. ファイル復旧
aws s3 sync s3://process-todo-backup/latest s3://process-todo-files

# 4. アプリケーション復旧
tar -xzf /backup/latest_app_backup.tar.gz -C /

# 5. 設定ファイル復旧
cp /backup/config/* /app/config/

# 6. システム起動
systemctl start process-todo-api
systemctl start process-todo-web

# 7. ヘルスチェック
curl -f http://localhost:3000/health
curl -f http://localhost:3001/health
```

## 定期メンテナンス

### 日次メンテナンス
```bash
#!/bin/bash
# ログローテーション
logrotate /etc/logrotate.d/process-todo

# 一時ファイル削除
find /tmp -name "process-todo-*" -mtime +1 -delete

# データベース統計更新
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "ANALYZE;"
```

### 週次メンテナンス
```bash
#!/bin/bash
# データベース最適化
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "VACUUM ANALYZE;"

# インデックス再構築
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "REINDEX DATABASE $DB_NAME;"

# キャッシュクリア
redis-cli FLUSHDB
```

### 月次メンテナンス
```bash
#!/bin/bash
# 古いログ削除
find /var/log/process-todo -name "*.log" -mtime +30 -delete

# 古い監査ログアーカイブ
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME \
  --table=audit_logs \
  --where="created_at < NOW() - INTERVAL '3 months'" \
  --file="/archive/audit_logs_$(date +%Y%m).dump"

# アーカイブ後削除
psql -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -c "DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '3 months';"
```

## セキュリティ監視

### セキュリティイベント監視
```typescript
// 不正アクセス検知
const securityEvents = [
  'multiple_failed_logins',    // 連続ログイン失敗
  'privilege_escalation',      // 権限昇格試行
  'unusual_access_pattern',    // 異常なアクセスパターン
  'data_exfiltration',        // データ流出の兆候
  'sql_injection_attempt',    // SQLインジェクション試行
  'xss_attempt'               // XSS攻撃試行
];

// アラート設定
const securityAlerts = {
  failed_login_threshold: 5,      // 5回失敗でアラート
  unusual_access_threshold: 100,  // 通常の10倍のアクセスでアラート
  data_access_threshold: 1000,    // 1000件以上のデータアクセスでアラート
};
```

### 脆弱性スキャン
```bash
#!/bin/bash
# 依存関係の脆弱性チェック
npm audit --audit-level high

# コンテナイメージの脆弱性スキャン
trivy image process-todo:latest

# Webアプリケーションの脆弱性スキャン
zap-baseline.py -t http://localhost:3000
```

## 変更履歴

### v1.1での運用・保守機能

1. **包括的なログ出力システム**
   - 構造化ログ・カテゴリ別ログ
   - トレーサビリティ確保

2. **詳細なエラー監視・対応手順**
   - 優先度別対応フロー
   - アラート設定・エスカレーション

3. **パフォーマンス監視指標**
   - SLI/SLO定義・APM実装
   - データベース監視

4. **災害復旧・バックアップ戦略**
   - 自動バックアップ・復旧手順
   - RTO/RPO定義

5. **セキュリティ監視・メンテナンス**
   - セキュリティイベント監視
   - 定期メンテナンス手順
