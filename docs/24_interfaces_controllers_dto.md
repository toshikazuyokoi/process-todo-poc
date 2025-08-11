# 24 インターフェース層（Controller/DTO/認可） v4

## Controller 責務
- ルーティング、DTOバリデーション、認可（ロール/スコープ）、UseCase起動、例外マッピング

## DTO 検証規約
- すべての日時はISO8601/Z（UTC）
- `processId`, `caseId`, `stepId` は正の整数
- `status` は定義済み列挙に限定
- `confirmedChanges` は **サーバ再計算結果と一致** しない場合は400

## 認可ガード（MVP）
- `admin` は全操作可、`member` はプロジェクト内の編集のみ
- `AddArtifact`, `UpdateStep` は担当者またはadminのみ可

## エンドポイント⇔UseCase 対応
- `POST /cases` → CreateCase
- `POST /cases/:id/replan/preview` → PreviewReplan
- `POST /cases/:id/replan/apply` → ApplyReplan
- `PUT /steps/:id` → UpdateStep
- `POST /steps/:id/artifacts` / `DELETE /steps/:id/artifacts/:artifactId` → Add/RemoveArtifact
- `GET /cases` → ListCases