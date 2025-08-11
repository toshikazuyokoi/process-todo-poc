# 27 バリデーション/ポリシー/品質（v4）

## 入力バリデーション（DTO）
- ISO8601/Z、将来の時刻許容（`goalDate`）
- `offsetDays` は0以上の整数
- `dependsOn` は同一テンプレ内の既存ID、自己参照禁止

## ドメイン検証
- DAG性検証（トポロジカルソート）。循環発見でDomainError。
- `locked` と `status=done` の保護。
- 休日判定は `holidays(country)` テーブルから。

## 非機能ポリシー（MVP）
- ログ：すべてのUseCase開始/終了と例外を構造化ログで出力（trace_id）
- 計測：UseCaseごと応答時間／Reposクエリ回数
- セキュリティ：ファイルアップロードはpresigned URL＋サイズ制限＋拡張子制限

## テスト原則
- Domain：**決定性**（同一入力→同一出力）。境界条件（祝日連続・年跨ぎ・並列多段）。
- Application：Tx/Repoモックで差分適用の正しさ。
- Interfaces：DTO→UseCaseの接続とエラーへのHTTPマッピング。
