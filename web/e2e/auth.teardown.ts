import { test as teardown } from '@playwright/test'
import { E2E_CONFIG, getApiBaseUrl } from './config'

/**
 * Playwright認証ティアダウン
 * すべてのテスト完了後に実行され、テストデータをクリーンアップする
 */
teardown('cleanup authentication', async ({ request }) => {
  console.log('Starting authentication cleanup...')
  
  const apiBaseUrl = getApiBaseUrl()
  const cleanupUrl = `${apiBaseUrl}/api/test/cleanup`
  
  try {
    // テストユーザーとデータをクリーンアップ
    const response = await request.delete(cleanupUrl, {
      data: {
        email: E2E_CONFIG.auth.testUser.email
      },
      headers: {
        'Content-Type': 'application/json'
      }
    }).catch(error => {
      // クリーンアップエンドポイントが存在しない場合は警告のみ
      console.warn('Cleanup endpoint not available:', error.message);
      return null;
    });
    
    if (response) {
      if (response.ok()) {
        const data = await response.json();
        console.log('Cleanup response:', data.message);
      } else {
        console.warn(`Cleanup failed with status ${response.status()}`);
      }
    }
    
  } catch (error) {
    console.error('Error during cleanup:', error);
    // クリーンアップに失敗しても続行
  }
  
  console.log('Authentication cleanup completed')
})

/**
 * 認証ファイルのクリーンアップ（オプション）
 */
teardown('cleanup auth files', async () => {
  console.log('Cleaning up auth storage files...')
  
  // 認証ファイルの削除はPlaywrightが自動的に行うため、
  // 特別な処理は不要ですが、必要に応じてここに追加できます
  
  console.log('Auth file cleanup completed')
})