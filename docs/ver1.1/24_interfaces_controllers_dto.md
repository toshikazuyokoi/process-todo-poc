# 24 インターフェース層（Controller/DTO/認可） v1.1・実装反映版

## 概要
本ドキュメントは、プロセス指向ToDoアプリケーションの実装されたインターフェース層を反映したものです。
v1.0から大幅に拡張され、包括的な認証・認可システム、詳細なDTO検証、エラーハンドリングが実装されています。

## Controller 責務

### 基本責務
- **ルーティング**: HTTPリクエストのエンドポイント処理
- **DTOバリデーション**: 入力データの検証・変換
- **認証・認可**: JWT認証、ロール・権限ベース認可
- **UseCase起動**: アプリケーション層への処理委譲
- **例外マッピング**: ドメインエラーのHTTPレスポンス変換
- **レスポンス構築**: 統一されたレスポンス形式での返却

### 拡張責務（v1.1で追加）
- **リクエストID生成**: トレーサビリティ確保
- **ログ出力**: 構造化ログによる監査証跡
- **レート制限**: API使用量制御
- **キャッシュ制御**: レスポンスキャッシュ管理
- **メトリクス収集**: パフォーマンス監視

## 認証・認可システム

### JWT認証
```typescript
// JWT認証ガード
@UseGuards(JwtAuthGuard)
export class CaseController {
  // すべてのエンドポイントでJWT認証が必要
}

// JWT戦略実装
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.authService.validateJwtPayload(payload);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid token or inactive user');
    }
    return user;
  }
}
```

### ロールベース認可（RBAC）
```typescript
// ロール指定
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'manager')
@Delete('/users/:id')
async deleteUser(@Param('id') id: number): Promise<void> {
  // admin または manager のみ実行可能
}

// ロールガード実装
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) return true;
    
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    return requiredRoles.some(role => user.roles?.includes(role));
  }
}
```

### 権限ベース認可
```typescript
// 権限指定
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('cases:read', 'cases:write')
@Put('/cases/:id')
async updateCase(@Param('id') id: number, @Body() dto: UpdateCaseDto): Promise<CaseResponseDto> {
  // cases:read AND cases:write 権限が必要
}

// 権限ガード実装
@Injectable()
export class PermissionsGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<string[]>('permissions', context.getHandler());
    if (!requiredPermissions) return true;
    
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    for (const permission of requiredPermissions) {
      const hasPermission = await this.authService.hasPermission(
        user.id, 
        permission.split(':')[0], 
        permission.split(':')[1]
      );
      if (!hasPermission) return false;
    }
    
    return true;
  }
}
```

### リソース所有者チェック
```typescript
// 担当者または管理者のみ更新可能
@UseGuards(JwtAuthGuard, ResourceOwnerGuard)
@Put('/steps/:id')
async updateStep(
  @Param('id') id: number,
  @Body() dto: UpdateStepDto,
  @CurrentUser() user: User
): Promise<StepResponseDto> {
  // ResourceOwnerGuard で担当者チェック
}
```

## DTO 検証規約

### 基本検証ルール
- **日時形式**: すべてISO8601/Z（UTC）形式
- **ID形式**: 正の整数のみ
- **ステータス**: 定義済み列挙値のみ
- **必須フィールド**: `@IsNotEmpty()` で検証
- **文字列長**: 最小・最大長制限
- **数値範囲**: 最小・最大値制限

### 認証関連DTO
```typescript
export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}

export class SignupDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain uppercase, lowercase, number and special character'
  })
  password: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  name: string;
}

export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: UserResponseDto;
  expiresIn: number;
}
```

### 案件関連DTO
```typescript
export class CreateCaseDto {
  @IsInt()
  @IsPositive()
  processId: number;

  @IsString()
  @IsNotEmpty()
  @Length(1, 200)
  title: string;

  @IsDateString()
  @IsNotEmpty()
  goalDateUtc: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  createdBy?: number;
}

export class UpdateCaseDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(1, 200)
  title?: string;

  @IsOptional()
  @IsDateString()
  goalDateUtc?: string;

  @IsOptional()
  @IsEnum(CaseStatus)
  status?: CaseStatus;
}

export class CaseResponseDto {
  id: number;
  processId: number;
  title: string;
  goalDateUtc: string;
  status: CaseStatus;
  stepInstances: StepInstanceResponseDto[];
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  etag: string;
  progressRate: number;
}
```

### 再計算関連DTO
```typescript
export class PreviewReplanDto {
  @IsOptional()
  @IsDateString()
  newGoalDate?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  delayedStepIds?: number[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  lockedStepIds?: number[];

  @IsOptional()
  @IsString()
  @IsIn(['JP', 'US', 'UK'])
  countryCode?: string;
}

export class ApplyReplanDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleChangeDto)
  confirmedChanges: ScheduleChangeDto[];

  @IsString()
  @IsNotEmpty()
  etag: string;
}

export class ScheduleChangeDto {
  @IsInt()
  @IsPositive()
  stepId: number;

  @IsDateString()
  oldDueDate: string;

  @IsDateString()
  newDueDate: string;

  @IsBoolean()
  isLocked: boolean;
}
```

