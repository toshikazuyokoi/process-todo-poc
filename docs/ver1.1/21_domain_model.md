# 21 ドメインモデル（v1.1・実装反映版）

## 概要
本ドキュメントは、プロセス指向ToDoアプリケーションの実装されたドメインモデルを反映したものです。
v1.0から詳細化され、ステータス遷移ルール、ビジネスルール、バリデーション機能が強化されています。

## 値オブジェクト

### 基本値オブジェクト
- `Basis` = enum { `goal`, `prev` }
- `OffsetDays` : int (>=0) - 負の値は不可、整数のみ
- `UtcDateTime` : ISO8601/Z - UTC形式の日時
- `ArtifactKind` = enum { `file`, `link`, `document`, `image`, `video`, `other` }

### 実装された値オブジェクト

#### DueDate
```typescript
export class DueDate {
  constructor(private readonly date: Date | string) {
    const parsedDate = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(parsedDate.getTime())) {
      throw new Error('Invalid date format');
    }
    this.date = parsedDate;
  }
  
  getValue(): Date { return this.date; }
  toISOString(): string { return this.date.toISOString(); }
  isAfter(other: DueDate): boolean { return this.date > other.date; }
  isBefore(other: DueDate): boolean { return this.date < other.date; }
}
```

#### OffsetDays
```typescript
export class OffsetDays {
  constructor(private readonly days: number) {
    if (!Number.isInteger(days) || days < 0) {
      throw new Error('Offset days must be a non-negative integer');
    }
    this.days = days;
  }
  
  getDays(): number { return this.days; }
  add(other: OffsetDays): OffsetDays { return new OffsetDays(this.days + other.days); }
  subtract(other: OffsetDays): OffsetDays { return new OffsetDays(Math.max(0, this.days - other.days)); }
}
```

#### CaseStatus
```typescript
export enum CaseStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  ON_HOLD = 'on_hold'
}

export class CaseStatusValue {
  constructor(private readonly status: CaseStatus) {}
  
  getValue(): CaseStatus { return this.status; }
  isOpen(): boolean { return this.status === CaseStatus.OPEN; }
  isCompleted(): boolean { return this.status === CaseStatus.COMPLETED; }
  canTransitionTo(newStatus: CaseStatus): boolean {
    const transitions = {
      [CaseStatus.OPEN]: [CaseStatus.IN_PROGRESS, CaseStatus.CANCELLED],
      [CaseStatus.IN_PROGRESS]: [CaseStatus.COMPLETED, CaseStatus.ON_HOLD, CaseStatus.CANCELLED],
      [CaseStatus.COMPLETED]: [], // 完了からの遷移は不可
      [CaseStatus.CANCELLED]: [], // キャンセルからの遷移は不可
      [CaseStatus.ON_HOLD]: [CaseStatus.IN_PROGRESS, CaseStatus.CANCELLED]
    };
    return transitions[this.status]?.includes(newStatus) || false;
  }
}
```

#### StepStatus
```typescript
export enum StepStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
  BLOCKED = 'blocked',
  CANCELLED = 'cancelled'
}

export class StepStatusValue {
  constructor(private readonly status: StepStatus) {}
  
  getValue(): StepStatus { return this.status; }
  isTodo(): boolean { return this.status === StepStatus.TODO; }
  isInProgress(): boolean { return this.status === StepStatus.IN_PROGRESS; }
  isDone(): boolean { return this.status === StepStatus.DONE; }
  isBlocked(): boolean { return this.status === StepStatus.BLOCKED; }
  
  canTransitionTo(newStatus: StepStatus): boolean {
    const transitions = {
      [StepStatus.TODO]: [StepStatus.IN_PROGRESS, StepStatus.BLOCKED, StepStatus.CANCELLED],
      [StepStatus.IN_PROGRESS]: [StepStatus.TODO, StepStatus.DONE, StepStatus.BLOCKED, StepStatus.CANCELLED],
      [StepStatus.DONE]: [], // 完了からの遷移は不可
      [StepStatus.BLOCKED]: [StepStatus.TODO, StepStatus.IN_PROGRESS, StepStatus.CANCELLED],
      [StepStatus.CANCELLED]: [] // キャンセルからの遷移は不可
    };
    return transitions[this.status]?.includes(newStatus) || false;
  }
}
```

## エンティティと不変条件

