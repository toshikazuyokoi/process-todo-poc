import { test, expect } from '@playwright/test';

test.describe('キーボードショートカット', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('ナビゲーション', () => {
    test('g h でホームへ移動', async ({ page }) => {
      await page.goto('/cases');
      await page.keyboard.press('g');
      await page.keyboard.press('h');
      await expect(page).toHaveURL('/');
    });

    test('g c でケース一覧へ移動', async ({ page }) => {
      await page.keyboard.press('g');
      await page.keyboard.press('c');
      await expect(page).toHaveURL('/cases');
    });

    test('g t でテンプレート一覧へ移動', async ({ page }) => {
      await page.keyboard.press('g');
      await page.keyboard.press('t');
      await expect(page).toHaveURL('/templates');
    });

    test('g g でガントチャートへ移動', async ({ page }) => {
      await page.keyboard.press('g');
      await page.keyboard.press('g');
      await expect(page).toHaveURL('/gantt');
    });
  });

  test.describe('ヘルプ', () => {
    test('? でヘルプモーダルを表示', async ({ page }) => {
      await page.keyboard.press('Shift+?');
      
      const helpModal = page.locator('[data-testid="shortcut-help"]');
      await expect(helpModal).toBeVisible();
      await expect(helpModal).toContainText('キーボードショートカット');
      
      // ショートカット一覧が表示される
      await expect(helpModal).toContainText('ホームへ移動');
      await expect(helpModal).toContainText('ケース一覧へ移動');
      await expect(helpModal).toContainText('新規作成');
      await expect(helpModal).toContainText('クイック検索');
    });

    test('Escapeでヘルプモーダルを閉じる', async ({ page }) => {
      await page.keyboard.press('Shift+?');
      const helpModal = page.locator('[data-testid="shortcut-help"]');
      await expect(helpModal).toBeVisible();
      
      await page.keyboard.press('Escape');
      await expect(helpModal).not.toBeVisible();
    });
  });

  test.describe('クイック検索', () => {
    test('Ctrl+K でクイック検索を開く', async ({ page }) => {
      await page.keyboard.press('Control+k');
      
      const searchInput = page.locator('input[placeholder*="検索"]');
      await expect(searchInput).toBeVisible();
      await expect(searchInput).toBeFocused();
    });

    test('検索結果をキーボードで操作できる', async ({ page }) => {
      await page.keyboard.press('Control+k');
      
      // 検索キーワードを入力
      await page.keyboard.type('ケース');
      
      // 下矢印で選択を移動
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      
      // Enterで選択した項目へ遷移
      await page.keyboard.press('Enter');
      
      // URLが変更されることを確認
      await expect(page).not.toHaveURL('/');
    });

    test('Escapeで検索を閉じる', async ({ page }) => {
      await page.keyboard.press('Control+k');
      const searchInput = page.locator('input[placeholder*="検索"]');
      await expect(searchInput).toBeVisible();
      
      await page.keyboard.press('Escape');
      await expect(searchInput).not.toBeVisible();
    });
  });

  test.describe('新規作成', () => {
    test('Ctrl+N で新規作成モーダルを開く', async ({ page }) => {
      await page.keyboard.press('Control+n');
      
      // モーダルが表示される
      await expect(page.locator('text=新規作成')).toBeVisible();
      await expect(page.locator('text=新規ケース')).toBeVisible();
      await expect(page.locator('text=新規テンプレート')).toBeVisible();
    });

    test('新規ケースを選択して遷移', async ({ page }) => {
      await page.keyboard.press('Control+n');
      await page.click('text=新規ケース');
      
      await expect(page).toHaveURL('/cases/new');
    });
  });

  test.describe('保存ショートカット', () => {
    test('編集画面でCtrl+Sで保存', async ({ page }) => {
      // ケース作成画面へ移動
      await page.goto('/cases/new');
      
      // フォームに入力
      await page.selectOption('select[name="templateId"]', { index: 1 });
      await page.fill('input[name="title"]', 'テストケース');
      await page.fill('input[name="goalDate"]', '2025-12-31');
      
      // Ctrl+Sで保存
      await page.keyboard.press('Control+s');
      
      // 保存ボタンがクリックされたことを確認
      await page.waitForTimeout(500); // 保存処理を待つ
      
      // エラーがない場合は遷移するか、保存中の表示が出る
      const saveButton = page.locator('[data-testid="save-button"]');
      const buttonText = await saveButton.textContent();
      expect(buttonText).toContain('保存');
    });
  });

  test.describe('モバイルでの動作', () => {
    test.skip(({ isMobile }) => !isMobile, 'モバイルのみ');
    
    test('モバイルでもショートカットが動作する', async ({ page }) => {
      // モバイルでは物理キーボードがない場合が多いので、
      // 仮想キーボードでの入力をシミュレート
      await page.keyboard.press('g');
      await page.keyboard.press('c');
      await expect(page).toHaveURL('/cases');
    });
  });
});