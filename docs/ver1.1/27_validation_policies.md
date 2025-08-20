# 27 バリデーション/ポリシー/品質（v1.1・実装反映版）

## 概要
本ドキュメントは、プロセス指向ToDoアプリケーションの実装されたバリデーション・ポリシー・品質管理を反映したものです。
v1.0から大幅に強化され、包括的なバリデーション、セキュリティポリシー、品質保証が実装されています。

## 入力バリデーション（DTO層）

### 基本バリデーションルール
- **日時形式**: ISO8601/Z（UTC）形式必須、将来の時刻許容（`goalDate`）
- **数値検証**: `offsetDays` は0以上の整数、ID系は正の整数
- **参照整合性**: `dependsOn` は同一テンプレ内の既存ID、自己参照禁止
- **文字列検証**: 長さ制限、文字種制限、必須フィールドチェック
- **列挙値検証**: 定義済みステータス値のみ許可

### 認証関連バリデーション
```typescript
// パスワード強度検証
@IsString()
@MinLength(8)
@MaxLength(128)
@Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
  message: 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
})
password: string;

// メールアドレス検証
@IsEmail({}, { message: 'Invalid email format' })
@MaxLength(254)
email: string;

// ユーザー名検証
@IsString()
@MinLength(2)
@MaxLength(50)
@Matches(/^[a-zA-Z0-9\s\-_]+$/, { message: 'Name can only contain letters, numbers, spaces, hyphens and underscores' })
name: string;
```

### 日付・時刻バリデーション
```typescript
// 目標日検証（将来日のみ）
@IsDateString()
@IsNotEmpty()
@Transform(({ value }) => {
  const date = new Date(value);
  if (date <= new Date()) {
    throw new BadRequestException('Goal date must be in the future');
  }
  return value;
})
goalDateUtc: string;

// 日付範囲検証
@IsOptional()
@IsDateString()
@IsDateRange('startDate', { message: 'End date must be after start date' })
endDate?: string;
```

### ビジネスルールバリデーション
```typescript
// 再計算確認データ検証
@IsArray()
@ValidateNested({ each: true })
@Type(() => ScheduleChangeDto)
@ArrayMinSize(1, { message: 'At least one change must be confirmed' })
@ValidateScheduleChanges() // カスタムバリデーター
confirmedChanges: ScheduleChangeDto[];

// ファイルアップロード検証
@IsString()
@IsNotEmpty()
@MaxLength(255)
@Matches(/^[^<>:"/\\|?*]+$/, { message: 'Invalid file name characters' })
fileName: string;

@IsInt()
@Min(1)
@Max(10 * 1024 * 1024) // 10MB制限
fileSize: number;

@IsString()
@IsIn(['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'text/plain'])
mimeType: string;
```

## ドメイン検証

### DAG性検証
```typescript
export class ProcessTemplate {
  validateDAG(): void {
    const visited = new Set<number>();
    const recursionStack = new Set<number>();
    
    for (const step of this.stepTemplates) {
      if (this.hasCycleDFS(step, visited, recursionStack)) {
        throw new DomainError('CIRCULAR_DEPENDENCY', 'Circular dependency detected in process template');
      }
    }
  }
  
  private hasCycleDFS(step: StepTemplate, visited: Set<number>, recursionStack: Set<number>): boolean {
    if (recursionStack.has(step.getId())) {
      return true; // 循環検出
    }
    
    if (visited.has(step.getId())) {
      return false; // 既に検証済み
    }
    
    visited.add(step.getId());
    recursionStack.add(step.getId());
    
    // 依存関係を再帰的にチェック
    for (const depId of step.getDependsOn()) {
      const depStep = this.findStepById(depId);
      if (depStep && this.hasCycleDFS(depStep, visited, recursionStack)) {
        return true;
      }
    }
    
    recursionStack.delete(step.getId());
    return false;
  }
}
```

