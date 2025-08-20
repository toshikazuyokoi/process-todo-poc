# アーキテクチャ概要（A案：TypeScript MVC）

## 目的
プロセス指向ToDoアプリのMVP〜Phase3までを堅実に実装し、将来のAI拡張に耐える「MVC準拠＋レイヤード」構成を定義する。

## 方針
- **MVC（Controller / View / Model）**を基本に、Application（UseCase）/Domain/Infrastructureのレイヤを明確化
- 逆算・再計算などのコアロジックは**Domainサービス**としてDB非依存で実装し、テスト容易性を確保
- すべてUTC保存、表示時にユーザーTZ（Asia/Tokyo）へ変換
- JSON APIを標準とし、Next.jsのSSR/CSRでViewを実装

## コンポーネント図（論理）
- Presentation：Next.js（SSR/CSR）＋ NestJS Controller（REST）
- Application：ユースケース（再計画プレビュー/確定、案件生成、テンプレCRUD）
- Domain：エンティティ（Case/Step等）、値オブジェクト（Basis/Offset）、ドメインサービス（BusinessDay/Replan）
- Infrastructure：Prisma Repository、Redis Queue、Storage(S3互換)、Mail/Slack Gateway
- 外部：PostgreSQL、Redis、MinIO、SMTP/Slack
