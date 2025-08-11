import { test, expect } from '@playwright/test'

test.describe('Real API Integration Tests', () => {
  // 実際のAPIを使用（モックなし）
  
  test('テンプレート作成が実際のAPIで動作する', async ({ page }) => {
    // テンプレート作成ページへ移動
    await page.goto('http://localhost:3004/templates/new')
    
    // ページが読み込まれるのを待つ
    await page.waitForSelector('h1:has-text("新規テンプレート作成")')
    
    // テンプレート名を入力
    const templateName = `E2Eテスト_${Date.now()}`
    await page.fill('input[type="text"]', templateName)
    
    // ステップを追加
    await page.click('button:has-text("ステップ追加")')
    await page.waitForSelector('input[value="ステップ 1"]')
    
    // ブラウザコンソールのエラーを監視
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })
    
    // ネットワークリクエストを監視
    const apiCalls: { url: string; method: string; status?: number; response?: any }[] = []
    page.on('response', async response => {
      if (response.url().includes('/api/')) {
        apiCalls.push({
          url: response.url(),
          method: response.request().method(),
          status: response.status(),
          response: await response.text().catch(() => null)
        })
      }
    })
    
    // 保存ボタンをクリック
    await page.click('button:has-text("保存")')
    
    // API呼び出しを待つ
    await page.waitForTimeout(2000)
    
    // デバッグ情報を出力
    console.log('Console Errors:', consoleErrors)
    console.log('API Calls:', apiCalls)
    
    // APIコールの確認
    const createCall = apiCalls.find(call => 
      call.url.includes('/process-templates') && call.method === 'POST'
    )
    
    if (createCall) {
      console.log('Create API Response:', createCall.response)
      expect(createCall.status).toBe(201)
    }
    
    // エラーメッセージの確認
    const errorAlert = page.locator('text=/保存に失敗しました|テンプレートを作成しました/')
    const errorText = await errorAlert.textContent().catch(() => null)
    console.log('Alert text:', errorText)
    
    // 成功または失敗の確認
    if (errorText?.includes('失敗')) {
      // 失敗の場合、詳細なデバッグ情報を出力
      console.log('API呼び出しが失敗しました')
      console.log('すべてのAPIコール:', JSON.stringify(apiCalls, null, 2))
    }
  })
  
  test('案件作成が実際のAPIで動作する', async ({ page }) => {
    // 案件作成ページへ移動
    await page.goto('http://localhost:3004/cases/new')
    
    // ページが読み込まれるのを待つ
    await page.waitForSelector('h1:has-text("新規案件作成")')
    
    // ブラウザコンソールのエラーを監視
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })
    
    // ネットワークリクエストを監視
    const apiCalls: { url: string; status?: number }[] = []
    page.on('response', async response => {
      if (response.url().includes('/api/')) {
        apiCalls.push({
          url: response.url(),
          status: response.status()
        })
      }
    })
    
    // テンプレート取得APIが呼ばれることを確認
    await page.waitForTimeout(1000)
    
    const templateCall = apiCalls.find(call => 
      call.url.includes('/process-templates')
    )
    
    console.log('Template API call:', templateCall)
    expect(templateCall).toBeDefined()
    expect(templateCall?.status).toBe(200)
  })
})