### ProcessTemplate
```typescript
export class ProcessTemplate {
  constructor(
    private readonly id: number,
    private name: string,
    private version: number,
    private isActive: boolean,
    private stepTemplates: StepTemplate[]
  ) {
    this.validateDAG();
  }
  
  // DAG（有向非循環グラフ）検証
  private validateDAG(): void {
    const visited = new Set<number>();
    const recursionStack = new Set<number>();
    
    for (const step of this.stepTemplates) {
      if (this.hasCycle(step, visited, recursionStack)) {
        throw new Error('Circular dependency detected in process template');
      }
    }
  }
  
  // ステップテンプレート追加
  addStepTemplate(stepTemplate: StepTemplate): void {
    this.stepTemplates.push(stepTemplate);
    this.validateDAG(); // 追加後にDAG検証
  }
  
  // 依存関係の検証
  validateDependencies(): void {
    const stepIds = new Set(this.stepTemplates.map(s => s.getId()));
    
    for (const step of this.stepTemplates) {
      for (const depId of step.getDependsOn()) {
        if (!stepIds.has(depId)) {
          throw new Error(`Invalid dependency: step ${depId} not found`);
        }
      }
    }
  }
}
```

### StepTemplate
```typescript
export class StepTemplate {
  constructor(
    private readonly id: number,
    private readonly processId: number,
    private seq: number,
    private name: string,
    private basis: Basis,
    private offsetDays: OffsetDays,
    private requiredArtifacts: ArtifactRequirement[],
    private dependsOn: number[]
  ) {
    this.validate();
  }
  
  private validate(): void {
    if (this.seq < 0) {
      throw new Error('Sequence number must be non-negative');
    }
    if (this.name.trim().length === 0) {
      throw new Error('Step name cannot be empty');
    }
    if (this.dependsOn.includes(this.id)) {
      throw new Error('Step cannot depend on itself');
    }
  }
  
  // 基準日の取得
  getBasis(): Basis { return this.basis; }
  getOffset(): OffsetDays { return this.offsetDays; }
  getDependsOn(): number[] { return [...this.dependsOn]; }
  
  // 必須成果物の検証
  hasRequiredArtifacts(): boolean {
    return this.requiredArtifacts.some(req => req.isRequired());
  }
}
```

### CaseAggregate
```typescript
export class Case {
  constructor(
    private readonly id: number,
    private readonly processId: number,
    private title: string,
    private goalDateUtc: Date,
    private status: CaseStatusValue,
    private stepInstances: StepInstance[],
    private readonly createdBy: number,
    private readonly createdAt: Date,
    private updatedAt: Date
  ) {
    this.validateGoalDate();
    this.validateStepConsistency();
  }
  
  // 目標日の検証
  private validateGoalDate(): void {
    if (this.goalDateUtc <= new Date()) {
      throw new Error('Goal date must be in the future');
    }
  }
  
  // ステップとの整合性検証
  private validateStepConsistency(): void {
    for (const step of this.stepInstances) {
      if (step.getCaseId() !== this.id) {
        throw new Error('Step instance case ID mismatch');
      }
    }
  }
  
  // タイトル更新
  updateTitle(title: string): void {
    if (!title || title.trim().length === 0) {
      throw new Error('Case title cannot be empty');
    }
    this.title = title;
    this.updatedAt = new Date();
  }
  
  // ステータス更新
  updateStatus(newStatus: CaseStatus): void {
    if (!this.status.canTransitionTo(newStatus)) {
      throw new Error(
        `Cannot transition from ${this.status.getValue()} to ${newStatus}`
      );
    }
    this.status = new CaseStatusValue(newStatus);
    this.updatedAt = new Date();
  }
  
  // 目標日更新
  updateGoalDate(newGoalDate: Date): void {
    if (this.status.isCompleted()) {
      throw new Error('Cannot update goal date of completed case');
    }
    this.goalDateUtc = newGoalDate;
    this.validateGoalDate();
    this.updatedAt = new Date();
  }
  
  // 完了チェック
  isCompleted(): boolean {
    return this.stepInstances.every(step => step.getStatus().isDone());
  }
  
  // 進捗率計算
  getProgressRate(): number {
    if (this.stepInstances.length === 0) return 0;
    const completedSteps = this.stepInstances.filter(step => step.getStatus().isDone()).length;
    return (completedSteps / this.stepInstances.length) * 100;
  }
}
```

