# 06 API仕様（REST v1.1・実装反映版）

## 概要
本ドキュメントは、プロセス指向ToDoアプリケーションの実装されたAPI仕様を反映したものです。
v1.0から大幅に拡張され、認証・認可、検索、可視化、通知などの機能が追加されています。

## 共通仕様

### 基本設定
- **BasePath**: `/api`
- **認証**: JWT Bearer Token（`Authorization: Bearer <token>`）
- **日時形式**: すべてUTC ISO8601（Z）
- **Content-Type**: `application/json`

### 認証・認可
- **JWT認証**: すべてのAPIエンドポイント（認証関連を除く）でJWT認証が必要
- **ロールベース認可**: `admin`, `manager`, `member`の3段階
- **権限ベース認可**: リソース・アクション単位での細かい権限制御

### エラー・HTTPマッピング
| code | HTTP | 説明 |
|---|---|---|
| VALIDATION_ERROR | 400 | DTO検証失敗 |
| AUTH_ERROR | 401 | 認証失敗 |
| FORBIDDEN | 403 | 権限不足 |
| NOT_FOUND | 404 | リソース無し |
| CONFLICT | 409 | 楽観ロック衝突 |
| DOMAIN_ERROR | 422 | 業務矛盾（循環依存/禁止遷移 等） |
| RATE_LIMIT_ERROR | 429 | レート制限 |
| SYSTEM_ERROR | 500 | 想定外障害 |

### 共通クエリパラメータ
- `page`(1..), `size`(1..100), `sort`, `order(asc|desc)`, `filter`

### エラーレスポンス形式
```json
{
  "statusCode": 400,
  "timestamp": "2025-08-20T10:00:00.000Z",
  "path": "/api/cases",
  "method": "POST",
  "message": "Validation failed",
  "requestId": "req_1234567890",
  "errorCode": "VALIDATION_ERROR",
  "validationErrors": ["title must not be empty"],
  "details": {}
}
```

## 認証API

### 基本認証
- `POST /auth/login` - ログイン
  ```json
  // Request
  { "email": "user@example.com", "password": "password123" }
  
  // Response
  {
    "accessToken": "eyJ...",
    "refreshToken": "refresh_token_here",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "User Name",
      "role": "member"
    }
  }
  ```

- `POST /auth/signup` - サインアップ
- `POST /auth/logout` - ログアウト
- `POST /auth/refresh` - トークンリフレッシュ
- `GET /auth/validate` - トークン検証
- `GET /auth/me` - 現在のユーザー情報取得
- `PATCH /auth/change-password` - パスワード変更

## ユーザー管理API

### ユーザーCRUD
- `POST /users` - ユーザー作成（admin権限）
- `GET /users` - ユーザー一覧取得
- `GET /users/:id` - ユーザー詳細取得
- `PUT /users/:id` - ユーザー更新
- `DELETE /users/:id` - ユーザー削除（admin権限）

### ユーザー操作
- `POST /users/:userId/assign-step/:stepId` - ステップ割り当て

## プロセステンプレートAPI

### テンプレートCRUD
- `POST /process-templates` - テンプレート作成
- `GET /process-templates` - テンプレート一覧取得
- `GET /process-templates/:id` - テンプレート詳細取得
- `PUT /process-templates/:id` - テンプレート更新（DAG検証付き）
- `DELETE /process-templates/:id` - テンプレート削除

### ステップテンプレート
- `POST /process-templates/:id/steps` - ステップテンプレート追加

## 案件管理API

### 案件CRUD
- `POST /cases` - 案件作成
  ```json
  // Request
  {
    "processId": 1,
    "title": "新規営業案件",
    "goalDateUtc": "2025-12-31T23:59:59.000Z",
    "createdBy": 1
  }
  
  // Response
  {
    "id": 1,
    "processId": 1,
    "title": "新規営業案件",
    "goalDateUtc": "2025-12-31T23:59:59.000Z",
    "status": "open",
    "stepInstances": [...],
    "etag": "W/\"1-1234567890\""
  }
  ```

- `GET /cases` - 案件一覧取得（検索・ページング対応）
- `GET /cases/:id` - 案件詳細取得
- `PUT /cases/:id` - 案件更新（If-Match必須）
- `DELETE /cases/:id` - 案件削除