### ステータス遷移検証
```typescript
export class StepInstance {
  updateStatus(newStatus: StepStatus): void {
    // 遷移可能性チェック
    if (!this.status.canTransitionTo(newStatus)) {
      throw new DomainError(
        'INVALID_STATUS_TRANSITION',
        `Cannot transition from ${this.status.getValue()} to ${newStatus}`
      );
    }
    
    // 完了時の必須成果物チェック
    if (newStatus === StepStatus.DONE && !this.hasAllRequiredArtifacts()) {
      throw new DomainError(
        'MISSING_REQUIRED_ARTIFACTS',
        'Cannot complete step without all required artifacts'
      );
    }
    
    // ロック状態チェック
    if (this.locked && this.status.isDone()) {
      throw new DomainError(
        'LOCKED_STEP_MODIFICATION',
        'Cannot modify locked completed step'
      );
    }
    
    this.status = new StepStatusValue(newStatus);
    this.updatedAt = new Date();
  }
}
```

### 営業日・休日検証
```typescript
export class BusinessDayService {
  async validateBusinessDay(date: Date, countryCode: string = 'JP'): Promise<void> {
    if (!await this.isBusinessDay(date, countryCode)) {
      throw new DomainError(
        'INVALID_BUSINESS_DAY',
        `${date.toISOString().split('T')[0]} is not a business day in ${countryCode}`
      );
    }
  }
  
  async isBusinessDay(date: Date, countryCode: string = 'JP'): Promise<boolean> {
    // 土日チェック
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return false;
    
    // 祝日チェック
    const holidays = await this.getHolidays(countryCode, date.getFullYear());
    const dateString = date.toISOString().split('T')[0];
    
    return !holidays.some(holiday => holiday.date === dateString);
  }
}
```

### 権限・認可検証
```typescript
export class AuthorizationService {
  async validatePermission(userId: number, resource: string, action: string, resourceId?: number): Promise<void> {
    // 基本権限チェック
    const hasPermission = await this.hasPermission(userId, resource, action);
    if (!hasPermission) {
      throw new DomainError(
        'INSUFFICIENT_PERMISSIONS',
        `User ${userId} does not have permission ${resource}:${action}`
      );
    }
    
    // リソース所有者チェック
    if (resourceId && await this.requiresOwnership(resource, action)) {
      const isOwner = await this.isResourceOwner(userId, resource, resourceId);
      if (!isOwner) {
        throw new DomainError(
          'RESOURCE_ACCESS_DENIED',
          `User ${userId} is not authorized to ${action} ${resource} ${resourceId}`
        );
      }
    }
  }
}
```

## セキュリティポリシー

### ファイルアップロードセキュリティ
```typescript
export class FileUploadPolicy {
  private readonly allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain',
    'text/csv'
  ];
  
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private readonly maxFilesPerStep = 20;
  
  validateFileUpload(fileName: string, fileSize: number, mimeType: string): void {
    // ファイル名検証
    if (!/^[^<>:"/\\|?*]+$/.test(fileName)) {
      throw new ValidationError('Invalid file name characters');
    }
    
    if (fileName.length > 255) {
      throw new ValidationError('File name too long');
    }
    
    // ファイルサイズ検証
    if (fileSize > this.maxFileSize) {
      throw new ValidationError(`File size exceeds limit of ${this.maxFileSize / 1024 / 1024}MB`);
    }
    
    // MIME タイプ検証
    if (!this.allowedMimeTypes.includes(mimeType)) {
      throw new ValidationError(`File type ${mimeType} is not allowed`);
    }
    
    // 拡張子とMIMEタイプの整合性チェック
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (!this.isValidMimeTypeForExtension(extension, mimeType)) {
      throw new ValidationError('File extension and MIME type mismatch');
    }
  }
  
  async validateStepFileLimit(stepId: number): Promise<void> {
    const fileCount = await this.artifactRepository.countByStepId(stepId);
    if (fileCount >= this.maxFilesPerStep) {
      throw new ValidationError(`Maximum ${this.maxFilesPerStep} files per step allowed`);
    }
  }
}
```

