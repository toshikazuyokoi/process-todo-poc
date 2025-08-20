/**
 * E2E Test Configuration
 * 環境変数から設定を読み込み、デフォルト値を提供
 */

export const E2E_CONFIG = {
  frontend: {
    baseUrl: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    port: process.env.FRONTEND_PORT || '3000'
  },
  api: {
    baseUrl: process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005/api',
    port: process.env.API_PORT || '3005',
    healthEndpoint: '/health'
  },
  auth: {
    testUser: {
      email: process.env.TEST_USER_EMAIL || 'test@example.com',
      password: process.env.TEST_USER_PASSWORD || 'password123',
      name: process.env.TEST_USER_NAME || 'Test User',
      role: process.env.TEST_USER_ROLE || 'admin'
    },
    storageFile: 'playwright/.auth/user.json'
  },
  timeouts: {
    navigation: parseInt(process.env.NAVIGATION_TIMEOUT || '60000'),
    action: parseInt(process.env.ACTION_TIMEOUT || '30000'),
    server: parseInt(process.env.SERVER_TIMEOUT || '120000')
  }
}

/**
 * APIのベースURLを取得（/apiサフィックスなし）
 */
export function getApiBaseUrl(): string {
  const apiUrl = E2E_CONFIG.api.baseUrl
  return apiUrl.replace(/\/api$/, '')
}

/**
 * URLからホスト名を取得
 */
export function getHostname(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return 'localhost'
  }
}

/**
 * URLがHTTPSかどうかを判定
 */
export function isSecureUrl(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:'
  } catch {
    return false
  }
}