# 詳細検索問題の修正分析レポート

## 問題の概要
詳細検索画面で全ての検索条件を「すべて」に設定しても、検索結果が0件になる。

## 調査結果

### 1. エラーの発生箇所
`/web/app/search/page.tsx` の以下の2箇所でAPIが呼び出されているが、これらの関数が未定義：

1. **75行目**: `api.getTemplates()` - カテゴリ取得のため
2. **119行目**: `api.searchTemplates(templateParams)` - テンプレート検索のため

### 2. API実装の現状

#### バックエンド側 (`/api/src/interfaces/controllers/`)
- **検索API**:
  - `/api/search/cases` - 案件検索（実装済み）
  - `/api/search/steps` - ステップ検索（実装済み）
  - `/api/search/templates` - **テンプレート検索（未実装）**

- **テンプレートAPI**:
  - `/api/process-templates` - テンプレート一覧取得（実装済み）
  - `/api/process-templates/:id` - 個別取得（実装済み）

#### フロントエンド側 (`/web/app/lib/api-client.ts`)
現在定義されている関数：
```typescript
// Process Templates
getProcessTemplates: () => apiClient.get('/process-templates'),
getProcessTemplate: (id: number) => apiClient.get(`/process-templates/${id}`),

// Search
searchCases: (params: any) => apiClient.get('/search/cases', { params }),
searchSteps: (params: any) => apiClient.get('/search/steps', { params }),
```

不足している関数：
- `getTemplates()` - `getProcessTemplates()`のエイリアスまたは同一機能
- `searchTemplates(params)` - テンプレート検索API

### 3. 他の画面での実装状況

#### `/web/app/templates/page.tsx` での実装
- 88行目: `api.getProcessTemplates()` を使用（正しい関数名）
- 84-126行目: クライアント側でフィルタリング実装
  - 全テンプレートを取得後、クライアント側で検索・フィルタリング
  - カテゴリ、アクティブ状態、検索クエリでフィルタ

### 4. 修正方針

#### 方針A: 最小限の修正（推奨）
フロントエンドのみの修正で、既存の実装パターンに合わせる。

**修正対象ファイル**:
1. `/web/app/lib/api-client.ts`
2. `/web/app/search/page.tsx`

**修正内容**:

1. **api-client.ts の修正**
```typescript
// Process Templates（既存）
getProcessTemplates: () => apiClient.get('/process-templates'),
getProcessTemplate: (id: number) => apiClient.get(`/process-templates/${id}`),

// 追加（エイリアス）
getTemplates: () => apiClient.get('/process-templates'), // getProcessTemplatesと同じ

// Search（既存）
searchCases: (params: any) => apiClient.get('/search/cases', { params }),
searchSteps: (params: any) => apiClient.get('/search/steps', { params }),

// 追加（クライアント側フィルタリング用のダミー関数）
searchTemplates: async (params: any) => {
  // 全テンプレートを取得してクライアント側でフィルタリング
  const response = await apiClient.get('/process-templates')
  let templates = response.data || []
  
  // queryでフィルタリング
  if (params.query) {
    templates = templates.filter((t: any) => 
      t.name.toLowerCase().includes(params.query.toLowerCase())
    )
  }
  
  // categoryでフィルタリング
  if (params.category) {
    templates = templates.filter((t: any) => t.category === params.category)
  }
  
  // tagsでフィルタリング
  if (params.tags) {
    const tagArray = params.tags.split(',')
    templates = templates.filter((t: any) => 
      t.tags && tagArray.some((tag: string) => t.tags.includes(tag))
    )
  }
  
  return { data: { templates } }
},
```

2. **search/page.tsx の修正**
変更不要（api-client.tsに関数を追加すれば動作する）

#### 方針B: 完全な実装
バックエンドにテンプレート検索APIを追加し、フロントエンドから呼び出す。

**修正対象ファイル**:
1. バックエンド: 新規ファイル作成 + SearchControllerの更新
2. フロントエンド: api-client.tsの更新

**修正内容**:
1. バックエンドに `/api/search/templates` エンドポイントを追加
2. SearchTemplatesUseCaseを実装
3. フロントエンドのapi-client.tsを更新

### 5. 影響範囲

#### 方針Aの場合
- **影響**: 最小限
- **リスク**: 低
- **パフォーマンス**: 全テンプレート取得のため、件数が多い場合は遅い
- **実装時間**: 短い

#### 方針Bの場合
- **影響**: バックエンド・フロントエンド両方
- **リスク**: 中
- **パフォーマンス**: サーバー側フィルタリングで高速
- **実装時間**: 長い

### 6. 推奨事項

**即座の対応（方針A）**:
1. api-client.tsに不足している関数を追加
2. クライアント側でフィルタリング処理を実装
3. templates/page.tsxと同じパターンで実装

**将来的な改善（方針B）**:
1. バックエンドにテンプレート検索APIを実装
2. パフォーマンスとスケーラビリティの向上
3. 他の検索APIと一貫性のある実装

## 結論

詳細検索が機能しない原因は、`api.getTemplates()`と`api.searchTemplates()`関数が未定義のためです。

即座の修正として、api-client.tsにこれらの関数を追加し、既存のgetProcessTemplates()を使用してクライアント側でフィルタリングを行うことを推奨します。これにより、最小限の変更で問題を解決できます。