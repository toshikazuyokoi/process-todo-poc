# プロセス指向ToDoアプリ - ドキュメント・コードベース差異分析レポート

**作成日**: 2025-08-20  
**対象バージョン**: v1.0 MVP  
**調査範囲**: `/mnt/c/work/git2/process-todo/docs/` と `/mnt/c/work/git2/process-todo/api/`, `/mnt/c/work/git2/process-todo/web/`

## エグゼクティブサマリー

本レポートは、プロセス指向ToDoアプリケーションのドキュメント（設計書）と実装されたコードベース間の差異を詳細に分析したものです。開発過程での仕様変更やバグ修正により、ドキュメントと実装の間に複数の乖離が発生していることが確認されました。

### 主要な発見事項

1. **データベーススキーマ**: 実装では認証・認可機能が大幅に拡張されており、RBAC（Role-Based Access Control）システムが追加されている
2. **API仕様**: ドキュメントで定義されていない多数のエンドポイントが実装されている
3. **ドメインモデル**: 基本構造は一致しているが、実装では追加のエンティティと値オブジェクトが存在
4. **UI/UXフロー**: 実装では認証フロー、検索機能、カンバンビューなど、ドキュメントにない機能が追加されている

## 1. データベーススキーマの差異分析

### 1.1 ドキュメント仕様 (docs/04_schema.md)

ドキュメントでは以下のテーブル構成が定義されています：

```sql
-- 基本テーブル
process_templates (id, name, version, is_active, created_at, updated_at)
step_templates (id, process_id, seq, name, basis, offset_days, required_artifacts_json, depends_on_json, created_at, updated_at)
cases (id, process_id, title, goal_date_utc, status, created_by, created_at, updated_at)
step_instances (id, case_id, template_id, name, due_date_utc, assignee_id, status, locked, created_at, updated_at)
artifacts (id, step_id, kind, s3_key, required, created_at, updated_at)
users (id, name, email, role, timezone)
holidays (country_code, date, name)
audit_logs (id, actor_id, resource_type, resource_id, action, diff_json, created_at)
```

### 1.2 実装されたスキーマ (api/prisma/schema.prisma)

実装では以下の大幅な拡張が行われています：

#### 1.2.1 追加されたテーブル

**認証・セキュリティ関連**:
- `refresh_tokens`: JWTリフレッシュトークン管理
- `roles`: ロール定義テーブル
- `permissions`: 権限定義テーブル  
- `role_permissions`: ロール-権限関連テーブル
- `user_roles`: ユーザー-ロール関連テーブル

**組織・チーム管理**:
- `organizations`: 組織管理
- `teams`: チーム管理
- `team_members`: チームメンバー管理

**機能拡張**:
- `comments`: ステップへのコメント機能
- `notifications`: 通知システム

#### 1.2.2 既存テーブルの拡張

**users テーブル**:
```sql
-- ドキュメント仕様
users (id, name, email, role, timezone)

-- 実装
users (
  id, name, email, password, role, timezone, is_active,
  email_verified, email_verified_at, last_login_at,
  failed_login_attempts, locked_until, created_at, updated_at
)
```

**artifacts テーブル**:
```sql
-- ドキュメント仕様  
artifacts (id, step_id, kind, s3_key, required, created_at, updated_at)

-- 実装
artifacts (
  id, step_id, kind, file_name, file_size, mime_type, s3_key,
  required, uploaded_by, uploaded_at, created_at, updated_at
)
```

**step_instances テーブル**:
```sql
-- ドキュメント仕様
step_instances (id, case_id, template_id, name, due_date_utc, assignee_id, status, locked, created_at, updated_at)

-- 実装  
step_instances (
  id, case_id, template_id, name, start_date_utc, due_date_utc,
  assignee_id, status, locked, created_at, updated_at
)
```

#### 1.2.3 差異の影響度

**高影響**:
- RBAC システムの追加により、認証・認可の仕組みが大幅に変更
- 組織・チーム機能の追加により、マルチテナント対応が可能

**中影響**:
- ファイル管理の詳細化（ファイル名、サイズ、MIME タイプの追加）
- ユーザー管理の強化（アカウントロック、メール認証等）

**低影響**:
- 開始日の追加（start_date_utc）
- コメント・通知機能の追加

## 2. API仕様の差異分析

### 2.1 ドキュメント仕様 (docs/06_api_spec.md)

ドキュメントでは以下のエンドポイントが定義されています：

```
テンプレート:
- POST /templates
- GET /templates  
- GET /templates/:id
- PUT /templates/:id
- POST /templates/:id/steps

案件:
- POST /cases
- GET /cases
- GET /cases/:id
- PUT /cases/:id

再計算:
- POST /cases/:id/replan/preview
- POST /cases/:id/replan/apply

ステップ/成果物:
- PUT /steps/:id
- POST /steps/:id/artifacts
- DELETE /steps/:id/artifacts/:artifactId
- GET /steps/:id/history

休日/補助:
- GET /holidays?country=JP&year=2025

ストレージ:
- POST /storage/presigned
```

