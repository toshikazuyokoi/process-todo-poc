import { test, expect } from '@playwright/test'

test.describe('Final Working Tests', () => {
  test.beforeEach(async ({ page }) => {
    // すべてのAPIコールをモック
    await page.route('**/api/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      })
    })
  })

  test('基本的なページ遷移が動作する', async ({ page }) => {
    // ホームページ
    await page.goto('/')
    await expect(page).toHaveTitle(/Process Todo/)
    await expect(page.locator('h1')).toContainText('プロセス指向ToDoアプリ')
    
    // テンプレート作成ページへ直接遷移
    await page.goto('/templates/new')
    await expect(page.locator('h1')).toContainText('新規テンプレート作成')
    
    // 案件作成ページへ直接遷移
    await page.goto('/cases/new')
    await expect(page.locator('h1')).toContainText('新規案件作成')
  })

  test('テンプレート作成フォームの基本要素が存在する', async ({ page }) => {
    await page.goto('/templates/new')
    
    // 必須要素の確認
    await expect(page.locator('text=テンプレート名')).toBeVisible()
    await expect(page.locator('text=バージョン')).toBeVisible()
    await expect(page.locator('button:has-text("保存")')).toBeVisible()
    await expect(page.locator('button:has-text("ステップ追加")')).toBeVisible()
    
    // ステップ追加のテスト
    await page.click('button:has-text("ステップ追加")')
    await expect(page.locator('input[value="ステップ 1"]')).toBeVisible()
  })

  test('案件作成フォームの基本要素が存在する', async ({ page }) => {
    await page.goto('/cases/new')
    
    // 必須要素の確認
    await expect(page.locator('text=案件名')).toBeVisible()
    await expect(page.locator('text=プロセステンプレート')).toBeVisible()
    await expect(page.locator('text=ゴール日付')).toBeVisible()
    await expect(page.locator('button:has-text("保存")')).toBeVisible()
  })

  test('ホームページのレイアウトが正しく表示される', async ({ page }) => {
    await page.goto('/')
    
    // 主要セクションの確認
    await expect(page.locator('text=クイックアクション')).toBeVisible()
    await expect(page.locator('text=サマリー')).toBeVisible()
    await expect(page.locator('text=進行中の案件')).toBeVisible()
    await expect(page.locator('h2:has-text("プロセステンプレート")')).toBeVisible()
    
    // ボタンの存在確認
    await expect(page.locator('button:has-text("新規案件作成")')).toBeVisible()
    await expect(page.locator('button:has-text("新規テンプレート作成")')).toBeVisible()
  })

  test('レスポンシブデザインが機能する', async ({ page }) => {
    await page.goto('/')
    
    // デスクトップビュー
    await page.setViewportSize({ width: 1280, height: 720 })
    await expect(page.locator('.md\\:grid-cols-2').first()).toBeVisible()
    
    // モバイルビュー
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('button:has-text("新規案件作成")')).toBeVisible()
  })
})