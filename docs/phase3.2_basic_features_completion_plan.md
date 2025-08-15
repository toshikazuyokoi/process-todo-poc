# Phase 3.2: 基本機能完成計画書

## 1. 概要

既存UIで未実装または不完全な機能を完成させ、システムの基本的な使用性を確保する。高度な機能の前に、まず現在の画面で期待される動作を全て実装する。

## 2. 現状の問題点と対応策

### 2.1 案件詳細画面（/cases/[id]）

#### 問題点1: 担当者割当機能の未実装

**現状**
- 担当者表示欄はあるが、割当・変更機能が動作しない
- ステップごとの担当者管理ができない

**調査結果**
- **Frontend**: `/web/app/components/cases/step-instance-list.tsx:162` で `担当: ユーザー{assigneeId}` と表示のみ
- **Backend**: `/api/src/interfaces/controllers/step/step.controller.ts:50-64` に `PUT :id/assignee` エンドポイントは存在
- **API Client**: `/web/app/lib/api-client.ts:89` に `updateStepAssignee` メソッドあり
- **問題**: UIに担当者選択ドロップダウンが未実装

**必要な修正**
```typescript
// step-instance-list.tsx に追加すべきコンポーネント
const AssigneeSelector = ({ stepId, currentAssigneeId, onAssign }) => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    api.getUsers().then(res => setUsers(res.data))
  }, [])
  
  const handleAssign = async (userId) => {
    setLoading(true)
    try {
      await api.updateStepAssignee(stepId, userId)
      onAssign()
    } catch (error) {
      alert('担当者の割当に失敗しました')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <Select
      value={currentAssigneeId?.toString() || ''}
      onChange={(e) => handleAssign(parseInt(e.target.value))}
      disabled={loading}
      options={[
        { value: '', label: '未割当' },
        ...users.map(u => ({ value: u.id.toString(), label: u.name }))
      ]}
    />
  )
}
```

**実装タスク**
- [x] StepInstanceList に AssigneeSelector コンポーネント追加
- [x] ユーザー一覧取得処理の実装
- [x] 担当者変更時の楽観的更新
- [x] WebSocket経由でのリアルタイム更新対応

#### 問題点2: コメント投稿機能の不具合

**現状**
- コメント入力欄と投稿ボタンはあるが、実際に投稿できない
- APIとの接続が未実装

**調査結果**
- **Frontend**: `/web/app/components/cases/step-comments.tsx:99-118` に `handleSubmitComment` 実装済み
- **Backend**: `/api/src/interfaces/controllers/comment/comment.controller.ts` に完全なCRUD API実装済み
- **API Client**: `/web/app/lib/api-client.ts:110-115` にコメント関連メソッド実装済み
- **問題**: 
  1. Frontend で `api.createComment` を呼んでいるが、エラーハンドリングが不十分
  2. userId がハードコード（1）されている（line 107）
  3. Backend の `CreateCommentUseCase` が正常に動作しているか要確認

**既存の実装（step-comments.tsx:99-118）**
```typescript
const handleSubmitComment = async () => {
  if (!newComment.trim()) return
  
  setSubmitting(true)
  try {
    await api.createComment({
      stepId,
      content: newComment,
      userId: 1, // TODO: Get actual logged-in user ID  ← 問題箇所
    })
    setNewComment('')
    fetchComments()
    if (onCommentAdded) onCommentAdded()
  } catch (error) {
    console.error('Failed to submit comment:', error)
    alert('コメントの投稿に失敗しました')
  } finally {
    setSubmitting(false)
  }
}
```

**必要な修正**
1. 認証コンテキストからユーザーID取得
2. エラーの詳細表示
3. WebSocket統合（RealtimeGateway経由）

**実装タスク**
- [x] AuthContext から現在のユーザーID取得
- [x] エラーレスポンスの詳細表示
- [ ] コメント投稿後のWebSocket通知実装
- [ ] 楽観的更新の実装（即座に表示して、失敗時にロールバック）

### 2.2 スケジュール計算の問題

#### 問題点: 開始日の自動計算未実装

**現状**
- 終了日は自動計算されるが、開始日が全て案件開始日になっている
- これによりガントチャートが正しく表示されない

**調査結果**
- **ReplanDomainService**: `/api/src/domain/services/replan-domain.service.ts` に2つの計算メソッド存在
  - `calculateSchedule` (line 388-554): 旧実装
  - `calculateScheduleV2` (line 265-386): 新実装（修正版）
