# 21 ドメインモデル（v4）

## 値オブジェクト
- `Basis` = enum { `goal`, `prev` }
- `OffsetDays` : int (>=0)
- `UtcDateTime` : ISO8601/Z
- `ArtifactKind` = enum { `file`, `link` }

## ステータス列挙と遷移規則
- `Case.status` ∈ { `open`, `closed` }；`closed` でステップ編集不可
- `StepInstance.status` ∈ { `todo`, `doing`, `done` }
  - 許可遷移：`todo→doing→done`、`doing→todo`（戻し）
  - 禁止：`done→*`（ロールバック不可）
  - `done` は `dueDateUtc` 変更不可・再計算対象外
  - `required=true` 成果物未添付で `done` 遷移は禁止

## エンティティと不変
- **ProcessTemplate**：`steps` はDAG（循環禁止）。保存時と生成時に検証。
- **StepTemplate**：`basis`, `offsetDays>=0`, `dependsOn` は同一テンプレID範囲。
- **CaseAggregate**：`goalDateUtc` はUTC、子の`StepInstance[]`と整合。
- **StepInstance**：`locked=true` は再計算で変更不可。

## ドメインサービス
- **BusinessDayService**：営業日加算/減算/補正、休日判定（国別）
- **ReplanDomainService**：Plan生成（DAG最遅基準）、Diff生成（locked尊重）

## ドメイン検証
- トポロジカルソートでDAG性検証、循環検出で `DomainError`（422）
- 依存参照の存在検証、負オフセット禁止