### パスワードポリシー
```typescript
export class PasswordPolicy {
  private readonly minLength = 8;
  private readonly maxLength = 128;
  private readonly requireUppercase = true;
  private readonly requireLowercase = true;
  private readonly requireNumbers = true;
  private readonly requireSpecialChars = true;
  private readonly specialChars = '@$!%*?&';
  
  validatePassword(password: string): void {
    if (password.length < this.minLength) {
      throw new ValidationError(`Password must be at least ${this.minLength} characters long`);
    }
    
    if (password.length > this.maxLength) {
      throw new ValidationError(`Password must be no more than ${this.maxLength} characters long`);
    }
    
    if (this.requireUppercase && !/[A-Z]/.test(password)) {
      throw new ValidationError('Password must contain at least one uppercase letter');
    }
    
    if (this.requireLowercase && !/[a-z]/.test(password)) {
      throw new ValidationError('Password must contain at least one lowercase letter');
    }
    
    if (this.requireNumbers && !/\d/.test(password)) {
      throw new ValidationError('Password must contain at least one number');
    }
    
    if (this.requireSpecialChars && !new RegExp(`[${this.specialChars}]`).test(password)) {
      throw new ValidationError(`Password must contain at least one special character (${this.specialChars})`);
    }
    
    // 一般的な弱いパスワードチェック
    const commonPasswords = ['password', '123456', 'qwerty', 'admin'];
    if (commonPasswords.includes(password.toLowerCase())) {
      throw new ValidationError('Password is too common');
    }
  }
}
```

### レート制限ポリシー
```typescript
export class RateLimitPolicy {
  private readonly limits = {
    'auth:login': { requests: 5, window: 60 * 1000 }, // 5回/分
    'auth:signup': { requests: 3, window: 60 * 1000 }, // 3回/分
    'search:*': { requests: 100, window: 60 * 1000 }, // 100回/分
    'api:*': { requests: 1000, window: 60 * 1000 }, // 1000回/分
  };
  
  async checkRateLimit(userId: number, endpoint: string): Promise<void> {
    const key = this.getRateLimitKey(userId, endpoint);
    const limit = this.getLimitForEndpoint(endpoint);
    
    const current = await this.redis.get(key);
    if (current && parseInt(current) >= limit.requests) {
      throw new TooManyRequestsException(
        `Rate limit exceeded. Maximum ${limit.requests} requests per ${limit.window / 1000} seconds`
      );
    }
    
    await this.redis.incr(key);
    await this.redis.expire(key, limit.window / 1000);
  }
}
```

## 非機能ポリシー

### ログ出力ポリシー
```typescript
export class LoggingPolicy {
  // 構造化ログ形式
  logUseCaseStart(useCase: string, input: any, context: ExecutionContext): void {
    const request = context.switchToHttp().getRequest();
    const traceId = request.headers['x-trace-id'] || this.generateTraceId();
    
    this.logger.info('UseCase started', {
      useCase,
      traceId,
      userId: request.user?.id,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      input: this.sanitizeInput(input),
      timestamp: new Date().toISOString()
    });
  }
  
  logUseCaseEnd(useCase: string, output: any, duration: number, traceId: string): void {
    this.logger.info('UseCase completed', {
      useCase,
      traceId,
      duration,
      output: this.sanitizeOutput(output),
      timestamp: new Date().toISOString()
    });
  }
  
  logUseCaseError(useCase: string, error: Error, traceId: string): void {
    this.logger.error('UseCase failed', {
      useCase,
      traceId,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      timestamp: new Date().toISOString()
    });
  }
  
  // センシティブ情報のサニタイズ
  private sanitizeInput(input: any): any {
    const sensitiveFields = ['password', 'token', 'secret', 'key'];
    return this.sanitizeObject(input, sensitiveFields);
  }
}
```

