# 22 アプリケーション層 UseCase（v1.1・実装反映版）

## 概要
本ドキュメントは、プロセス指向ToDoアプリケーションの実装されたユースケースを反映したものです。
v1.0から大幅に拡張され、認証・認可、検索、可視化、通知などの機能が追加されています。

## 基本ユースケース（v1.0からの継続）

| UseCase | 入力 | 出力 | Tx | 権限 |
|---|---|---|---|---|
| CreateCase | processId, title, goalDate, createdBy | caseId, stepCount, etag | Yes | cases:create |
| GetCase | caseId | CaseView | No | cases:read |
| UpdateCase | caseId, title?, goalDate?, status? + If-Match | CaseView, etag | Yes | cases:update |
| DeleteCase | caseId + If-Match | 204 | Yes | cases:delete |
| PreviewReplan | caseId, newGoalDate?, delayedStepIds?, lockedStepIds? | ReplanDiffView | No | cases:replan |
| ApplyReplan | caseId, confirmedChanges[] + If-Match | updatedCount, etag | Yes | cases:replan |
| UpdateStep | stepId, assigneeId?, status?, locked?, dueDate? + If-Match | StepView, etag | Yes | steps:update |
| AddArtifact | stepId, kind, fileName, fileSize, mimeType, s3Key, required? | ArtifactView | Yes | artifacts:create |
| RemoveArtifact | stepId, artifactId + If-Match | 204 | Yes | artifacts:delete |
| ListCases | page, size, sort, order, filter, userId? | CaseSummary[], totalCount | No | cases:read |

## 認証・認可ユースケース（新規追加）

### 基本認証
| UseCase | 入力 | 出力 | Tx | 権限 |
|---|---|---|---|---|
| Login | email, password | accessToken, refreshToken, user | No | - |
| Signup | email, password, name | user, emailVerificationToken | Yes | - |
| Logout | refreshToken | 204 | Yes | - |
| RefreshToken | refreshToken | accessToken, refreshToken | Yes | - |
| ValidateToken | accessToken | user, permissions | No | - |
| ChangePassword | userId, currentPassword, newPassword | 204 | Yes | users:update_password |
| ResetPassword | email | emailSent | No | - |
| VerifyEmail | emailVerificationToken | user | Yes | - |

### ユーザー管理
| UseCase | 入力 | 出力 | Tx | 権限 |
|---|---|---|---|---|
| CreateUser | email, password, name, role | user | Yes | users:create |
| GetUser | userId | UserView | No | users:read |
| UpdateUser | userId, name?, email?, role?, isActive? + If-Match | UserView, etag | Yes | users:update |
| DeleteUser | userId + If-Match | 204 | Yes | users:delete |
| ListUsers | page, size, sort, order, filter | UserSummary[], totalCount | No | users:read |
| AssignStepToUser | userId, stepId | StepView | Yes | steps:assign |

## プロセステンプレート管理ユースケース（拡張）

| UseCase | 入力 | 出力 | Tx | 権限 |
|---|---|---|---|---|
| CreateProcessTemplate | name, version?, isActive? | templateId, etag | Yes | templates:create |
| GetProcessTemplate | templateId | ProcessTemplateView | No | templates:read |
| UpdateProcessTemplate | templateId, name?, version?, isActive? + If-Match | ProcessTemplateView, etag | Yes | templates:update |
| DeleteProcessTemplate | templateId + If-Match | 204 | Yes | templates:delete |
| ListProcessTemplates | page, size, sort, order, filter | ProcessTemplateSummary[], totalCount | No | templates:read |
| CloneProcessTemplate | templateId, newName | newTemplateId, etag | Yes | templates:create |
| CreateStepTemplate | processId, seq, name, basis, offsetDays, requiredArtifacts?, dependsOn? | stepTemplateId, etag | Yes | templates:update |
| UpdateStepTemplate | stepTemplateId, seq?, name?, basis?, offsetDays?, requiredArtifacts?, dependsOn? + If-Match | StepTemplateView, etag | Yes | templates:update |
| DeleteStepTemplate | stepTemplateId + If-Match | 204 | Yes | templates:update |
| ValidateProcessTemplate | templateId | ValidationResult | No | templates:read |

## 検索ユースケース（新規追加）

| UseCase | 入力 | 出力 | Tx | 権限 |
|---|---|---|---|---|
| SearchCases | query, filters, page, size, sort | CaseSearchResult[], totalCount, facets | No | cases:read |
| SearchSteps | query, filters, page, size, sort | StepSearchResult[], totalCount, facets | No | steps:read |
| SearchTemplates | query, filters, page, size, sort | TemplateSearchResult[], totalCount, facets | No | templates:read |
| SearchArtifacts | query, filters, page, size, sort | ArtifactSearchResult[], totalCount, facets | No | artifacts:read |
| SaveSearch | userId, name, query, filters | savedSearchId | Yes | searches:create |
| GetSavedSearches | userId | SavedSearch[] | No | searches:read |
| DeleteSavedSearch | savedSearchId + If-Match | 204 | Yes | searches:delete |