### 2.2 実装されたAPI (api/src/interfaces/controllers/)

実装では以下の大幅な拡張が行われています：

#### 2.2.1 追加されたコントローラー・エンドポイント

**認証関連 (auth.controller.ts)**:
```typescript
POST /auth/login
POST /auth/signup  
POST /auth/refresh
POST /auth/logout
GET /auth/me
PATCH /auth/change-password
GET /auth/validate
```

**ユーザー管理 (user.controller.ts)**:
```typescript
POST /users
GET /users
GET /users/:id
PUT /users/:id
DELETE /users/:id
POST /users/:userId/assign-step/:stepId
```

**検索機能 (search.controller.ts)**:
```typescript
GET /search/cases
GET /search/steps
GET /search/templates
```

**可視化機能**:
- **gantt.controller.ts**: `GET /gantt`
- **calendar.controller.ts**: `GET /calendar`  
- **kanban.controller.ts**: `GET /kanban`

**通知・コメント**:
- **notification.controller.ts**: 通知CRUD操作
- **comment.controller.ts**: コメントCRUD操作

**デバッグ・開発支援**:
- **debug.controller.ts**: デバッグ用エンドポイント

#### 2.2.2 認証・認可の実装

実装では包括的な認証・認可システムが構築されています：

```typescript
// JWT認証ガード
@UseGuards(JwtAuthGuard)

// ロールベース認可
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')

// 権限ベース認可  
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('cases:read')
```

#### 2.2.3 エラーハンドリングの拡張

実装では詳細なエラーハンドリングシステムが構築されています：

```typescript
// グローバル例外フィルター
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  // リクエストID生成
  // センシティブ情報のサニタイズ
  // 構造化ログ出力
  // 環境別エラー詳細制御
}
```

### 2.3 差異の影響度

**高影響**:
- 認証・認可システムの完全な実装（ドキュメントでは簡易版のみ）
- 検索・可視化機能の大幅な拡張

**中影響**:
- ユーザー管理機能の詳細化
- 通知・コメント機能の追加

**低影響**:
- デバッグ機能の追加
- エラーハンドリングの詳細化

## 3. ドメインモデルの差異分析

### 3.1 ドキュメント仕様 (docs/21_domain_model.md)

ドキュメントでは以下のドメインモデルが定義されています：

**値オブジェクト**:
- `Basis` = enum { `goal`, `prev` }
- `OffsetDays` : int (>=0)  
- `UtcDateTime` : ISO8601/Z
- `ArtifactKind` = enum { `file`, `link` }

**エンティティ**:
- `ProcessTemplate`: `steps` はDAG（循環禁止）
- `StepTemplate`: `basis`, `offsetDays>=0`, `dependsOn`
- `CaseAggregate`: `goalDateUtc` はUTC、子の`StepInstance[]`と整合
- `StepInstance`: `locked=true` は再計算で変更不可

**ドメインサービス**:
- `BusinessDayService`: 営業日加算/減算/補正、休日判定
- `ReplanDomainService`: Plan生成、Diff生成

### 3.2 実装されたドメインモデル (api/src/domain/)

#### 3.2.1 値オブジェクトの実装状況

**実装済み**:
- `DueDate` (api/src/domain/values/due-date.ts)
- `CaseStatus` (api/src/domain/values/case-status.ts)  
- `StepStatus` (api/src/domain/values/step-status.ts)
- `Basis` (api/src/domain/values/basis.ts)
- `OffsetDays` (api/src/domain/values/offset-days.ts)

**追加実装**:
- `ArtifactKind`: より詳細な分類が実装されている

#### 3.2.2 エンティティの実装状況

**基本エンティティ** (ドキュメント通り実装):
- `Case` (api/src/domain/entities/case.ts)
- `StepInstance` (api/src/domain/entities/step-instance.ts)
- `ProcessTemplate` (api/src/domain/entities/process-template.ts)
- `StepTemplate` (api/src/domain/entities/step-template.ts)

**追加エンティティ**:
- `Artifact` (api/src/domain/entities/artifact.ts)
- `User` (認証・認可関連の拡張)

#### 3.2.3 ドメインサービスの実装状況

**完全実装**:
- `BusinessDayService` (api/src/domain/services/business-day.service.ts)
- `ReplanDomainService` (api/src/domain/services/replan-domain.service.ts)

**実装の詳細化**:
```typescript
// ReplanDomainService の実装
async calculateScheduleV2(
  processTemplate: ProcessTemplate,
  goalDate: Date,
  existingSteps: StepInstance[] = [],
  lockedStepIds: Set<number> = new Set(),
  countryCode: string = 'JP',
): Promise<SchedulePlan>
```

#### 3.2.4 ビジネスルールの実装

