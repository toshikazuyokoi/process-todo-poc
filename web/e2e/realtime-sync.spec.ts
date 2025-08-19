import { test, expect, Page, BrowserContext } from '@playwright/test';

// APIベースURLの取得
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';

test.describe('Realtime WebSocket Updates', () => {
  let context1: BrowserContext;
  let context2: BrowserContext;
  let page1: Page;
  let page2: Page;
  let caseId: number;

  test.beforeAll(async ({ browser }) => {
    // テスト用のケースを作成
    const response = await fetch(`${API_URL}/cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateId: 1,
        title: 'WebSocket Test Case',
        goalDateUtc: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    });
    const caseData = await response.json();
    caseId = caseData.id;
  });

  test.beforeEach(async ({ browser }) => {
    // 2つの異なるブラウザコンテキストを作成（異なるユーザーをシミュレート）
    context1 = await browser.newContext();
    context2 = await browser.newContext();
    page1 = await context1.newPage();
    page2 = await context2.newPage();

    // 両方のページで同じケースを開く
    await page1.goto(`/cases/${caseId}`);
    await page2.goto(`/cases/${caseId}`);

    // ページの読み込みを待つ
    await page1.waitForSelector('h1:has-text("WebSocket Test Case")', { timeout: 10000 });
    await page2.waitForSelector('h1:has-text("WebSocket Test Case")', { timeout: 10000 });
  });

  test.afterEach(async () => {
    await context1.close();
    await context2.close();
  });

  test.afterAll(async () => {
    // テスト用のケースを削除
    await fetch(`${API_URL}/cases/${caseId}`, {
      method: 'DELETE',
    });
  });

  test('should establish WebSocket connection', async () => {
    // WebSocket接続インジケーターをチェック（実装に応じて調整）
    // コンソールログで接続を確認
    const consoleMessages: string[] = [];
    page1.on('console', msg => {
      if (msg.text().includes('WebSocket connected')) {
        consoleMessages.push(msg.text());
      }
    });

    // 接続が確立されるまで待つ
    await page1.waitForTimeout(2000);
    
    // 接続メッセージが記録されていることを確認
    expect(consoleMessages.some(msg => msg.includes('WebSocket connected'))).toBeTruthy();
  });

  test('should sync step status updates between browsers', async () => {
    // ページ1でステップを見つける
    const firstStep = page1.locator('.step-item').first();
    await expect(firstStep).toBeVisible();

    // 初期ステータスを確認
    const initialStatus = await firstStep.locator('[data-testid="step-status"]').textContent();
    expect(initialStatus).toBeTruthy();

    // ページ1でステップのステータスを変更
    await firstStep.locator('button:has-text("進行中にする")').click();
    
    // APIレスポンスを待つ
    await page1.waitForTimeout(1000);

    // ページ2でステータスが更新されることを確認
    const updatedStepPage2 = page2.locator('.step-item').first();
    await expect(updatedStepPage2.locator('[data-testid="step-status"]')).toContainText('進行中', {
      timeout: 5000
    });
  });

  test('should sync case title updates between browsers', async () => {
    // ページ1で編集ボタンをクリック
    await page1.locator('button:has-text("編集")').click();
    
    // タイトルフィールドを更新
    const titleInput = await page1.waitForSelector('input[name="title"]');
    await titleInput.fill('Updated WebSocket Test Case');
    
    // 保存
    await page1.locator('button:has-text("保存")').click();
    
    // APIレスポンスを待つ
    await page1.waitForTimeout(1000);

    // ページ2でタイトルが更新されることを確認
    await expect(page2.locator('h1')).toContainText('Updated WebSocket Test Case', {
      timeout: 5000
    });
  });

  test('should show notification when other user updates', async () => {
    // ページ2で通知要素を監視
    const notificationPromise = page2.waitForSelector('.toast-notification:has-text("更新されました")', {
      timeout: 5000
    });

    // ページ1でステップを更新
    const firstStep = page1.locator('.step-item').first();
    await firstStep.locator('button:has-text("完了にする")').click();

    // ページ2で通知が表示されることを確認
    const notification = await notificationPromise;
    expect(notification).toBeTruthy();
  });

  test('should handle connection recovery', async () => {
    // ネットワークをオフラインにシミュレート
    await page1.context().setOffline(true);
    
    // オフライン状態を確認（実装に応じて調整）
    await page1.waitForTimeout(1000);
    
    // ネットワークを復元
    await page1.context().setOffline(false);
    
    // 再接続を待つ
    await page1.waitForTimeout(3000);
    
    // 再接続後もリアルタイム更新が機能することを確認
    const firstStep = page1.locator('.step-item').first();
    await firstStep.locator('button').first().click();
    
    // ページ2で更新が反映されることを確認
    await expect(page2.locator('.step-item').first()).toContainText(/進行中|完了/, {
      timeout: 5000
    });
  });

  test('should handle rapid updates correctly', async () => {
    // 複数の高速更新を実行
    const steps = await page1.locator('.step-item').all();
    
    for (let i = 0; i < Math.min(3, steps.length); i++) {
      await steps[i].locator('button').first().click();
      await page1.waitForTimeout(100); // 短い間隔で更新
    }
    
    // ページ2ですべての更新が反映されることを確認
    await page2.waitForTimeout(2000);
    
    const stepsPage2 = await page2.locator('.step-item').all();
    for (let i = 0; i < Math.min(3, stepsPage2.length); i++) {
      const status = await stepsPage2[i].locator('[data-testid="step-status"]').textContent();
      expect(status).not.toBe('未着手'); // ステータスが変更されていることを確認
    }
  });

  test('should sync when multiple users join and leave', async () => {
    // 3つ目のブラウザコンテキストを作成
    const context3 = await page1.context().browser()?.newContext();
    if (!context3) {
      throw new Error('Failed to create third context');
    }
    const page3 = await context3.newPage();
    
    // ページ3で同じケースを開く
    await page3.goto(`/cases/${caseId}`);
    await page3.waitForSelector('h1', { timeout: 10000 });
    
    // ページ3で更新を実行
    const firstStep = page3.locator('.step-item').first();
    if (await firstStep.isVisible()) {
      await firstStep.locator('button').first().click();
    }
    
    // 他のページで更新が反映されることを確認
    await expect(page1.locator('.step-item').first()).toContainText(/進行中|完了/, {
      timeout: 5000
    });
    await expect(page2.locator('.step-item').first()).toContainText(/進行中|完了/, {
      timeout: 5000
    });
    
    // クリーンアップ
    await context3.close();
  });

  test('should measure update latency', async () => {
    const startTime = Date.now();
    
    // ページ1で更新を実行
    const updatePromise = page1.locator('.step-item').first().locator('button').first().click();
    
    // ページ2で更新を検出
    const detectPromise = page2.waitForFunction(
      () => {
        const stepElement = document.querySelector('.step-item [data-testid="step-status"]');
        return stepElement && !stepElement.textContent?.includes('未着手');
      },
      { timeout: 5000 }
    );
    
    await Promise.all([updatePromise, detectPromise]);
    
    const latency = Date.now() - startTime;
    console.log(`Update latency: ${latency}ms`);
    
    // レイテンシーが1秒以内であることを確認
    expect(latency).toBeLessThan(1000);
  });
});