import { test, expect } from '@playwright/test'
import { waitForNavigation, waitForPageReady, checkValidationError } from './helpers/test-utils'

test.describe('Improved UI Tests with Mock API', () => {
  test.beforeEach(async ({ page }) => {
    // APIレスポンスをモック
    await page.route('**/api/process-templates', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            name: 'テストテンプレート',
            version: 1,
            isActive: true,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            stepTemplates: [
              {
                id: 1,
                seq: 1,
                name: 'ステップ1',
                basis: 'goal',
                offsetDays: -10,
                dependsOnJson: [],
                requiredArtifactsJson: []
              }
            ]
          }
        ])
      })
    })

    await page.route('**/api/cases', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            title: 'テスト案件',
            processId: 1,
            goalDateUtc: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'IN_PROGRESS',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            stepInstances: [
              {
                id: 1,
                caseId: 1,
                templateId: 1,
                name: 'ステップ1',
                dueDateUtc: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'TODO',
                locked: false
              }
            ]
          }
        ])
      })
    })
  })

  test('should navigate to template creation page with proper wait', async ({ page }) => {
    await page.goto('/')
    await waitForPageReady(page, 'h1:has-text("プロセス指向ToDoアプリ")')
    
    // ボタンの存在を確認
    const button = page.locator('button:has-text("新規テンプレート作成")')
    await expect(button).toBeVisible()
    
    // クリックしてナビゲーションを待つ
    await Promise.all([
      page.waitForURL('**/templates/new', { timeout: 10000 }),
      button.click()
    ])
    
    // ページが完全に読み込まれるのを待つ
    await waitForPageReady(page, 'h1:has-text("新規テンプレート作成")')
    
    // 要素の確認
    await expect(page.locator('text=テンプレート名').first()).toBeVisible()
    await expect(page.locator('button:has-text("ステップ追加")')).toBeVisible()
  })

  test('should validate form fields with improved error detection', async ({ page }) => {
    // テンプレート作成ページに直接アクセス
    await page.goto('/templates/new')
    await waitForPageReady(page, 'h1:has-text("新規テンプレート作成")')
    
    // フォーム要素を取得
    const nameInput = page.locator('input[type="text"]').first()
    const saveButton = page.locator('button:has-text("保存")')
    
    // ケース1: ステップなしエラー
    await nameInput.fill('テストテンプレート')
    await saveButton.click()
    
    // エラーメッセージを待つ（複数のパターンを試す）
    const stepError = await checkValidationError(page, '少なくとも1つのステップが必要です')
    await expect(stepError).toBeVisible({ timeout: 5000 })
    
    // ケース2: テンプレート名なしエラー
    await nameInput.clear()
    await saveButton.click()
    
    // エラーメッセージを待つ
    const nameError = await checkValidationError(page, 'テンプレート名は必須です')
    await expect(nameError).toBeVisible({ timeout: 5000 })
    
    // 案件作成ページのテスト
    await page.goto('/cases/new')
    await waitForPageReady(page, 'h1:has-text("新規案件作成")')
    
    // 保存ボタンをクリック
    await page.locator('button:has-text("保存")').click()
    
    // エラーメッセージの確認
    const caseNameError = await checkValidationError(page, '案件名は必須です')
    await expect(caseNameError).toBeVisible({ timeout: 5000 })
    
    const templateError = await checkValidationError(page, 'プロセステンプレートを選択してください')
    await expect(templateError).toBeVisible({ timeout: 5000 })
  })

  test('should handle dynamic content loading', async ({ page }) => {
    await page.goto('/')
    
    // 動的コンテンツが読み込まれるのを待つ
    await page.waitForSelector('text=テスト案件', { timeout: 5000 })
    await page.waitForSelector('text=テストテンプレート', { timeout: 5000 })
    
    // 進捗バーの確認
    const progressBar = page.locator('.bg-gray-200.rounded-full').first()
    await expect(progressBar).toBeVisible()
    
    // 進捗率の確認
    await expect(page.locator('text=0%')).toBeVisible()
  })

  test('should handle navigation between pages smoothly', async ({ page }) => {
    await page.goto('/')
    
    // ホーム → テンプレート作成
    await Promise.all([
      page.waitForURL('**/templates/new'),
      page.click('button:has-text("新規テンプレート作成")')
    ])
    await expect(page.locator('h1')).toContainText('新規テンプレート作成')
    
    // 戻るボタンでホームに戻る
    await Promise.all([
      page.waitForURL('/'),
      page.click('button:has-text("戻る")')
    ])
    await expect(page.locator('h1')).toContainText('プロセス指向ToDoアプリ')
    
    // ホーム → 案件作成
    await Promise.all([
      page.waitForURL('**/cases/new'),
      page.click('button:has-text("新規案件作成")')
    ])
    await expect(page.locator('h1')).toContainText('新規案件作成')
  })

  test('should maintain state during navigation', async ({ page }) => {
    await page.goto('/templates/new')
    await waitForPageReady(page, 'h1:has-text("新規テンプレート作成")')
    
    // フォームに値を入力
    const nameInput = page.locator('input[type="text"]').first()
    await nameInput.fill('一時保存テスト')
    
    // ステップを追加
    await page.click('button:has-text("ステップ追加")')
    await page.waitForSelector('text=ステップ 1')
    
    // 値が保持されていることを確認
    await expect(nameInput).toHaveValue('一時保存テスト')
    await expect(page.locator('text=ステップ 1')).toBeVisible()
  })
})