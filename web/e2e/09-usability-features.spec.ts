import { test, expect } from '@playwright/test';

test.describe('Phase 2.1: ユーザビリティ機能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('ドラッグ&ドロップ機能', () => {
    test('テンプレート編集画面でステップの順序を変更できる', async ({ page }) => {
      // テンプレート編集画面へ移動
      await page.goto('/templates/new');
      
      // ステップを追加
      await page.click('button:has-text("ステップを追加")');
      await page.fill('input[name="name"]', 'ステップ1');
      await page.click('button:has-text("保存")');
      
      await page.click('button:has-text("ステップを追加")');
      await page.fill('input[name="name"]', 'ステップ2');
      await page.click('button:has-text("保存")');
      
      // ドラッグ&ドロップで順序変更
      const step1 = page.locator('text=ステップ1').first();
      const step2 = page.locator('text=ステップ2').first();
      
      // ステップ1をステップ2の下にドラッグ
      await step1.dragTo(step2);
      
      // 順序が変わったことを確認
      const steps = await page.locator('[data-testid="step-item"]').all();
      await expect(steps[0]).toContainText('ステップ2');
      await expect(steps[1]).toContainText('ステップ1');
    });

    test('ケース詳細画面でステップの優先順位を変更できる', async ({ page }) => {
      // ケース詳細画面へ移動
      await page.goto('/cases/1');
      
      // ドラッグハンドルが表示されることを確認
      const dragHandles = page.locator('[aria-label="ドラッグして順序を変更"]');
      await expect(dragHandles.first()).toBeVisible();
      
      // ドラッグ&ドロップで順序変更
      const firstStep = page.locator('[data-testid="step-instance"]').first();
      const secondStep = page.locator('[data-testid="step-instance"]').nth(1);
      
      await firstStep.dragTo(secondStep);
      
      // APIコールが発生することを確認
      await page.waitForResponse(response => 
        response.url().includes('/api/cases') && 
        response.request().method() === 'PUT'
      );
    });

    test('モバイルでもドラッグ操作が可能', async ({ page, isMobile }) => {
      if (!isMobile) {
        test.skip();
      }
      
      await page.goto('/templates/1/edit');
      
      // タッチ操作でドラッグ
      const step1 = page.locator('[data-testid="step-item"]').first();
      const step2 = page.locator('[data-testid="step-item"]').nth(1);
      
      const box1 = await step1.boundingBox();
      const box2 = await step2.boundingBox();
      
      if (box1 && box2) {
        // タッチ&ドラッグのシミュレーション
        await page.touchscreen.tap(box1.x + box1.width / 2, box1.y + box1.height / 2);
        await page.waitForTimeout(100);
        await page.touchscreen.tap(box2.x + box2.width / 2, box2.y + box2.height / 2);
      }
    });
  });

  test.describe('一括選択機能', () => {
    test('複数のケースを選択して一括更新できる', async ({ page }) => {
      await page.goto('/cases');
      
      // 複数のケースを選択
      await page.click('input[type="checkbox"]:nth-of-type(1)');
      await page.click('input[type="checkbox"]:nth-of-type(2)');
      await page.click('input[type="checkbox"]:nth-of-type(3)');
      
      // 選択数が表示される
      await expect(page.locator('text=3件選択中')).toBeVisible();
      
      // 一括アクションバーが表示される
      await expect(page.locator('[data-testid="bulk-action-bar"]')).toBeVisible();
      
      // ステータスを一括更新
      await page.click('button:has-text("ステータス更新")');
      await page.selectOption('select[name="status"]', 'completed');
      await page.click('button:has-text("適用")');
      
      // 成功メッセージを確認
      await expect(page.locator('text=3件のケースを更新しました')).toBeVisible();
    });

    test('全選択/全解除が動作する', async ({ page }) => {
      await page.goto('/cases');
      
      // 全選択
      await page.click('[aria-label="全選択"]');
      
      const selectedCount = await page.locator('input[type="checkbox"]:checked').count();
      expect(selectedCount).toBeGreaterThan(0);
      
      // 全解除
      await page.click('[aria-label="全選択解除"]');
      
      const deselectedCount = await page.locator('input[type="checkbox"]:checked').count();
      expect(deselectedCount).toBe(0);
    });

    test('Shift+クリックで範囲選択ができる', async ({ page }) => {
      await page.goto('/cases');
      
      // 最初のアイテムをクリック
      await page.click('tr:nth-of-type(1) input[type="checkbox"]');
      
      // Shiftを押しながら5番目のアイテムをクリック
      await page.keyboard.down('Shift');
      await page.click('tr:nth-of-type(5) input[type="checkbox"]');
      await page.keyboard.up('Shift');
      
      // 5つのアイテムが選択されていることを確認
      await expect(page.locator('text=5件選択中')).toBeVisible();
    });

    test('Ctrl/Cmd+クリックで個別複数選択ができる', async ({ page }) => {
      await page.goto('/cases');
      
      const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
      
      // Ctrl/Cmdを押しながら複数選択
      await page.keyboard.down(modifier);
      await page.click('tr:nth-of-type(1) input[type="checkbox"]');
      await page.click('tr:nth-of-type(3) input[type="checkbox"]');
      await page.click('tr:nth-of-type(5) input[type="checkbox"]');
      await page.keyboard.up(modifier);
      
      // 3つのアイテムが選択されていることを確認
      await expect(page.locator('text=3件選択中')).toBeVisible();
    });
  });

  test.describe('キーボードショートカット', () => {
    test('Ctrl+Nで新規作成ダイアログが開く', async ({ page }) => {
      await page.goto('/cases');
      
      await page.keyboard.press('Control+n');
      
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await expect(page.locator('h2:has-text("新規ケース作成")')).toBeVisible();
    });

    test('Ctrl+Sで保存される', async ({ page }) => {
      await page.goto('/cases/1/edit');
      
      // フォームを編集
      await page.fill('input[name="title"]', '更新されたタイトル');
      
      // Ctrl+Sで保存
      await page.keyboard.press('Control+s');
      
      // 保存成功メッセージを確認
      await expect(page.locator('text=保存しました')).toBeVisible();
    });

    test('Escapeでモーダルが閉じる', async ({ page }) => {
      await page.goto('/cases');
      
      // モーダルを開く
      await page.click('button:has-text("新規作成")');
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      
      // Escapeで閉じる
      await page.keyboard.press('Escape');
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    });

    test('Ctrl+/でショートカット一覧が表示される', async ({ page }) => {
      await page.goto('/');
      
      await page.keyboard.press('Control+/');
      
      await expect(page.locator('[data-testid="shortcut-help"]')).toBeVisible();
      await expect(page.locator('text=キーボードショートカット')).toBeVisible();
    });
  });

  test.describe('アンドゥ/リドゥ機能', () => {
    test('Ctrl+Zで操作を取り消せる', async ({ page }) => {
      await page.goto('/templates/new');
      
      // ステップを追加
      await page.click('button:has-text("ステップを追加")');
      await page.fill('input[name="name"]', 'テストステップ');
      await page.click('button:has-text("保存")');
      
      // ステップが追加されたことを確認
      await expect(page.locator('text=テストステップ')).toBeVisible();
      
      // Ctrl+Zでアンドゥ
      await page.keyboard.press('Control+z');
      
      // ステップが削除されたことを確認
      await expect(page.locator('text=テストステップ')).not.toBeVisible();
    });

    test('Ctrl+Shift+Zでやり直しができる', async ({ page }) => {
      await page.goto('/templates/new');
      
      // ステップを追加
      await page.click('button:has-text("ステップを追加")');
      await page.fill('input[name="name"]', 'テストステップ');
      await page.click('button:has-text("保存")');
      
      // アンドゥ
      await page.keyboard.press('Control+z');
      await expect(page.locator('text=テストステップ')).not.toBeVisible();
      
      // リドゥ
      await page.keyboard.press('Control+Shift+z');
      await expect(page.locator('text=テストステップ')).toBeVisible();
    });

    test('アンドゥ履歴が表示される', async ({ page }) => {
      await page.goto('/templates/new');
      
      // 複数の操作を実行
      for (let i = 1; i <= 3; i++) {
        await page.click('button:has-text("ステップを追加")');
        await page.fill('input[name="name"]', `ステップ${i}`);
        await page.click('button:has-text("保存")');
      }
      
      // 履歴パネルを開く
      await page.click('button[aria-label="履歴を表示"]');
      
      // 履歴が表示されることを確認
      await expect(page.locator('text=ステップ1を追加')).toBeVisible();
      await expect(page.locator('text=ステップ2を追加')).toBeVisible();
      await expect(page.locator('text=ステップ3を追加')).toBeVisible();
    });
  });

  test.describe('アクセシビリティ', () => {
    test('キーボードのみで操作できる', async ({ page }) => {
      await page.goto('/cases');
      
      // Tabキーでフォーカス移動
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Spaceキーで選択
      await page.keyboard.press('Space');
      
      // 選択されたことを確認
      await expect(page.locator('text=1件選択中')).toBeVisible();
      
      // 矢印キーでナビゲーション
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Space');
      
      await expect(page.locator('text=2件選択中')).toBeVisible();
    });

    test('スクリーンリーダー用のラベルが適切', async ({ page }) => {
      await page.goto('/templates/new');
      
      // ARIA属性を確認
      const dragHandles = await page.locator('[aria-label="ドラッグして順序を変更"]').all();
      expect(dragHandles.length).toBeGreaterThan(0);
      
      const checkboxes = await page.locator('input[type="checkbox"][aria-label]').all();
      for (const checkbox of checkboxes) {
        const label = await checkbox.getAttribute('aria-label');
        expect(label).toBeTruthy();
      }
    });
  });

  test.describe('パフォーマンス', () => {
    test('大量のアイテムでもスムーズに動作する', async ({ page }) => {
      // 100件のデータがあるページを想定
      await page.goto('/cases?limit=100');
      
      const startTime = Date.now();
      
      // 全選択
      await page.click('[aria-label="全選択"]');
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 1秒以内に完了することを確認
      expect(duration).toBeLessThan(1000);
    });

    test('ドラッグ&ドロップが60fpsで動作する', async ({ page }) => {
      await page.goto('/templates/1/edit');
      
      // パフォーマンス計測開始
      await page.evaluate(() => {
        (window as any).performanceMarks = [];
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            (window as any).performanceMarks.push(entry);
          }
        });
        observer.observe({ entryTypes: ['measure'] });
      });
      
      // ドラッグ操作
      const step1 = page.locator('[data-testid="step-item"]').first();
      const step2 = page.locator('[data-testid="step-item"]').nth(1);
      await step1.dragTo(step2);
      
      // フレームレートを確認
      const marks = await page.evaluate(() => (window as any).performanceMarks);
      // 60fps = 16.67ms per frame
      const averageFrameTime = marks.reduce((acc: number, mark: any) => 
        acc + mark.duration, 0) / marks.length;
      
      expect(averageFrameTime).toBeLessThan(17);
    });
  });
});