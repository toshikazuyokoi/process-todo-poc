# 26 エラー/トランザクション/整合性設計

## トランザクション境界と再試行
- `ApplyReplan`, `CreateCase`, `UpdateStep`, `AddArtifact` は単一Tx。失敗時はロールバック。
- キュー処理（通知）は **at-least-once**。UseCaseは**冪等**に（IDEMPOTENCY KEYの導入を検討）。

## 競合と同時更新
- 案件詳細の更新は `cases.updated_at` による楽観ロックで409検出。
- `locked` の切替と `dueDate` 変更は同一Txで実行。

## 整合性ルール（抜粋）
- `status=done` のステップは `dueDate` 変更不可。
- `required=true` 成果物未添付なら `done` へ遷移不可。
- `dependsOn` によって順序が規定されるが、`basis=goal` はゴール基準で独立に計算可。

## エラーカテゴリ
| カテゴリ | 例 | ハンドリング |
|---|---|---|
| ValidationError | 不正なID/時刻/enum | 400 |
| DomainError | 循環依存、負のオフセット | 422 |
| ConflictError | 楽観ロック衝突 | 409 |
| NotFound | リソース不存在 | 404 |
| SystemError | 予期せぬ障害 | 500 + ログ |
