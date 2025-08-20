# 13 ディレクトリ構成（v1.1・実装反映版）

## 概要
本ドキュメントは、プロセス指向ToDoアプリケーションの実装されたディレクトリ構造を反映したものです。
v1.0から大幅に拡張され、認証システム、可視化機能、検索機能などが追加されています。

## Backend（/api）

### 実装されたディレクトリ構造
```
/api
  /src
    /common
      /decorators     # カスタムデコレーター（@Roles, @RequirePermissions等）
      /filters        # 例外フィルター（グローバル・HTTP）
      /guards         # 認証・認可ガード（JWT, Roles, Permissions）
      /interceptors   # リクエスト・レスポンス処理
      /services       # 共通サービス（ログ、設定等）
      /types          # 共通型定義
      /utils          # ユーティリティ関数
    
    /domain
      /entities       # Case.ts, StepInstance.ts, ProcessTemplate.ts, User.ts
      /services       # BusinessDayService.ts, ReplanDomainService.ts
      /values         # Basis.ts, OffsetDays.ts, DueDate.ts, CaseStatus.ts, StepStatus.ts
    
    /application
      /usecases       # 詳細なユースケース実装
        /auth         # LoginUseCase.ts, SignupUseCase.ts, RefreshTokenUseCase.ts
        /cases        # CreateCaseUseCase.ts, UpdateCaseUseCase.ts, DeleteCaseUseCase.ts
        /templates    # CreateTemplateUseCase.ts, UpdateTemplateUseCase.ts
        /steps        # UpdateStepUseCase.ts, CompleteStepUseCase.ts
        /search       # SearchCasesUseCase.ts, SearchStepsUseCase.ts
        /replan       # PreviewReplanUseCase.ts, ApplyReplanUseCase.ts
      /dto            # リクエスト・レスポンスDTO
        /auth         # LoginDto.ts, SignupDto.ts, AuthResponseDto.ts
        /cases        # CreateCaseDto.ts, UpdateCaseDto.ts, CaseResponseDto.ts
        /templates    # CreateTemplateDto.ts, UpdateTemplateDto.ts
        /steps        # UpdateStepDto.ts, StepResponseDto.ts
        /search       # SearchDto.ts, SearchResultDto.ts
    
    /infrastructure
      /auth           # 認証システム（JWT、パスポート戦略）
        /strategies   # jwt.strategy.ts, local.strategy.ts
        /services     # auth.service.ts, token.service.ts
      /prisma         # Prismaリポジトリ
        /repositories # case.repository.ts, template.repository.ts, user.repository.ts
      /gateways       # 外部サービス連携
        /mail         # mail.service.ts, mail.templates.ts
        /storage      # s3.service.ts, storage.service.ts
        /slack        # slack.service.ts
      /jobs           # バックグラウンドジョブ
        /queues       # notification.queue.ts, email.queue.ts
        /processors   # notification.processor.ts, email.processor.ts
    
    /interfaces
      /controllers    # 大幅に拡張されたコントローラー群
        /auth         # auth.controller.ts
        /users        # user.controller.ts
        /cases        # case.controller.ts
        /templates    # template.controller.ts
        /steps        # step.controller.ts
        /search       # search.controller.ts
        /gantt        # gantt.controller.ts
        /calendar     # calendar.controller.ts
        /kanban       # kanban.controller.ts
        /notifications # notification.controller.ts
        /comments     # comment.controller.ts
        /debug        # debug.controller.ts（開発環境のみ）
      /mappers        # DTO <-> ドメイン変換
        /auth         # auth.mapper.ts
        /cases        # case.mapper.ts
        /templates    # template.mapper.ts
        /steps        # step.mapper.ts
  
  /prisma
    schema.prisma     # 拡張されたデータベーススキーマ
    /migrations       # マイグレーションファイル
    /seeds            # シードデータ
  
  /test
    /unit             # 単体テスト
    /integration      # 統合テスト
    /e2e              # E2Eテスト
  
  /docs
    /api              # API仕様書（OpenAPI/Swagger）
```

### 主要な追加・変更点

1. **認証・認可システム**
   - `/infrastructure/auth`: JWT認証、パスポート戦略
   - `/common/guards`: 認証・認可ガード
   - `/common/decorators`: ロール・権限デコレーター

