import { test, expect } from '@playwright/test'

test.describe('Template Management', () => {
  test('should create a new process template', async ({ page }) => {
    // ホームページに移動
    await page.goto('/')
    
    // テンプレート作成ページへ移動
    await page.click('text=新規テンプレート作成')
    await expect(page).toHaveURL('/templates/new')
    
    // テンプレート基本情報を入力
    await page.fill('input[label="テンプレート名"]', 'E2Eテストテンプレート')
    await page.fill('input[label="バージョン"]', '1')
    
    // ステップを追加
    await page.click('text=ステップ追加')
    await page.fill('input[value="ステップ 1"]', '要件定義')
    await page.selectOption('select[label="基準"]', 'goal')
    await page.fill('input[label="所要日数"]', '-10')
    
    // 2つ目のステップを追加
    await page.click('text=ステップ追加')
    await page.fill('input[value="ステップ 2"]', '設計')
    await page.selectOption('text=前工程基準', 'prev')
    await page.fill('input[type="number"][value="1"]', '3')
    
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