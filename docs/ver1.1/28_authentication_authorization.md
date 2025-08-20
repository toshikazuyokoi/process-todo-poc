# 28 認証・認可設計書（v1.1）

## 概要
本ドキュメントは、プロセス指向ToDoアプリケーションの認証・認可システムの設計と実装を詳述します。
JWT認証、RBAC（Role-Based Access Control）システム、マルチテナント対応を含む包括的なセキュリティ機能を提供します。

## 認証システム

### JWT（JSON Web Token）認証

#### トークン構成
```typescript
// アクセストークンペイロード
interface JwtPayload {
  sub: number;        // ユーザーID
  email: string;      // メールアドレス
  name: string;       // ユーザー名
  roles: string[];    // ロール一覧
  permissions: string[]; // 権限一覧
  iat: number;        // 発行時刻
  exp: number;        // 有効期限
  jti: string;        // トークンID
}

// リフレッシュトークンペイロード
interface RefreshTokenPayload {
  sub: number;        // ユーザーID
  tokenId: string;    // トークンID
  iat: number;        // 発行時刻
  exp: number;        // 有効期限
}
```

#### トークン有効期限
- **アクセストークン**: 15分
- **リフレッシュトークン**: 7日間
- **メール認証トークン**: 24時間
- **パスワードリセットトークン**: 1時間

#### トークンリフレッシュフロー
```
1. クライアント → サーバー: リフレッシュトークン送信
2. サーバー: リフレッシュトークン検証
3. サーバー: 新しいアクセストークン生成
4. サーバー: 新しいリフレッシュトークン生成（ローテーション）
5. サーバー: 古いリフレッシュトークン無効化
6. サーバー → クライアント: 新しいトークンペア返却
```

### 認証フロー

#### ログインフロー
```typescript
POST /auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

// 成功レスポンス
{
  "accessToken": "eyJ...",
  "refreshToken": "refresh_token_here",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "User Name",
    "roles": ["member"],
    "permissions": ["cases:read", "cases:create"]
  },
  "expiresIn": 900
}
```

#### サインアップフロー
```typescript
POST /auth/signup
{
  "email": "newuser@example.com",
  "password": "password123",
  "name": "New User"
}

// 成功レスポンス
{
  "user": {
    "id": 2,
    "email": "newuser@example.com",
    "name": "New User",
    "emailVerified": false
  },
  "message": "Please check your email to verify your account"
}
```

#### メール認証フロー
```typescript
POST /auth/verify-email
{
  "token": "email_verification_token"
}

// 成功レスポンス
{
  "user": {
    "id": 2,
    "email": "newuser@example.com",
    "name": "New User",
    "emailVerified": true
  },
  "accessToken": "eyJ...",
  "refreshToken": "refresh_token_here"
}
```

### セキュリティ機能

#### アカウントロック機能
```typescript
// ログイン失敗時の処理
interface LoginAttemptPolicy {
  maxFailedAttempts: 5;           // 最大失敗回数
  lockoutDuration: 30 * 60 * 1000; // ロック時間（30分）
  resetWindow: 60 * 60 * 1000;    // リセット時間（1時間）
}

// 実装例
async validateLoginAttempt(email: string): Promise<void> {
  const user = await this.userRepository.findByEmail(email);
  
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new UnauthorizedException('Account is locked due to too many failed login attempts');
  }
  
  if (user.failedLoginAttempts >= 5) {
    user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
    await this.userRepository.save(user);
    throw new UnauthorizedException('Account locked due to too many failed login attempts');
  }
}
```

#### パスワードセキュリティ
```typescript
// パスワードハッシュ化
import * as bcrypt from 'bcrypt';

const saltRounds = 12;
const hashedPassword = await bcrypt.hash(password, saltRounds);

// パスワード検証
const isValid = await bcrypt.compare(password, user.hashedPassword);
```

## 認可システム（RBAC）

### ロール定義

