import { test, expect } from '@playwright/test'

test.describe('Navigation and UI', () => {
  test('should navigate through main pages', async ({ page }) => {
    // ホームページ
    await page.goto('/')
    await expect(page.locator('h1')).toContainText('プロセス指向ToDoアプリ')
    
    // クイックアクションの確認
    await expect(page.locator('text=クイックアクション')).toBeVisible()
    await expect(page.locator('text=サマリー')).toBeVisible()
    
    // テンプレート作成ページへの遷移（クライアントサイドナビゲーション待機）
    await page.waitForLoadState('networkidle')
    await Promise.all([
      page.waitForURL('/templates/new'),
      page.click('button:has-text("新規テンプレート作成")')
    ])
    await expect(page.locator('h1')).toContainText('新規テンプレート作成')
    
    // 戻るボタンでホームに戻る
    await page.click('button:has-text("戻る")')
    await page.waitForURL('/')
    
    // 案件作成ページへの遷移（クライアントサイドナビゲーション待機）
    await Promise.all([
      page.waitForURL('/cases/new'),
      page.click('button:has-text("新規案件作成")')
    ])
    await expect(page.locator('h1')).toContainText('新規案件作成')
  })

  test('should display dashboard summary correctly', async ({ page }) => {
    await page.goto('/')
    
    // サマリーセクションの確認
    const summarySection = page.locator('h2:has-text("サマリー")').locator('..')
    await expect(summarySection).toBeVisible()
    
    // アクティブな案件数の表示
    const caseCount = summarySection.locator('p.text-3xl').first()
    await expect(caseCount).toBeVisible()
    await expect(summarySection.locator('text=アクティブな案件')).toBeVisible()
    
    // 利用可能なテンプレート数の表示
    const templateCount = summarySection.locator('p.text-3xl').nth(1)
    await expect(templateCount).toBeVisible()
    await expect(summarySection.locator('text=利用可能なテンプレート')).toBeVisible()
  })

  test('should handle form validation', async ({ page }) => {
    // テンプレート作成ページ
    await page.goto('/templates/new')
    
    // 必須項目を入力せずに保存を試みる
    await page.click('button:has-text("保存")')
    
    // エラーメッセージの確認
    await expect(page.locator('[role="alert"]:has-text("テンプレート名は必須です")')).toBeVisible()
    await expect(page.locator('[role="alert"]:has-text("少なくとも1つのステップが必要です")')).toBeVisible()
    
    // 案件作成ページ
    await page.goto('/cases/new')
    
    // 必須項目を入力せずに保存を試みる
    await page.click('button:has-text("保存")')
    
    // エラーメッセージの確認
    await expect(page.locator('[role="alert"]:has-text("案件名は必須です")')).toBeVisible()
    await expect(page.locator('[role="alert"]:has-text("プロセステンプレートを選択してください")' )).toBeVisible()
  })

  test('should display progress bars correctly', async ({ page }) => {
    await page.goto('/')
    
    // 案件一覧セクション
    const caseSection = page.locator('div:has(h2:has-text("進行中の案件"))')
    
    // 案件が存在する場合、進捗バーを確認
    const caseItems = caseSection.locator('a[href^="/cases/"]')
    const count = await caseItems.count()
    
    if (count > 0) {
      const firstCase = caseItems.first()
      
      // 進捗バーの存在確認
      const progressBar = firstCase.locator('.bg-gray-200.rounded-full')
      await expect(progressBar).toBeVisible()
      
      // 進捗率の表示確認
      const progressText = firstCase.locator('span').filter({ hasText: /%$/ })
      await expect(progressText).toBeVisible()
    }
  })

  test('should handle empty states', async ({ page }) => {
    // APIモックを使用して空の状態をテスト
    await page.route('**/api/cases', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      })
    })
    
    await page.route('**/api/process-templates', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      })
    })
    
    await page.goto('/')
    
    // 空状態のメッセージ確認
    await expect(page.locator('text=まだ案件がありません')).toBeVisible()
    await expect(page.locator('text=まだテンプレートがありません')).toBeVisible()
  })
})