2. **コントローラーの大幅拡張**
   - 認証関連: `auth.controller.ts`
   - ユーザー管理: `user.controller.ts`
   - 検索機能: `search.controller.ts`
   - 可視化機能: `gantt.controller.ts`, `calendar.controller.ts`, `kanban.controller.ts`
   - 補助機能: `notification.controller.ts`, `comment.controller.ts`

3. **ユースケースの詳細化**
   - 機能別ディレクトリ分割
   - 認証・検索・可視化ユースケースの追加

4. **インフラストラクチャの拡張**
   - 外部サービス連携の充実
   - バックグラウンドジョブシステム

## Frontend（/web）

### 実装されたディレクトリ構造
```
/web
  /app
    # ページ構造（App Router）
    /(auth)
      /login          # ログインページ
      /signup         # サインアップページ
      /reset-password # パスワードリセット
    
    /(dashboard)
      /page.tsx       # ダッシュボード（ホーム画面）
    
    /cases
      /page.tsx       # 案件一覧
      /[id]
        /page.tsx     # 案件詳細
        /edit         # 案件編集
        /timeline     # タイムライン表示
    
    /templates
      /page.tsx       # テンプレート一覧
      /[id]
        /page.tsx     # テンプレート詳細
        /edit         # テンプレート編集（D&Dエディター）
    
    /gantt
      /page.tsx       # ガントチャート
    
    /calendar
      /page.tsx       # カレンダー
    
    /kanban
      /page.tsx       # カンバンボード
    
    /search
      /page.tsx       # 検索ページ
    
    /settings
      /profile        # プロフィール設定
      /notifications  # 通知設定
    
    # レイアウト・メタデータ
    /layout.tsx       # ルートレイアウト
    /loading.tsx      # ローディング画面
    /error.tsx        # エラー画面
    /not-found.tsx    # 404ページ
    /middleware.ts    # 認証ミドルウェア
  
  /components
    /ui               # 基本UIコンポーネント
      /button         # Button.tsx, button.variants.ts
      /input          # Input.tsx, TextArea.tsx
      /modal          # Modal.tsx, Dialog.tsx
      /form           # Form.tsx, FormField.tsx
      /table          # Table.tsx, DataTable.tsx
      /card           # Card.tsx
      /badge          # Badge.tsx
      /toast          # Toast.tsx, Toaster.tsx
    
    /layout           # レイアウトコンポーネント
      /header         # Header.tsx, Navigation.tsx
      /sidebar        # Sidebar.tsx, SidebarItem.tsx
      /footer         # Footer.tsx
    
    /auth             # 認証関連コンポーネント
      /login-form     # LoginForm.tsx
      /signup-form    # SignupForm.tsx
      /auth-guard     # AuthGuard.tsx
    
    /templates        # テンプレート関連コンポーネント
      /template-list  # TemplateList.tsx, TemplateCard.tsx
      /template-editor # TemplateEditor.tsx, StepEditor.tsx
      /dnd-editor     # DragDropEditor.tsx, StepNode.tsx
    
    /cases            # 案件関連コンポーネント
      /case-list      # CaseList.tsx, CaseCard.tsx
      /case-detail    # CaseDetail.tsx, CaseHeader.tsx
      /step-list      # StepList.tsx, StepItem.tsx
      /timeline       # Timeline.tsx, TimelineItem.tsx
    
    /gantt            # ガントチャート
      /gantt-chart    # GanttChart.tsx, GanttBar.tsx
      /gantt-timeline # GanttTimeline.tsx
    
    /kanban           # カンバンボード
      /kanban-board   # KanbanBoard.tsx, KanbanColumn.tsx
      /kanban-card    # KanbanCard.tsx
    
    /search           # 検索機能
      /search-bar     # SearchBar.tsx
      /search-results # SearchResults.tsx, SearchItem.tsx
      /search-filters # SearchFilters.tsx
    
    /notifications    # 通知システム
      /notification-list # NotificationList.tsx
      /notification-item # NotificationItem.tsx
    
    /shortcuts        # キーボードショートカット
      /shortcut-provider # ShortcutProvider.tsx
      /shortcut-help     # ShortcutHelp.tsx
  
  /contexts           # React Context
    /auth-context     # AuthContext.tsx, useAuth.ts
    /websocket-context # WebSocketContext.tsx, useWebSocket.ts
    /theme-context    # ThemeContext.tsx, useTheme.ts
  
  /hooks              # カスタムフック
    /use-api          # useApi.ts, useApiMutation.ts
    /use-auth         # useAuth.ts, usePermissions.ts
    /use-websocket    # useWebSocket.ts, useRealtime.ts
    /use-search       # useSearch.ts, useSearchHistory.ts
    /use-shortcuts    # useShortcuts.ts, useKeyboard.ts
  
  /lib                # ユーティリティライブラリ
    /api-client       # api.ts, endpoints.ts, types.ts
    /auth             # auth.utils.ts, token.utils.ts
    /date-utils       # date.utils.ts, business-days.ts
    /validation       # validation.schemas.ts, validators.ts
    /utils            # common.utils.ts, format.utils.ts
  
  /providers          # プロバイダー
    /query-provider   # QueryProvider.tsx（React Query）
    /websocket-provider # WebSocketProvider.tsx
    /theme-provider   # ThemeProvider.tsx
  
  /types              # TypeScript型定義
    /api              # api.types.ts, response.types.ts
    /auth             # auth.types.ts, user.types.ts
    /domain           # case.types.ts, template.types.ts, step.types.ts
    /ui               # ui.types.ts, component.types.ts
  
  /utils              # ユーティリティ関数
    /format           # format.utils.ts, currency.utils.ts
    /validation       # validation.utils.ts
    /storage          # localStorage.utils.ts, sessionStorage.utils.ts
  
  /styles             # スタイル
    /globals.css      # グローバルスタイル
    /components.css   # コンポーネントスタイル
    /themes           # テーマ定義
  
  /public             # 静的ファイル
    /icons            # アイコンファイル
    /images           # 画像ファイル
    /manifest.json    # PWAマニフェスト
```