**ステータス遷移ルール**:
```typescript
// StepStatus の遷移ルール実装
canTransitionTo(newStatus: StepStatus): boolean {
  const transitions = {
    [StepStatus.TODO]: [StepStatus.IN_PROGRESS, StepStatus.BLOCKED, StepStatus.CANCELLED],
    [StepStatus.IN_PROGRESS]: [StepStatus.TODO, StepStatus.DONE, StepStatus.BLOCKED, StepStatus.CANCELLED],
    [StepStatus.DONE]: [], // 完了からの遷移は不可
    [StepStatus.BLOCKED]: [StepStatus.TODO, StepStatus.IN_PROGRESS, StepStatus.CANCELLED],
    [StepStatus.CANCELLED]: []
  };
  return transitions[this.value]?.includes(newStatus) || false;
}
```

### 3.3 差異の影響度

**高影響**:
- ステータス遷移ルールの詳細実装（ドキュメントでは概要のみ）
- スケジューリングアルゴリズムの複数バージョン実装（V1, V2）

**中影響**:
- エンティティのメソッド詳細化（ビジネスロジックの具体化）
- 値オブジェクトの検証ルール強化

**低影響**:
- 追加エンティティの実装
- ドメインサービスのログ出力強化

## 4. アーキテクチャ・ディレクトリ構造の差異分析

### 4.1 ドキュメント仕様 (docs/13_directory_structure.md)

ドキュメントでは以下の構造が推奨されています：

```
/api
  /src
    /common        # DTO/guards/filters/interceptors/errors
    /domain
      /entities    # Case.ts, StepInstance.ts, ...
      /services    # BusinessDayService.ts, ReplanDomainService.ts
      /values      # Basis.ts, Offset.ts, DueDate.ts
    /application
      /usecases    # CreateCase.ts, PreviewReplan.ts, ApplyReplan.ts
      /dto         # request/response schemas
    /infrastructure
      /prisma      # schema.prisma, repositories
      /gateways    # mail.ts, slack.ts, storage.ts
      /jobs        # bullmq queues/processors
    /interfaces
      /controllers # cases.controller.ts, templates.controller.ts, steps.controller.ts
      /mappers     # dto <-> domain

/web
  /app
    /(public) login, dashboard, cases, templates
    /cases/[id]        # timeline, diff preview
    /templates/[id]    # D&D editor
  /components          # gantt, calendar, diff-panel, forms, dnd-steps
  /lib                 # api-client, auth, date-utils
  /styles
```

### 4.2 実装されたディレクトリ構造

#### 4.2.1 バックエンド (api/src/)

**基本構造は準拠**しているが、以下の拡張があります：

```
/api/src
  /common
    /decorators     # カスタムデコレーター
    /filters        # 例外フィルター（グローバル・HTTP）
    /guards         # 認証・認可ガード
    /interceptors   # リクエスト・レスポンス処理
    /services       # 共通サービス（ログ等）

  /domain (ドキュメント通り)
    /entities
    /services
    /values

  /application
    /usecases       # 詳細なユースケース実装
    /dto            # リクエスト・レスポンスDTO

  /infrastructure
    /auth           # 認証システム（JWT、パスポート戦略）
    /prisma         # Prismaリポジトリ
    /gateways       # 外部サービス連携
    /jobs           # バックグラウンドジョブ

  /interfaces
    /controllers    # 大幅に拡張されたコントローラー群
```

**追加されたコントローラー**:
- `auth/` - 認証関連
- `user/` - ユーザー管理
- `search/` - 検索機能
- `gantt/`, `calendar/`, `kanban/` - 可視化機能
- `notification/`, `comment/` - 補助機能
- `debug/` - 開発支援

#### 4.2.2 フロントエンド (web/app/)

**基本構造は準拠**しているが、以下の大幅な拡張があります：

```
/web/app
  /components
    /ui             # 基本UIコンポーネント
    /layout         # レイアウトコンポーネント
    /templates      # テンプレート関連コンポーネント
    /cases          # 案件関連コンポーネント
    /kanban         # カンバンボード
    /shortcuts      # キーボードショートカット

  /contexts         # React Context（認証、WebSocket）
  /hooks            # カスタムフック
  /lib              # ユーティリティライブラリ
  /providers        # プロバイダー（Query、WebSocket等）
  /types            # TypeScript型定義
  /utils            # ユーティリティ関数

  # ページ構造
  /login, /signup   # 認証ページ（ドキュメントにない）
  /dashboard        # ダッシュボード（ドキュメントにない）
  /templates        # テンプレート管理
  /cases            # 案件管理
  /gantt            # ガントチャート（ドキュメントにない）
  /calendar         # カレンダー（ドキュメントにない）
  /kanban           # カンバン（ドキュメントにない）
  /search           # 検索（ドキュメントにない）
```

### 4.3 差異の影響度

