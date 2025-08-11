import { test, expect } from '@playwright/test'

test.describe('Simple Tests', () => {
  // APIモックを設定
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/**', async route => {
      const url = route.request().url()
      
      if (url.includes('/process-templates')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{
            id: 1,
            name: 'テストテンプレート',
            version: 1,
            isActive: true,
            stepTemplates: []
          }])
        })
      } else if (url.includes('/cases')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{
            id: 1,
            title: 'テスト案件',
            processId: 1,
            goalDateUtc: '2024-12-31T00:00:00Z',
            status: 'IN_PROGRESS',
            stepInstances: []
          }])
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({})
        })
      }
    })
  })

  test('ホームページが表示される', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toContainText('プロセス指向ToDoアプリ')
  })

  test('テンプレート作成ページへ遷移できる', async ({ page }) => {
    await page.goto('/templates/new')
    await expect(page.locator('h1')).toContainText('新規テンプレート作成')
  })

  test('案件作成ページへ遷移できる', async ({ page }) => {
    await page.goto('/cases/new')
    await expect(page.locator('h1')).toContainText('新規案件作成')
  })

  test('テンプレートのバリデーションが動作する', async ({ page }) => {
    await page.goto('/templates/new')
    
    // 保存ボタンをクリック
    await page.click('button:has-text("保存")')
    
    // エラーメッセージのいずれかが表示されることを確認
    const errorVisible = await page.locator('text=/テンプレート名は必須|少なくとも1つのステップが必要/').count()
    expect(errorVisible).toBeGreaterThan(0)
  })

  test('案件のバリデーションが動作する', async ({ page }) => {
    await page.goto('/cases/new')
    
    // 保存ボタンをクリック
    await page.click('button:has-text("保存")')
    
    // エラーメッセージのいずれかが表示されることを確認
    const errorVisible = await page.locator('text=/案件名は必須|プロセステンプレートを選択/').count()
    expect(errorVisible).toBeGreaterThan(0)
  })
})