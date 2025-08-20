import { defineConfig, devices } from '@playwright/test'
import { E2E_CONFIG } from './e2e/config'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 
    [['github'], ['html', { outputFolder: 'playwright-report', open: 'never' }]] : 
    [['html', { outputFolder: 'playwright-report', open: 'on-failure' }], ['list']],
  
  use: {
    baseURL: E2E_CONFIG.frontend.baseUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: E2E_CONFIG.timeouts.action,
    navigationTimeout: E2E_CONFIG.timeouts.navigation,
  },

  /* Configure test match patterns */
  testMatch: [
    '01-template-management.spec.ts',
    '02-case-management.spec.ts',
    '03-navigation.spec.ts',
    '04-api-integration.spec.ts',
    '05-user-workflow.spec.ts',
    '06-business-critical.spec.ts',
    '07-page-object-tests.spec.ts',
  ],

  /* Configure projects for different test categories */
  projects: [
    // 認証セットアップ
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      teardown: 'cleanup'
    },
    
    // デスクトップブラウザ
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // 認証状態を使用
        storageState: E2E_CONFIG.auth.storageFile,
      },
      dependencies: ['setup'], // setupプロジェクトに依存
      testMatch: /.*\.spec\.ts$/,
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: E2E_CONFIG.auth.storageFile,
      },
      dependencies: ['setup'],
      testMatch: /0[1-4].*\.spec\.ts$/, // 基本的なテストのみ
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: E2E_CONFIG.auth.storageFile,
      },
      dependencies: ['setup'],
      testMatch: /0[1-4].*\.spec\.ts$/, // 基本的なテストのみ
    },

    // モバイルビューポート
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: /05-user-workflow\.spec\.ts/, // レスポンシブテストを含む
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
      testMatch: /05-user-workflow\.spec\.ts/, // レスポンシブテストを含む
    },

    // タブレットビューポート
    {
      name: 'tablet',
      use: { ...devices['iPad (gen 7)'] },
      testMatch: /05-user-workflow\.spec\.ts/, // レスポンシブテストを含む
    },

    // エッジケーステスト（本番環境のみ）
    {
      name: 'edge',
      use: {
        ...devices['Desktop Edge'],
        storageState: E2E_CONFIG.auth.storageFile,
      },
      dependencies: ['setup'],
      testMatch: /06-business-critical\.spec\.ts/,
    },
    
    // クリーンアッププロジェクト
    {
      name: 'cleanup',
      testMatch: /.*\.teardown\.ts/,
    },
  ],

  /* 環境別設定 */
  webServer: [
    {
      command: `cd ../api && PORT=${E2E_CONFIG.api.port} npm run start:dev`,
      url: `${E2E_CONFIG.api.baseUrl}/process-templates`,
      reuseExistingServer: !process.env.CI,
      timeout: E2E_CONFIG.timeouts.server,
    },
    {
      command: `PORT=${E2E_CONFIG.frontend.port} npm run dev`,
      url: E2E_CONFIG.frontend.baseUrl,
      reuseExistingServer: !process.env.CI,
      timeout: E2E_CONFIG.timeouts.server,
    }
  ],

  /* グローバルセットアップ・ティアダウン */
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',

  /* テストのタイムアウト設定 */
  timeout: process.env.CI ? E2E_CONFIG.timeouts.navigation : E2E_CONFIG.timeouts.action,
  expect: {
    timeout: 5000,
  },
})