# テストエラー深層分析レポート

## エラー分析サマリー

現在のテストスイートで発生している主要なエラーは以下の3つのカテゴリに分類されます：

1. **UIコンポーネントの期待値不一致**（3件）
2. **モジュール解決エラー**（2件）
3. **Vitest依存の残存ファイル**（削除済み）

## 1. ProgressIndicatorコンポーネントのエラー詳細分析

### エラー1: "50%"テキストが見つからない

#### 現象
```javascript
// テストコード
expect(screen.getByText('50%')).toBeInTheDocument();
```

#### 原因分析
ProgressIndicatorコンポーネントの実装を確認すると：
- コンポーネントは`progress`プロパティを受け取る（line 54）
- プログレスバーは表示される（line 203-211）
- **しかし、パーセンテージのテキスト表示はどこにもない**

```typescript
// line 203-211の実装
<div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
  <div
    className={clsx('h-full transition-all duration-500', 
      progress === 100 ? 'bg-green-500' : 'bg-blue-500'
    )}
    style={{ width: `${progress}%` }}  // CSSでwidthを設定するだけ
  />
</div>
```

#### 根本原因
**ProgressIndicatorコンポーネントは、進捗パーセンテージをテキストとして表示する機能を持っていない。**
プログレスバーの幅でのみ進捗を表現している。

### エラー2: エラーメッセージとRetryボタン

#### 現象
```javascript
// テストコード
render(<ProgressIndicator isGenerating={false} error="Generation failed" />);
expect(screen.getByText('Generation failed')).toBeInTheDocument();
expect(screen.getByText('再試行')).toBeInTheDocument();
```

#### 原因分析
ProgressIndicatorの`error`プロパティの型定義（line 30-33）：
```typescript
error?: {
  message: string;
  canRetry: boolean;
};
```

テストは文字列を渡しているが、コンポーネントはオブジェクトを期待している。

#### 実際のレンダリング（line 228-235）
```typescript
{error && (
  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
    <div className="flex items-start gap-2">
      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
      <p className="text-sm text-red-700">{error.message}</p>
    </div>
  </div>
)}
```

また、Retryボタンのテキストは「再試行」ではなく「Retry」（line 184）：
```typescript
<Button ... >
  <RotateCw className="w-4 h-4" />
  Retry
</Button>
```

### エラー3: キャンセルボタンのテキスト

#### 現象
```javascript
const cancelButton = screen.getByText('キャンセル');
```

#### 原因分析
実際のキャンセルボタン実装（line 187-196）：
```typescript
{isGenerating && onCancel && (
  <Button
    size="sm"
    variant="ghost"
    onClick={onCancel}
    className="text-red-600 hover:text-red-700"
  >
    <X className="w-4 h-4" />  // アイコンのみ、テキストなし
  </Button>
)}
```

**キャンセルボタンはアイコンのみで、テキストラベルを持たない。**

## 2. モジュール解決エラーの分析

### auth-context.test.tsxのエラー

#### 現象
```
Could not locate module @/app/lib/api-client mapped as:
/mnt/c/work/git2/process-todo/web/app/$1
```

#### 原因分析
1. jest.config.jsのmoduleNameMapper設定：
```javascript
'^@/(.*)$': '<rootDir>/app/$1'
```

2. テストファイルのモック：
```javascript
jest.mock('@/app/lib/api-client', ...)
```

3. 実際のパス解決：
   - `@/app/lib/api-client` → `/mnt/c/work/git2/process-todo/web/app/app/lib/api-client`
   - **"app"が二重になっている**

#### 根本原因
テストファイルで`@/app/lib/api-client`と書いているが、`@/`は既に`app/`にマップされるため、
正しくは`@/lib/api-client`と書くべき。

### chat-components.integration.test.tsxのエラー

#### 現象
```javascript
import { setupTestEnvironment, ... } from './setup';
```