### 検索関連DTO
```typescript
export class SearchCasesDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  q?: string;

  @IsOptional()
  @IsEnum(CaseStatus)
  status?: CaseStatus;

  @IsOptional()
  @IsInt()
  @IsPositive()
  assigneeId?: number;

  @IsOptional()
  @IsDateString()
  dueDateFrom?: string;

  @IsOptional()
  @IsDateString()
  dueDateTo?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  size?: number = 20;

  @IsOptional()
  @IsString()
  @IsIn(['createdAt', 'updatedAt', 'goalDateUtc', 'title'])
  sort?: string = 'createdAt';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  order?: string = 'desc';
}
```

## エラーハンドリング

### グローバル例外フィルター
```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'SYSTEM_ERROR';
    let message = 'Internal server error';
    let validationErrors: string[] = [];

    // リクエストID生成
    const requestId = request.headers['x-request-id'] || this.generateRequestId();

    // エラー種別による分岐
    if (exception instanceof BadRequestException) {
      status = HttpStatus.BAD_REQUEST;
      errorCode = 'VALIDATION_ERROR';
      message = 'Validation failed';
      
      const response = exception.getResponse();
      if (typeof response === 'object' && 'message' in response) {
        validationErrors = Array.isArray(response.message) 
          ? response.message 
          : [response.message];
      }
    } else if (exception instanceof UnauthorizedException) {
      status = HttpStatus.UNAUTHORIZED;
      errorCode = 'AUTH_ERROR';
      message = 'Authentication failed';
    } else if (exception instanceof ForbiddenException) {
      status = HttpStatus.FORBIDDEN;
      errorCode = 'FORBIDDEN';
      message = 'Insufficient permissions';
    } else if (exception instanceof NotFoundException) {
      status = HttpStatus.NOT_FOUND;
      errorCode = 'NOT_FOUND';
      message = 'Resource not found';
    } else if (exception instanceof ConflictException) {
      status = HttpStatus.CONFLICT;
      errorCode = 'CONFLICT';
      message = 'Resource conflict';
    } else if (exception instanceof DomainError) {
      status = HttpStatus.UNPROCESSABLE_ENTITY;
      errorCode = 'DOMAIN_ERROR';
      message = exception.message;
    }

    // センシティブ情報のサニタイズ
    message = this.sanitizeErrorMessage(message);

    // エラーレスポンス構築
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      requestId,
      errorCode,
      ...(validationErrors.length > 0 && { validationErrors }),
      ...(process.env.NODE_ENV === 'development' && { 
        stack: exception instanceof Error ? exception.stack : undefined 
      })
    };

    // ログ出力
    this.logger.error('HTTP Exception', {
      ...errorResponse,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      userId: request.user?.id
    });

    response.status(status).json(errorResponse);
  }
}
```

### ドメインエラーマッピング
```typescript
// ドメインエラー → HTTPステータス
const errorMappings = {
  'CIRCULAR_DEPENDENCY': HttpStatus.UNPROCESSABLE_ENTITY,
  'INVALID_STATUS_TRANSITION': HttpStatus.UNPROCESSABLE_ENTITY,
  'MISSING_REQUIRED_ARTIFACTS': HttpStatus.UNPROCESSABLE_ENTITY,
  'LOCKED_STEP_MODIFICATION': HttpStatus.CONFLICT,
  'INVALID_DATE_RANGE': HttpStatus.BAD_REQUEST,
  'INSUFFICIENT_PERMISSIONS': HttpStatus.FORBIDDEN
};
```

## コントローラー実装パターン

### 基本構造
```typescript
@Controller('cases')
@UseGuards(JwtAuthGuard)
@ApiTags('Cases')
export class CaseController {
  constructor(
    private readonly createCaseUseCase: CreateCaseUseCase,
    private readonly getCaseUseCase: GetCaseUseCase,
    private readonly updateCaseUseCase: UpdateCaseUseCase,
    private readonly deleteCaseUseCase: DeleteCaseUseCase,
    private readonly listCasesUseCase: ListCasesUseCase,
    private readonly logger: Logger
  ) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('cases:create')
  @ApiOperation({ summary: 'Create a new case' })
  @ApiResponse({ status: 201, type: CaseResponseDto })
  async createCase(
    @Body() dto: CreateCaseDto,
    @CurrentUser() user: User,
    @Headers('x-request-id') requestId?: string
  ): Promise<CaseResponseDto> {
    this.logger.info('Creating case', { dto, userId: user.id, requestId });
    
    const result = await this.createCaseUseCase.execute({
      ...dto,
      createdBy: user.id,
      requestId
    });
    
    this.logger.info('Case created', { caseId: result.caseId, requestId });
    
    return result;
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('cases:read')
  @ApiOperation({ summary: 'Get case by ID' })
  @ApiResponse({ status: 200, type: CaseResponseDto })
  async getCase(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User
  ): Promise<CaseResponseDto> {
    return await this.getCaseUseCase.execute({ caseId: id, userId: user.id });
  }

  @Put(':id')
  @UseGuards(PermissionsGuard, ResourceOwnerGuard)
  @RequirePermissions('cases:update')
  @ApiOperation({ summary: 'Update case' })
  @ApiResponse({ status: 200, type: CaseResponseDto })
  async updateCase(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCaseDto,
    @Headers('if-match') etag: string,
    @CurrentUser() user: User
  ): Promise<CaseResponseDto> {
    if (!etag) {
      throw new BadRequestException('If-Match header is required');
    }
    
    return await this.updateCaseUseCase.execute({
      caseId: id,
      ...dto,
      etag,
      userId: user.id
    });
  }
}
```

