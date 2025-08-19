# 詳細検索修正 方針B（バックエンド実装）分析レポート

## レビュー日時
2025-08-18

## 方針B: サーバーサイド検索APIの実装

### 1. 現状の分析

#### データベーススキーマ（ProcessTemplate）
```prisma
model ProcessTemplate {
  id            Int            @id @default(autoincrement())
  name          String
  version       Int            @default(1)
  isActive      Boolean        @default(true) @map("is_active")
  createdAt     DateTime       @default(now()) @map("created_at")
  updatedAt     DateTime       @updatedAt @map("updated_at")
  cases         Case[]
  stepTemplates StepTemplate[]

  @@map("process_templates")
}
```

**問題点**: 
- `category`フィールドが存在しない
- `tags`フィールドが存在しない
- `description`フィールドが存在しない

#### 既存の検索実装パターン（SearchCasesUseCase）
- 全件取得してメモリ上でフィルタリング（非効率）
- ページネーションはメモリ上で実施
- データベースレベルのフィルタリングなし

### 2. 実装対象ファイル一覧

#### バックエンド側（新規作成）
1. `/api/src/application/usecases/search/search-templates.usecase.ts`
2. `/api/src/application/dto/search/search-templates.dto.ts`

#### バックエンド側（修正）
1. `/api/src/interfaces/controllers/search/search.controller.ts`
2. `/api/src/interfaces/controllers/search/search.module.ts`
3. `/api/src/domain/repositories/process-template.repository.interface.ts`
4. `/api/src/infrastructure/repositories/process-template.repository.ts`

#### フロントエンド側（修正）
1. `/web/app/lib/api-client.ts`

### 3. 詳細実装内容

#### 3.1 search-templates.dto.ts（新規）
```typescript
export interface SearchTemplatesDto {
  query?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface TemplateSearchResultDto {
  id: number;
  name: string;
  version: number;
  isActive: boolean;
  stepCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchTemplatesResultDto {
  templates: TemplateSearchResultDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

#### 3.2 search-templates.usecase.ts（新規）
```typescript
import { Injectable, Inject } from '@nestjs/common';
import { IProcessTemplateRepository } from '@domain/repositories/process-template.repository.interface';
import { SearchTemplatesDto, SearchTemplatesResultDto, TemplateSearchResultDto } from '@application/dto/search/search-templates.dto';

@Injectable()
export class SearchTemplatesUseCase {
  constructor(
    @Inject('IProcessTemplateRepository')
    private readonly templateRepository: IProcessTemplateRepository,
  ) {}

  async execute(dto: SearchTemplatesDto): Promise<SearchTemplatesResultDto> {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const offset = (page - 1) * limit;

    // データベースレベルでフィルタリングと検索を実行
    const { templates, total } = await this.templateRepository.search({
      query: dto.query,
      isActive: dto.isActive,
      limit,
      offset,
    });

    const totalPages = Math.ceil(total / limit);

    // DTOにマッピング
    const templateDtos: TemplateSearchResultDto[] = templates.map(t => ({
      id: t.getId()!,
      name: t.getName(),
      version: t.getVersion(),
      isActive: t.getIsActive(),
      stepCount: t.getStepTemplates().length,
      createdAt: t.getCreatedAt(),
      updatedAt: t.getUpdatedAt(),
    }));

    return {
      templates: templateDtos,
      total,
      page,
      limit,
      totalPages,
    };
  }
}
```

#### 3.3 process-template.repository.interface.ts（修正）
```typescript
// 既存のインターフェースに追加
export interface IProcessTemplateRepository {
  // ... 既存のメソッド ...
  
  // 追加
  search(params: {
    query?: string;
    isActive?: boolean;
    limit: number;
    offset: number;
  }): Promise<{ templates: ProcessTemplate[]; total: number }>;
}
```

#### 3.4 process-template.repository.ts（修正）
```typescript
// 既存のクラスに追加
export class ProcessTemplateRepository implements IProcessTemplateRepository {
  // ... 既存のメソッド ...

