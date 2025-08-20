# 14 クロスカット設計（完全版 v4）

- **時刻/タイムゾーン**：DBはUTC、APIはISO8601（Z）。表示はユーザーTZ（Asia/Tokyo）。
- **ID採番**：MVPはINT、成長時にBIGINT/ULIDへ移行可能なアブストラクション。
- **トランザクション**：再計算の確定は単一Tx。差分プレビュー→確定までの整合を保証。
- **バリデーション**：Controller（DTO）＋Domain（二重防御）。
- **監査**：すべての変更コマンドで`audit_logs`にDIFFを保存。
- **ファイル**：`artifacts.path_or_url`にS3キー。devはMinIOで互換運用。
- **権限**：Phase4でRBAC（Admin/Editor/Viewer）。MVPは最低限のスコープ制御。
- **観測**：OpenTelemetry（HTTP/DB/Queueトレース）を導入可能な構成に。
- **国別休日**：`holidays(country, date)`で判定、将来案件単位のカレンダー切替を予定。
