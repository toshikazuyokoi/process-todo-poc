# 12 MVCとレイヤ責務（v4）

## View（Next.js）
- 画面：テンプレ編集、案件作成、案件詳細（差分プレビュー付）、ガント/カレンダー
- 状態管理：サーバコンポーネント＋軽量のクライアント状態（必要に応じてZustand等）
- APIクライアント：fetch/axiosの薄いラッパ

## Controller（NestJS Controller）
- ルーティング/DTOバリデーション/認可ガード
- 入力DTO→アプリ用入力モデルに変換してUseCase呼出

## Model（Domain + Application）
- **Application（UseCase）**：ユースケース単位の調停（トランザクション境界、ドメインサービス呼出、リポジトリ集約）
- **Domain**：不変条件と計算（逆算、再計算、営業日、差分生成）をDB非依存で保持
- **Infrastructure**：Prismaリポジトリ、Queue、Storage、外部連携

## ジョブ/統合
- NotificationJob（期限前/遅延通知）、Import/Exportジョブ