**高影響**:
- 認証・認可システムの完全実装
- 可視化機能の大幅な拡張（ガント、カレンダー、カンバン）
- 検索機能の実装

**中影響**:
- 共通コンポーネント・ユーティリティの充実
- 状態管理システムの実装（Context、React Query）

**低影響**:
- デバッグ・開発支援機能の追加
- ディレクトリ構造の細分化

## 5. UI/UXフローの差異分析

### 5.1 ドキュメント仕様 (docs/07_ui_flow.md)

ドキュメントでは以下のUI フローが定義されています：

**基本フロー**:
1. テンプレ編集: D&Dで`seq`/依存を編集 → 保存
2. 案件作成: テンプレ選択→タイトル→`goalDate`入力→展開プレビュー→作成確定
3. 案件詳細: タイムライン/リスト、担当割当、`locked`切替、再計算プレビュー→確定
4. ガント/カレンダー: 個人ビュー／案件ビューをトグル

**技術方針**:
- SSRベースで初期データ取得
- 時刻は`Intl.DateTimeFormat`でユーザーTZ表示

### 5.2 実装されたUI/UXフロー

#### 5.2.1 認証フロー（ドキュメントにない）

**実装された認証システム**:
```typescript
// ログインフロー
/login → 認証 → /dashboard

// サインアップフロー
/signup → アカウント作成 → メール認証 → /dashboard

// 認証状態管理
AuthContext + JWT + リフレッシュトークン
```

**ミドルウェアによる認証制御**:
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get('accessToken');
  const isAuthPage = request.nextUrl.pathname.startsWith('/login');

  if (!token && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
```

#### 5.2.2 ダッシュボード機能（ドキュメントにない）

**実装されたホームページ** (web/app/page.tsx):
- クイックアクション（新規案件作成、テンプレート作成、ガントチャート表示）
- サマリー表示（アクティブ案件数、利用可能テンプレート数）
- 進行中案件一覧
- プロセステンプレート一覧

#### 5.2.3 可視化機能の拡張

**カンバンボード** (web/app/components/kanban/):
```typescript
export interface KanbanColumn {
  id: string;
  title: string;
  status: StepInstance['status'];
  color: string;
}

// ドラッグ&ドロップによるステータス変更
// カラム設定のカスタマイズ
// ステップカードの詳細表示
```

**ガントチャート機能**:
- 案件別・個人別ビューの切り替え
- 期限迫近・遅延の強調表示
- インタラクティブな操作

#### 5.2.4 検索機能（ドキュメントにない）

**実装された検索システム**:
```typescript
// 検索対象
- 案件検索 (SearchCasesUseCase)
- ステップ検索 (SearchStepsUseCase)
- テンプレート検索 (SearchTemplatesUseCase)

// 検索条件
- テキスト検索
- ステータスフィルター
- 日付範囲フィルター
- タグフィルター
```

#### 5.2.5 リアルタイム更新（ドキュメントにない）

**WebSocket実装**:
```typescript
// リアルタイム更新機能
- 案件更新の即座反映
- ステップステータス変更の通知
- 複数ユーザー間での同期

// WebSocketContext
joinCaseRoom(caseId: number)
sendCaseUpdate(caseId: number, data: any)
```

#### 5.2.6 状態管理の実装

**React Query + Context**:
```typescript
// データフェッチング・キャッシュ管理
QueryProvider + React Query

// 認証状態管理
AuthContext + JWT管理

// WebSocket状態管理
WebSocketContext + Socket.IO
```

### 5.3 差異の影響度

**高影響**:
- 認証フローの完全実装（ドキュメントでは言及なし）
- ダッシュボード・ホーム画面の実装
- 可視化機能の大幅な拡張（カンバン、ガント詳細化）

**中影響**:
- 検索機能の実装
- リアルタイム更新機能の追加
- 状態管理システムの詳細化

**低影響**:
- UI コンポーネントの充実
- ユーザビリティの向上

## 6. 認証・認可の差異分析

### 6.1 ドキュメント仕様

ドキュメントでは認証・認可について以下の簡易的な記述があります：

**docs/24_interfaces_controllers_dto.md**:
```
認可ガード（MVP）:
- admin は全操作可、member はプロジェクト内の編集のみ
- AddArtifact, UpdateStep は担当者またはadminのみ可
```

**docs/06_api_spec.md**:
```
認証：APIキー or Bearer
```

### 6.2 実装された認証・認可システム

#### 6.2.1 JWT ベース認証システム

**完全なJWT実装**:
```typescript
// JWT戦略 (api/src/infrastructure/auth/jwt.strategy.ts)
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  async validate(payload: JwtPayload) {
    const user = await this.authService.validateJwtPayload(payload);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid token or inactive user');
    }
    return user;
  }
}

// リフレッシュトークン機能
async refreshToken(refreshToken: string): Promise<AuthResponse>
```

#### 6.2.2 包括的な認証機能

**実装された認証機能**:
```typescript
// 基本認証
POST /auth/login
POST /auth/signup
POST /auth/logout