- **問題の根本原因**:
  1. **Gantt UseCase** (`/api/src/application/usecases/gantt/get-gantt-data.usecase.ts:86`) で `start: step.getCreatedAt()` を使用（作成日を開始日として使用）
  2. 開始日（startDate）が StepInstance エンティティに存在しない
  3. 期限日（dueDateUtc）のみ計算・保存されている

**ガントチャートのデータフロー**
```typescript
// get-gantt-data.usecase.ts:82-96
const stepTasks = steps.map(step => {
  const task: GanttTaskDto = {
    id: `step-${step.getId()}`,
    name: step.getName(),
    start: step.getCreatedAt(),  // ← 問題: 作成日を開始日として使用
    end: step.getDueDate() ? step.getDueDate()!.getDate() : new Date(),
    // ...
  }
})
```

**必要な修正**

1. **StepInstance エンティティに開始日フィールド追加**
```sql
ALTER TABLE step_instances ADD COLUMN start_date_utc TIMESTAMP;
```

2. **ReplanDomainService の計算結果に開始日を含める**
```typescript
// 既存の calculateScheduleV2 は期限日のみ返している
export interface StepSchedule {
  templateId: number;
  name: string;
  startDateUtc: Date;  // 追加
  dueDateUtc: Date;
  dependencies: number[];
}
```

3. **GetGanttDataUseCase の修正**
```typescript
// step_instances.start_date_utc を使用
const task: GanttTaskDto = {
  id: `step-${step.getId()}`,
  name: step.getName(),
  start: step.getStartDate() || step.getCreatedAt(),  // 開始日がない場合のフォールバック
  end: step.getDueDate()?.getDate() || new Date(),
  // ...
}
```

**実装タスク**
- [x] step_instances テーブルに start_date_utc カラム追加
- [x] StepInstance エンティティに startDate プロパティ追加
- [x] ReplanDomainService で開始日も計算するよう修正
- [x] CreateCaseUseCase で開始日も保存
- [x] GetGanttDataUseCase で開始日を使用
- [x] 既存データのマイグレーション（開始日を逆算して設定）

### 2.3 カレンダー画面

#### 問題点: 表示内容が未定義

**現状**
- 画面の枠組みだけで、何を表示するか未実装
- カレンダーコンポーネントは存在するが、データ取得ロジックがない

**調査結果**
- **Frontend**: `/web/app/calendar/page.tsx` に実装あり
- **データ取得**: line 34-83 で cases と steps を取得して表示
- **問題**: 
  1. エラー時にダミーデータ表示（line 89-134）でユーザーを混乱させる
  2. steps が caseDetailResponse.data.steps を参照しているが、実際は stepInstances
  3. DraggableCalendar コンポーネントの実装状態が不明

**既存の実装の問題箇所（calendar/page.tsx:58-79）**
```typescript
// 各ケースの詳細を取得してステップを取得
try {
  const caseDetailResponse = await apiClient.get(`/cases/${caseItem.id}`);
  const steps = caseDetailResponse.data.steps || [];  // ← 問題: 実際は stepInstances
  
  // ステップをイベントに変換
  steps.forEach((step: any) => {
    if (step.dueDateUtc) {  // 開始日がないため期限日のみ表示
      calendarEvents.push({
        id: `step-${step.id}`,
        title: step.name,
        start: step.dueDateUtc,  // 期限日を開始日として使用
        // ...
      });
    }
  });
} catch (error) {
  console.error(`Failed to load steps for case ${caseItem.id}:`, error);
}
```

**実装内容**
```typescript
interface CalendarEvent {
  id: string;
  title: string;         // ステップ名
  caseTitle: string;     // 案件名
  start: Date;           // 開始日
  end: Date;            // 終了日
  type: 'deadline' | 'milestone' | 'task';
  status: StepStatus;
  assignee?: User;
  color: string;         // ステータスに応じた色
}

// カレンダーに表示する内容
1. 自分が担当するステップ
2. 期限が近いステップ（1週間以内）
3. マイルストーンステップ
4. 遅延しているステップ（赤色強調）
```

**必要な修正**
1. steps → stepInstances に修正
2. 開始日と終了日の適切な設定
3. エラー時のダミーデータ削除
4. カレンダー専用APIの作成

**実装タスク**
- [x] caseDetailResponse.data.steps → stepInstances に修正
- [x] 開始日フィールド実装後、start と end を適切に設定
- [x] ダミーデータ表示を削除し、適切なエラーメッセージ表示
- [ ] GET /api/calendar エンドポイント作成（効率的なデータ取得）
- [ ] DraggableCalendar コンポーネントの動作確認

### 2.4 カンバン画面

#### 問題点: データ取得と表示の未実装

