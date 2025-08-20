# プロセス指向ToDoアプリケーション - ドキュメント v1.1

## 概要

プロセス指向ToDoアプリケーションは、定型的な業務プロセスを効率的に管理するためのWebアプリケーションです。プロセステンプレートを作成し、それを基に案件を展開して、各ステップの進捗を管理できます。

### 主要機能

- **プロセステンプレート管理**: 業務プロセスのテンプレート作成・編集
- **案件管理**: テンプレートから案件を作成し、進捗を管理
- **スケジューリング**: 営業日を考慮した自動スケジュール計算
- **可視化**: ガントチャート・カンバンボード・カレンダー表示
- **検索**: 統合検索・高度なフィルタリング
- **認証・認可**: JWT認証・RBAC・マルチテナント対応
- **リアルタイム更新**: WebSocketによる即座反映
- **通知システム**: リアルタイム通知・コメント機能

### 技術スタック

**バックエンド**:
- Node.js + NestJS
- TypeScript
- PostgreSQL + Prisma ORM
- JWT認証 + Passport
- Redis (キャッシュ・セッション)
- Socket.IO (WebSocket)

**フロントエンド**:
- Next.js 14 (App Router)
- React + TypeScript
- Tailwind CSS
- React Query (状態管理)
- Socket.IO Client

**インフラ**:
- Docker + Docker Compose
- AWS (S3, RDS, ElastiCache)
- GitHub Actions (CI/CD)

## v1.1での主要な変更点

### 🔐 認証・認可システムの完全実装
- JWT + リフレッシュトークン認証
- RBAC（Role-Based Access Control）システム
- マルチテナント・組織・チーム管理
- アカウントロック・メール認証機能

### 🔍 検索・可視化機能の大幅拡張
- 統合検索システム（案件・ステップ・テンプレート）
- ガントチャート・カンバンボード・カレンダー
- インタラクティブ操作・ドラッグ&ドロップ対応

### 📊 ダッシュボード・UI/UX強化
- ホーム画面・サマリー表示
- クイックアクション・進捗可視化
- レスポンシブデザイン・モバイル対応

### ⚡ リアルタイム機能
- WebSocketによるリアルタイム更新
- 通知システム・コメント機能
- 協調編集・同期機能

### 🛡️ セキュリティ・品質強化
- 包括的なバリデーション・エラーハンドリング
- レート制限・セキュリティヘッダー
- 構造化ログ・監査証跡

## ドキュメント構成

### 📋 要件・設計 (01-09)
| ファイル | タイトル | 説明 | 更新状況 |
|---------|---------|------|----------|
| [01_use_cases.md](01_use_cases.md) | ユースケース | 基本的なユースケース定義 | 無修正 |
| [02_glossary.md](02_glossary.md) | 用語集 | プロジェクト用語の定義 | 無修正 |
| [03_erd.md](03_erd.md) | ER図 | データベース設計の概要 | 無修正 |
| [04_schema.md](04_schema.md) | DBスキーマ | **データベーススキーマ詳細** | **🔄 大幅更新** |
| [05_scheduling_algorithm.md](05_scheduling_algorithm.md) | スケジューリングアルゴリズム | 営業日計算・再計算ロジック | 無修正 |
| [06_api_spec.md](06_api_spec.md) | API仕様 | **REST API仕様書** | **🔄 大幅更新** |
| [07_ui_flow.md](07_ui_flow.md) | 画面フロー | **UI/UXフロー設計** | **🔄 大幅更新** |
| [08_test_plan.md](08_test_plan.md) | テスト計画 | テスト戦略・計画 | 無修正 |
| [09_backlog.md](09_backlog.md) | バックログ | 機能要望・改善項目 | 無修正 |

### 🏗️ アーキテクチャ (10-20)
| ファイル | タイトル | 説明 | 更新状況 |
|---------|---------|------|----------|
| [10_arch_overview.md](10_arch_overview.md) | アーキテクチャ概要 | システム全体のアーキテクチャ | 無修正 |
| [11_stack_selection.md](11_stack_selection.md) | 技術スタック選定 | 技術選定の理由・根拠 | 無修正 |
| [12_mvc_layers.md](12_mvc_layers.md) | レイヤー設計 | Clean Architecture設計 | 無修正 |
| [13_directory_structure.md](13_directory_structure.md) | ディレクトリ構成 | **プロジェクト構造** | **🔄 大幅更新** |
| [14_crosscutting.md](14_crosscutting.md) | 横断的関心事 | ログ・例外処理・セキュリティ | 無修正 |
| [15_devops_ci_cd.md](15_devops_ci_cd.md) | DevOps・CI/CD | デプロイ・運用自動化 | 無修正 |
| [16_next_actions.md](16_next_actions.md) | 次のアクション | 今後の開発計画 | 無修正 |
| [17_security_threat_model.md](17_security_threat_model.md) | セキュリティ脅威モデル | セキュリティリスク分析 | 無修正 |
| [18_nonfunctional_requirements.md](18_nonfunctional_requirements.md) | 非機能要件 | パフォーマンス・可用性要件 | 無修正 |
| [19_data_lifecycle_backup_restore.md](19_data_lifecycle_backup_restore.md) | データライフサイクル | バックアップ・復旧戦略 | 無修正 |
| [20_internal_design_overview.md](20_internal_design_overview.md) | 内部設計概要 | 詳細設計の概要 | 無修正 |