### 主要な追加・変更点

1. **認証システムの完全実装**
   - 認証ページ（ログイン・サインアップ）
   - 認証ガード・ミドルウェア
   - 認証状態管理

2. **ダッシュボード機能**
   - ホーム画面の実装
   - サマリー表示・クイックアクション

3. **可視化機能の大幅拡張**
   - ガントチャート詳細実装
   - カンバンボード実装
   - カレンダー機能実装

4. **検索機能の実装**
   - 統合検索システム
   - 検索結果表示・フィルタリング

5. **リアルタイム機能**
   - WebSocket通信
   - リアルタイム通知システム

6. **開発者体験の向上**
   - TypeScript型定義の充実
   - カスタムフックの実装
   - ユーティリティ関数の整備

## 設計原則

### Clean Architecture準拠
- **ドメイン層**: ビジネスロジックの中核
- **アプリケーション層**: ユースケースの実装
- **インフラストラクチャ層**: 外部システム連携
- **インターフェース層**: API・UI

### DDD（Domain-Driven Design）
- **エンティティ**: ビジネスオブジェクト
- **値オブジェクト**: 不変オブジェクト
- **ドメインサービス**: ドメインロジック
- **リポジトリ**: データアクセス抽象化

### 拡張性・保守性
- **モジュラー設計**: 機能別モジュール分割
- **依存性注入**: 疎結合設計
- **テスタビリティ**: テスト容易性の確保
- **型安全性**: TypeScript活用

## 変更履歴

### v1.1での主要な変更点

1. **バックエンド構造の拡張**
   - 認証・認可システムの追加
   - コントローラーの大幅拡張（8→15コントローラー）
   - ユースケースの詳細化・機能別分割

2. **フロントエンド構造の拡張**
   - 認証ページの追加
   - 可視化機能の実装（ガント・カンバン・カレンダー）
   - 検索機能の実装
   - リアルタイム機能の追加

3. **開発基盤の強化**
   - TypeScript型定義の充実
   - テスト構造の整備
   - ドキュメント自動生成対応

4. **運用・保守性の向上**
   - ログ出力の構造化
   - エラーハンドリングの詳細化
   - 監視・メトリクス対応
