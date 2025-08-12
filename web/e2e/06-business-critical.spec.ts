import { test, expect } from '@playwright/test';

test.describe('Business Critical Scenarios', () => {
  test.describe('データ整合性', () => {
    test('テンプレート更新時の既存案件への影響', async ({ page }) => {
      // テンプレートから案件を作成
      await page.goto('http://localhost:3000/templates');
      const templateName = `Template_${Date.now()}`;
      
      // テンプレート作成
      await page.click('text=新規作成');
      await page.fill('input[name="name"]', templateName);
      await page.click('text=ステップを追加');
      await page.fill('[placeholder="ステップ名"]', 'ステップ1');
      await page.click('button:has-text("保存")');
      
      // 案件作成
      await page.goto('http://localhost:3000/cases/new');
      await page.fill('input[name="title"]', 'テスト案件1');
      await page.selectOption('select[name="templateId"]', { label: templateName });
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + 1);
      await page.fill('input[type="date"]', targetDate.toISOString().split('T')[0]);
      await page.click('button:has-text("作成")');
      const caseUrl = page.url();
      
      // テンプレートを更新
      await page.goto('http://localhost:3000/templates');
      await page.click(`text=${templateName}`);
      await page.click('text=編集');
      await page.click('text=ステップを追加');
      const newStep = page.locator('.step-editor').last();
      await newStep.locator('[placeholder="ステップ名"]').fill('新ステップ');
      await page.click('button:has-text("保存")');
      
      // 既存案件が影響を受けていないことを確認
      await page.goto(caseUrl);
      const stepCount = await page.locator('.step-instance').count();
      expect(stepCount).toBe(1); // 元のステップ数のまま
    });

    test('同時編集の競合解決', async ({ browser }) => {
      // 2つのブラウザコンテキストを作成
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      
      try {
        // 両方のユーザーが同じ案件を開く
        const caseId = 1; // 既存の案件ID
        await page1.goto(`http://localhost:3000/cases/${caseId}/edit`);
        await page2.goto(`http://localhost:3000/cases/${caseId}/edit`);
        
        // ユーザー1が編集
        await page1.fill('input[name="title"]', 'ユーザー1の変更');
        
        // ユーザー2も編集
        await page2.fill('input[name="title"]', 'ユーザー2の変更');
        
        // ユーザー1が保存
        await page1.click('button:has-text("保存")');
        await expect(page1.locator('text=保存されました')).toBeVisible();
        
        // ユーザー2が保存を試みる
        await page2.click('button:has-text("保存")');
        
        // 競合エラーまたは確認ダイアログが表示される
        await expect(page2.locator('text=データが更新されています')).toBeVisible();
        
        // 最新データを取得して再編集
        await page2.click('button:has-text("最新データを取得")');
        await expect(page2.locator('input[name="title"]')).toHaveValue('ユーザー1の変更');
      } finally {
        await context1.close();
        await context2.close();
      }
    });

    test('カスケード削除の確認', async ({ page }) => {
      // テンプレートと関連データを作成
      const templateName = `Cascade_${Date.now()}`;
      
      await page.goto('http://localhost:3000/templates/new');
      await page.fill('input[name="name"]', templateName);
      await page.click('text=ステップを追加');
      await page.fill('[placeholder="ステップ名"]', 'ステップ1');
      await page.click('button:has-text("保存")');
      
      // 複数の案件を作成
      for (let i = 1; i <= 3; i++) {
        await page.goto('http://localhost:3000/cases/new');
        await page.fill('input[name="title"]', `案件${i}`);
        await page.selectOption('select[name="templateId"]', { label: templateName });
        const date = new Date();
        date.setMonth(date.getMonth() + i);
        await page.fill('input[type="date"]', date.toISOString().split('T')[0]);
        await page.click('button:has-text("作成")');
      }
      
      // テンプレートを削除しようとする
      await page.goto('http://localhost:3000/templates');
      await page.click(`text=${templateName}`);
      await page.click('button:has-text("削除")');
      
      // 確認ダイアログ
      await expect(page.locator('text=このテンプレートは3件の案件で使用されています')).toBeVisible();
      await expect(page.locator('text=本当に削除しますか？')).toBeVisible();
      
      // キャンセル
      await page.click('button:has-text("キャンセル")');
      await expect(page.locator(`text=${templateName}`)).toBeVisible();
    });
  });

  test.describe('権限とセキュリティ', () => {
    test('未認証ユーザーのアクセス制限', async ({ page }) => {
      // ログアウト状態を想定（実装に応じて調整）
      await page.context().clearCookies();
      
      // 保護されたページへのアクセス
      await page.goto('http://localhost:3000/cases/new');
      
      // ログインページへリダイレクト（または403エラー）
      await expect(page).toHaveURL(/\/(login|auth)/);
      // または
      // await expect(page.locator('text=ログインが必要です')).toBeVisible();
    });

    test('XSS攻撃の防御', async ({ page }) => {
      await page.goto('http://localhost:3000/templates/new');
      
      // XSSペイロードを入力
      const xssPayload = '<script>alert("XSS")</script>';
      await page.fill('input[name="name"]', xssPayload);
      await page.click('text=ステップを追加');
      await page.fill('[placeholder="ステップ名"]', xssPayload);
      await page.click('button:has-text("保存")');
      
      // 一覧ページで確認
      await page.goto('http://localhost:3000/templates');
      
      // スクリプトが実行されないことを確認
      const alertPromise = page.waitForEvent('dialog', { timeout: 1000 }).catch(() => null);
      const alert = await alertPromise;
      expect(alert).toBeNull();
      
      // エスケープされたテキストが表示される
      await expect(page.locator('text=<script>alert("XSS")</script>')).toBeVisible();
    });

    test('SQLインジェクションの防御', async ({ page }) => {
      await page.goto('http://localhost:3000/search');
      
      // SQLインジェクションペイロード
      const sqlPayload = "'; DROP TABLE cases; --";
      await page.fill('input[placeholder="検索..."]', sqlPayload);
      await page.press('input[placeholder="検索..."]', 'Enter');
      
      // エラーが表示されないことを確認
      await expect(page.locator('text=Internal Server Error')).not.toBeVisible();
      
      // 検索結果が正常に表示される（0件でも正常）
      await expect(page.locator('.search-results')).toBeVisible();
      
      // データベースが破壊されていないことを確認
      await page.goto('http://localhost:3000/cases');
      await expect(page.locator('.case-card')).toHaveCount({ min: 0 });
    });
  });

  test.describe('営業日計算とスケジューリング', () => {
    test('祝日を考慮したスケジュール計算', async ({ page }) => {
      await page.goto('http://localhost:3000/cases/new');
      
      // 年末年始を跨ぐ案件を作成
      await page.fill('input[name="title"]', '年末年始プロジェクト');
      await page.selectOption('select[name="templateId"]', { index: 1 });
      
      // 12月28日を目標日に設定
      const yearEnd = new Date();
      yearEnd.setMonth(11); // December
      yearEnd.setDate(28);
      await page.fill('input[type="date"]', yearEnd.toISOString().split('T')[0]);
      
      await page.click('button:has-text("作成")');
      
      // ステップの期日が祝日を避けていることを確認
      const stepDates = await page.locator('.step-due-date').allTextContents();
      
      for (const dateStr of stepDates) {
        const date = new Date(dateStr);
        const month = date.getMonth();
        const day = date.getDate();
        
        // 1月1日〜3日ではないことを確認
        if (month === 0) {
          expect(day).not.toBeLessThanOrEqual(3);
        }
        
        // 土日ではないことを確認
        const dayOfWeek = date.getDay();
        expect(dayOfWeek).not.toBe(0); // Sunday
        expect(dayOfWeek).not.toBe(6); // Saturday
      }
    });

    test('依存関係の連鎖的な日付調整', async ({ page }) => {
      // 依存関係のあるステップを持つテンプレートを作成
      await page.goto('http://localhost:3000/templates/new');
      await page.fill('input[name="name"]', '依存関係テスト');
      
      // ステップ1
      await page.click('text=ステップを追加');
      await page.fill('[placeholder="ステップ名"]', 'フェーズ1');
      await page.selectOption('select[name="basis"]', 'START');
      await page.fill('input[name="offsetDays"]', '5');
      
      // ステップ2（ステップ1に依存）
      await page.click('text=ステップを追加');
      const step2 = page.locator('.step-editor').last();
      await step2.locator('[placeholder="ステップ名"]').fill('フェーズ2');
      await step2.locator('select[name="basis"]').selectOption('STEP');
      await step2.locator('input[name="offsetDays"]').fill('3');
      
      // ステップ3（ステップ2に依存）
      await page.click('text=ステップを追加');
      const step3 = page.locator('.step-editor').last();
      await step3.locator('[placeholder="ステップ名"]').fill('フェーズ3');
      await step3.locator('select[name="basis"]').selectOption('STEP');
      await step3.locator('input[name="offsetDays"]').fill('7');
      
      await page.click('button:has-text("保存")');
      
      // 案件を作成
      await page.goto('http://localhost:3000/cases/new');
      await page.fill('input[name="title"]', '依存関係案件');
      await page.selectOption('select[name="templateId"]', { label: '依存関係テスト' });
      
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + 1);
      await page.fill('input[type="date"]', targetDate.toISOString().split('T')[0]);
      await page.click('button:has-text("作成")');
      
      // 各ステップの日付が依存関係に従って設定されていることを確認
      const dates = await page.locator('.step-due-date').allTextContents();
      const parsedDates = dates.map(d => new Date(d));
      
      // 日付が順序通りになっている
      for (let i = 0; i < parsedDates.length - 1; i++) {
        expect(parsedDates[i] <= parsedDates[i + 1]).toBeTruthy();
      }
    });
  });

  test.describe('通知とリアルタイム更新', () => {
    test('期限切れ通知の自動生成', async ({ page }) => {
      // 過去の期限を持つ案件を作成（APIモックが必要）
      await page.goto('http://localhost:3000/cases/new');
      await page.fill('input[name="title"]', '期限切れテスト');
      await page.selectOption('select[name="templateId"]', { index: 1 });
      
      // 明日の日付を設定（すぐに期限切れになるように）
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await page.fill('input[type="date"]', tomorrow.toISOString().split('T')[0]);
      await page.click('button:has-text("作成")');
      
      // 時間を進める（実際のテストではモックタイマーを使用）
      // await page.evaluate(() => {
      //   const now = new Date();
      //   now.setDate(now.getDate() + 2);
      //   Date.now = () => now.getTime();
      // });
      
      // 通知を確認
      await page.reload();
      await page.click('[aria-label="通知"]');
      await expect(page.locator('text=期限を過ぎています')).toBeVisible();
    });

    test('複数ユーザーでのリアルタイム更新', async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      
      try {
        // 両方のユーザーが同じ案件を表示
        const caseId = 1;
        await page1.goto(`http://localhost:3000/cases/${caseId}`);
        await page2.goto(`http://localhost:3000/cases/${caseId}`);
        
        // ユーザー1がステータスを更新
        const step1 = page1.locator('.step-instance').first();
        await step1.locator('button:has-text("開始")').click();
        
        // ユーザー2の画面が自動更新される（WebSocketまたはポーリング）
        await page2.waitForTimeout(2000); // リアルタイム更新を待つ
        const step2 = page2.locator('.step-instance').first();
        await expect(step2.locator('text=進行中')).toBeVisible();
        
        // ユーザー1がコメントを追加
        await step1.locator('button:has-text("コメント")').click();
        await page1.fill('textarea[placeholder="コメントを入力"]', 'リアルタイムテスト');
        await page1.click('button:has-text("投稿")');
        
        // ユーザー2の画面にコメントが表示される
        await page2.waitForTimeout(2000);
        await expect(page2.locator('text=リアルタイムテスト')).toBeVisible();
      } finally {
        await context1.close();
        await context2.close();
      }
    });
  });

  test.describe('データのインポート/エクスポート', () => {
    test('テンプレートのエクスポートとインポート', async ({ page }) => {
      // テンプレートをエクスポート
      await page.goto('http://localhost:3000/templates');
      await page.click('text=テストテンプレート');
      await page.click('button:has-text("エクスポート")');
      
      // ダウンロードを待つ
      const download = await page.waitForEvent('download');
      const fileName = download.suggestedFilename();
      expect(fileName).toContain('.json');
      
      // 別のテンプレートとしてインポート
      await page.goto('http://localhost:3000/templates');
      await page.click('button:has-text("インポート")');
      
      // ファイルを選択
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(await download.path());
      
      // インポート実行
      await page.click('button:has-text("インポート実行")');
      await expect(page.locator('text=インポートが完了しました')).toBeVisible();
      
      // インポートされたテンプレートが表示される
      await expect(page.locator('text=(インポート)')).toBeVisible();
    });

    test('案件データのCSVエクスポート', async ({ page }) => {
      await page.goto('http://localhost:3000/cases');
      
      // エクスポートボタンをクリック
      await page.click('button:has-text("CSVエクスポート")');
      
      // オプションを選択
      await page.check('input[name="includeSteps"]');
      await page.check('input[name="includeComments"]');
      
      // ダウンロード
      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("ダウンロード")');
      const download = await downloadPromise;
      
      // ファイル名とサイズを確認
      expect(download.suggestedFilename()).toContain('cases_');
      expect(download.suggestedFilename()).toContain('.csv');
    });
  });
});