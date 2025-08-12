import { test, expect } from '@playwright/test';

test.describe('User Workflow - End to End', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('完全なユーザーワークフロー: テンプレート作成から案件完了まで', async ({ page }) => {
    // 1. テンプレート作成
    await test.step('新規テンプレート作成', async () => {
      await page.click('text=テンプレート');
      await page.click('text=新規作成');
      
      // テンプレート名入力
      await page.fill('input[name="name"]', 'システム導入プロジェクト');
      
      // ステップ1追加
      await page.click('text=ステップを追加');
      await page.fill('[placeholder="ステップ名"]', '要件定義');
      await page.selectOption('select[name="basis"]', 'START');
      await page.fill('input[name="offsetDays"]', '5');
      
      // ステップ2追加（依存関係あり）
      await page.click('text=ステップを追加');
      const step2 = page.locator('.step-editor').last();
      await step2.locator('[placeholder="ステップ名"]').fill('設計');
      await step2.locator('select[name="basis"]').selectOption('STEP');
      await step2.locator('input[name="offsetDays"]').fill('10');
      
      // ステップ3追加
      await page.click('text=ステップを追加');
      const step3 = page.locator('.step-editor').last();
      await step3.locator('[placeholder="ステップ名"]').fill('実装');
      await step3.locator('select[name="basis"]').selectOption('STEP');
      await step3.locator('input[name="offsetDays"]').fill('20');
      
      // 保存
      await page.click('button:has-text("保存")');
      await expect(page).toHaveURL(/\/templates$/);
      await expect(page.locator('text=システム導入プロジェクト')).toBeVisible();
    });

    // 2. 案件作成
    await test.step('テンプレートから案件作成', async () => {
      await page.click('text=案件');
      await page.click('text=新規作成');
      
      // 案件情報入力
      await page.fill('input[name="title"]', '顧客A向けシステム導入');
      await page.selectOption('select[name="templateId"]', { label: 'システム導入プロジェクト' });
      
      // 目標完了日設定（2ヶ月後）
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + 2);
      const dateStr = targetDate.toISOString().split('T')[0];
      await page.fill('input[type="date"]', dateStr);
      
      // 案件作成
      await page.click('button:has-text("作成")');
      await expect(page).toHaveURL(/\/cases\/\d+$/);
      
      // ガントチャートに遷移して確認
      await page.click('text=ガントチャート');
      await expect(page.locator('.gantt-task')).toHaveCount(3);
    });

    // 3. ステップの進行管理
    await test.step('ステップのステータス更新', async () => {
      // 案件詳細に戻る
      await page.click('text=案件');
      await page.click('text=顧客A向けシステム導入');
      
      // 要件定義を開始
      const step1 = page.locator('.step-instance').first();
      await step1.locator('button:has-text("開始")').click();
      await expect(step1.locator('text=進行中')).toBeVisible();
      
      // コメント追加
      await step1.locator('button:has-text("コメント")').click();
      await page.fill('textarea[placeholder="コメントを入力"]', '顧客とのヒアリング完了');
      await page.click('button:has-text("投稿")');
      await expect(page.locator('text=顧客とのヒアリング完了')).toBeVisible();
      
      // 要件定義を完了
      await step1.locator('button:has-text("完了")').click();
      await expect(step1.locator('text=完了')).toBeVisible();
      
      // 次のステップが開始可能になることを確認
      const step2 = page.locator('.step-instance').nth(1);
      await expect(step2.locator('button:has-text("開始")')).toBeEnabled();
    });

    // 4. 再計画機能
    await test.step('スケジュール再計画', async () => {
      await page.click('button:has-text("再計画")');
      
      // 新しい目標日を設定
      const newDate = new Date();
      newDate.setMonth(newDate.getMonth() + 3);
      const newDateStr = newDate.toISOString().split('T')[0];
      await page.fill('input[name="targetDate"]', newDateStr);
      
      // プレビュー
      await page.click('button:has-text("プレビュー")');
      await expect(page.locator('text=再計画プレビュー')).toBeVisible();
      
      // 適用
      await page.click('button:has-text("適用")');
      await expect(page.locator('text=再計画が適用されました')).toBeVisible();
    });

    // 5. 通知確認
    await test.step('通知機能の確認', async () => {
      // 通知ベルをクリック
      await page.click('[aria-label="通知"]');
      await expect(page.locator('.notification-item')).toHaveCount({ min: 1 });
      
      // 既読にする
      await page.click('button:has-text("すべて既読")');
      await expect(page.locator('.notification-badge')).not.toBeVisible();
    });
  });

  test('エラーハンドリングとバリデーション', async ({ page }) => {
    await test.step('テンプレート作成時のバリデーション', async () => {
      await page.goto('http://localhost:3000/templates/new');
      
      // 空のフォームで保存を試みる
      await page.click('button:has-text("保存")');
      await expect(page.locator('text=テンプレート名は必須です')).toBeVisible();
      await expect(page.locator('text=少なくとも1つのステップが必要です')).toBeVisible();
      
      // ステップ追加後、ステップ名なしで保存
      await page.fill('input[name="name"]', 'テストテンプレート');
      await page.click('text=ステップを追加');
      await page.click('button:has-text("保存")');
      await expect(page.locator('text=ステップ名は必須です')).toBeVisible();
    });

    await test.step('案件作成時のバリデーション', async () => {
      await page.goto('http://localhost:3000/cases/new');
      
      // 空のフォームで作成を試みる
      await page.click('button:has-text("作成")');
      await expect(page.locator('text=タイトルは必須です')).toBeVisible();
      await expect(page.locator('text=テンプレートを選択してください')).toBeVisible();
      
      // 無効な日付
      await page.fill('input[name="title"]', 'テスト案件');
      await page.selectOption('select[name="templateId"]', { index: 1 });
      await page.fill('input[type="date"]', '2020-01-01'); // 過去の日付
      await page.click('button:has-text("作成")');
      await expect(page.locator('text=目標完了日は未来の日付を指定してください')).toBeVisible();
    });
  });

  test('検索とフィルタリング', async ({ page }) => {
    await test.step('グローバル検索', async () => {
      // ヘッダーの検索ボックス
      await page.fill('input[placeholder="検索..."]', 'システム');
      await page.press('input[placeholder="検索..."]', 'Enter');
      
      await expect(page).toHaveURL(/\/search\?q=システム/);
      await expect(page.locator('.search-result')).toHaveCount({ min: 1 });
    });

    await test.step('案件フィルタリング', async () => {
      await page.goto('http://localhost:3000/cases');
      
      // ステータスでフィルタ
      await page.selectOption('select[name="status"]', 'IN_PROGRESS');
      await expect(page.locator('.case-card')).toHaveCount({ min: 0 });
      
      // 期限でソート
      await page.selectOption('select[name="sort"]', 'dueDate');
      const firstCase = page.locator('.case-card').first();
      const lastCase = page.locator('.case-card').last();
      
      const firstDate = await firstCase.getAttribute('data-due-date');
      const lastDate = await lastCase.getAttribute('data-due-date');
      
      if (firstDate && lastDate) {
        expect(new Date(firstDate) <= new Date(lastDate)).toBeTruthy();
      }
    });
  });

  test('レスポンシブデザインの確認', async ({ page }) => {
    // モバイルビューポート
    await page.setViewportSize({ width: 375, height: 667 });
    
    await test.step('モバイルナビゲーション', async () => {
      await page.goto('http://localhost:3000');
      
      // ハンバーガーメニューが表示される
      await expect(page.locator('[aria-label="メニュー"]')).toBeVisible();
      
      // メニューを開く
      await page.click('[aria-label="メニュー"]');
      await expect(page.locator('.mobile-menu')).toBeVisible();
      
      // ナビゲーション
      await page.click('.mobile-menu >> text=案件');
      await expect(page).toHaveURL(/\/cases$/);
    });
    
    await test.step('モバイルでのフォーム操作', async () => {
      await page.goto('http://localhost:3000/templates/new');
      
      // フォーム要素が適切にスタックされている
      const formElements = page.locator('.form-field');
      const count = await formElements.count();
      
      for (let i = 0; i < count - 1; i++) {
        const current = await formElements.nth(i).boundingBox();
        const next = await formElements.nth(i + 1).boundingBox();
        
        if (current && next) {
          // 縦に並んでいることを確認
          expect(current.y < next.y).toBeTruthy();
        }
      }
    });
    
    // タブレットビューポート
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await test.step('タブレットレイアウト', async () => {
      await page.goto('http://localhost:3000/cases');
      
      // グリッドレイアウトの確認
      const cards = page.locator('.case-card');
      const firstCard = await cards.first().boundingBox();
      const secondCard = await cards.nth(1).boundingBox();
      
      if (firstCard && secondCard) {
        // 2カラムレイアウト
        expect(firstCard.y).toBeCloseTo(secondCard.y, 5);
      }
    });
  });

  test('アクセシビリティ', async ({ page }) => {
    await test.step('キーボードナビゲーション', async () => {
      await page.goto('http://localhost:3000');
      
      // Tabキーでフォーカス移動
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toHaveAttribute('href', '/');
      
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toHaveAttribute('href', '/templates');
      
      // Enterキーでリンクをクリック
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/\/templates$/);
    });

    await test.step('ARIAラベルとロール', async () => {
      await page.goto('http://localhost:3000/cases/new');
      
      // フォーム要素のラベル
      await expect(page.locator('label:has-text("タイトル")')).toBeVisible();
      await expect(page.locator('label:has-text("テンプレート")')).toBeVisible();
      
      // ボタンのARIAラベル
      const saveButton = page.locator('button:has-text("作成")');
      await expect(saveButton).toHaveAttribute('type', 'submit');
      
      // エラーメッセージのロール
      await page.click('button:has-text("作成")');
      await expect(page.locator('[role="alert"]')).toBeVisible();
    });
  });

  test('パフォーマンステスト', async ({ page }) => {
    await test.step('ページロード時間', async () => {
      const startTime = Date.now();
      await page.goto('http://localhost:3000/cases');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      // 3秒以内にロード完了
      expect(loadTime).toBeLessThan(3000);
    });

    await test.step('大量データの表示', async () => {
      // モックで100件のデータを返すように設定（実際のテストでは事前準備が必要）
      await page.goto('http://localhost:3000/cases?limit=100');
      
      // 仮想スクロールまたはページネーションの確認
      const visibleItems = await page.locator('.case-card:visible').count();
      expect(visibleItems).toBeLessThanOrEqual(20); // 一度に表示される件数を制限
      
      // ページネーションコントロール
      await expect(page.locator('.pagination')).toBeVisible();
    });
  });
});