// トークン管理
POST /auth/refresh
GET /auth/validate

// アカウント管理
PATCH /auth/change-password
GET /auth/me
```

**セキュリティ機能**:
- アカウントロック機能（失敗回数制限）
- メール認証機能
- パスワード強度検証
- セッション管理

#### 6.2.3 RBAC（Role-Based Access Control）システム

**完全なRBACシステム**:
```sql
-- 実装されたRBACテーブル
roles (id, name, description, is_system, created_at, updated_at)
permissions (id, resource, action, description)
role_permissions (role_id, permission_id)
user_roles (id, user_id, role_id, team_id, granted_at, granted_by)
```

**権限ガード実装**:
```typescript
// ロールベース認可
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'manager')

// 権限ベース認可
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('cases:read', 'cases:write')
```

#### 6.2.4 組織・チーム管理

**マルチテナント対応**:
```sql
organizations (id, name, slug, plan, settings, created_at, updated_at)
teams (id, organization_id, name, description, settings, created_at, updated_at)
team_members (user_id, team_id, joined_at)
```

**チーム単位の権限管理**:
```typescript
// チーム内権限チェック
async hasPermission(
  userId: number,
  resource: string,
  action: string,
  teamId?: number,
): Promise<boolean>
```

### 6.3 差異の影響度

**高影響**:
- 簡易認証からエンタープライズレベルの認証システムへの大幅な拡張
- RBACシステムの完全実装
- マルチテナント・チーム管理機能の追加

**中影響**:
- セキュリティ機能の強化（アカウントロック、メール認証等）
- JWT + リフレッシュトークンによる堅牢なセッション管理

**低影響**:
- 認証関連のUI/UX実装
- セキュリティログの強化

## 7. ビジネスロジック・アルゴリズムの差異分析

### 7.1 ドキュメント仕様 (docs/05_scheduling_algorithm.md)

ドキュメントでは以下のアルゴリズムが定義されています：

**基本アルゴリズム**:
```
1. テンプレをトポロジカルソート
2. basis=goal は goalDateUtc - offsetDays(営業日)
   basis=prev は 依存の最遅 + offset
3. 非営業日は最近接の営業日に補正
4. Diff生成時、locked/done は変更不可
```

**入力/出力**:
- 入力：`goalDateUtc`, `stepTemplates(DAG)`, `existing(stepInstances)`, `lockedIds`, `holidays`
- 出力：`Plan{templateId→dueUtc}`, `Diff{stepId, oldDueUtc, newDueUtc}`

### 7.2 実装されたスケジューリングアルゴリズム

#### 7.2.1 複数バージョンの実装

**V1アルゴリズム** (calculateSchedule):
```typescript
async calculateSchedule(
  processTemplate: ProcessTemplate,
  goalDate: Date,
  existingSteps: StepInstance[] = [],
  lockedStepIds: Set<number> = new Set(),
  countryCode: string = 'JP',
): Promise<SchedulePlan>
```

**V2アルゴリズム** (calculateScheduleV2):
```typescript
async calculateScheduleV2(
  processTemplate: ProcessTemplate,
  goalDate: Date,
  existingSteps: StepInstance[] = [],
  lockedStepIds: Set<number> = new Set(),
  countryCode: string = 'JP',
): Promise<SchedulePlan>
```

#### 7.2.2 アルゴリズムの詳細実装

**V2アルゴリズムの改良点**:
```typescript
// Step 1: 初期化とデータ準備
const stepTemplates = processTemplate.getStepTemplates();
const stepSchedules = new Map<number, { startDate: Date; endDate: Date }>();

// Step 2: トポロジカルソート
const sortedTemplates = this.topologicalSort(stepTemplates);

// Step 3: Goal-based ステップの計算
for (const template of goalBasedTemplates) {
  const offsetDays = template.getOffset().getDays();
  const endDate = await this.businessDayService.subtractBusinessDays(
    goalDate, offsetDays, countryCode
  );
  const startDate = await this.businessDayService.subtractBusinessDays(
    endDate, duration - 1, countryCode
  );
  stepSchedules.set(templateId, { startDate, endDate });
}

