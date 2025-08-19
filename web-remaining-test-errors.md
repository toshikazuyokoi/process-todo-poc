# 残存テストエラー詳細レポート

## 概要
- **失敗テストスイート数**: 8
- **失敗テスト数**: 24
- **成功テスト数**: 287
- **合計テスト数**: 311

## 失敗しているテストファイル一覧

1. `app/components/ui/__tests__/toast.test.tsx`
2. `app/components/kanban/kanban-board.test.tsx`
3. `app/components/cases/case-form.test.tsx`
4. `app/contexts/auth-context.test.tsx`
5. `app/contexts/websocket-context.test.tsx`
6. `app/components/templates/process-template-form.test.tsx`
7. `app/components/ui/__tests__/error-boundary.test.tsx`
8. `app/components/calendar/__tests__/calendar-api-integration.test.tsx`

---

## 1. Toast Component (`toast.test.tsx`)

### エラー内容
複数のスタイル関連テストが失敗

#### 失敗しているテスト
- ✗ should execute action callback when action button is clicked
- ✗ should apply success toast styles
- ✗ should apply error toast styles
- ✗ should apply warning toast styles
- ✗ should apply info toast styles
- ✗ should animate toast entrance

### エラー詳細
```
Expected the element to have class:
  border-green-200 (success)
  border-red-200 (error)
  border-yellow-200 (warning)
  border-blue-200 (info)
  transition-all (animation)
```

### 原因
- Toastコンポーネントのスタイルクラスが期待値と異なる
- バリアント（success/error/warning/info）に応じたスタイル適用ロジックの問題
- アニメーション用のCSSクラスが不足

### 推奨修正
- Toastコンポーネントのvariantプロパティに基づくクラス名生成ロジックの確認
- Tailwind CSSクラスの正しい適用

---

## 2. Kanban Board (`kanban-board.test.tsx`)

### エラー内容
カラム削除テストの失敗

#### 失敗しているテスト
- ✗ should not allow removing the last column

### エラー詳細
```
Unable to find an element with the text: ✕
```

### 原因
- 最後のカラムを削除できないようにする制限が期待通り動作していない
- 削除ボタン（✕）の表示/非表示ロジックの問題

### 推奨修正
- `columns.length > 1`の条件で削除ボタンを表示する実装の確認
- テストケースのアサーション方法の見直し

---

## 3. Case Form (`case-form.test.tsx`)

### エラー内容
フォーム操作とバリデーションの複数のテスト失敗

#### 失敗しているテスト
- ✗ テンプレートが読み込まれて表示される
- ✗ 必須項目が未入力の場合エラーメッセージが表示される
- ✗ 正しい入力で案件が作成される

### エラー詳細
```
Unable to find an element with the text: Template 1
Unable to find an element with the text: 案件名は必須です
Expected: {"goalDateUtc": Any<String>, "processId": 1, "title": "Test Case"}
```

### 原因
- テンプレート選択のセレクトボックスが正しくレンダリングされていない
- フォームバリデーションメッセージが表示されていない
- react-hook-formの統合問題

### 推奨修正
- テンプレートデータのモックが正しく設定されているか確認
- フォームバリデーションのエラーメッセージ表示ロジックの確認
- react-hook-formのregister、handleSubmit、errorsの適切な使用

---

## 4. Auth Context (`auth-context.test.tsx`)

### エラー内容
認証コンテキストのテスト失敗（詳細は前回修正済みだが、まだ失敗している）

### 原因
- apiClientのインターセプター設定の問題が完全に解決されていない可能性
- モックの設定タイミングの問題

### 推奨修正
- api-clientモックの完全性を再確認
- テスト環境でのインターセプター設定の無効化を検討

---

## 5. WebSocket Context (`websocket-context.test.tsx`)

### エラー内容
WebSocketコンテキストのエラーハンドリングテスト失敗（前回修正済みだが、まだ失敗している）

### 原因
- Error Boundaryの実装が不完全
- React Hooksのエラーハンドリングの特殊性

### 推奨修正
- Error Boundaryクラスコンポーネントの実装確認
- getDerivedStateFromErrorの正しい使用

---

## 6. Process Template Form (`process-template-form.test.tsx`)

### エラー内容
テストスイート自体の実行失敗

#### エラー詳細
```
Cannot find module '../../../lib/api-client' from 'app/components/templates/process-template-form.test.tsx'
```

### 原因
- モジュールのインポートパスが間違っている
- 相対パスの階層が正しくない

### 推奨修正
- インポートパスを`@/app/lib/api-client`に修正
- または正しい相対パス`../../lib/api-client`に修正

---

## 7. Error Boundary (`error-boundary.test.tsx`)

### エラー内容
エラーバウンダリーのテスト失敗（前回修正済みだが、まだ失敗している）

### 原因
- window.locationのモック方法が不完全
- リロード機能のテストが正しく動作していない

### 推奨修正
- Object.definePropertyによるモック設定の再確認
- テスト後のクリーンアップ処理の追加

---

## 8. Calendar API Integration (`calendar-api-integration.test.tsx`)

### エラー内容
カレンダーイベントの操作テスト失敗

#### 失敗しているテスト
- ✗ ケースの期限更新が呼ばれる
- ✗ ステップの期限更新が呼ばれる
- ✗ イベントクリック時にコールバックが呼ばれる

### エラー詳細
```
Unable to find an element by: [data-testid="draggable-event-case-1"]
Unable to find an element by: [data-testid="draggable-event-step-1"]
```

### 原因
- カレンダーコンポーネントがdata-testid属性を持つイベント要素をレンダリングしていない
- イベント要素のレンダリング条件が満たされていない
- 非同期レンダリングのタイミング問題

### 推奨修正
- CalendarViewコンポーネントでイベント要素にdata-testid属性を追加
- waitForを使用した非同期レンダリングの待機
- イベントデータのモックが正しく設定されているか確認

---

## 修正優先順位

### 優先度: 高（ビルドブロッカー）
1. **Process Template Form** - モジュールパスエラー（即座に修正可能）

### 優先度: 中（機能テスト）
2. **Case Form** - フォーム機能の基本的なテスト
3. **Calendar API Integration** - data-testid属性の追加
4. **Kanban Board** - カラム削除ロジック

### 優先度: 低（スタイル/UI）
5. **Toast** - スタイルクラスの適用
6. **Auth Context** - モック設定の微調整
7. **WebSocket Context** - エラーハンドリング
8. **Error Boundary** - window.locationモック

---

## 推奨アクションプラン

### Step 1: 即座の修正（5分）
- Process Template Formのインポートパス修正

### Step 2: data-testid追加（15分）
- CalendarViewコンポーネントにdata-testid属性追加
- KanbanBoardの削除ボタンロジック確認

### Step 3: フォーム関連修正（30分）
- CaseFormのテンプレート表示とバリデーション修正
- react-hook-formのモック設定確認

### Step 4: スタイル関連修正（20分）
- Toastコンポーネントのvariantスタイル実装

### Step 5: 残りのコンテキスト修正（20分）
- Auth/WebSocket/Error Boundaryの微調整

## 期待される結果
上記の修正により、失敗テスト数を24から5以下に削減可能。