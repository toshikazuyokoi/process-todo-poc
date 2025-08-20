import { test, expect } from '@playwright/test'

test.describe('API Integration', () => {
  test.beforeEach(async ({ page }) => {
    // APIが起動していることを確認
    const apiHealth = await fetch('http://localhost:3005/api/health').catch(() => null)
    if (!apiHealth || !apiHealth.ok) {
      test.skip()
    }
  })

  test('should handle API errors gracefully', async ({ page }) => {
    // APIエラーをシミュレート
    await page.route('**/api/process-templates', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      })
    })
    
    await page.goto('/')
    
    // エラーハンドリングの確認（コンソールエラーをキャッチ）
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })
    
    await page.waitForTimeout(1000)
    expect(consoleErrors.some(error => error.includes('Failed to fetch'))).toBeTruthy()
  })

  test('should handle network latency', async ({ page }) => {
    // 遅延をシミュレート
    await page.route('**/api/process-templates', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000))
      await route.continue()
    })
    
    await page.goto('/')
    
    // ローディング状態の確認
    await expect(page.locator('.animate-spin')).toBeVisible()
    
    // データロード後の確認
    await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 5000 })
  })

  test('should update data in real-time', async ({ page }) => {
    // テンプレート作成
    await page.goto('/templates/new')
    
    const templateName = `リアルタイムテスト_${Date.now()}`
    await page.fill('input[label="テンプレート名"]', templateName)
    
    // ステップ追加
    await page.click('text=ステップ追加')
    await page.fill('input[value="ステップ 1"]', 'テストステップ')
    
    // 保存
    await page.click('button:has-text("保存")')
    await page.waitForTimeout(1000)
    
    // ホームページに戻って確認
    await page.goto('/')
    await page.waitForTimeout(1000)
    
    // 新しいテンプレートが表示されることを確認
    await expect(page.locator(`text=${templateName}`)).toBeVisible({ timeout: 5000 })
  })

  test('should handle concurrent operations', async ({ page, context }) => {
    // 2つのページを開く
    const page1 = page
    const page2 = await context.newPage()
    
    // 両方のページで同じ案件を開く
    await page1.goto('/')
    await page2.goto('/')
    
    const caseLink = page1.locator('a[href^="/cases/"]').first()
    const caseUrl = await caseLink.getAttribute('href')
    
    if (caseUrl) {
      await page1.goto(caseUrl)
      await page2.goto(caseUrl)
      
      // Page1でステップのステータスを変更
      const step1 = page1.locator('.border').first()
      if (await step1.count() > 0) {
        const progressButton = step1.locator('button[title="進行中にする"]')
        if (await progressButton.count() > 0) {
          await progressButton.click()
          await page1.waitForTimeout(500)
        }
      }
      
      // Page2をリロードして変更を確認
      await page2.reload()
      await page2.waitForTimeout(500)
      
      // 両方のページで同じステータスが表示されることを確認
      const status1 = await page1.locator('.border').first().locator('text=進行中').count()
      const status2 = await page2.locator('.border').first().locator('text=進行中').count()
      
      expect(status1).toBe(status2)
    }
    
    await page2.close()
  })

  test('should validate date calculations', async ({ page }) => {
    // 案件作成ページ
    await page.goto('/cases/new')
    
    // 過去の日付を設定してエラーを確認
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 1)
    const pastDateString = pastDate.toISOString().split('T')[0]
    
    await page.fill('input[label="案件名"]', 'バリデーションテスト')
    await page.fill('input[type="date"]', pastDateString)
    
    // テンプレートを選択
    const templateSelect = page.locator('select[label="プロセステンプレート"]')
    const options = await templateSelect.locator('option').all()
    if (options.length > 1) {
      await templateSelect.selectOption({ index: 1 })
    }
    
    // 保存を試みる
    await page.click('button:has-text("保存")')
    
    // エラーメッセージの確認
    await expect(page.locator('text=ゴール日付は今日以降の日付を選択してください')).toBeVisible()
  })
})