### 再計算API
- `POST /cases/:id/replan/preview` - 再計算プレビュー
  ```json
  // Request
  {
    "newGoalDate": "2025-12-31T23:59:59.000Z",
    "delayedStepIds": [1, 2, 3],
    "lockedStepIds": [4, 5]
  }
  
  // Response
  {
    "changes": [
      {
        "stepId": 1,
        "stepName": "要件定義",
        "oldDueDate": "2025-11-30T23:59:59.000Z",
        "newDueDate": "2025-12-15T23:59:59.000Z",
        "isLocked": false
      }
    ],
    "criticalPath": [1, 2, 3],
    "totalDuration": 45
  }
  ```

- `POST /cases/:id/replan/apply` - 再計算適用（If-Match + 変更確認必須）

## ステップ・成果物API

### ステップ操作
- `PUT /steps/:id` - ステップ更新（ステータス遷移ルール検証付き）
- `POST /steps/:id/lock` - ステップロック
- `POST /steps/:id/unlock` - ステップアンロック
- `GET /steps/:id/history` - ステップ履歴取得

### 成果物管理
- `POST /steps/:id/artifacts` - 成果物アップロード（multipart/form-data）
- `GET /steps/:id/artifacts` - 成果物一覧取得
- `DELETE /steps/:id/artifacts/:artifactId` - 成果物削除

## 検索API

### 統合検索
- `GET /search/cases` - 案件検索
  ```json
  // Query Parameters
  {
    "q": "営業",
    "status": "open",
    "assigneeId": 1,
    "dueDateFrom": "2025-01-01",
    "dueDateTo": "2025-12-31",
    "page": 1,
    "size": 20
  }
  ```

- `GET /search/steps` - ステップ検索
- `GET /search/templates` - テンプレート検索

## 可視化API

### ガントチャート
- `GET /gantt` - ガントチャートデータ取得
  ```json
  // Query Parameters
  { "caseId": 1, "view": "case|personal", "startDate": "2025-01-01", "endDate": "2025-12-31" }
  
  // Response
  {
    "cases": [...],
    "steps": [...],
    "dependencies": [...],
    "timeline": {
      "start": "2025-01-01",
      "end": "2025-12-31"
    }
  }
  ```

### カレンダー
- `GET /calendar` - カレンダーデータ取得

### カンバンボード
- `GET /kanban` - カンバンボードデータ取得

## 通知・コメントAPI

### 通知管理
- `POST /notifications` - 通知作成
- `GET /notifications/my` - 自分の通知一覧取得
- `PUT /notifications/:id/read` - 通知既読化
- `PUT /notifications/read-all` - 全通知既読化
- `DELETE /notifications/:id` - 通知削除

### コメント機能
- `POST /steps/:stepId/comments` - コメント投稿
- `GET /steps/:stepId/comments` - コメント一覧取得
- `PUT /comments/:id` - コメント更新
- `DELETE /comments/:id` - コメント削除

## 補助API

### 休日・カレンダー
- `GET /holidays` - 休日一覧取得
  ```json
  // Query Parameters
  { "country": "JP", "year": 2025 }
  ```

### ストレージ
- `POST /storage/presigned` - プリサインドURL生成
  ```json
  // Request
  {
    "stepId": 1,
    "fileName": "document.pdf",
    "contentType": "application/pdf",
    "size": 1048576
  }
  
  // Response
  {
    "url": "https://s3.amazonaws.com/bucket/...",
    "fields": {...},
    "expiresAt": "2025-08-20T11:00:00.000Z"
  }
  ```

### システム情報
- `GET /health` - ヘルスチェック

## デバッグ・開発支援API

### デバッグ機能（開発環境のみ）
- `POST /debug/schedule-test` - スケジュール計算テスト
- `GET /debug/system-info` - システム情報取得

## レート制限

- **認証API**: 5回/分
- **検索API**: 100回/分
- **その他API**: 1000回/分

## バージョニング

- **現在バージョン**: v1.1
- **バージョン指定**: `Accept: application/vnd.api+json;version=1.1`
- **後方互換性**: v1.0との互換性を維持

## 変更履歴

### v1.1での主要な追加・変更点

1. **認証・認可システムの完全実装**
   - JWT認証の導入
   - RBAC（Role-Based Access Control）システム
   - リフレッシュトークン機能

2. **API大幅拡張**
   - ユーザー管理API（8エンドポイント）
   - 検索API（3エンドポイント）
   - 可視化API（3エンドポイント）
   - 通知・コメントAPI（10エンドポイント）

3. **エラーハンドリング強化**
   - 詳細なエラーレスポンス
   - リクエストID追跡
   - バリデーションエラー詳細化

4. **セキュリティ強化**
   - レート制限
   - 権限ベース認可
   - センシティブ情報のサニタイズ

5. **開発者体験向上**
   - OpenAPI/Swagger対応
   - デバッグAPI
   - 詳細なログ出力
