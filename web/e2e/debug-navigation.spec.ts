import { test, expect } from '@playwright/test'

test.describe('Debug Navigation', () => {
  test('debug form validation - templates', async ({ page }) => {
    // テンプレート作成ページ
    await page.goto('/templates/new')
    
    // ページが正しくロードされたか確認
    const h1 = await page.locator('h1').textContent()
    console.log('Page H1:', h1)
    
    // 保存ボタンが存在するか確認
    const saveButton = page.locator('button:has-text("保存")')
    await expect(saveButton).toBeVisible()
    
    // 必須項目を入力せずに保存を試みる
    await saveButton.click()
    
    // デバッグ: 全てのrole="alert"要素を取得
    const alerts = await page.locator('[role="alert"]').all()
    console.log('Found alerts:', alerts.length)
    
    for (const alert of alerts) {
      const text = await alert.textContent()
      console.log('Alert text:', text)
    }
    
    // エラーメッセージの確認
    await expect(page.locator('[role="alert"]')).toHaveCount({ min: 1 })
  })

  test('debug form validation - cases', async ({ page }) => {
    // 案件作成ページ
    await page.goto('/cases/new')
    
    // ページが正しくロードされたか確認
    const h1 = await page.locator('h1').textContent()
    console.log('Page H1:', h1)
    
    // 保存ボタンが存在するか確認
    const saveButton = page.locator('button:has-text("保存")')
    await expect(saveButton).toBeVisible()
    
    // 必須項目を入力せずに保存を試みる
    await saveButton.click()
    
    // デバッグ: 全てのrole="alert"要素を取得
    const alerts = await page.locator('[role="alert"]').all()
    console.log('Found alerts:', alerts.length)
    
    for (const alert of alerts) {
      const text = await alert.textContent()
      console.log('Alert text:', text)
    }
    
    // エラーメッセージの確認
    await expect(page.locator('[role="alert"]')).toHaveCount({ min: 1 })
  })
})