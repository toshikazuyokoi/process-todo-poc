import { test, expect } from '@playwright/test'

test.describe('Template Management', () => {
  test('should create a new process template', async ({ page }) => {
    // ホームページに移動
    await page.goto('/')
    
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle')
    
    // テンプレート作成ページへ移動 - より具体的なセレクターと待機を追加
    await page.waitForSelector('button:has-text("新規テンプレート作成")', { timeout: 30000 })
    await page.click('button:has-text("新規テンプレート作成")')
    await expect(page).toHaveURL('/templates/new')
    
    // テンプレート基本情報を入力
    await page.fill('input[name="テンプレート名"]', 'E2Eテストテンプレート')
    await page.fill('input[name="バージョン"]', '1')
    
    // ステップを追加
    await page.click('text=ステップ追加')
    await page.locator('.border').first().locator('input[name*="ステップ"]').fill('要件定義')
    await page.locator('.border').first().locator('select[name="基準"]').selectOption('goal')
    await page.locator('.border').first().locator('input[name="所要日数"]').fill('-10')
    
    // 2つ目のステップを追加
    await page.click('text=ステップ追加')
    await page.locator('.border').last().locator('input[name*="ステップ"]').fill('設計')
    await page.locator('.border').last().locator('select[name="基準"]').selectOption('prev')
    await page.locator('.border').last().locator('input[name="所要日数"]').fill('3')
    
    // 保存
    await page.click('button:has-text("保存")')
    
    // 成功メッセージの確認
    await page.waitForTimeout(1000)
    const alertText = await page.evaluate(() => {
      return new Promise<string>((resolve) => {
        const originalAlert = window.alert
        window.alert = (message) => {
          resolve(message)
          window.alert = originalAlert
        }
      })
    })
    expect(alertText).toContain('テンプレートを作成しました')
  })

  test('should view template details', async ({ page }) => {
    // ホームページに移動
    await page.goto('/')
    
    // テンプレート一覧から詳細へ
    const templateCard = page.locator('.border').filter({ hasText: 'E2Eテストテンプレート' })
    if (await templateCard.count() > 0) {
      await templateCard.locator('button:has-text("詳細")').click()
      
      // 詳細ページの確認
      await expect(page.locator('h1')).toContainText('E2Eテストテンプレート')
      await expect(page.locator('text=要件定義')).toBeVisible()
      await expect(page.locator('text=設計')).toBeVisible()
    }
  })

  test('should edit an existing template', async ({ page }) => {
    // テンプレート一覧ページに移動
    await page.goto('/')
    
    // 既存のテンプレートを編集
    const templateCard = page.locator('.border').filter({ hasText: 'E2Eテストテンプレート' })
    if (await templateCard.count() > 0) {
      await templateCard.locator('button:has-text("詳細")').click()
      await page.click('button:has-text("編集")')
      
      // テンプレート名を更新
      await page.fill('input[value*="E2Eテストテンプレート"]', 'E2Eテストテンプレート更新版')
      
      // ステップを追加
      await page.click('text=ステップ追加')
      await page.fill('input[value="ステップ 3"]', 'テスト')
      
      // 保存
      await page.click('button:has-text("保存")')
      
      // 成功メッセージの確認
      await expect(page.locator('text=テンプレートを更新しました')).toBeVisible({ timeout: 5000 })
    }
  })
})