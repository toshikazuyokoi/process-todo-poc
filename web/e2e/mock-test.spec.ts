import { test, expect } from '@playwright/test'

test.describe('Basic UI Tests with Mock API', () => {
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

  test('should display homepage with mocked data', async ({ page }) => {
    await page.goto('/')
    
    // タイトルの確認
    await expect(page.locator('h1')).toContainText('プロセス指向ToDoアプリ')
    
    // サマリーの確認
    await expect(page.locator('text=アクティブな案件')).toBeVisible()
    await expect(page.locator('text=利用可能なテンプレート')).toBeVisible()
    
    // モックデータの表示確認
    await expect(page.locator('text=テスト案件')).toBeVisible()
    await expect(page.locator('text=テストテンプレート')).toBeVisible()
  })

  test('should navigate to template creation page', async ({ page }) => {
    await page.goto('/')
    
    // テンプレート作成ボタンをクリック
    await page.click('button:has-text("新規テンプレート作成")')
    
    // ページ遷移を待つ（h1要素の変化を待つ）
    await page.waitForSelector('h1:has-text("新規テンプレート作成")', { timeout: 10000 })
    
    // URLの確認
    await expect(page).toHaveURL('/templates/new')
    
    // ページタイトルの確認
    await expect(page.locator('h1')).toContainText('新規テンプレート作成')
    
    // フォーム要素の存在確認
    await expect(page.locator('text=テンプレート名').first()).toBeVisible()
    await expect(page.locator('button:has-text("ステップ追加")')).toBeVisible()
  })

  test('should navigate to case creation page', async ({ page }) => {
    await page.goto('/')
    
    // 案件作成ボタンをクリック
    await page.click('button:has-text("新規案件作成")')
    
    // URLの確認
    await expect(page).toHaveURL('/cases/new')
    
    // ページタイトルの確認
    await expect(page.locator('h1')).toContainText('新規案件作成')
    
    // フォーム要素の存在確認
    await expect(page.locator('text=案件名').first()).toBeVisible()
    await expect(page.locator('text=プロセステンプレート').first()).toBeVisible()
  })

  test('should validate form fields', async ({ page }) => {
    // テンプレート作成ページでのバリデーション
    await page.goto('/templates/new')
    
    // ページが完全に読み込まれるのを待つ
    await page.waitForSelector('h1:has-text("新規テンプレート作成")')
    
    // テンプレート名のみ入力して保存（ステップなし）
    const nameInput = page.locator('input').first()
    await nameInput.fill('テストテンプレート')
    await page.click('button:has-text("保存")')
    
    // ステップが必要であることのエラー確認（div内のテキストを探す）
    await expect(page.locator('.bg-red-50:has-text("少なくとも1つのステップが必要です")')).toBeVisible()
    
    // テンプレート名を空にして保存
    await nameInput.clear()
    await page.click('button:has-text("保存")')
    
    // テンプレート名が必須であることのエラー確認（p要素内のエラーメッセージ）
    await expect(page.locator('p.text-red-600:has-text("テンプレート名は必須です")')).toBeVisible()
    
    // 案件作成ページでのバリデーション
    await page.goto('/cases/new')
    
    // ページが完全に読み込まれるのを待つ
    await page.waitForSelector('h1:has-text("新規案件作成")')
    
    // 何も入力せずに保存
    await page.click('button:has-text("保存")')
    
    // エラーメッセージの確認（p要素内のエラーメッセージ）
    await expect(page.locator('p.text-red-600:has-text("案件名は必須です")')).toBeVisible()
    await expect(page.locator('p.text-red-600:has-text("プロセステンプレートを選択してください")')).toBeVisible()
  })

  test('should display progress correctly', async ({ page }) => {
    await page.goto('/')
    
    // 進捗バーの存在確認
    const progressBar = page.locator('.bg-gray-200.rounded-full').first()
    await expect(progressBar).toBeVisible()
    
    // 進捗率の表示確認（0%のはず - 1つのTODOステップ）
    await expect(page.locator('text=0%')).toBeVisible()
  })
})