### パフォーマンス監視ポリシー
```typescript
export class PerformancePolicy {
  private readonly thresholds = {
    'CreateCase': 2000, // 2秒
    'PreviewReplan': 5000, // 5秒
    'ApplyReplan': 3000, // 3秒
    'SearchCases': 1000, // 1秒
    'GetGanttData': 3000, // 3秒
  };
  
  async measureUseCasePerformance<T>(
    useCase: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      const endMemory = process.memoryUsage();
      
      // パフォーマンスメトリクス記録
      this.recordMetrics(useCase, {
        duration,
        memoryUsed: endMemory.heapUsed - startMemory.heapUsed,
        success: true
      });
      
      // 閾値チェック
      const threshold = this.thresholds[useCase];
      if (threshold && duration > threshold) {
        this.logger.warn('UseCase performance threshold exceeded', {
          useCase,
          duration,
          threshold,
          memoryUsed: endMemory.heapUsed - startMemory.heapUsed
        });
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordMetrics(useCase, { duration, success: false });
      throw error;
    }
  }
}
```

### データベースクエリ監視
```typescript
export class DatabasePolicy {
  private readonly queryThresholds = {
    slowQueryTime: 1000, // 1秒
    maxQueriesPerRequest: 50,
    maxConnectionPoolSize: 20
  };
  
  async monitorQuery<T>(
    query: string,
    params: any[],
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      // スロークエリ検出
      if (duration > this.queryThresholds.slowQueryTime) {
        this.logger.warn('Slow query detected', {
          query: this.sanitizeQuery(query),
          params: this.sanitizeParams(params),
          duration,
          timestamp: new Date().toISOString()
        });
      }
      
      return result;
    } catch (error) {
      this.logger.error('Database query failed', {
        query: this.sanitizeQuery(query),
        params: this.sanitizeParams(params),
        error: error.message
      });
      throw error;
    }
  }
}
```

## テスト原則・品質保証

### ドメイン層テスト
```typescript
describe('BusinessDayService', () => {
  // 決定性テスト（同一入力→同一出力）
  it('should return consistent results for same input', async () => {
    const date = new Date('2025-01-15'); // 水曜日
    const days = 5;
    
    const result1 = await service.addBusinessDays(date, days, 'JP');
    const result2 = await service.addBusinessDays(date, days, 'JP');
    
    expect(result1).toEqual(result2);
  });
  
  // 境界条件テスト
  it('should handle holiday sequences correctly', async () => {
    // 連続祝日のテスト
    const goldenWeekStart = new Date('2025-04-29'); // 昭和の日
    const result = await service.addBusinessDays(goldenWeekStart, 1, 'JP');
    
    // ゴールデンウィーク後の最初の営業日を期待
    expect(result.getDay()).not.toBe(0); // 日曜日ではない
    expect(result.getDay()).not.toBe(6); // 土曜日ではない
  });
  
  // 年跨ぎテスト
  it('should handle year boundary correctly', async () => {
    const yearEnd = new Date('2024-12-30'); // 月曜日
    const result = await service.addBusinessDays(yearEnd, 5, 'JP');
    
    expect(result.getFullYear()).toBe(2025);
    expect(await service.isBusinessDay(result, 'JP')).toBe(true);
  });
});
```

### アプリケーション層テスト
```typescript
describe('CreateCaseUseCase', () => {
  // トランザクション・リポジトリモックテスト
  it('should create case with correct step instances', async () => {
    const mockTemplate = createMockProcessTemplate();
    const mockSchedulePlan = createMockSchedulePlan();
    
    processTemplateRepository.findById.mockResolvedValue(mockTemplate);
    replanDomainService.calculateScheduleV2.mockResolvedValue(mockSchedulePlan);
    caseRepository.save.mockImplementation(case => Promise.resolve(case));
    
    const input = {
      processId: 1,
      title: 'Test Case',
      goalDate: new Date('2025-12-31'),
      createdBy: 1
    };
    
    const result = await useCase.execute(input);
    
    expect(result.caseId).toBeDefined();
    expect(result.stepCount).toBe(mockTemplate.stepTemplates.length);
    expect(caseRepository.save).toHaveBeenCalledTimes(1);
  });
  
  // エラーハンドリングテスト
  it('should throw error when process template not found', async () => {
    processTemplateRepository.findById.mockResolvedValue(null);
    
    const input = {
      processId: 999,
      title: 'Test Case',
      goalDate: new Date('2025-12-31'),
      createdBy: 1
    };
    
    await expect(useCase.execute(input)).rejects.toThrow(NotFoundError);
  });
});
```