### レスポンス統一化
```typescript
// 成功レスポンス
export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    size?: number;
    totalCount?: number;
    totalPages?: number;
  };
  requestId: string;
  timestamp: string;
}

// エラーレスポンス
export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  errorCode: string;
  message: string;
  validationErrors?: string[];
  requestId: string;
  timestamp: string;
  path: string;
  method: string;
}
```

## エンドポイント⇔UseCase 対応表

### 認証関連
| エンドポイント | HTTPメソッド | UseCase | 権限 |
|---|---|---|---|
| `/auth/login` | POST | LoginUseCase | - |
| `/auth/signup` | POST | SignupUseCase | - |
| `/auth/logout` | POST | LogoutUseCase | - |
| `/auth/refresh` | POST | RefreshTokenUseCase | - |
| `/auth/me` | GET | GetCurrentUserUseCase | - |
| `/auth/change-password` | PATCH | ChangePasswordUseCase | users:update_password |

### 案件管理
| エンドポイント | HTTPメソッド | UseCase | 権限 |
|---|---|---|---|
| `/cases` | POST | CreateCaseUseCase | cases:create |
| `/cases` | GET | ListCasesUseCase | cases:read |
| `/cases/:id` | GET | GetCaseUseCase | cases:read |
| `/cases/:id` | PUT | UpdateCaseUseCase | cases:update |
| `/cases/:id` | DELETE | DeleteCaseUseCase | cases:delete |
| `/cases/:id/replan/preview` | POST | PreviewReplanUseCase | cases:replan |
| `/cases/:id/replan/apply` | POST | ApplyReplanUseCase | cases:replan |

### ステップ・成果物
| エンドポイント | HTTPメソッド | UseCase | 権限 |
|---|---|---|---|
| `/steps/:id` | PUT | UpdateStepUseCase | steps:update |
| `/steps/:id/artifacts` | POST | AddArtifactUseCase | artifacts:create |
| `/steps/:id/artifacts/:artifactId` | DELETE | RemoveArtifactUseCase | artifacts:delete |
| `/steps/:id/history` | GET | GetStepHistoryUseCase | steps:read |

### 検索・可視化
| エンドポイント | HTTPメソッド | UseCase | 権限 |
|---|---|---|---|
| `/search/cases` | GET | SearchCasesUseCase | cases:read |
| `/search/steps` | GET | SearchStepsUseCase | steps:read |
| `/search/templates` | GET | SearchTemplatesUseCase | templates:read |
| `/gantt` | GET | GetGanttDataUseCase | gantt:read |
| `/calendar` | GET | GetCalendarDataUseCase | calendar:read |
| `/kanban` | GET | GetKanbanDataUseCase | kanban:read |

## バリデーション強化

### カスタムバリデーター
```typescript
// 日付範囲バリデーター
@ValidatorConstraint({ name: 'isDateRange', async: false })
export class IsDateRangeConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const [startDateProperty] = args.constraints;
    const startDate = (args.object as any)[startDateProperty];
    
    if (!startDate || !value) return true;
    
    return new Date(startDate) <= new Date(value);
  }

  defaultMessage(args: ValidationArguments) {
    return 'End date must be after start date';
  }
}

export function IsDateRange(startDateProperty: string, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [startDateProperty],
      validator: IsDateRangeConstraint,
    });
  };
}
```

### 条件付きバリデーション
```typescript
export class UpdateStepDto {
  @IsOptional()
  @IsEnum(StepStatus)
  status?: StepStatus;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  // ステータスがDONEの場合、必須成果物チェック
  @ValidateIf(o => o.status === StepStatus.DONE)
  @IsBoolean()
  @IsNotEmpty()
  hasRequiredArtifacts?: boolean;
}
```

## 変更履歴

### v1.1での主要な追加・変更点

1. **認証・認可システムの完全実装**
   - JWT認証ガード
   - ロール・権限ベース認可
   - リソース所有者チェック

2. **DTO検証の大幅強化**
   - 包括的なバリデーションルール
   - カスタムバリデーター
   - 条件付きバリデーション

3. **エラーハンドリングの詳細化**
   - グローバル例外フィルター
   - 構造化エラーレスポンス
   - センシティブ情報のサニタイズ

4. **コントローラーの大幅拡張**
   - 認証・検索・可視化・通知コントローラー
   - OpenAPI/Swagger対応
   - 詳細なログ出力

5. **レスポンス統一化**
   - 統一されたAPIレスポンス形式
   - メタデータ・ページネーション対応
   - リクエストID追跡