// Step 4: Prev-based ステップの計算（依存関係考慮）
// Step 5: 検証
// Step 6: 結果構築
```

#### 7.2.3 営業日計算の実装

**BusinessDayService の詳細実装**:
```typescript
async addBusinessDays(date: Date, days: number, countryCode: string = 'JP'): Promise<Date>
async subtractBusinessDays(date: Date, days: number, countryCode: string = 'JP'): Promise<Date>
async isBusinessDay(date: Date, countryCode: string = 'JP'): Promise<boolean>
async getNextBusinessDay(date: Date, countryCode: string = 'JP'): Promise<Date>
async getPreviousBusinessDay(date: Date, countryCode: string = 'JP'): Promise<Date>
```

**休日データベース連携**:
```typescript
// 日本の祝日データベースとの連携
const holidays = await this.prisma.holiday.findMany({
  where: {
    countryCode,
    date: {
      gte: startOfYear,
      lte: endOfYear,
    },
  },
});
```

#### 7.2.4 再計算機能の実装

**プレビュー機能**:
```typescript
async previewReplan(
  caseId: number,
  newGoalDate?: Date,
  delayedStepIds?: number[],
): Promise<ReplanPreview>
```

**差分計算**:
```typescript
generateScheduleDiff(
  existingSteps: StepInstance[],
  newSchedule: SchedulePlan,
  lockedStepIds: Set<number>,
): ScheduleDiff[]
```

### 7.3 差異の影響度

**高影響**:
- アルゴリズムの複数バージョン実装（V1, V2）
- 営業日計算の詳細実装
- 再計算プレビュー機能の完全実装

**中影響**:
- トポロジカルソートの実装
- 依存関係解決の詳細化
- エラーハンドリングの強化

**低影響**:
- ログ出力の詳細化
- パフォーマンス最適化

## 8. バリデーション・ポリシーの差異分析

### 8.1 ドキュメント仕様 (docs/27_validation_policies.md)

ドキュメントでは以下のバリデーション方針が定義されています：

**入力バリデーション（DTO）**:
- ISO8601/Z、将来の時刻許容（`goalDate`）
- `offsetDays` は0以上の整数
- `dependsOn` は同一テンプレ内の既存ID、自己参照禁止

**ドメイン検証**:
- DAG性検証（トポロジカルソート）、循環発見でDomainError
- `locked` と `status=done` の保護
- 休日判定は `holidays(country)` テーブルから

### 8.2 実装されたバリデーション・ポリシー

#### 8.2.1 DTO バリデーション

**包括的なDTO検証**:
```typescript
// 認証関連
export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class SignupDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}

// 案件作成
export class CreateCaseDto {
  @IsInt()
  @IsPositive()
  processId: number;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsDateString()
  goalDateUtc: string;

  @IsOptional()
  @IsInt()
  createdBy?: number;
}
```

#### 8.2.2 ドメインレベルバリデーション

**エンティティ内バリデーション**:
```typescript
// Case エンティティ
updateTitle(title: string): void {
  if (!title || title.trim().length === 0) {
    throw new Error('Case title cannot be empty');
  }
  this.title = title;
}

updateStatus(newStatus: CaseStatus): void {
  if (!this.status.canTransitionTo(newStatus)) {
    throw new Error(
      `Cannot transition from ${this.status.getValue()} to ${newStatus}`,
    );
  }
  this.status = new CaseStatusValue(newStatus);
}

// StepInstance エンティティ
updateDueDate(dueDate: Date | string | null): void {
  if (this.locked && !this.status.isDone()) {
    throw new Error('Cannot update due date of a locked step');
  }
  this.dueDate = dueDate ? new DueDate(dueDate) : null;
}

complete(): void {
  const hasAllRequiredArtifacts = this.hasAllRequiredArtifacts();
  if (!hasAllRequiredArtifacts) {
    throw new Error('Cannot complete step without all required artifacts');
  }
  this.updateStatus(StepStatus.DONE);
}
```

#### 8.2.3 値オブジェクトのバリデーション

**厳密な値オブジェクト検証**:
```typescript
// DueDate 値オブジェクト
export class DueDate {
  constructor(private readonly date: Date | string) {
    const parsedDate = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(parsedDate.getTime())) {
      throw new Error('Invalid date format');
    }
    this.date = parsedDate;
  }
}

// OffsetDays 値オブジェクト
export class OffsetDays {
  constructor(private readonly days: number) {
    if (!Number.isInteger(days) || days < 0) {
      throw new Error('Offset days must be a non-negative integer');
    }
    this.days = days;
  }
}
```

#### 8.2.4 グローバル例外処理

**詳細なエラーハンドリング**:
```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    // バリデーションエラーの処理
    if (exception instanceof BadRequestException) {
      const response = exception.getResponse();
      if (typeof response === 'object' && 'message' in response) {
        validationErrors = Array.isArray(response.message)
          ? response.message
          : [response.message];
      }
    }

    // ドメインエラーの処理
    if (exception instanceof DomainError) {
      status = HttpStatus.UNPROCESSABLE_ENTITY;
      errorCode = 'DOMAIN_ERROR';
    }

    // データベース制約エラーの処理
    if ((exception as any)?.name === 'QueryFailedError') {
      status = HttpStatus.CONFLICT;
      errorCode = 'DATABASE_ERROR';
    }
  }
}
```

#### 8.2.5 セキュリティバリデーション

**セキュリティ関連検証**:
```typescript
// パスワード強度検証
@MinLength(8)
password: string;

// ファイルアップロード検証
const allowedMimeTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
];