### インターフェース層テスト
```typescript
describe('CaseController', () => {
  // DTO→UseCaseの接続テスト
  it('should call CreateCaseUseCase with correct parameters', async () => {
    const dto = {
      processId: 1,
      title: 'Test Case',
      goalDateUtc: '2025-12-31T23:59:59.000Z'
    };
    
    const mockUser = { id: 1, email: 'test@example.com' };
    const mockResult = { caseId: 1, stepCount: 5, etag: 'W/"1-123"' };
    
    createCaseUseCase.execute.mockResolvedValue(mockResult);
    
    const result = await controller.createCase(dto, mockUser);
    
    expect(createCaseUseCase.execute).toHaveBeenCalledWith({
      ...dto,
      goalDate: new Date(dto.goalDateUtc),
      createdBy: mockUser.id
    });
    expect(result).toEqual(mockResult);
  });
  
  // HTTPエラーマッピングテスト
  it('should return 422 for domain errors', async () => {
    const dto = { processId: 1, title: 'Test', goalDateUtc: '2025-12-31T23:59:59.000Z' };
    const mockUser = { id: 1, email: 'test@example.com' };
    
    createCaseUseCase.execute.mockRejectedValue(
      new DomainError('CIRCULAR_DEPENDENCY', 'Circular dependency detected')
    );
    
    await expect(controller.createCase(dto, mockUser))
      .rejects.toThrow(UnprocessableEntityException);
  });
});
```

### E2Eテスト
```typescript
describe('Case Management E2E', () => {
  it('should complete full case lifecycle', async () => {
    // 1. ログイン
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password123' })
      .expect(200);
    
    const token = loginResponse.body.accessToken;
    
    // 2. 案件作成
    const createResponse = await request(app.getHttpServer())
      .post('/cases')
      .set('Authorization', `Bearer ${token}`)
      .send({
        processId: 1,
        title: 'E2E Test Case',
        goalDateUtc: '2025-12-31T23:59:59.000Z'
      })
      .expect(201);
    
    const caseId = createResponse.body.caseId;
    
    // 3. 案件詳細取得
    const getResponse = await request(app.getHttpServer())
      .get(`/cases/${caseId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    
    expect(getResponse.body.title).toBe('E2E Test Case');
    expect(getResponse.body.stepInstances).toBeDefined();
    
    // 4. ステップ更新
    const stepId = getResponse.body.stepInstances[0].id;
    await request(app.getHttpServer())
      .put(`/steps/${stepId}`)
      .set('Authorization', `Bearer ${token}`)
      .set('If-Match', getResponse.body.etag)
      .send({ status: 'in_progress' })
      .expect(200);
  });
});
```

## 品質メトリクス

### コードカバレッジ目標
- **ドメイン層**: 95%以上
- **アプリケーション層**: 90%以上
- **インターフェース層**: 85%以上
- **全体**: 90%以上

### パフォーマンス目標
- **API応答時間**: 95%のリクエストが2秒以内
- **データベースクエリ**: 95%のクエリが1秒以内
- **メモリ使用量**: ヒープ使用量が1GB以下
- **CPU使用率**: 平均70%以下

### 可用性目標
- **アップタイム**: 99.9%以上
- **エラー率**: 0.1%以下
- **復旧時間**: 5分以内

## 変更履歴

### v1.1での主要な追加・変更点

1. **バリデーション機能の大幅強化**
   - 包括的なDTO検証ルール
   - カスタムバリデーター実装
   - ドメインレベルでの厳密な検証

2. **セキュリティポリシーの実装**
   - ファイルアップロードセキュリティ
   - パスワードポリシー
   - レート制限ポリシー

3. **非機能要件の詳細化**
   - 構造化ログ出力
   - パフォーマンス監視
   - データベースクエリ監視

4. **テスト戦略の体系化**
   - 層別テスト原則
   - 品質メトリクス定義
   - E2Eテストシナリオ

5. **品質保証プロセスの確立**
   - コードカバレッジ目標
   - パフォーマンス目標
   - 可用性目標