  async search(params: {
    query?: string;
    isActive?: boolean;
    limit: number;
    offset: number;
  }): Promise<{ templates: ProcessTemplate[]; total: number }> {
    const where: any = {};

    // 検索条件の構築
    if (params.query) {
      where.name = {
        contains: params.query,
        mode: 'insensitive', // 大文字小文字を区別しない
      };
    }

    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    // 総件数を取得
    const total = await this.prisma.processTemplate.count({ where });

    // ページネーション付きでデータ取得
    const data = await this.prisma.processTemplate.findMany({
      where,
      include: {
        stepTemplates: true,
      },
      skip: params.offset,
      take: params.limit,
      orderBy: {
        updatedAt: 'desc', // 更新日時の降順
      },
    });

    const templates = data.map((d) => this.toDomainWithSteps(d));

    return { templates, total };
  }
}
```

#### 3.5 search.controller.ts（修正）
```typescript
// 既存のコントローラーに追加
import { SearchTemplatesUseCase, SearchTemplatesDto } from '@application/usecases/search/search-templates.usecase';

export class SearchController {
  constructor(
    // ... 既存の依存性注入 ...
    private readonly searchTemplatesUseCase: SearchTemplatesUseCase,
  ) {}

  // ... 既存のメソッド ...

  @Get('templates')
  @ApiOperation({ summary: 'Search and filter templates' })
  @ApiQuery({ name: 'query', required: false, type: String, description: 'Search query' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filter by active status' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async searchTemplates(
    @Query('query') query?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const dto: SearchTemplatesDto = {
      query,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    };

    return await this.searchTemplatesUseCase.execute(dto);
  }
}
```

#### 3.6 search.module.ts（修正）
```typescript
// 既存のモジュールに追加
import { SearchTemplatesUseCase } from '@application/usecases/search/search-templates.usecase';

@Module({
  imports: [InfrastructureModule],
  controllers: [SearchController],
  providers: [
    SearchCasesUseCase,
    SearchStepsUseCase,
    SearchTemplatesUseCase, // 追加
  ],
  exports: [
    SearchCasesUseCase,
    SearchStepsUseCase,
    SearchTemplatesUseCase, // 追加
  ],
})
export class SearchModule {}
```

#### 3.7 api-client.ts（フロントエンド修正）
```typescript
// 既存のAPI関数に追加
export const api = {
  // ... 既存の関数 ...

  // Process Templates（追加）
  getTemplates: () => apiClient.get('/process-templates'), // エイリアス

  // Search（修正）
  searchCases: (params: any) => apiClient.get('/search/cases', { params }),
  searchSteps: (params: any) => apiClient.get('/search/steps', { params }),
  searchTemplates: (params: any) => apiClient.get('/search/templates', { params }), // 追加
}
```

### 4. カテゴリ・タグ対応について

#### 現状の問題
- データベースにcategory、tagsフィールドが存在しない
- フロントエンドUIにはこれらのフィルタが存在する

#### 対応方針

**方針1: スキーマ拡張（推奨）**
```prisma
model ProcessTemplate {
  // ... 既存フィールド ...
  category    String?
  description String?
  tags        String[]  // PostgreSQLの配列型
}
```
- マイグレーションが必要
- 既存データへの影響を考慮

**方針2: UI側で非表示**
- search/page.tsxからcategory、tagsフィルタを削除
- 最小限の変更で済む

**方針3: JSONフィールド活用**
```prisma
model ProcessTemplate {
  // ... 既存フィールド ...
  metadata Json @default("{}")  // category, tags, descriptionを含む
}
```
- 柔軟性が高い
- クエリパフォーマンスに注意

### 5. パフォーマンス改善点

#### 現在の実装（SearchCasesUseCase）の問題
```typescript
// 全件取得してメモリ上でフィルタリング
let cases = await this.caseRepository.findAll();
if (dto.query) {
  cases = cases.filter(c => 
    c.getTitle().toLowerCase().includes(query)
  );
}
```

#### 改善後の実装
- データベースレベルでWHERE句によるフィルタリング
- LIMIT/OFFSETによる効率的なページネーション
- インデックスの活用（name列にインデックス推奨）

### 6. 実装の優先順位

1. **Phase 1: 基本検索機能**
   - name検索のみ実装
   - isActiveフィルタ実装
   - ページネーション実装
   - categoryとtagsは一旦無視

2. **Phase 2: スキーマ拡張**（オプション）
   - category、description、tagsフィールド追加
   - マイグレーション実行
   - 検索機能の拡張

### 7. テストポイント

#### ユニットテスト
- SearchTemplatesUseCaseのテスト
- ProcessTemplateRepositoryのsearchメソッドテスト

#### 統合テスト
- GET /api/search/templates エンドポイントテスト
- ページネーションテスト
- 検索条件の組み合わせテスト

### 8. リスク評価

#### 低リスク
- 新規APIエンドポイントの追加のため、既存機能への影響なし
- フロントエンドの変更は最小限

#### 中リスク
- ProcessTemplateRepositoryインターフェースの変更
- 依存性注入の設定ミス可能性

#### 考慮事項
- Prismaのcontainsクエリは大文字小文字を区別する（PostgreSQL）
  - `mode: 'insensitive'`オプションで解決
- 日本語検索の考慮（全文検索は未実装）

### 9. 最終推奨事項

**即座の実装（Phase 1）**:
1. 上記3.1〜3.7の実装を行う
2. categoryとtagsフィルタはUIから一時的に非表示
3. name検索とisActiveフィルタのみで動作確認

**将来の拡張（Phase 2）**:
1. スキーマ拡張でcategory、description、tagsを追加
2. 全文検索の実装（PostgreSQLのFull Text Search）
3. 検索履歴の保存機能

### 10. 案件・ステップ検索の既存実装の問題分析

#### 10.1 案件検索（SearchCasesUseCase）の詳細分析

##### APIレスポンス構造
```typescript
// api/src/application/usecases/search/search-cases.usecase.ts
return {
  cases: caseDtos,  // CaseSearchResultDto[]の配列
  total,
  page,
  limit,
  totalPages,
};
```

##### フロントエンドの受信処理（現状）
```typescript
// web/app/search/page.tsx (Line 107-108)
const response = await api.searchCases(caseParams)
results.cases = response.data.cases || []  // ✅ 正しい
```

**評価**: 案件検索のデータアクセスは正しく実装されている。

#### 10.2 ステップ検索（SearchStepsUseCase）の詳細分析

##### APIレスポンス構造
```typescript
// api/src/application/usecases/search/search-steps.usecase.ts
return {
  steps: stepDtos,  // StepSearchResultDto[]の配列
  total,
  page,
  limit,
  totalPages,
};
```

##### フロントエンドの受信処理（現状）
```typescript
// web/app/search/page.tsx (Line 128-129)
const response = await api.searchSteps(stepParams)
results.steps = response.data || []  // ❌ 誤り！response.data.stepsであるべき
```

**問題点**: ステップ検索でresponse.dataオブジェクト全体をsteps配列として扱っている。

#### 10.3 検索機能が動作しない根本原因の階層的分析

##### レベル1: 即座に発生するエラー（最優先）
1. **テンプレート関連の未実装API呼び出し**
   - `api.getTemplates()` (Line 75) - カテゴリ取得用
   - `api.searchTemplates()` (Line 119) - テンプレート検索用
   - **影響**: JavaScriptエラーで検索処理全体が停止

##### レベル2: データ構造の不一致
1. **ステップ検索のデータアクセスエラー**
   - `response.data`を配列として扱う（Line 129）
   - **影響**: ステップ検索結果が正しく表示されない

##### レベル3: UIレンダリングの問題
1. **ステップ検索結果の表示フィールド**
   - Line 494: `step.caseName`と`step.estimatedHours`を表示
   - **問題**: APIレスポンスに`estimatedHours`フィールドが存在しない
   ```typescript
   // 実際のAPIレスポンス
   interface StepSearchResultDto {
     id: number;
     name: string;
     description: string | null;
     status: string;
     assigneeId: number | null;
     assigneeName: string | null;
     caseId: number;
     caseName: string;
     dueDate: Date | null;
     createdAt: Date;
     updatedAt: Date;
     // estimatedHoursは存在しない！
   }
   ```

#### 10.4 カテゴリ取得処理の問題

##### fetchCategories関数の分析（Line 73-84）
```typescript
const fetchCategories = async () => {
  try {
    const response = await api.getTemplates()  // ❌ 未実装
    const uniqueCategories = [...new Set(response.data
      .map((t: any) => t.category)  // categoryフィールドも存在しない
      .filter((c: string | null) => c !== null)
    )] as string[]
    setCategories(uniqueCategories)
  } catch (error) {
    console.error('Failed to fetch categories:', error)
  }
}
```

**問題の連鎖**:
1. `api.getTemplates()`が未実装
2. ProcessTemplateテーブルに`category`フィールドが存在しない
3. エラーはcatchされるが、カテゴリフィルタが機能しない

### 11. 修正方針の詳細提案

#### 11.1 即座の修正（Phase 1: 最小限の動作確保）

##### A. フロントエンド側の修正
```typescript
// web/app/search/page.tsx の修正箇所

// 1. fetchCategories関数を一時的に無効化（Line 73-84）
const fetchCategories = async () => {
  // 一時的にコメントアウト
  // API実装後に復活
  setCategories([])  // 空配列をセット
}

// 2. テンプレート検索を一時的に無効化（Line 111-121）
// if (filters.type === 'all' || filters.type === 'templates') {
//   // 省略
// }

// 3. ステップ検索のデータアクセス修正（Line 129）
results.steps = response.data.steps || []  // 修正

// 4. ステップ表示の修正（Line 494）
<p className="text-sm text-gray-500 mt-1">
  案件: {step.caseName}
  {/* estimatedHoursを削除または条件付き表示 */}
</p>
```

##### B. api-client.tsの修正
```typescript
// web/app/lib/api-client.ts

// テンプレート関連の仮実装を追加
getTemplates: () => Promise.resolve({ data: [] }),  // 空配列を返す仮実装
searchTemplates: (params: any) => Promise.resolve({ 
  data: { templates: [], total: 0, page: 1, limit: 20, totalPages: 0 } 
}),
```

#### 11.2 本格的な修正（Phase 2: 完全な機能実装）

##### A. バックエンドの実装優先順位
1. **最優先**: テンプレート検索API実装（セクション3.1〜3.6の内容）
2. **次点**: 案件・ステップ検索のパフォーマンス改善
3. **将来**: カテゴリ・タグ機能の実装

##### B. データベーススキーマの拡張検討
```sql
-- 将来的な拡張案
ALTER TABLE process_templates 
ADD COLUMN category VARCHAR(100),
ADD COLUMN description TEXT,
ADD COLUMN tags TEXT[];  -- PostgreSQL配列型

-- インデックスの追加
CREATE INDEX idx_templates_category ON process_templates(category);
CREATE INDEX idx_templates_name ON process_templates(name);
```

### 12. テスト戦略

#### 12.1 手動テストシナリオ
1. **基本検索**
   - 検索フィールドに「テスト」と入力
   - 「すべて」フィルタで検索実行
   - 案件とステップの結果が表示されることを確認

2. **フィルタ検索**
   - タイプを「案件のみ」に変更して検索
   - ステータスフィルタを適用して検索
   - 結果が正しくフィルタリングされることを確認

3. **エラーハンドリング**
   - ネットワークエラー時の動作確認
   - 認証エラー時の動作確認

#### 12.2 自動テストの追加ポイント
```typescript
// 案件検索のテスト例
describe('SearchCasesUseCase', () => {
  it('should return paginated results', async () => {
    // テスト実装
  });
  
  it('should filter by query string', async () => {
    // テスト実装
  });
});
```

### 13. リスク評価（更新版）

#### 高リスク
- **テンプレート検索未実装によるJavaScriptエラー**
  - 影響: 検索機能全体が動作しない
  - 対策: 即座の仮実装または条件付き実行

#### 中リスク
- **ステップ検索のデータアクセスエラー**
  - 影響: ステップ検索結果が表示されない
  - 対策: データアクセスパスの修正

- **存在しないフィールドへのアクセス**
  - 影響: undefinedエラーまたは表示の欠落
  - 対策: オプショナルチェイニングの使用

#### 低リスク
- **カテゴリフィルタの非動作**
  - 影響: UIは表示されるが機能しない
  - 対策: 一時的にUIを非表示化

### 14. 実装チェックリスト

#### Phase 1（即座の修正）
- [ ] fetchCategories関数の一時無効化
- [ ] テンプレート検索のコメントアウト
- [ ] ステップ検索のデータアクセス修正
- [ ] estimatedHours表示の削除/修正
- [ ] api-client.tsに仮実装追加
- [ ] 動作確認テスト

#### Phase 2（本格実装）
- [ ] SearchTemplatesUseCaseの実装
- [ ] SearchControllerへのエンドポイント追加
- [ ] ProcessTemplateRepositoryの拡張
- [ ] api-client.tsの本実装
- [ ] フロントエンドのコメント解除
- [ ] 統合テストの実施

### 15. 最終結論

検索機能が動作しない主要因は以下の3点：

1. **テンプレート検索APIの未実装**（最重要）
2. **ステップ検索のデータアクセスパス誤り**（重要）
3. **存在しないフィールドへのアクセス**（中程度）

これらを段階的に修正することで、検索機能を復活させることができます。Phase 1の修正により最小限の動作を確保し、Phase 2で完全な機能を実装する二段階アプローチを推奨します。