**現状**
- カンバンボードのUIはあるが、実データが表示されない
- ドラッグ&ドロップの状態更新が未実装

**調査結果**
- **Frontend**: `/web/app/kanban/page.tsx` に実装あり
- **データ取得**: line 19-44 で全案件の stepInstances を取得
- **状態更新**: line 49-68 で `handleStatusChange` 実装済み
- **問題**: 
  1. cases API が stepInstances を含んでいない可能性
  2. KanbanBoardComplete コンポーネントの実装状態が不明
  3. WebSocket統合がない

**既存の実装（kanban/page.tsx:23-35）**
```typescript
const [casesResponse, usersResponse] = await Promise.all([
  apiClient.get<any[]>('/cases'),
  apiClient.get<User[]>('/users'),
]);

// Extract all step instances from all cases
const allSteps: StepInstance[] = [];
const cases = casesResponse.data || [];
cases.forEach(caseItem => {
  if (caseItem.stepInstances) {  // ← 問題: GET /cases が stepInstances を含むか確認必要
    allSteps.push(...caseItem.stepInstances);
  }
});
```

**実装内容**
```typescript
// カンバンに表示するデータ構造
interface KanbanData {
  columns: {
    todo: StepInstance[];
    inProgress: StepInstance[];
    review: StepInstance[];
    done: StepInstance[];
    blocked: StepInstance[];
  };
  filters: {
    assignee?: number;
    caseId?: number;
    priority?: string;
    dueDate?: DateRange;
  };
}

// 必要なAPI
GET /api/kanban/board?assignee=1&status=todo,inProgress
PUT /api/steps/{stepId}/status
```

**必要な修正**
1. GET /cases API が stepInstances を含むよう修正
2. または専用の GET /api/kanban エンドポイント作成
3. KanbanBoardComplete コンポーネントの動作確認

**実装タスク**
- [x] CaseController の findAll で stepInstances を含めるよう修正
- [ ] または GET /api/kanban/board エンドポイント作成
- [x] KanbanBoardComplete コンポーネントの動作確認と修正
- [x] WebSocket統合でリアルタイム更新
- [x] ドラッグ&ドロップ時の楽観的更新

### 2.5 テンプレート管理

#### 問題点: ステップ追加の保存失敗

**現状**
- ステップを追加しても保存できない
- バリデーションエラーが適切に表示されない

**調査結果**
- **Frontend**: 
  - `/web/app/components/templates/process-template-form.tsx` line 85-99: 保存処理
  - `/web/app/components/templates/step-template-editor.tsx` line 24-35: ステップ追加
- **Backend**:
  - `/api/src/application/dto/process-template/create-process-template.dto.ts`: DTO定義
  - `/api/src/interfaces/controllers/process-template/process-template.controller.ts`: API実装
- **問題の詳細**:
  1. **dependsOn の型不一致**: Frontend は `dependsOnJson` を送信、Backend は `dependsOn` を期待
  2. **requiredArtifacts の型不一致**: Frontend は文字列配列、Backend はオブジェクト配列を期待
  3. **バリデーションエラーの詳細が表示されない**

**型の不一致（process-template-form.tsx:88-98）**
```typescript
stepTemplates: template.stepTemplates?.map(step => ({
  seq: step.seq,
  name: step.name,
  basis: step.basis,
  offsetDays: step.offsetDays,
  requiredArtifacts: step.requiredArtifactsJson?.map(a => ({
    kind: a,  // ← 問題: requiredArtifactsJson が undefined の可能性
    description: ''
  })) || [],
  dependsOn: step.dependsOnJson || [],  // ← OK: dependsOnJson → dependsOn
}))
```

**StepTemplateEditor の初期値（step-template-editor.tsx:24-31）**
```typescript
const newStep: StepTemplate = {
  seq: localSteps.length + 1,
  name: `ステップ ${localSteps.length + 1}`,
  basis: 'prev',
  offsetDays: 1,
  requiredArtifactsJson: [],  // ← 初期化されている
  dependsOnJson: [],  // ← 初期化されている
}
```

**実装タスク**
- [ ] Frontend の型定義を Backend DTO と一致させる
- [ ] バリデーションエラーの詳細表示（error.response?.data?.errors）
- [ ] requiredArtifacts の UI 実装（現在未実装）
- [ ] 保存前のペイロード確認（console.log）
- [ ] Backend のバリデーションエラーレスポンス改善

## 3. 実装優先順位

### 優先度: 高（Week 1-2）
1. **スケジュール計算の修正**
   - ガントチャートが正しく表示されないのは致命的
   - 他の機能にも影響する基盤部分

