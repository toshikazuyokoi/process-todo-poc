# Process Todo Web Application

プロセス指向ToDoアプリケーションのフロントエンドです。

## 技術スタック

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Playwright (E2Eテスト)

## セットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

## スクリプト

- `npm run dev` - 開発サーバーの起動 (http://localhost:3000)
- `npm run build` - プロダクションビルド
- `npm run start` - プロダクションサーバーの起動
- `npm run lint` - ESLintの実行
- `npm run test:e2e` - E2Eテストの実行
- `npm run test:e2e:ui` - E2Eテストの実行（UI付き）
- `npm run test:e2e:debug` - E2Eテストのデバッグ

## 主要機能

### プロセステンプレート管理
- テンプレートの作成・編集・削除
- ステップの定義と依存関係の設定
- ドラッグ&ドロップによるステップの並び替え
- ビジュアルなプロセスフロープレビュー

### 案件管理
- テンプレートからの案件作成
- ステップステータスの更新（TODO/進行中/完了/スキップ）
- 進捗状況の可視化
- ステップのロック/アンロック機能

### 再計画機能
- ゴール日付の変更とスケジュール再計算
- 固定ステップの指定
- クリティカルパスの表示
- 変更内容のプレビュー

## ディレクトリ構造

```
web/
├── app/
│   ├── components/     # 共通コンポーネント
│   │   ├── ui/         # UIコンポーネント
│   │   ├── templates/  # テンプレート関連
│   │   └── cases/      # 案件関連
│   ├── lib/            # ユーティリティ
│   ├── types/          # 型定義
│   ├── templates/      # テンプレートページ
│   ├── cases/          # 案件ページ
│   └── page.tsx        # ホームページ
├── e2e/                # E2Eテスト
├── public/             # 静的ファイル
└── styles/             # グローバルスタイル
```

## E2Eテスト

Playwrightを使用した包括的なE2Eテストが含まれています：

1. **テンプレート管理** (`01-template-management.spec.ts`)
   - テンプレートの作成
   - 詳細表示
   - 編集

2. **案件管理** (`02-case-management.spec.ts`)
   - 案件の作成
   - ステータス更新
   - 再計画機能
   - ステップのロック/アンロック

3. **ナビゲーション** (`03-navigation.spec.ts`)
   - ページ遷移
   - フォームバリデーション
   - 空状態の表示

4. **API統合** (`04-api-integration.spec.ts`)
   - エラーハンドリング
   - ネットワーク遅延
   - リアルタイム更新
   - 並行操作

## 環境変数

`.env.local`ファイルに以下の環境変数を設定：

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## 開発時の注意事項

1. APIサーバー（ポート3001）が起動していることを確認
2. TypeScriptの型定義を活用
3. コンポーネントの再利用性を意識
4. E2Eテストの実行前にAPIサーバーを起動