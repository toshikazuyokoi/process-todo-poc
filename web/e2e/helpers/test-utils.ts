import { Page } from '@playwright/test'

/**
 * Next.jsのクライアントサイドナビゲーションを待つヘルパー関数
 */
export async function waitForNavigation(page: Page, url: string, options?: { timeout?: number }) {
  const timeout = options?.timeout || 10000
  
  // URLが変更されるまで待つ
  await page.waitForURL(url, { timeout })
  
  // DOMが安定するまで少し待つ
  await page.waitForLoadState('domcontentloaded')
  await page.waitForLoadState('networkidle')
}

/**
 * Next.jsページの完全な読み込みを待つヘルパー関数
 */
export async function waitForPageReady(page: Page, selector: string, options?: { timeout?: number }) {
  const timeout = options?.timeout || 10000
  
  // 指定されたセレクタが表示されるまで待つ
  await page.waitForSelector(selector, { state: 'visible', timeout })
  
  // React/Next.jsのレンダリングが完了するまで待つ
  await page.waitForTimeout(100)
}

/**
 * フォームバリデーションエラーを確認するヘルパー関数
 */
export async function checkValidationError(page: Page, errorMessage: string) {
  // 複数の可能なエラー表示パターンをチェック
  const errorSelectors = [
    `p.text-red-600:has-text("${errorMessage}")`,
    `.text-red-700:has-text("${errorMessage}")`,
    `.bg-red-50:has-text("${errorMessage}")`,
    `[role="alert"]:has-text("${errorMessage}")`
  ]
  
  for (const selector of errorSelectors) {
    const element = page.locator(selector)
    if (await element.count() > 0) {
      return element
    }
  }
  
  // エラーが見つからない場合は一般的なテキスト検索
  return page.locator(`text="${errorMessage}"`)
}