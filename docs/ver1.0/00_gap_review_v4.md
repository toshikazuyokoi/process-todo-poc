# 00 セルフレビュー総括（v4・最終統合）

本書は 01–27 の全設計ドキュメントを **A案（NestJS + Prisma + Next.js／MVC＋Layered）** に整合させた最終統合版の要約である。

## 反映事項（網羅）
- **API契約強化**：ETag/If-Match、エラー表（400/404/409/422/500）、ページング/検索、Storage Presigned API を明文化。
- **ドメイン厳密化**：`Step.status={todo,doing,done}`、禁止遷移、`done`/`locked` の相互制約、テンプレDAG検証。
- **整合性**：再計算は *Preview→Apply(Tx)*、Tx境界、監査DIFF、UTC統一（DB `*_utc`／API ISO8601 Z）。
- **冪等性/通知**：BullMQのIdempotency Key（`stepId+plannedDueUtc`）、重複スキップ、失敗再実行方針。
- **NFR/セキュリティ**：脅威モデル、SLI/SLO、バックアップ/リストア、データ保持・削除。
- **UI/UX**：差分プレビュー、ガント/カレンダー、D&Dテンプレ編集の責務分離。
- **テスト**：年跨ぎ・連休・If-Match競合・必須成果物未添付・権限違反等のエッジケースを追加。

以降、各章に完全版を記載する。