2. **担当者割当機能**
   - 実運用で必須の機能
   - 通知やフィルターにも関連

### 優先度: 中（Week 3-4）
3. **コメント投稿機能**
   - コミュニケーション機能として重要
   - UIは既にあるので実装は比較的容易

4. **カンバン画面の実装**
   - タスク管理の中核機能
   - ドラッグ&ドロップで直感的な操作

### 優先度: 低（Week 5）
5. **カレンダー画面の実装**
   - あると便利だが必須ではない
   - 他の画面で代替可能

6. **テンプレート保存の修正**
   - 頻度は低いが重要な機能

## 4. 技術的実装詳細

### 4.1 共通改善事項

#### エラーハンドリングの統一
```typescript
// utils/error-handler.ts
export class ApiErrorHandler {
  static handle(error: any, context: string) {
    console.error(`Error in ${context}:`, error);
    
    if (error.response?.data?.message) {
      toast.error(error.response.data.message);
    } else if (error.response?.status === 401) {
      toast.error('認証エラー: 再度ログインしてください');
      router.push('/login');
    } else if (error.response?.status === 403) {
      toast.error('権限エラー: この操作は許可されていません');
    } else {
      toast.error(`エラーが発生しました: ${context}`);
    }
  }
}
```

#### ローディング状態の管理
```typescript
// hooks/useAsyncAction.ts
export function useAsyncAction<T extends (...args: any[]) => Promise<any>>(
  action: T,
  options?: {
    onSuccess?: () => void;
    onError?: (error: any) => void;
    successMessage?: string;
  }
) {
  const [loading, setLoading] = useState(false);
  
  const execute = useCallback(async (...args: Parameters<T>) => {
    setLoading(true);
    try {
      const result = await action(...args);
      if (options?.successMessage) {
        toast.success(options.successMessage);
      }
      options?.onSuccess?.();
      return result;
    } catch (error) {
      options?.onError?.(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [action, options]);
  
  return { execute, loading };
}
```

### 4.2 データ取得の最適化

#### React Queryの活用
```typescript
// queries/useStepInstances.ts
export function useStepInstances(caseId: number) {
  return useQuery({
    queryKey: ['stepInstances', caseId],
    queryFn: () => api.get(`/cases/${caseId}/steps`),
    staleTime: 30000, // 30秒
    cacheTime: 300000, // 5分
  });
}

// mutations/useAssignStep.ts
export function useAssignStep() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ stepId, userId }: AssignStepParams) =>
      api.post(`/steps/${stepId}/assign`, { userId }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['stepInstances']);
      toast.success('担当者を割り当てました');
    },
  });
}
```

## 5. テスト計画

### 5.1 単体テスト
- [ ] スケジュール計算ロジック
- [ ] 権限チェック
- [ ] バリデーション

### 5.2 統合テスト
- [ ] 担当者割当フロー
- [ ] コメント投稿フロー
- [ ] カンバン操作フロー

### 5.3 E2Eテスト
- [ ] 案件作成から完了までのフロー
- [ ] 複数ユーザーでの同時操作

## 6. 完了基準

### 各機能の完了基準

| 機能 | 完了基準 |
|-----|---------|
| 担当者割当 | ステップに担当者を設定でき、フィルターが機能する |
| コメント投稿 | コメントが投稿・表示され、リアルタイム更新される |
| スケジュール計算 | 開始日が正しく計算され、ガントチャートに反映される |
| カレンダー | 担当ステップが表示され、日程変更が可能 |
| カンバン | ステップが表示され、ドラッグ&ドロップで更新できる |
| テンプレート保存 | ステップの追加・編集が正常に保存される |

## 7. リスクと対策

| リスク | 影響 | 対策 |
|-------|-----|------|
| 既存データとの整合性 | 高 | マイグレーションスクリプトの作成 |
| パフォーマンス劣化 | 中 | キャッシング、ページネーション |
| UIの複雑化 | 低 | 段階的な機能追加 |

## 8. スケジュール

### Week 1-2: 基盤修正
- スケジュール計算ロジック
- 担当者割当機能

### Week 3-4: UI機能完成
- コメント機能
- カンバン実装

### Week 5: 追加機能
- カレンダー実装
- テンプレート修正
- バグ修正・最適化

## 9. 成功指標

- 全ての画面で期待される機能が動作する
- エラー発生率 < 0.1%
- ユーザー操作の応答時間 < 1秒
- テストカバレッジ > 70%

---

この計画書により、既存UIの未実装機能を体系的に完成させ、システムの基本的な使用性を確保します。