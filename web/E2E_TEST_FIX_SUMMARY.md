# E2Eテスト修正案 詳細レポート

## 実施した修正内容

### 1. UIコンポーネントの改善
- **Input コンポーネント** (`/app/components/ui/input.tsx`)
  - name属性の自動生成機能を追加
  - data-testid属性を追加
  - aria-label属性を追加
  - labelからnameを自動生成する機能を実装

- **Select コンポーネント** (`/app/components/ui/select.tsx`)
  - 同様の改善を実施

### 2. E2Eテストの部分修正
- **01-template-management.spec.ts**
  - セレクタを`input[label=""]`から`input[name=""]`に変更
  - ステップ編集部分のセレクタを具体化

- **02-case-management.spec.ts**
  - 案件名入力のセレクタを修正

## 残りの修正が必要なファイル

### E2Eテストファイル
以下のファイルのセレクタパターンを同様に修正する必要があります：

1. **03-navigation.spec.ts**
   - フォームバリデーションテストのセレクタ修正

2. **05-user-workflow.spec.ts**
   - ユーザーワークフローのセレクタ修正

3. **06-business-critical.spec.ts**
   - ビジネスクリティカルシナリオのセレクタ修正

4. **07-page-object-tests.spec.ts**
   - Page Objectパターンのセレクタ修正

## 推奨される追加修正

### セレクタパターンの統一
```typescript
// 修正前
input[label="テンプレート名"]
select[label="プロセステンプレート"]

// 修正後（3つの選択肢）
// 1. name属性を使用（推奨）
input[name="テンプレート名"]
select[name="プロセステンプレート"]

// 2. data-testid属性を使用
input[data-testid="template-name"]
select[data-testid="process-template"]

// 3. aria-label属性を使用
input[aria-label="テンプレート名"]
select[aria-label="プロセステンプレート"]
```

### バリデーションメッセージの確認方法
```typescript
// エラーメッセージの確認はrole属性を使用
await expect(page.locator('[role="alert"]:has-text("テンプレート名は必須です")')).toBeVisible()
```

## テスト実行コマンド

修正後のテストを実行するには：

```bash
# 単一ファイルのテスト
cd web
npx playwright test 01-template-management.spec.ts --project=chromium

# すべてのE2Eテスト
npm run test:e2e

# デバッグモード
npm run test:e2e:debug
```

## 期待される改善効果

1. **セレクタの安定性向上**: name属性による確実な要素選択
2. **アクセシビリティ向上**: aria-label属性の追加
3. **テストの保守性向上**: data-testid属性による明示的なテスト対象指定
4. **エラー率の大幅削減**: 現在64.6%の失敗率を20%以下に改善見込み

## 注意事項

- 案件作成フォームのname属性も適切に設定する必要があります
- グローバル検索機能は未実装のため、関連テストはスキップまたは実装待ちとする必要があります
- 認証システムは未実装のため、認証関連のテストは別途対応が必要です