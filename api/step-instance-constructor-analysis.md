# StepInstanceコンストラクタ問題の詳細分析レポート

## 問題の概要

StepInstanceエンティティのコンストラクタが11個のパラメータを要求しているが、テストコードでは10個しか渡していないため、TypeScriptコンパイルエラーが発生している。

## コンストラクタの正しいシグネチャ

### 現在の実装 (step-instance.ts:11-23)
```typescript
constructor(
  private readonly id: number | null,
  private readonly caseId: number,
  private readonly templateId: number | null,
  private name: string,
  startDateUtc: Date | string | null,  // 5番目のパラメータ
  dueDateUtc: Date | string | null,    // 6番目のパラメータ
  private assigneeId: number | null,
  status: StepStatus | string,
  private locked: boolean,
  private readonly createdAt: Date,
  private updatedAt: Date,  // 11番目のパラメータ（必須）
)
```

## 誤った呼び出し箇所の詳細

### 1. step-instance.spec.ts (ドメインテスト)
**全18箇所でエラー発生**

#### 典型的な誤りパターン
```typescript
// 現在のコード（誤り）- 10個のパラメータ
const instance = new StepInstance(
  1,                        // id
  100,                      // caseId
  10,                       // templateId
  'Test Step',              // name
  dueDate,                  // ★誤り: dueDateをstartDateの位置に
  null,                     // assigneeId
  StepStatus.TODO,          // status
  true,                     // locked
  new Date('2025-01-01'),   // createdAt
  new Date('2025-01-01'),   // updatedAt ★誤り: これが10番目
);

// 正しいコード - 11個のパラメータ
const instance = new StepInstance(
  1,                        // id
  100,                      // caseId
  10,                       // templateId
  'Test Step',              // name
  null,                     // startDateUtc (5番目)
  dueDate,                  // dueDateUtc (6番目)
  null,                     // assigneeId
  StepStatus.TODO,          // status
  true,                     // locked
  new Date('2025-01-01'),   // createdAt
  new Date('2025-01-01'),   // updatedAt (11番目)
);
```

### 2. case.spec.ts (ドメインテスト)
**全13箇所で同様のエラー**

#### 修正前（10パラメータ）
```typescript
const step1 = new StepInstance(
  1, 1, 1, 'Step 1',
  new Date('2024-12-15'),  // dueDateをstartDateの位置に
  null,
  StepStatus.DONE,
  false,
  new Date(),
  new Date(),
);
```

#### 修正後（11パラメータ）
```typescript
const step1 = new StepInstance(
  1, 1, 1, 'Step 1',
  null,                    // startDateUtc (5番目)
  new Date('2024-12-15'),  // dueDateUtc (6番目)
  null,
  StepStatus.DONE,
  false,
  new Date(),
  new Date(),
);
```

## 正しく実装されている箇所

### 1. step-instance.repository.ts (インフラ層)
```typescript
private toDomain(data: any): StepInstance {
  return new StepInstance(
    data.id,
    data.caseId,
    data.templateId,
    data.name,
    data.startDateUtc,    // 正しく5番目
    data.dueDateUtc,      // 正しく6番目
    data.assigneeId,
    data.status,
    data.locked,
    data.createdAt,
    data.updatedAt,       // 正しく11番目
  );
}
```

### 2. create-case.usecase.ts (アプリケーション層)
```typescript
const instance = new StepInstance(
  null,
  savedCase.getId()!,
  step.templateId,
  step.name,
  step.startDateUtc,      // 正しく5番目
  step.dueDateUtc,        // 正しく6番目
  null,
  StepStatus.TODO,
  false,
  new Date(),
  new Date(),             // 正しく11番目
);
```

## 修正対象ファイル

### 必須修正（TypeScriptコンパイルエラー）
1. **src/domain/entities/step-instance.spec.ts**
   - 18箇所のnew StepInstance呼び出し
   - 各箇所でstartDateUtcパラメータを追加

2. **src/domain/entities/case.spec.ts**
   - 13箇所のnew StepInstance呼び出し
   - 各箇所でstartDateUtcパラメータを追加

## 修正方針

### パラメータ配置の原則
1. **startDateUtc（5番目）**: 多くのテストケースではnullで良い
2. **dueDateUtc（6番目）**: 既存のdueDate値をここに移動
3. **updatedAt（11番目）**: createdAtと同じ値またはnew Date()

### 具体的な修正手順
1. 各new StepInstance呼び出しを特定
2. 現在5番目にある日付パラメータを6番目に移動
3. 5番目にnullまたは適切なstartDateを挿入
4. パラメータ数が11個になることを確認

## 影響範囲

### 直接的影響
- **テストファイル**: 31箇所の修正が必要
- **プロダクションコード**: 影響なし（既に正しい）

### 間接的影響
- 修正後、step-instance.spec.tsとcase.spec.tsのテストが実行可能になる
- 新たなテスト失敗が発覚する可能性がある

## 推奨事項

1. **即座の修正**: TypeScriptコンパイルエラーのため、テスト実行不可
2. **一括修正**: 全31箇所を一度に修正して整合性を保つ
3. **テスト実行**: 修正後に全テストを再実行して新たな問題を確認

## 結論

この問題は明確で、修正方法も確立している。StepInstanceのコンストラクタは11個のパラメータを要求しており、テストコードが10個しか渡していないことが原因。startDateUtcパラメータ（5番目）を追加することで解決可能。