#### 原因分析
- このテストはvitestを前提に書かれている（`vi.mocked`の使用）
- setupファイルもvitest前提の実装
- Jestとvitestの非互換性

## 3. テスト環境の混在問題

### 現状
- **Jest**：プロジェクトの標準テストランナー
- **Vitest依存のテスト**：Day 9で作成されたが、環境が異なる

### 影響範囲
1. `chat-components.integration.test.tsx` - vitest文法
2. `setup.ts` - vitest前提のセットアップ
3. 削除済みファイル（hooks.integration, performance, template-components）

## 対応方法の提案

### 1. ProgressIndicatorテストの修正

#### オプションA: テストを実装に合わせる
```javascript
// 修正案
it('should render progress indicator', () => {
  render(<ProgressIndicator isGenerating={true} progress={50} message="Processing..." />);
  
  // パーセンテージテキストではなく、プログレスバーの幅を確認
  const progressBar = container.querySelector('[style*="width: 50%"]');
  expect(progressBar).toBeInTheDocument();
  expect(screen.getByText('Processing...')).toBeInTheDocument();
  expect(screen.getByText('Processing')).toBeInTheDocument(); // ステージラベル
});

it('should show error state', () => {
  render(
    <ProgressIndicator 
      isGenerating={false}
      error={{ message: 'Generation failed', canRetry: true }}
      onRetry={jest.fn()}
    />
  );
  
  expect(screen.getByText('Generation failed')).toBeInTheDocument();
  expect(screen.getByText('Retry')).toBeInTheDocument(); // 英語
});

it('should show cancel button when generating', () => {
  const onCancel = jest.fn();
  render(<ProgressIndicator isGenerating={true} progress={25} onCancel={onCancel} />);
  
  // テキストではなくアイコンボタンを探す
  const cancelButton = screen.getByRole('button', { name: '' });
  expect(cancelButton).toHaveClass('text-red-600');
});
```

#### オプションB: コンポーネントを修正する（推奨しない）
コンポーネントにパーセンテージ表示やテキストラベルを追加する。
ただし、現在のデザインが意図的なものである可能性が高い。

### 2. モジュール解決エラーの修正

#### auth-context.test.tsxの修正
```javascript
// 修正前
jest.mock('@/app/lib/api-client', ...)

// 修正後
jest.mock('@/lib/api-client', ...)
```

### 3. chat-components.integration.test.tsxの対応

#### オプションA: Jestに書き換える
```javascript
// 修正前
const io = vi.mocked(require('socket.io-client').io);

// 修正後
const io = jest.mocked(require('socket.io-client').io);
```

#### オプションB: ファイルを削除
統合テストは`websocket-simple.test.tsx`で十分カバーされているため。

## 推奨アクションプラン

### 優先度：高
1. **ProgressIndicatorテストの修正**
   - テストケースを実装に合わせて修正
   - DOMクエリ方法を適切に変更

2. **auth-context.test.tsxのインポートパス修正**
   - `@/app/lib/` → `@/lib/`

### 優先度：中
3. **chat-components.integration.test.tsxの削除または書き換え**
   - websocket-simple.test.tsxで機能がカバーされているため削除推奨

### 優先度：低
4. **setup.tsファイルの整理**
   - 使用されていない場合は削除

## まとめ

### 根本原因の総括
1. **期待値の不一致**：テストが想定している UI と実装が異なる
2. **テスト環境の混在**：Vitest前提のコードがJest環境で実行されている
3. **パス解決の誤り**：エイリアスの使い方の誤解

### 修正の方針
- **実装優先**：既存の実装を変更せず、テストを実装に合わせる
- **環境統一**：Jestに統一し、Vitest依存を排除
- **明確性重視**：曖昧なテストケースは削除または明確化

これらの修正により、テストスイートの安定性と保守性が大幅に向上します。

---

*作成日: 2025-08-30*
*分析深度: コンポーネント実装レベル*