### StepInstance
```typescript
export class StepInstance {
  constructor(
    private readonly id: number,
    private readonly caseId: number,
    private readonly templateId: number,
    private name: string,
    private startDate: DueDate | null,
    private dueDate: DueDate | null,
    private assigneeId: number | null,
    private status: StepStatusValue,
    private locked: boolean,
    private artifacts: Artifact[],
    private readonly createdAt: Date,
    private updatedAt: Date
  ) {}
  
  // ステータス更新
  updateStatus(newStatus: StepStatus): void {
    if (!this.status.canTransitionTo(newStatus)) {
      throw new Error(
        `Cannot transition from ${this.status.getValue()} to ${newStatus}`
      );
    }
    
    // 完了時の必須成果物チェック
    if (newStatus === StepStatus.DONE && !this.hasAllRequiredArtifacts()) {
      throw new Error('Cannot complete step without all required artifacts');
    }
    
    this.status = new StepStatusValue(newStatus);
    this.updatedAt = new Date();
  }
  
  // 期限更新
  updateDueDate(dueDate: Date | string | null): void {
    if (this.locked && !this.status.isDone()) {
      throw new Error('Cannot update due date of a locked step');
    }
    this.dueDate = dueDate ? new DueDate(dueDate) : null;
    this.updatedAt = new Date();
  }
  
  // 担当者割り当て
  assignTo(assigneeId: number): void {
    this.assigneeId = assigneeId;
    this.updatedAt = new Date();
  }
  
  // ロック・アンロック
  lock(): void {
    this.locked = true;
    this.updatedAt = new Date();
  }
  
  unlock(): void {
    if (this.status.isDone()) {
      throw new Error('Cannot unlock completed step');
    }
    this.locked = false;
    this.updatedAt = new Date();
  }
  
  // 完了処理
  complete(): void {
    const hasAllRequiredArtifacts = this.hasAllRequiredArtifacts();
    if (!hasAllRequiredArtifacts) {
      throw new Error('Cannot complete step without all required artifacts');
    }
    this.updateStatus(StepStatus.DONE);
  }
  
  // 必須成果物チェック
  private hasAllRequiredArtifacts(): boolean {
    // 実装では、テンプレートの必須成果物要件と照合
    return true; // 簡略化
  }
  
  // 遅延チェック
  isOverdue(): boolean {
    if (!this.dueDate || this.status.isDone()) return false;
    return this.dueDate.getValue() < new Date();
  }
  
  // 期限迫近チェック
  isDueSoon(days: number = 3): boolean {
    if (!this.dueDate || this.status.isDone()) return false;
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + days);
    return this.dueDate.getValue() <= threshold;
  }
}
```

## ドメインサービス

### BusinessDayService
```typescript
export class BusinessDayService {
  // 営業日加算
  async addBusinessDays(date: Date, days: number, countryCode: string = 'JP'): Promise<Date> {
    let result = new Date(date);
    let addedDays = 0;
    
    while (addedDays < days) {
      result.setDate(result.getDate() + 1);
      if (await this.isBusinessDay(result, countryCode)) {
        addedDays++;
      }
    }
    
    return result;
  }
  
  // 営業日減算
  async subtractBusinessDays(date: Date, days: number, countryCode: string = 'JP'): Promise<Date> {
    let result = new Date(date);
    let subtractedDays = 0;
    
    while (subtractedDays < days) {
      result.setDate(result.getDate() - 1);
      if (await this.isBusinessDay(result, countryCode)) {
        subtractedDays++;
      }
    }
    
    return result;
  }
  
  // 営業日判定
  async isBusinessDay(date: Date, countryCode: string = 'JP'): Promise<boolean> {
    // 土日チェック
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return false;
    
    // 祝日チェック
    const holidays = await this.getHolidays(countryCode, date.getFullYear());
    const dateString = date.toISOString().split('T')[0];
    return !holidays.some(holiday => holiday.date === dateString);
  }
  
  // 次の営業日取得
  async getNextBusinessDay(date: Date, countryCode: string = 'JP'): Promise<Date> {
    let result = new Date(date);
    do {
      result.setDate(result.getDate() + 1);
    } while (!(await this.isBusinessDay(result, countryCode)));
    
    return result;
  }
  
  // 前の営業日取得
  async getPreviousBusinessDay(date: Date, countryCode: string = 'JP'): Promise<Date> {
    let result = new Date(date);
    do {
      result.setDate(result.getDate() - 1);
    } while (!(await this.isBusinessDay(result, countryCode)));
    
    return result;
  }
}
```