#### システムロール
```typescript
enum SystemRole {
  ADMIN = 'admin',        // システム管理者
  MANAGER = 'manager',    // プロジェクト管理者
  MEMBER = 'member'       // 一般メンバー
}

// ロール階層
const roleHierarchy = {
  admin: ['manager', 'member'],
  manager: ['member'],
  member: []
};
```

#### ロール権限マトリックス
| リソース | アクション | Admin | Manager | Member |
|----------|------------|-------|---------|--------|
| users | create | ✓ | × | × |
| users | read | ✓ | ✓ | 自分のみ |
| users | update | ✓ | 自分のみ | 自分のみ |
| users | delete | ✓ | × | × |
| cases | create | ✓ | ✓ | ✓ |
| cases | read | ✓ | ✓ | ✓ |
| cases | update | ✓ | ✓ | 担当者のみ |
| cases | delete | ✓ | ✓ | × |
| templates | create | ✓ | ✓ | × |
| templates | read | ✓ | ✓ | ✓ |
| templates | update | ✓ | ✓ | × |
| templates | delete | ✓ | × | × |

### 権限システム

#### 権限定義
```typescript
interface Permission {
  id: number;
  resource: string;     // リソース名（例: cases, templates, users）
  action: string;       // アクション名（例: create, read, update, delete）
  description: string;  // 権限の説明
}

// 権限例
const permissions = [
  { resource: 'cases', action: 'create', description: '案件作成' },
  { resource: 'cases', action: 'read', description: '案件参照' },
  { resource: 'cases', action: 'update', description: '案件更新' },
  { resource: 'cases', action: 'delete', description: '案件削除' },
  { resource: 'cases', action: 'replan', description: '再計算実行' },
  { resource: 'templates', action: 'create', description: 'テンプレート作成' },
  { resource: 'templates', action: 'read', description: 'テンプレート参照' },
  { resource: 'templates', action: 'update', description: 'テンプレート更新' },
  { resource: 'templates', action: 'delete', description: 'テンプレート削除' }
];
```

#### 権限チェック実装
```typescript
@Injectable()
export class AuthorizationService {
  async hasPermission(
    userId: number,
    resource: string,
    action: string,
    teamId?: number
  ): Promise<boolean> {
    // ユーザーのロール取得
    const userRoles = await this.getUserRoles(userId, teamId);
    
    // ロールに紐づく権限取得
    const permissions = await this.getRolePermissions(userRoles);
    
    // 権限チェック
    return permissions.some(p => 
      p.resource === resource && p.action === action
    );
  }
  
  async checkPermission(
    userId: number,
    resource: string,
    action: string,
    teamId?: number
  ): Promise<void> {
    const hasPermission = await this.hasPermission(userId, resource, action, teamId);
    
    if (!hasPermission) {
      throw new ForbiddenException(
        `User ${userId} does not have permission ${resource}:${action}`
      );
    }
  }
}
```

### リソース所有者チェック

#### 所有者ベース認可
```typescript
@Injectable()
export class ResourceOwnerGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const resourceId = request.params.id;
    const resourceType = this.getResourceType(context);
    
    // 管理者は全てのリソースにアクセス可能
    if (user.roles.includes('admin')) {
      return true;
    }
    
    // リソース所有者チェック
    const isOwner = await this.checkResourceOwnership(
      user.id,
      resourceType,
      resourceId
    );
    
    return isOwner;
  }
  
  private async checkResourceOwnership(
    userId: number,
    resourceType: string,
    resourceId: number
  ): Promise<boolean> {
    switch (resourceType) {
      case 'case':
        const case = await this.caseRepository.findById(resourceId);
        return case?.createdBy === userId || 
               case?.stepInstances.some(step => step.assigneeId === userId);
      
      case 'step':
        const step = await this.stepRepository.findById(resourceId);
        return step?.assigneeId === userId;
      
      default:
        return false;
    }
  }
}
```