## 可視化ユースケース（新規追加）

### ガントチャート
| UseCase | 入力 | 出力 | Tx | 権限 |
|---|---|---|---|---|
| GetGanttData | caseId?, userId?, teamId?, startDate?, endDate?, view | GanttData | No | gantt:read |
| UpdateGanttStep | stepId, newStartDate?, newDueDate? + If-Match | StepView, etag | Yes | steps:update |

### カレンダー
| UseCase | 入力 | 出力 | Tx | 権限 |
|---|---|---|---|---|
| GetCalendarData | userId?, teamId?, startDate, endDate, view | CalendarData | No | calendar:read |
| GetCalendarEvents | userId?, teamId?, startDate, endDate | CalendarEvent[] | No | calendar:read |

### カンバンボード
| UseCase | 入力 | 出力 | Tx | 権限 |
|---|---|---|---|---|
| GetKanbanData | caseId?, userId?, teamId?, filters? | KanbanData | No | kanban:read |
| UpdateKanbanStep | stepId, newStatus, newPosition? + If-Match | StepView, etag | Yes | steps:update |
| GetKanbanColumns | userId? | KanbanColumn[] | No | kanban:read |
| UpdateKanbanColumns | userId, columns + If-Match | KanbanColumn[], etag | Yes | kanban:update |

## 通知・コメントユースケース（新規追加）

### 通知管理
| UseCase | 入力 | 出力 | Tx | 権限 |
|---|---|---|---|---|
| CreateNotification | userId, type, title, message, data? | notificationId | Yes | notifications:create |
| GetMyNotifications | userId, page, size, isRead? | Notification[], totalCount | No | notifications:read |
| MarkNotificationAsRead | notificationId + If-Match | 204 | Yes | notifications:update |
| MarkAllNotificationsAsRead | userId | updatedCount | Yes | notifications:update |
| DeleteNotification | notificationId + If-Match | 204 | Yes | notifications:delete |
| GetNotificationSettings | userId | NotificationSettings | No | notifications:read |
| UpdateNotificationSettings | userId, settings + If-Match | NotificationSettings, etag | Yes | notifications:update |

### コメント機能
| UseCase | 入力 | 出力 | Tx | 権限 |
|---|---|---|---|---|
| CreateComment | stepId, userId, content, parentId? | commentId, etag | Yes | comments:create |
| GetStepComments | stepId, page, size | Comment[], totalCount | No | comments:read |
| UpdateComment | commentId, content + If-Match | CommentView, etag | Yes | comments:update |
| DeleteComment | commentId + If-Match | 204 | Yes | comments:delete |

## 補助ユースケース（拡張）

### 休日・カレンダー
| UseCase | 入力 | 出力 | Tx | 権限 |
|---|---|---|---|---|
| GetHolidays | countryCode, year | Holiday[] | No | holidays:read |
| CreateHoliday | countryCode, date, name | holidayId | Yes | holidays:create |
| UpdateHoliday | countryCode, date, name + If-Match | Holiday, etag | Yes | holidays:update |
| DeleteHoliday | countryCode, date + If-Match | 204 | Yes | holidays:delete |

### ストレージ
| UseCase | 入力 | 出力 | Tx | 権限 |
|---|---|---|---|---|
| GeneratePresignedUrl | stepId, fileName, contentType, size | presignedUrl, fields, expiresAt | No | artifacts:upload |
| ValidateFileUpload | stepId, s3Key, fileName, fileSize, mimeType | isValid, validationErrors? | No | artifacts:validate |

### システム情報
| UseCase | 入力 | 出力 | Tx | 権限 |
|---|---|---|---|---|
| GetHealthCheck | - | HealthStatus | No | - |
| GetSystemInfo | - | SystemInfo | No | system:read |

## デバッグ・開発支援ユースケース（新規追加）

| UseCase | 入力 | 出力 | Tx | 権限 |
|---|---|---|---|---|
| TestScheduleCalculation | processTemplateId, goalDate, existingSteps?, lockedStepIds? | SchedulePlan, calculationTime | No | debug:schedule |
| GetSystemMetrics | - | SystemMetrics | No | debug:metrics |
| ClearCache | cacheKey? | clearedKeys[] | No | debug:cache |

## ユースケース実装パターン

