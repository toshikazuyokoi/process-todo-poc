import { test as setup, expect } from '@playwright/test'
import { E2E_CONFIG, getApiBaseUrl, getHostname, isSecureUrl } from './config'

/**
 * Playwright認証セットアップ
 * テスト実行前に一度だけ実行され、認証状態を保存する
 */
setup('authenticate', async ({ page, request }) => {
  console.log('Starting authentication setup...')
  
  // APIのベースURLを取得
  const apiBaseUrl = getApiBaseUrl()
  const loginUrl = `${apiBaseUrl}/api/auth/login`
  
  console.log(`Attempting to login at: ${loginUrl}`)
  console.log(`With user: ${E2E_CONFIG.auth.testUser.email}`)
  
  try {
    // 認証リクエストを送信
    const loginResponse = await request.post(loginUrl, {
      data: {
        email: E2E_CONFIG.auth.testUser.email,
        password: E2E_CONFIG.auth.testUser.password
      },
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    // レスポンスのステータスを確認
    if (!loginResponse.ok()) {
      const responseText = await loginResponse.text()
      console.error(`Login failed with status ${loginResponse.status()}: ${responseText}`)
      throw new Error(`Login failed: ${loginResponse.status()}`)
    }
    
    // レスポンスからトークンを取得
    const responseData = await loginResponse.json()
    const accessToken = responseData.accessToken || responseData.access_token || responseData.token
    
    if (!accessToken) {
      console.error('No access token in response:', responseData)
      throw new Error('No access token received from login')
    }
    
    console.log('Login successful, setting up cookie...')
    
    // Cookieをブラウザコンテキストに設定
    const hostname = getHostname(E2E_CONFIG.frontend.baseUrl)
    const isSecure = isSecureUrl(E2E_CONFIG.frontend.baseUrl)
    
    await page.context().addCookies([{
      name: 'accessToken',
      value: accessToken,
      domain: hostname,
      path: '/',
      httpOnly: true,
      secure: isSecure,
      sameSite: 'Lax'
    }])
    
    // 認証状態を保存
    await page.context().storageState({ path: E2E_CONFIG.auth.storageFile })
    
    console.log('Authentication setup completed successfully')
    
  } catch (error) {
    console.error('Authentication setup failed:', error)
    
    // エラー時は、テストユーザーが存在しない可能性があるので、
    // global-setupでの作成を促すメッセージを表示
    console.log('\n===========================================')
    console.log('Authentication failed. Please ensure:')
    console.log('1. The API server is running')
    console.log('2. Test user exists in the database')
    console.log('3. The credentials are correct')
    console.log('===========================================\n')
    
    throw error
  }
})

/**
 * 認証状態の検証（オプション）
 */
setup('verify authentication', async ({ page }) => {
  console.log('Verifying authentication...')
  
  // 認証が必要なページにアクセスして確認
  await page.goto(E2E_CONFIG.frontend.baseUrl)
  
  // ログインページにリダイレクトされていないことを確認
  const currentUrl = page.url()
  if (currentUrl.includes('/login')) {
    throw new Error('Authentication verification failed: redirected to login page')
  }
  
  console.log('Authentication verified successfully')
})