## マルチテナント対応

### 組織・チーム構造
```typescript
// 組織
interface Organization {
  id: number;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'enterprise';
  settings: OrganizationSettings;
}

// チーム
interface Team {
  id: number;
  organizationId: number;
  name: string;
  description: string;
  settings: TeamSettings;
}

// チームメンバー
interface TeamMember {
  userId: number;
  teamId: number;
  joinedAt: Date;
}

// ユーザーロール（チーム単位）
interface UserRole {
  id: number;
  userId: number;
  roleId: number;
  teamId?: number;  // チーム固有のロール
  grantedAt: Date;
  grantedBy: number;
}
```

### チーム単位の権限管理
```typescript
@Injectable()
export class TeamAuthorizationService {
  async hasTeamPermission(
    userId: number,
    teamId: number,
    resource: string,
    action: string
  ): Promise<boolean> {
    // チームメンバーシップ確認
    const isMember = await this.isTeamMember(userId, teamId);
    if (!isMember) return false;
    
    // チーム内でのロール取得
    const teamRoles = await this.getUserTeamRoles(userId, teamId);
    
    // チーム固有の権限チェック
    const hasPermission = await this.checkTeamRolePermissions(
      teamRoles,
      resource,
      action
    );
    
    return hasPermission;
  }
  
  async getAccessibleTeams(userId: number): Promise<Team[]> {
    return await this.teamRepository.findByUserId(userId);
  }
}
```

## セキュリティ実装

### JWT戦略実装
```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }
  
  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.authService.validateJwtPayload(payload);
    
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid token or inactive user');
    }
    
    if (!user.emailVerified) {
      throw new UnauthorizedException('Email not verified');
    }
    
    return user;
  }
}
```

### セキュリティヘッダー
```typescript
// セキュリティミドルウェア
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS設定
app.enableCors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'If-Match', 'X-Request-ID']
});
```

### レート制限
```typescript
// レート制限設定
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // 最大100リクエスト
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
};

// 認証エンドポイント用の厳しい制限
const authRateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15分
  max: 5, // 最大5回のログイン試行
  message: 'Too many login attempts',
};
```

## 監査・ログ

### 認証イベントログ
```typescript
interface AuthEvent {
  userId?: number;
  email: string;
  event: 'login' | 'logout' | 'signup' | 'password_change' | 'account_lock';
  success: boolean;
  ip: string;
  userAgent: string;
  timestamp: Date;
  details?: any;
}

// ログ出力例
this.logger.info('Authentication event', {
  event: 'login',
  email: user.email,
  userId: user.id,
  success: true,
  ip: request.ip,
  userAgent: request.headers['user-agent'],
  timestamp: new Date().toISOString()
});
```

### 認可イベントログ
```typescript
interface AuthorizationEvent {
  userId: number;
  resource: string;
  action: string;
  resourceId?: number;
  teamId?: number;
  allowed: boolean;
  reason?: string;
  timestamp: Date;
}
```

## 設定・環境変数

### 必要な環境変数
```bash
# JWT設定
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# パスワード設定
BCRYPT_SALT_ROUNDS=12

# セッション設定
SESSION_SECRET=your-session-secret

# メール設定（認証用）
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=smtp-password

# セキュリティ設定
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 変更履歴

### v1.1での実装内容

1. **JWT認証システムの完全実装**
   - アクセストークン・リフレッシュトークン
   - トークンローテーション機能
   - メール認証・パスワードリセット

2. **RBAC システムの実装**
   - ロール・権限管理
   - リソース所有者チェック
   - 階層的権限システム

3. **マルチテナント対応**
   - 組織・チーム管理
   - チーム単位の権限制御
   - データ分離

4. **セキュリティ強化**
   - アカウントロック機能
   - レート制限
   - セキュリティヘッダー

5. **監査・ログ機能**
   - 認証・認可イベントログ
   - セキュリティ監査証跡