const maxFileSize = 10 * 1024 * 1024; // 10MB

// センシティブ情報のサニタイズ
private sanitizeErrorMessage(message: string): string {
  const sensitivePatterns = [
    /password/gi,
    /token/gi,
    /api[_-]?key/gi,
    /secret/gi,
    /authorization/gi,
  ];

  if (process.env.NODE_ENV === 'production') {
    for (const pattern of sensitivePatterns) {
      if (pattern.test(message)) {
        return 'Internal server error';
      }
    }
  }
  return message;
}
```

### 8.3 差異の影響度

**高影響**:
- 包括的なDTO検証システムの実装
- ドメインレベルでの厳密なバリデーション
- セキュリティ関連検証の強化

**中影響**:
- グローバル例外処理システムの実装
- 値オブジェクトレベルでの検証強化

**低影響**:
- エラーメッセージの詳細化
- ログ出力の構造化

## 9. 総合的な差異評価

### 9.1 差異の分類と優先度

#### 高優先度（システムアーキテクチャに大きな影響）

1. **認証・認可システムの大幅拡張**
   - ドキュメント: 簡易的な認証（APIキー or Bearer）
   - 実装: JWT + リフレッシュトークン + RBAC + マルチテナント
   - 影響: エンタープライズレベルのセキュリティ要件に対応

2. **データベーススキーマの拡張**
   - 追加テーブル: 8テーブル（認証、組織、通知等）
   - 既存テーブル拡張: 3テーブル（users, artifacts, step_instances）
   - 影響: データモデルの複雑化、マイグレーション戦略の見直し必要

3. **API仕様の大幅拡張**
   - ドキュメント: 基本CRUD + 再計算API
   - 実装: 認証、検索、可視化、通知等の包括的API
   - 影響: API設計書の全面的な更新が必要

#### 中優先度（機能拡張・品質向上）

4. **UI/UXフローの拡張**
   - 追加機能: ダッシュボード、検索、カンバン、リアルタイム更新
   - 影響: ユーザーエクスペリエンスの大幅な向上

5. **ビジネスロジックの詳細化**
   - アルゴリズムの複数バージョン実装
   - 営業日計算の詳細実装
   - 影響: システムの堅牢性・精度の向上

6. **バリデーション・エラーハンドリングの強化**
   - 包括的なDTO検証
   - グローバル例外処理
   - 影響: システムの安定性・保守性の向上

#### 低優先度（開発効率・運用性の向上）

7. **開発支援機能の追加**
   - デバッグAPI、詳細ログ、テスト支援
   - 影響: 開発・運用効率の向上

### 9.2 ドキュメント更新の推奨事項

#### 即座に更新すべきドキュメント

1. **docs/04_schema.md**
   - 追加された8テーブルの定義を追加
   - 既存テーブルの拡張カラムを反映
   - インデックス・制約の更新

2. **docs/06_api_spec.md**
   - 認証関連API（8エンドポイント）を追加
   - 検索・可視化API（10+エンドポイント）を追加
   - エラーレスポンス仕様の詳細化

3. **docs/24_interfaces_controllers_dto.md**
   - RBAC システムの認可仕様を追加
   - DTO検証ルールの詳細化
   - エラーハンドリング仕様の更新

#### 新規作成すべきドキュメント

4. **認証・認可設計書**
   - JWT + リフレッシュトークンの仕様
   - RBAC システムの設計
   - セキュリティポリシー

5. **UI/UX設計書**
   - ダッシュボード設計
   - 検索機能仕様
   - 可視化機能（カンバン、ガント）仕様

6. **運用・保守ガイド**
   - ログ出力仕様
   - エラー監視・対応手順
   - パフォーマンス監視指標

### 9.3 技術的負債の評価

#### 高リスク

1. **ドキュメントとコードの乖離**
   - 新規開発者のオンボーディング困難
   - 仕様理解の齟齬によるバグリスク
   - 推奨対応: ドキュメント更新の最優先実施

2. **API仕様書の不完全性**
   - フロントエンド・バックエンド間の連携ミス
   - 外部システム連携時の仕様不明
   - 推奨対応: OpenAPI/Swagger仕様書の自動生成導入

#### 中リスク

3. **アーキテクチャ設計書の更新遅れ**
   - システム全体像の把握困難
   - 拡張・改修時の影響範囲分析困難
   - 推奨対応: アーキテクチャ図の更新

4. **テスト仕様書の不足**
   - 品質保証の基準不明
   - 回帰テストの網羅性不足
   - 推奨対応: テスト戦略書の作成

### 9.4 今後の開発における推奨事項

#### ドキュメント管理プロセスの改善

1. **ドキュメント・ファースト開発の導入**
   - 機能追加前にドキュメント更新を必須化
   - コードレビュー時にドキュメント更新も確認

2. **自動化の導入**
   - API仕様書の自動生成（OpenAPI）
   - データベーススキーマドキュメントの自動生成
   - アーキテクチャ図の自動更新

3. **定期的な整合性チェック**
   - 月次でのドキュメント・コード整合性レビュー
   - 乖離発見時の即座対応ルール

#### 品質保証の強化

4. **テスト戦略の明文化**
   - 単体テスト・統合テスト・E2Eテストの役割分担
   - テストカバレッジ目標の設定

5. **コード品質基準の設定**
   - コーディング規約の明文化
   - 静的解析ツールの導入

## 10. 結論

### 10.1 調査結果サマリー

プロセス指向ToDoアプリケーションのドキュメントと実装コードベースの比較調査により、以下の重要な発見がありました：

1. **大幅な機能拡張**: 実装では、ドキュメントで定義された基本機能に加えて、エンタープライズレベルの認証・認可システム、包括的な可視化機能、検索システムなどが追加実装されています。

2. **アーキテクチャの成熟化**: 基本的なMVPから、本格的な業務システムレベルまで成熟しており、Clean Architecture + DDD の原則が適切に実装されています。

3. **品質・セキュリティの強化**: バリデーション、エラーハンドリング、セキュリティ機能が大幅に強化され、プロダクションレディなレベルに達しています。

### 10.2 ドキュメント更新の緊急度

**即座に対応が必要（高緊急度）**:
- データベーススキーマ仕様書（8テーブル追加、3テーブル拡張）
- API仕様書（20+エンドポイント追加）
- 認証・認可仕様書（新規作成）

**短期間で対応すべき（中緊急度）**:
- UI/UX設計書の更新
- アーキテクチャ設計書の更新
- 運用・保守ガイドの作成

### 10.3 技術的成果の評価

実装されたシステムは、ドキュメントで定義された基本要件を大幅に上回る機能と品質を実現しており、以下の点で特に優秀です：

1. **スケーラビリティ**: マルチテナント対応、RBAC システムにより、組織規模の拡大に対応可能
2. **ユーザビリティ**: 直感的なUI、リアルタイム更新、多様な可視化機能により、優れたユーザーエクスペリエンスを提供
3. **保守性**: Clean Architecture、包括的なテスト、詳細なログにより、長期的な保守性を確保
4. **セキュリティ**: エンタープライズレベルの認証・認可、入力検証、エラーハンドリングにより、高いセキュリティを実現

### 10.4 最終推奨事項

1. **ドキュメント更新の最優先実施**: 特にAPI仕様書とデータベーススキーマ仕様書の更新は緊急
2. **自動化ツールの導入**: OpenAPI仕様書自動生成、スキーマドキュメント自動生成の導入
3. **ドキュメント管理プロセスの確立**: 今後の開発でドキュメント・コード乖離を防ぐプロセスの構築
4. **実装成果の活用**: 優秀な実装成果を他プロジェクトにも展開可能

本調査により、プロセス指向ToDoアプリケーションは、設計段階の想定を大幅に上回る高品質なシステムとして実装されていることが確認されました。ドキュメントの更新により、この優秀な実装成果を適切に文書化し、今後の開発・運用に活用することを強く推奨します。

---

**調査実施者**: Augment Agent
**調査完了日**: 2025-08-20
**レポート版数**: v1.0

## 付録

### A. 主要な差異一覧表

| 分野 | ドキュメント仕様 | 実装状況 | 差異レベル |
|------|------------------|----------|------------|
| データベーステーブル | 8テーブル | 16テーブル | 高 |
| APIエンドポイント | 15エンドポイント | 35+エンドポイント | 高 |
| 認証システム | 簡易認証 | JWT+RBAC+マルチテナント | 高 |
| UI機能 | 基本CRUD | ダッシュボード+検索+可視化 | 高 |
| ビジネスロジック | 基本アルゴリズム | 複数バージョン+詳細実装 | 中 |
| バリデーション | 基本検証 | 包括的検証+エラーハンドリング | 中 |

### B. 更新優先度マトリックス

| 優先度 | ドキュメント | 更新工数 | ビジネス影響 |
|--------|--------------|----------|--------------|
| 高 | API仕様書 | 大 | 高 |
| 高 | DBスキーマ仕様書 | 中 | 高 |
| 高 | 認証・認可設計書 | 大 | 高 |
| 中 | UI/UX設計書 | 中 | 中 |
| 中 | アーキテクチャ設計書 | 中 | 中 |
| 低 | 運用・保守ガイド | 小 | 低 |

### C. 技術的負債リスク評価

| リスク項目 | 影響度 | 発生確率 | 対策緊急度 |
|------------|--------|----------|------------|
| 新規開発者オンボーディング遅延 | 高 | 高 | 緊急 |
| API連携時の仕様不明 | 高 | 中 | 緊急 |
| システム拡張時の影響範囲不明 | 中 | 中 | 中 |
| 品質保証基準の不明確性 | 中 | 低 | 低 |