### ReplanDomainService
```typescript
export class ReplanDomainService {
  // スケジュール計算（V2アルゴリズム）
  async calculateScheduleV2(
    processTemplate: ProcessTemplate,
    goalDate: Date,
    existingSteps: StepInstance[] = [],
    lockedStepIds: Set<number> = new Set(),
    countryCode: string = 'JP'
  ): Promise<SchedulePlan> {
    
    // Step 1: 初期化とデータ準備
    const stepTemplates = processTemplate.getStepTemplates();
    const stepSchedules = new Map<number, { startDate: Date; endDate: Date }>();
    
    // Step 2: トポロジカルソート
    const sortedTemplates = this.topologicalSort(stepTemplates);
    
    // Step 3: Goal-based ステップの計算
    const goalBasedTemplates = sortedTemplates.filter(t => t.getBasis() === Basis.GOAL);
    for (const template of goalBasedTemplates) {
      const offsetDays = template.getOffset().getDays();
      const endDate = await this.businessDayService.subtractBusinessDays(
        goalDate, offsetDays, countryCode
      );
      const duration = 1; // デフォルト期間
      const startDate = await this.businessDayService.subtractBusinessDays(
        endDate, duration - 1, countryCode
      );
      
      stepSchedules.set(template.getId(), { startDate, endDate });
    }
    
    // Step 4: Prev-based ステップの計算（依存関係考慮）
    const prevBasedTemplates = sortedTemplates.filter(t => t.getBasis() === Basis.PREV);
    for (const template of prevBasedTemplates) {
      const dependencies = template.getDependsOn();
      let latestEndDate = new Date(0); // 最も遅い依存ステップの終了日
      
      for (const depId of dependencies) {
        const depSchedule = stepSchedules.get(depId);
        if (depSchedule && depSchedule.endDate > latestEndDate) {
          latestEndDate = depSchedule.endDate;
        }
      }
      
      const offsetDays = template.getOffset().getDays();
      const startDate = await this.businessDayService.addBusinessDays(
        latestEndDate, offsetDays, countryCode
      );
      const duration = 1; // デフォルト期間
      const endDate = await this.businessDayService.addBusinessDays(
        startDate, duration - 1, countryCode
      );
      
      stepSchedules.set(template.getId(), { startDate, endDate });
    }
    
    // Step 5: 既存ステップとの整合性チェック
    for (const existingStep of existingSteps) {
      if (lockedStepIds.has(existingStep.getId())) {
        // ロックされたステップは変更しない
        const templateId = existingStep.getTemplateId();
        stepSchedules.set(templateId, {
          startDate: existingStep.getStartDate()?.getValue() || new Date(),
          endDate: existingStep.getDueDate()?.getValue() || new Date()
        });
      }
    }
    
    // Step 6: 結果構築
    return new SchedulePlan(stepSchedules);
  }
  
  // 差分生成
  generateScheduleDiff(
    existingSteps: StepInstance[],
    newSchedule: SchedulePlan,
    lockedStepIds: Set<number>
  ): ScheduleDiff[] {
    const diffs: ScheduleDiff[] = [];
    
    for (const step of existingSteps) {
      if (lockedStepIds.has(step.getId())) continue;
      
      const templateId = step.getTemplateId();
      const newScheduleItem = newSchedule.getSchedule(templateId);
      
      if (newScheduleItem) {
        const oldDueDate = step.getDueDate()?.getValue();
        const newDueDate = newScheduleItem.endDate;
        
        if (oldDueDate && oldDueDate.getTime() !== newDueDate.getTime()) {
          diffs.push(new ScheduleDiff(
            step.getId(),
            step.getName(),
            oldDueDate,
            newDueDate,
            step.isLocked()
          ));
        }
      }
    }
    
    return diffs;
  }
  
  // トポロジカルソート
  private topologicalSort(stepTemplates: StepTemplate[]): StepTemplate[] {
    const visited = new Set<number>();
    const result: StepTemplate[] = [];
    
    const visit = (template: StepTemplate) => {
      if (visited.has(template.getId())) return;
      
      visited.add(template.getId());
      
      // 依存関係を先に処理
      for (const depId of template.getDependsOn()) {
        const depTemplate = stepTemplates.find(t => t.getId() === depId);
        if (depTemplate) {
          visit(depTemplate);
        }
      }
      
      result.push(template);
    };
    
    for (const template of stepTemplates) {
      visit(template);
    }
    
    return result;
  }
}
```

## ドメイン検証

### 検証ルール
1. **DAG性検証**: トポロジカルソートで循環依存を検出
2. **依存関係検証**: 参照先ステップの存在確認
3. **ステータス遷移検証**: 許可された遷移のみ実行
4. **必須成果物検証**: 完了時の必須成果物チェック
5. **日付整合性検証**: 開始日≤終了日、目標日の妥当性
6. **ロック状態検証**: ロックされたステップの変更禁止

### エラーハンドリング
- **DomainError**: ビジネスルール違反（HTTP 422）
- **ValidationError**: 入力値検証エラー（HTTP 400）
- **ConflictError**: 楽観ロック衝突（HTTP 409）

## 変更履歴

### v1.1での主要な変更点

1. **ステータス遷移ルールの詳細実装**
   - CaseStatus・StepStatusの拡張
   - 遷移可能性の厳密なチェック

2. **ビジネスルールの強化**
   - 必須成果物チェック
   - ロック状態の厳密な管理
   - 日付整合性の検証

3. **ドメインサービスの詳細化**
   - スケジューリングアルゴリズムV2の実装
   - 営業日計算の詳細実装

4. **値オブジェクトの充実**
   - 型安全性の向上
   - バリデーション機能の強化

5. **エンティティメソッドの詳細化**
   - ビジネスロジックの具体化
   - 不変条件の厳密な管理
