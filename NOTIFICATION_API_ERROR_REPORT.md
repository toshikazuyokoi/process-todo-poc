# 通知API 404エラー調査レポート

## 問題の概要
Webフロントエンドから通知APIを呼び出す際に404エラーが発生しています。

### エラー詳細
- **エラーメッセージ**: `Failed to load resource: the server responded with a status of 404 (Not Found)`
- **問題のURL**: `:3001/api/notifications/users/4?isRead=false`
- **発生場所**: NotificationBellコンポーネント

## 原因分析

### 1. APIエンドポイントの不一致

**フロントエンド側の実装** (`web/app/lib/api-client.ts`)：
```typescript
getUserNotifications: (userId: number, isRead?: boolean) => 
  apiClient.get('/notifications/my', { params: { isRead } }),
```

**実際の呼び出し** (`web/app/components/notifications/notification-bell.tsx`)：
```typescript
const response = await api.getUserNotifications(userId, false) // Get unread
```

**問題点**：
- api-client.tsでは正しく `/notifications/my` を定義している
- しかし、実際のHTTPリクエストでは `/api/notifications/users/4` にアクセスしようとしている

### 2. NotificationBellコンポーネントの問題

`notification-bell.tsx` の43行目：
```typescript
const response = await api.getUserNotifications(userId, false)
```

このコードは、apiクライアントの定義に従えば `/notifications/my` にアクセスすべきですが、実際には異なるURLにアクセスしています。

### 3. 考えられる原因

1. **別のapiモジュールのインポート**
   - `notification-bell.tsx` では `import { api } from '@/app/lib/api-client'` としている
   - しかし、実行時に異なるapiオブジェクトが使用されている可能性

2. **apiオブジェクトの再定義**
   - どこかで `api.getUserNotifications` メソッドが上書きされている可能性

3. **ビルドキャッシュの問題**
   - Next.jsのビルドキャッシュが古いコードを保持している可能性

## バックエンドAPIの正しいエンドポイント

`api/src/interfaces/controllers/notification/notification.controller.ts` より：

```typescript
@Get('my')
async getMyNotifications(
  @CurrentUser('id') userId: number,
  @Query('isRead') isRead?: string,
)
```

正しいエンドポイント：
- **URL**: `/api/notifications/my`
- **Method**: GET
- **Query Parameters**: `isRead` (optional)
- **認証**: JWTトークンから自動的にuserIdを取得

## サーバーログの観察

APIサーバーのログから以下が確認できます：
1. 大量の `/login` への404エラー
2. `/api/notifications/users/4?isRead=false` への404エラー
3. 認証関連のエラー（`UnauthorizedException: Invalid email or password`）

これらから、以下の問題が推測されます：
- 認証が正しく行われていない
- フロントエンドが間違ったAPIエンドポイントを呼び出している

## 推奨される調査手順

1. **apiオブジェクトの確認**
   - NotificationBellコンポーネントで実際に使用されているapiオブジェクトの内容を確認
   - ブラウザのデベロッパーツールでネットワークタブを確認

2. **ビルドキャッシュのクリア**
   - `.next` フォルダの削除と再ビルド

3. **認証状態の確認**
   - JWTトークンが正しくセットされているか
   - AuthContextが正しく動作しているか

4. **api-clientの実装確認**
   - getUserNotificationsメソッドが正しく実装されているか再確認