### 基本構造
```typescript
export class CreateCaseUseCase {
  constructor(
    private readonly caseRepository: CaseRepository,
    private readonly processTemplateRepository: ProcessTemplateRepository,
    private readonly replanDomainService: ReplanDomainService,
    private readonly businessDayService: BusinessDayService,
    private readonly logger: Logger
  ) {}

  async execute(input: CreateCaseInput): Promise<CreateCaseOutput> {
    // 1. 入力検証
    this.validateInput(input);
    
    // 2. 権限チェック
    await this.checkPermissions(input.userId, 'cases:create');
    
    // 3. ビジネスロジック実行
    const processTemplate = await this.processTemplateRepository.findById(input.processId);
    if (!processTemplate) {
      throw new NotFoundError('Process template not found');
    }
    
    // 4. ドメインオブジェクト作成
    const case = new Case(
      null, // ID is auto-generated
      input.processId,
      input.title,
      input.goalDate,
      new CaseStatusValue(CaseStatus.OPEN),
      [],
      input.createdBy,
      new Date(),
      new Date()
    );
    
    // 5. スケジュール計算
    const schedulePlan = await this.replanDomainService.calculateScheduleV2(
      processTemplate,
      input.goalDate,
      [],
      new Set(),
      input.countryCode || 'JP'
    );
    
    // 6. ステップインスタンス作成
    const stepInstances = this.createStepInstances(case.getId(), schedulePlan);
    case.setStepInstances(stepInstances);
    
    // 7. 永続化
    const savedCase = await this.caseRepository.save(case);
    
    // 8. 通知送信
    await this.sendNotification(savedCase);
    
    // 9. ログ出力
    this.logger.info('Case created', { caseId: savedCase.getId(), userId: input.createdBy });
    
    // 10. 結果返却
    return {
      caseId: savedCase.getId(),
      stepCount: stepInstances.length,
      etag: savedCase.getEtag()
    };
  }
}
```

### エラーハンドリング
```typescript
// ドメインエラー
throw new DomainError('Cannot complete step without required artifacts');

// バリデーションエラー
throw new ValidationError('Goal date must be in the future');

// 権限エラー
throw new ForbiddenError('Insufficient permissions');

// 楽観ロック衝突
throw new ConflictError('Resource has been modified by another user');
```

### トランザクション管理
```typescript
@Transactional()
async execute(input: ApplyReplanInput): Promise<ApplyReplanOutput> {
  // トランザクション内で実行される
  const case = await this.caseRepository.findById(input.caseId);
  // ... ビジネスロジック
  await this.caseRepository.save(case);
  await this.stepRepository.saveAll(updatedSteps);
  // コミット or ロールバック
}
```

## 権限マトリックス

### リソース・アクション権限
| リソース | アクション | Admin | Manager | Member | 説明 |
|---|---|---|---|---|---|
| cases | create | ✓ | ✓ | ✓ | 案件作成 |
| cases | read | ✓ | ✓ | ✓ | 案件参照 |
| cases | update | ✓ | ✓ | 担当者のみ | 案件更新 |
| cases | delete | ✓ | ✓ | × | 案件削除 |
| cases | replan | ✓ | ✓ | 担当者のみ | 再計算 |
| templates | create | ✓ | ✓ | × | テンプレート作成 |
| templates | read | ✓ | ✓ | ✓ | テンプレート参照 |
| templates | update | ✓ | ✓ | × | テンプレート更新 |
| templates | delete | ✓ | × | × | テンプレート削除 |
| users | create | ✓ | × | × | ユーザー作成 |
| users | read | ✓ | ✓ | 自分のみ | ユーザー参照 |
| users | update | ✓ | 自分のみ | 自分のみ | ユーザー更新 |
| users | delete | ✓ | × | × | ユーザー削除 |

## パフォーマンス考慮事項

### キャッシュ戦略
- **GetCase**: 5分間キャッシュ
- **ListCases**: 1分間キャッシュ
- **GetProcessTemplate**: 30分間キャッシュ
- **SearchCases**: 30秒間キャッシュ

### 非同期処理
- **通知送信**: バックグラウンドジョブ
- **メール送信**: バックグラウンドジョブ
- **検索インデックス更新**: バックグラウンドジョブ

### バッチ処理
- **期限通知**: 日次バッチ
- **統計データ更新**: 時間次バッチ
- **アーカイブ処理**: 週次バッチ

## 変更履歴

### v1.1での主要な追加・変更点

1. **認証・認可ユースケースの完全実装**
   - ログイン・サインアップ・トークン管理
   - ユーザー管理・権限管理

2. **検索ユースケースの実装**
   - 統合検索・ファセット検索
   - 保存検索・検索履歴

3. **可視化ユースケースの実装**
   - ガントチャート・カレンダー・カンバン
   - インタラクティブ操作対応

4. **通知・コメントユースケースの実装**
   - リアルタイム通知・コメント機能
   - 通知設定・履歴管理

5. **権限システムの詳細化**
   - リソース・アクション単位の権限制御
   - チーム・組織レベルの権限管理

6. **エラーハンドリング・ログの強化**
   - 詳細なエラー分類・ログ出力
   - パフォーマンス監視・メトリクス
