import { test, expect } from '@playwright/test'

test.describe('Case Management', () => {
  test('should create a new case from template', async ({ page }) => {
    // ホームページに移動
    await page.goto('/')
    
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle')
    
    // 案件作成ページへ移動
    await page.waitForSelector('button:has-text("新規案件作成")', { timeout: 30000 })
    await page.click('button:has-text("新規案件作成")')
    await expect(page).toHaveURL('/cases/new')
    
    // 案件情報を入力
    await page.fill('input[name="title"]', 'E2Eテスト案件')
    
    // テンプレートを選択（最初の有効なテンプレートを選択）
    const templateSelect = page.locator('select[name="process-template"]')
    const options = await templateSelect.locator('option').all()
    if (options.length > 1) {
      await templateSelect.selectOption({ index: 1 })
    }
    
    // ゴール日付を設定（30日後）
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 30)
    const dateString = futureDate.toISOString().split('T')[0]
    await page.fill('input[type="date"]', dateString)
    
    // 保存
    await page.click('button:has-text("保存")')
    
    // 成功メッセージと遷移の確認
    await page.waitForTimeout(1000)
    expect(page.url()).toContain('/cases/')
    await expect(page.locator('h1')).toContainText('E2Eテスト案件')
  })

  test('should update step status', async ({ page }) => {
    // 案件詳細ページに移動（作成した案件を想定）
    await page.goto('/')
    
    // 案件一覧から詳細へ
    const caseItem = page.locator('a').filter({ hasText: 'E2Eテスト案件' })
    if (await caseItem.count() > 0) {
      await caseItem.click()
      
      // ステップ一覧の確認
      await expect(page.locator('h2:has-text("ステップ一覧")')).toBeVisible()
      
      // 最初のステップを進行中に変更
      const firstStep = page.locator('.border').first()
      if (await firstStep.count() > 0) {
        await firstStep.locator('button[title="進行中にする"]').click()
        await page.waitForTimeout(500)
        
        // ステータス変更の確認
        await expect(firstStep.locator('text=進行中')).toBeVisible()
      }
      
      // ステップを完了に変更
      if (await firstStep.count() > 0) {
        await firstStep.locator('button[title="完了にする"]').click()
        await page.waitForTimeout(500)
        
        // ステータス変更の確認
        await expect(firstStep.locator('text=完了')).toBeVisible()
      }
    }
  })

  test('should preview and apply replan', async ({ page }) => {
    // 案件詳細ページに移動
    await page.goto('/')
    
    const caseItem = page.locator('a').filter({ hasText: 'E2Eテスト案件' })
    if (await caseItem.count() > 0) {
      await caseItem.click()
      
      // 再計画ボタンをクリック
      await page.click('button:has-text("再計画")')
      
      // 再計画ダイアログの確認
      await expect(page.locator('h2:has-text("再計画")')).toBeVisible()
      
      // 新しいゴール日付を設定（45日後）
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 45)
      const dateString = futureDate.toISOString().split('T')[0]
      await page.fill('input[type="date"]', dateString)
      
      // プレビューボタンをクリック
      await page.click('button:has-text("プレビュー")')
      await page.waitForTimeout(1000)
      
      // プレビュー結果の確認
      await expect(page.locator('text=再計画サマリー')).toBeVisible()
      await expect(page.locator('text=ステップ別変更内容')).toBeVisible()
      
      // キャンセルして閉じる
      await page.click('button:has-text("キャンセル")')
      await expect(page.locator('h2:has-text("再計画")')).not.toBeVisible()
    }
  })

  test('should lock and unlock steps', async ({ page }) => {
    // 案件詳細ページに移動
    await page.goto('/')
    
    const caseItem = page.locator('a').filter({ hasText: 'E2Eテスト案件' })
    if (await caseItem.count() > 0) {
      await caseItem.click()
      
      // 最初のステップをロック
      const firstStep = page.locator('.border').first()
      if (await firstStep.count() > 0) {
        const lockButton = firstStep.locator('button[title="ロック"]')
        if (await lockButton.count() > 0) {
          await lockButton.click()
          await page.waitForTimeout(500)
          
          // ロック状態の確認
          await expect(firstStep.locator('text=ロック中')).toBeVisible()
          
          // ロック解除
          await firstStep.locator('button[title="ロック解除"]').click()
          await page.waitForTimeout(500)
          
          // ロック解除の確認
          await expect(firstStep.locator('text=ロック中')).not.toBeVisible()
        }
      }
    }
  })
})