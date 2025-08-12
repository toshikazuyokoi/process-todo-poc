import { defineConfig, devices } from '@playwright/test'

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
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
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
    // デスクトップブラウザ
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.spec\.ts$/,
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testMatch: /0[1-4].*\.spec\.ts$/, // 基本的なテストのみ
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
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
      use: { ...devices['Desktop Edge'] },
      testMatch: /06-business-critical\.spec\.ts/,
    },
  ],

  /* 環境別設定 */
  webServer: [
    {
      command: 'cd ../api && PORT=3005 npm run start:dev',
      url: 'http://localhost:3005/api/process-templates',
      reuseExistingServer: true,
      timeout: 120 * 1000,
    },
    {
      command: 'PORT=3000 npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 120 * 1000,
    }
  ],

  /* グローバルセットアップ・ティアダウン */
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',

  /* テストのタイムアウト設定 */
  timeout: process.env.CI ? 60000 : 30000,
  expect: {
    timeout: 5000,
  },
})