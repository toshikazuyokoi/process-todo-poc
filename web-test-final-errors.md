# 残りのWebテストエラー詳細レポート

## 概要
- **失敗テストスイート数**: 12
- **合格テストスイート数**: 13
- **失敗テスト数**: 28
- **合格テスト数**: 267
- **合計テスト数**: 295

## 失敗しているテストファイル一覧

### 1. KPI Calculator (`app/services/kpi-calculator.test.ts`)

#### エラー内容
```
● calculateOnTimeCompletionRate › should calculate on-time completion rate correctly
  Expected: 100
  Received: 0
```

**原因**: `onTimeCompletionRate`の計算ロジックで、完了したケースの期限内完了率が正しく計算されていない

**該当箇所**: 
- `app/services/kpi-calculator.test.ts:102`
- `calculator.calculateOnTimeCompletionRate(mockCases)`の戻り値が期待値と異なる

---

### 2. Kanban Board (`app/components/kanban/kanban-board.test.tsx`)

#### エラー1: 日付表示のdata-testid不在
```
● should display due dates when available
  Unable to find an element by: [data-testid="due-date-1"]
```

**原因**: KanbanBoardコンポーネントが`KanbanCard`を使用していないか、`data-testid`属性が設定されていない

**該当箇所**: 
- `app/components/kanban/kanban-board.test.tsx:85`
- 実際のDOM出力では日付が`Due: 1/15/2024`形式で表示されているが、`data-testid`が存在しない

#### エラー2: カラム削除ボタンの不在
```
● should not allow removing the last column
  Unable to find an element with the text: ✕
```

**原因**: 編集モードでカラムが1つしかない場合、削除ボタンが表示されていない

**該当箇所**: 
- `app/components/kanban/kanban-board.test.tsx:230`

---

### 3. Kanban Drag & Drop (`app/components/kanban/kanban-drag-drop.test.tsx`)

#### エラー内容
```
● should maintain drag functionality after adding a column
  Found multiple elements with the text: Task 1
```

**原因**: 同じタスク名が複数表示されており、`getByText`が複数の要素を見つけている

**該当箇所**: 
- `app/components/kanban/kanban-drag-drop.test.tsx:247`
- ドラッグ&ドロップ機能のテスト中に重複要素が生成されている

---

### 4. WebSocket Context (`app/contexts/websocket-context.test.tsx`)

#### エラー内容
```
● should throw error when useWebSocket is used outside provider
  Unable to find an element by: [data-testid="error-message"]
```

**原因**: エラーバウンダリやエラー表示メカニズムが正しく実装されていない

**該当箇所**: 
- `app/contexts/websocket-context.test.tsx:344`
- プロバイダー外での使用時のエラーハンドリングが不適切

---

### 5. Error Boundary (`app/components/ui/__tests__/error-boundary.test.tsx`)

#### エラー1: ページリロード機能
```
● should reload page when "ページを再読み込み" is clicked
  Expected number of calls: >= 1
  Received number of calls: 0
```

**原因**: `window.location.reload`のモックが正しく設定されていない、またはイベントハンドラが呼ばれていない

**該当箇所**: 
- `app/components/ui/__tests__/error-boundary.test.tsx:173`

#### エラー2: ホーム遷移機能
```
● should navigate to home when "ホームに戻る" is clicked
  Expected: "/"
  Received: "http://localhost/"
```

**原因**: `window.location.href`の設定値が絶対URLになっている

**該当箇所**: 
- `app/components/ui/__tests__/error-boundary.test.tsx:187`

---

### 6. Auth Context (`app/contexts/auth-context.test.tsx`)

#### エラー内容
```
● Test suite failed to run
  TypeError: Cannot read properties of undefined (reading 'interceptors')
```

**原因**: `apiClient`が正しくモックされていない。`apiClient.interceptors`が未定義

**該当箇所**: 
- `app/lib/api-client.ts:14`
- モジュールインポート時にインターセプターの設定が失敗

---

### 7. Use Realtime Updates (`app/hooks/use-realtime-updates.test.ts`)

#### エラー内容
```
● Test suite failed to run
  Syntax Error: Expected '>', got 'client'
```

**原因**: JSX構文の解析エラー。TypeScriptの設定またはテストファイルの構文エラー

**該当箇所**: 
- `app/hooks/use-realtime-updates.test.ts:61`
- `<QueryClientProvider client={queryClient}>`の部分で構文エラー

---

### 8. Calendar Week Day View (`app/components/calendar/__tests__/week-day-view.test.tsx`)

#### エラー内容
複数のテストが失敗しているが、主にモックやレンダリングの問題

**原因**: カレンダーコンポーネントの依存関係が正しくモックされていない

---

### 9. Calendar API Integration (`app/components/calendar/__tests__/calendar-api-integration.test.tsx`)

#### エラー内容
APIモックの設定やレスポンスの処理に関する問題

**原因**: APIクライアントのモックが不完全

---

### 10. Case Form (`app/components/cases/case-form.test.tsx`)

#### エラー内容
フォームのバリデーションや送信処理のテストが失敗

**原因**: フォームコンポーネントの依存関係やバリデーションロジックの問題

---

### 11. Toast Component (`app/components/ui/__tests__/toast.test.tsx`)

#### エラー内容
act()警告やタイマー関連のテストが失敗

**原因**: 非同期操作やタイマーの処理が適切にラップされていない

---

### 12. Process Template Form (`app/components/templates/process-template-form.test.tsx`)

#### エラー内容
テンプレートフォームのレンダリングやバリデーションテストが失敗

**原因**: コンポーネントの依存関係やプロップスの問題

---

## 修正優先度

### 高優先度（構文エラー・ビルドエラー）
1. **use-realtime-updates.test.ts** - 構文エラーの修正
2. **auth-context.test.tsx** - apiClientモックの修正

### 中優先度（機能テスト）
3. **kpi-calculator.test.ts** - 計算ロジックの修正
4. **error-boundary.test.tsx** - window.locationモックの修正
5. **websocket-context.test.tsx** - エラーハンドリングの修正

### 低優先度（UI/インテグレーション）
6. **kanban-board.test.tsx** - data-testid属性の追加
7. **kanban-drag-drop.test.tsx** - 重複要素の処理
8. その他のコンポーネントテスト

## 推奨される修正アプローチ

1. **構文エラーの即座の修正**: `use-realtime-updates.test.ts`のJSX構文を修正
2. **モックの適切な設定**: `apiClient`、`window.location`などのグローバルオブジェクトのモック
3. **data-testid属性の追加**: テスト可能性を向上させるため、コンポーネントに適切な属性を追加
4. **act()警告の解消**: 非同期操作を適切にラップ
5. **重複要素の処理**: `getAllByText`や`queryAllByText`を使用して複数要素を適切に処理