### 💻 実装詳細 (21-27)
| ファイル | タイトル | 説明 | 更新状況 |
|---------|---------|------|----------|
| [21_domain_model.md](21_domain_model.md) | ドメインモデル | **ドメイン層の詳細設計** | **🔄 大幅更新** |
| [22_application_usecases.md](22_application_usecases.md) | アプリケーションユースケース | **ユースケース実装詳細** | **🔄 大幅更新** |
| [24_interfaces_controllers_dto.md](24_interfaces_controllers_dto.md) | インターフェース層 | **Controller・DTO・認可** | **🔄 大幅更新** |
| [25_sequence_diagrams.md](25_sequence_diagrams.md) | シーケンス図 | 主要フローのシーケンス図 | 無修正 |
| [25_sequence_diagrams_addendum.md](25_sequence_diagrams_addendum.md) | シーケンス図補足 | 追加のシーケンス図 | 無修正 |
| [26_error_tx_consistency.md](26_error_tx_consistency.md) | エラー・トランザクション | エラーハンドリング・整合性 | 無修正 |
| [27_validation_policies.md](27_validation_policies.md) | バリデーション・ポリシー | **検証・品質管理** | **🔄 大幅更新** |

### 🆕 新規追加ドキュメント (28-30)
| ファイル | タイトル | 説明 | 更新状況 |
|---------|---------|------|----------|
| [28_authentication_authorization.md](28_authentication_authorization.md) | 認証・認可設計書 | **JWT・RBAC・マルチテナント** | **✨ 新規作成** |
| [29_ui_ux_detailed_design.md](29_ui_ux_detailed_design.md) | UI/UX詳細設計書 | **デザインシステム・可視化機能** | **✨ 新規作成** |
| [30_operations_maintenance_guide.md](30_operations_maintenance_guide.md) | 運用・保守ガイド | **監視・ログ・バックアップ** | **✨ 新規作成** |

### 📊 分析・レポート
| ファイル | タイトル | 説明 |
|---------|---------|------|
| [documentation_codebase_gap_analysis.md](documentation_codebase_gap_analysis.md) | ドキュメント・コードベース差異分析 | v1.0→v1.1の変更分析レポート |

## クイックスタート

### 前提条件
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Docker & Docker Compose

### 開発環境セットアップ

```bash
# リポジトリクローン
git clone https://github.com/toshikazuyokoi/process-todo-poc.git
cd process-todo-poc

# 環境変数設定
cp api/.env.example api/.env
cp web/.env.example web/.env

# Docker Compose起動
docker-compose up -d

# データベースマイグレーション
cd api
npm install
npx prisma migrate dev
npx prisma db seed

# バックエンド起動
npm run start:dev

# フロントエンド起動（別ターミナル）
cd ../web
npm install
npm run dev
```

### アクセス情報
- **フロントエンド**: http://localhost:3000
- **バックエンドAPI**: http://localhost:3001
- **API仕様書**: http://localhost:3001/api-docs

### デフォルトユーザー
- **管理者**: admin@example.com / password123
- **一般ユーザー**: user@example.com / password123

## 主要な機能フロー

### 1. 認証・ログイン
```
/login → 認証 → /dashboard → 各機能へ
```

### 2. プロセステンプレート作成
```
/templates → 新規作成 → D&Dエディター → 保存
```

### 3. 案件作成・管理
```
/cases → 新規作成 → テンプレート選択 → 基本情報入力 → 展開プレビュー → 作成
```

### 4. 可視化・分析
```
/gantt - ガントチャート表示
/kanban - カンバンボード表示
/calendar - カレンダー表示
/search - 統合検索
```

## 開発・運用ガイド

### 開発者向け
- **API開発**: [06_api_spec.md](06_api_spec.md)
- **ドメインモデル**: [21_domain_model.md](21_domain_model.md)
- **ユースケース**: [22_application_usecases.md](22_application_usecases.md)
- **UI/UX設計**: [29_ui_ux_detailed_design.md](29_ui_ux_detailed_design.md)

### 運用者向け
- **運用・保守**: [30_operations_maintenance_guide.md](30_operations_maintenance_guide.md)
- **セキュリティ**: [28_authentication_authorization.md](28_authentication_authorization.md)
- **バックアップ**: [19_data_lifecycle_backup_restore.md](19_data_lifecycle_backup_restore.md)

### テスト・品質管理
- **テスト計画**: [08_test_plan.md](08_test_plan.md)
- **バリデーション**: [27_validation_policies.md](27_validation_policies.md)

## ライセンス

MIT License

## 貢献・サポート

- **Issues**: GitHub Issues でバグ報告・機能要望
- **Pull Requests**: 機能追加・改善の提案
- **ドキュメント**: 本ドキュメントセットの改善提案

## 変更履歴

### v1.1 (2025-08-20)
- 🔐 認証・認可システムの完全実装
- 🔍 検索・可視化機能の大幅拡張
- 📊 ダッシュボード・UI/UX強化
- ⚡ リアルタイム機能の実装
- 🛡️ セキュリティ・品質強化
- 📚 ドキュメントの大幅更新（8ファイル更新、3ファイル新規作成）

### v1.0 (2025-07-01)
- 基本機能の実装
- MVP版リリース

---

**プロセス指向ToDoアプリケーション開発チーム**  
最終更新: 2025-08-20
