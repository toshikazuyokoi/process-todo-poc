# Phase 3.1: 認証・認可システム - 実装計画書

## 概要
プロセス管理システムに本格的な認証・認可システムを実装し、エンタープライズレベルのセキュリティを確保する。

## 実装目標
1. **認証システム**: JWT/OAuth2.0による安全な認証
2. **RBAC実装**: ロールベースアクセス制御
3. **チーム・組織管理**: マルチテナント対応
4. **監査ログ強化**: セキュリティイベントの完全記録

## アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Auth Context │  │ Protected    │  │ Login/Signup │  │
│  │ & Hooks      │  │ Routes       │  │ Pages        │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                     API Gateway                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ JWT Guard    │  │ RBAC Guard   │  │ Audit Logger │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                   Backend Services                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Auth Service │  │ User Service │  │ Team Service │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## 実装タスク詳細

### Week 1: 認証基盤の構築

#### タスク1.1: JWT認証システムの実装
**バックエンド実装**:
```typescript
// /api/src/infrastructure/auth/jwt.strategy.ts
- JWT戦略の実装（@nestjs/jwt）
- アクセストークン・リフレッシュトークンのペア管理
- トークン有効期限管理（アクセス: 15分、リフレッシュ: 7日）
- トークンブラックリスト機能（Redis）
```

**フロントエンド実装**:
```typescript
// /web/app/contexts/auth-context.tsx
- 認証コンテキストの作成
- トークン自動更新機構
- 認証状態管理（loading, authenticated, error）
- セキュアなトークン保存（httpOnly cookie）
```

**テスト**:
- JWT生成・検証テスト
- トークン有効期限テスト
- リフレッシュトークンローテーションテスト
- XSS/CSRF攻撃への耐性テスト

#### タスク1.2: ログイン・サインアップページ実装
**UI実装**:
```typescript
// /web/app/(auth)/login/page.tsx
// /web/app/(auth)/signup/page.tsx
- メールアドレス・パスワード認証
- パスワード強度チェック（zxcvbn）
- 2要素認証（TOTP）オプション
- ソーシャルログインボタン（OAuth準備）
```

**API実装**:
```typescript
// /api/src/interfaces/controllers/auth/auth.controller.ts
- POST /auth/login
- POST /auth/signup
- POST /auth/refresh
- POST /auth/logout
- POST /auth/verify-2fa
```

#### タスク1.3: パスワード管理機能
**実装内容**:
- パスワードリセット機能
- メール認証フロー
- パスワード履歴管理（直近5件の再利用防止）
- アカウントロック機能（5回失敗で30分ロック）

#### タスク1.4: セッション管理
**実装内容**:
```typescript
// /api/src/infrastructure/sessions/session.service.ts
- アクティブセッション管理
- 同時ログイン制限（デバイス3台まで）
- セッションタイムアウト（30分無操作）
- 強制ログアウト機能
```

### Week 2: RBAC（ロールベースアクセス制御）実装

#### タスク2.1: ロール・権限モデル設計
**データベーススキーマ**:
```sql
-- ロール定義
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 権限定義
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    UNIQUE(resource, action)
);

-- ロール権限マッピング
CREATE TABLE role_permissions (
    role_id INT REFERENCES roles(id),
    permission_id INT REFERENCES permissions(id),
    PRIMARY KEY(role_id, permission_id)
);

-- ユーザーロールマッピング
CREATE TABLE user_roles (
    user_id INT REFERENCES users(id),
    role_id INT REFERENCES roles(id),
    team_id INT REFERENCES teams(id),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by INT REFERENCES users(id),
    PRIMARY KEY(user_id, role_id, team_id)
);
```

#### タスク2.2: デフォルトロールの定義
**システムロール**:
1. **Super Admin**: 全権限
2. **Organization Admin**: 組織内全権限
3. **Team Manager**: チーム管理権限
4. **Project Owner**: プロジェクト所有者権限
5. **Editor**: 編集権限
6. **Viewer**: 閲覧権限

**権限マトリックス**:
| リソース | Super Admin | Org Admin | Team Manager | Project Owner | Editor | Viewer |
|---------|-------------|-----------|--------------|---------------|--------|--------|
| Users | CRUD | CRU | R | R | R | R |
| Teams | CRUD | CRUD | CRU | R | R | R |
| Templates | CRUD | CRUD | CRU | CRU | CRU | R |
| Cases | CRUD | CRUD | CRUD | CRUD | CRU | R |
| Steps | CRUD | CRUD | CRUD | CRUD | CRU | R |

#### タスク2.3: 権限チェックミドルウェア実装
**NestJS Guards**:
```typescript
// /api/src/infrastructure/guards/rbac.guard.ts
@Injectable()
export class RbacGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        // リソースとアクションを取得
        // ユーザーの権限をチェック
        // チーム/組織コンテキストを考慮
    }
}

// 使用例
@UseGuards(JwtAuthGuard, RbacGuard)
@RequirePermissions('cases:create')
@Post('cases')
createCase() { ... }
```

#### タスク2.4: フロントエンド権限制御
**実装内容**:
```typescript
// /web/app/hooks/use-permissions.ts
- useCanAccess(resource, action) フック
- ProtectedComponent ラッパー
- 権限に応じたUI要素の表示/非表示
- ルートレベルの保護
```

