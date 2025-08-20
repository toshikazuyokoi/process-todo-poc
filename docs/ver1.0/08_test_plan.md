# 08 テスト計画（完全版 v4）

## ピラミッド
- Unit（Domain）：営業日/再計算/差分（決定性）
- Integration：Prisma Repo、UseCase経由のTx適用、ETag検証
- E2E：UC-01（営業）シナリオ（作成→遅延→再計算→成果物→完了）

## 代表ケース（エッジ含む）
- 連休・年跨ぎ・月末跨ぎのオフセット計算
- 並列依存で一方遅延 → 後続prev基準が押し出される
- `locked=true`/`done` 混在再計算、`done`は変更不可
- If-Match不一致（409）、必須成果物未添付で`done`禁止（422）
- `/storage/presigned`：サイズ/拡張子NG、権限NG