# 06 API仕様（REST v4・網羅）

## 共通
- BasePath: `/api`、認証：APIキー or Bearer。すべてUTC ISO8601（Z）。
- **ETag/If-Match**：更新系は ETag を返却。更新時は `If-Match` 必須。不一致は **409**。
- エラー形式：`{ code, message, details? }`

### エラー・HTTPマッピング
| code | HTTP | 説明 |
|---|---|---|
| VALIDATION_ERROR | 400 | DTO検証失敗 |
| NOT_FOUND | 404 | リソース無し |
| CONFLICT | 409 | 楽観ロック衝突 |
| DOMAIN_ERROR | 422 | 業務矛盾（循環依存/禁止遷移 等） |
| SYSTEM_ERROR | 500 | 想定外障害 |

### 共通クエリ
- `page`(1..), `size`(1..100), `sort`, `order(asc|desc)`, `filter`（RSQL風・将来）

## テンプレート
- `POST /templates`
- `GET /templates`
- `GET /templates/:id`
- `PUT /templates/:id` ※保存時に **DAG検証**（循環は422）
- `POST /templates/:id/steps`

## 案件
- `POST /cases`  … `{ processId, title, goalDate }` → `{ caseId, etag, steps[...] }`
- `GET /cases`    … 検索・ページング
- `GET /cases/:id`
- `PUT /cases/:id` … If-Match 必須（`goalDate`直変更不可）

## 再計算
- `POST /cases/:id/replan/preview` … `{ newGoalDate?, delayedStepIds? }`
- `POST /cases/:id/replan/apply`   … `If-Match` + `{ changes[...] }`（サーバ再計算と整合必須）

## ステップ/成果物
- `PUT /steps/:id` … `status` 遷移はルール検証、`done` には必須成果物チェック
- `POST /steps/:id/artifacts`
- `DELETE /steps/:id/artifacts/:artifactId`
- `GET /steps/:id/history`

## 休日/補助
- `GET /holidays?country=JP&year=2025`

## ストレージ
- `POST /storage/presigned` … `{ stepId, fileName, contentType, size }` → `{ url, fields, expiresAt }`  
  制約：サイズ上限・拡張子Whitelist・権限チェック・有効期限。