### Week 3: チーム・組織管理

#### タスク3.1: 組織モデル実装
**データモデル**:
```sql
CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    plan VARCHAR(50) DEFAULT 'free',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE teams (
    id SERIAL PRIMARY KEY,
    organization_id INT REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### タスク3.2: 招待システム実装
**機能**:
- メール招待機能
- 招待リンク生成（有効期限7日）
- 招待承認フロー
- 一括招待（CSV）

#### タスク3.3: チーム切り替え機能
**実装内容**:
- チームセレクター UI
- チームコンテキスト管理
- チーム間のデータ分離
- デフォルトチーム設定

#### タスク3.4: 組織設定管理
**設定項目**:
- SSO設定（SAML/OIDC）
- IP制限
- パスワードポリシー
- セッション設定
- 監査設定

### Week 4: 監査ログ・セキュリティ強化

#### タスク4.1: 監査ログシステム実装
**ログ対象イベント**:
```typescript
enum AuditEvent {
    // 認証イベント
    USER_LOGIN = 'user.login',
    USER_LOGOUT = 'user.logout',
    LOGIN_FAILED = 'login.failed',
    PASSWORD_CHANGED = 'password.changed',
    
    // データ操作イベント
    RESOURCE_CREATED = 'resource.created',
    RESOURCE_UPDATED = 'resource.updated',
    RESOURCE_DELETED = 'resource.deleted',
    
    // 権限イベント
    PERMISSION_GRANTED = 'permission.granted',
    PERMISSION_REVOKED = 'permission.revoked',
    
    // セキュリティイベント
    SUSPICIOUS_ACTIVITY = 'security.suspicious',
    ACCESS_DENIED = 'access.denied'
}
```

**ログ保存**:
```sql
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    user_id INT,
    organization_id INT,
    team_id INT,
    resource_type VARCHAR(100),
    resource_id INT,
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_event ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
```

#### タスク4.2: セキュリティヘッダー実装
**実装内容**:
- CSP（Content Security Policy）
- HSTS（HTTP Strict Transport Security）
- X-Frame-Options
- X-Content-Type-Options
- Rate Limiting（1分100リクエスト）

#### タスク4.3: OAuth2.0/OIDC統合
**プロバイダー対応**:
- Google OAuth
- GitHub OAuth  
- Microsoft Azure AD
- Okta（エンタープライズ）

#### タスク4.4: セキュリティ監視ダッシュボード
**実装内容**:
- ログイン試行回数グラフ
- 異常アクセス検知
- アクティブセッション一覧
- 権限変更履歴
- セキュリティアラート

## 技術スタック

### バックエンド
- **認証**: @nestjs/passport, @nestjs/jwt
- **暗号化**: bcrypt, crypto
- **2FA**: speakeasy, qrcode
- **セッション**: express-session, connect-redis
- **Rate Limiting**: @nestjs/throttler

### フロントエンド
- **認証状態管理**: React Context + useReducer
- **HTTP Client**: Axios with interceptors
- **フォーム**: react-hook-form + zod
- **セキュリティ**: DOMPurify, helmet

### インフラ
- **Redis**: セッション、トークンブラックリスト
- **PostgreSQL**: ユーザー、権限、監査ログ
- **Email**: SendGrid/AWS SES

## テスト戦略

### ユニットテスト
- JWT生成・検証
- パスワードハッシュ・検証
- 権限チェックロジック
- 監査ログ記録

### 統合テスト
- 認証フロー全体
- 権限継承・委譲
- チーム切り替え
- セッション管理

### E2Eテスト
- ログイン・ログアウト
- パスワードリセット
- 権限による画面制御
- 監査ログ確認

### セキュリティテスト
- SQLインジェクション
- XSS攻撃
- CSRF攻撃
- セッション固定攻撃
- ブルートフォース攻撃

## 実装順序

1. **Week 1**: JWT認証基盤（ログイン・サインアップ）
2. **Week 2**: RBAC実装（ロール・権限）
3. **Week 3**: チーム・組織管理
4. **Week 4**: 監査ログ・セキュリティ強化

## 成功指標

1. **セキュリティ**
   - OWASP Top 10への対策完了
   - ペネトレーションテスト合格
   - 監査ログ100%記録

2. **パフォーマンス**
   - 認証レスポンス < 200ms
   - 権限チェック < 50ms
   - 同時1000セッション対応

3. **ユーザビリティ**
   - ログイン成功率 > 95%
   - パスワードリセット完了率 > 90%
   - 2FA採用率 > 30%

## リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| トークン漏洩 | 高 | httpOnly cookie、短い有効期限 |
| ブルートフォース | 中 | Rate limiting、アカウントロック |
| 権限昇格 | 高 | 厳密な権限チェック、監査ログ |
| セッションハイジャック | 高 | セッション固定対策、IP検証 |

## マイルストーン

- **M1（Week 1終了）**: 基本認証動作
- **M2（Week 2終了）**: RBAC完全実装
- **M3（Week 3終了）**: マルチテナント対応
- **M4（Week 4終了）**: 本番環境レディ

## 参考資料

- [OWASP Authentication Cheatsheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [RBAC vs ABAC](https://www.okta.com/identity-101/rbac-vs-abac/)
- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)