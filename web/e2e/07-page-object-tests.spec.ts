import { test, expect } from '@playwright/test';
import { TemplatePage } from './page-objects/template-page';
import { CasePage } from './page-objects/case-page';

test.describe('Page Object Pattern Tests', () => {
  let templatePage: TemplatePage;
  let casePage: CasePage;

  test.beforeEach(async ({ page }) => {
    templatePage = new TemplatePage(page);
    casePage = new CasePage(page);
  });

  test('テンプレート管理の完全フロー', async () => {
    const templateName = `POM_Template_${Date.now()}`;
    
    // テンプレート作成
    await templatePage.createTemplate(templateName, [
      { name: '企画', basis: 'START', offsetDays: 10 },
      { name: '設計', basis: 'STEP', offsetDays: 15 },
      { name: '開発', basis: 'STEP', offsetDays: 30 },
      { name: 'テスト', basis: 'STEP', offsetDays: 10 },
      { name: 'リリース', basis: 'STEP', offsetDays: 5 }
    ]);

    // テンプレートが作成されたことを確認
    await templatePage.goto();
    expect(await templatePage.isTemplateVisible(templateName)).toBeTruthy();

    // テンプレートを検索
    await templatePage.searchTemplate(templateName);
    expect(await templatePage.getTemplateCount()).toBe(1);

    // テンプレートを編集
    await templatePage.editTemplate(templateName);
    await templatePage.addStepToCurrentTemplate({
      name: 'レビュー',
      basis: 'STEP',
      offsetDays: 3
    });
    await templatePage.saveButton.click();

    // エクスポート
    const download = await templatePage.exportTemplate(templateName);
    expect(download.suggestedFilename()).toContain('.json');
  });

  test('案件管理の完全フロー', async ({ page }) => {
    // 前提: テンプレートが存在する
    const templateName = 'Standard Template';
    const caseName = `POM_Case_${Date.now()}`;
    
    // 案件作成
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + 2);
    await casePage.createCase(caseName, templateName, targetDate);

    // 案件が作成されたことを確認
    const caseUrl = page.url();
    const caseId = parseInt(caseUrl.split('/').pop() || '0');
    expect(caseId).toBeGreaterThan(0);

    // ステップの進行管理
    await casePage.updateStepStatus(0, 'start');
    expect(await casePage.getStepStatus(0)).toContain('進行中');

    // コメント追加
    await casePage.addComment(0, 'Page Object Patternテストコメント');
    expect(await casePage.getCommentCount(0)).toBeGreaterThan(0);

    // ステップをロック
    await casePage.lockStep(0);
    expect(await casePage.isStepLocked(0)).toBeTruthy();

    // ステップを完了
    await casePage.unlockStep(0);
    await casePage.updateStepStatus(0, 'complete');
    expect(await casePage.getStepStatus(0)).toContain('完了');

    // 進捗率を確認
    const progress = await casePage.getProgressPercentage();
    expect(progress).toBeGreaterThan(0);

    // ガントチャートに移動
    await casePage.navigateToGantt();
    expect(page.url()).toContain('/gantt');
  });

  test('テンプレートと案件の連携', async ({ page }) => {
    const templateName = `Integration_${Date.now()}`;
    
    // テンプレート作成
    await templatePage.createTemplate(templateName, [
      { name: 'ステップ1', basis: 'START', offsetDays: 5 },
      { name: 'ステップ2', basis: 'STEP', offsetDays: 10 },
      { name: 'ステップ3', basis: 'STEP', offsetDays: 7 }
    ]);

    // 同じテンプレートから複数の案件を作成
    const cases = [];
    for (let i = 1; i <= 3; i++) {
      const caseName = `${templateName}_Case_${i}`;
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + i);
      
      await casePage.createCase(caseName, templateName, targetDate);
      cases.push({ name: caseName, url: page.url() });
      
      // 案件一覧に戻る
      await casePage.goto();
    }

    // すべての案件が存在することを確認
    for (const c of cases) {
      expect(await casePage.isCaseVisible(c.name)).toBeTruthy();
    }

    // フィルタリングテスト
    await casePage.filterByStatus('TODO');
    expect(await casePage.getCaseCount()).toBeGreaterThan(0);

    // ソートテスト
    await casePage.sortBy('dueDate');
    const caseList = await page.locator('.case-card').all();
    expect(caseList.length).toBe(cases.length);
  });

  test('再計画機能の詳細テスト', async ({ page }) => {
    // 既存の案件を開く（または作成）
    const caseName = `Replan_Test_${Date.now()}`;
    const templateName = 'Standard Template';
    
    const initialDate = new Date();
    initialDate.setMonth(initialDate.getMonth() + 1);
    await casePage.createCase(caseName, templateName, initialDate);

    // 初期の期日を記録
    const initialDueDates = [];
    const stepCount = await page.locator('.step-instance').count();
    for (let i = 0; i < stepCount; i++) {
      initialDueDates.push(await casePage.getStepDueDate(i));
    }

    // 再計画実行
    const newTargetDate = new Date();
    newTargetDate.setMonth(newTargetDate.getMonth() + 3);
    await casePage.replanCase(newTargetDate);

    // 新しい期日を確認
    const newDueDates = [];
    for (let i = 0; i < stepCount; i++) {
      newDueDates.push(await casePage.getStepDueDate(i));
    }

    // 期日が変更されていることを確認
    for (let i = 0; i < stepCount; i++) {
      expect(newDueDates[i]).not.toBe(initialDueDates[i]);
    }
  });

  test('バリデーションエラーの処理', async () => {
    // テンプレートのバリデーション
    await templatePage.gotoNew();
    const templateErrors = await templatePage.validateTemplate();
    expect(templateErrors).toContain('テンプレート名は必須です');

    // 案件のバリデーション
    await casePage.gotoNew();
    await casePage.saveButton.click();
    const errorMessages = await casePage.page.locator('.error-message').allTextContents();
    expect(errorMessages).toContain('タイトルは必須です');
    expect(errorMessages).toContain('テンプレートを選択してください');
  });

  test('複数ブラウザでの同時操作', async ({ browser }) => {
    // 2つのブラウザコンテキストを作成
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    const templatePage1 = new TemplatePage(page1);
    const templatePage2 = new TemplatePage(page2);
    
    try {
      // 両方のユーザーがテンプレート一覧を表示
      await templatePage1.goto();
      await templatePage2.goto();
      
      const initialCount1 = await templatePage1.getTemplateCount();
      const initialCount2 = await templatePage2.getTemplateCount();
      expect(initialCount1).toBe(initialCount2);
      
      // ユーザー1が新しいテンプレートを作成
      const newTemplateName = `Concurrent_${Date.now()}`;
      await templatePage1.createTemplate(newTemplateName, [
        { name: 'Step1', basis: 'START', offsetDays: 5 }
      ]);
      
      // ユーザー2の画面をリフレッシュ
      await page2.reload();
      
      // 新しいテンプレートが表示される
      expect(await templatePage2.isTemplateVisible(newTemplateName)).toBeTruthy();
      expect(await templatePage2.getTemplateCount()).toBe(initialCount2 + 1);
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('データのインポート/エクスポート連携', async ({ page }) => {
    const originalTemplateName = `Export_Source_${Date.now()}`;
    
    // オリジナルテンプレートを作成
    await templatePage.createTemplate(originalTemplateName, [
      { name: '分析', basis: 'START', offsetDays: 5 },
      { name: '設計', basis: 'STEP', offsetDays: 10 },
      { name: '実装', basis: 'STEP', offsetDays: 20 }
    ]);
    
    // エクスポート
    const download = await templatePage.exportTemplate(originalTemplateName);
    const exportPath = await download.path();
    
    // インポート（別名として）
    await templatePage.goto();
    await templatePage.importTemplate(exportPath || '');
    
    // インポートされたテンプレートが存在することを確認
    await page.reload();
    const templates = await page.locator('.template-card').allTextContents();
    const importedTemplate = templates.find(t => t.includes(originalTemplateName) && t.includes('インポート'));
    expect(importedTemplate).toBeDefined();
  });

  test('ステップ依存関係の複雑なシナリオ', async ({ page }) => {
    const templateName = `Complex_Deps_${Date.now()}`;
    
    await templatePage.gotoNew();
    await templatePage.nameInput.fill(templateName);
    
    // 5つのステップを追加
    const steps = [
      { name: 'A: 要件定義', basis: 'START', offsetDays: 5 },
      { name: 'B: 基本設計', basis: 'STEP', offsetDays: 10 },
      { name: 'C: 詳細設計', basis: 'STEP', offsetDays: 10 },
      { name: 'D: 実装', basis: 'STEP', offsetDays: 20 },
      { name: 'E: テスト', basis: 'STEP', offsetDays: 15 }
    ];
    
    for (const step of steps) {
      await templatePage.addStepToCurrentTemplate(step);
    }
    
    // 複雑な依存関係を設定
    // B は A に依存
    await templatePage.setStepDependency(1, [0]);
    // C は A と B に依存
    await templatePage.setStepDependency(2, [0, 1]);
    // D は B と C に依存
    await templatePage.setStepDependency(3, [1, 2]);
    // E は C と D に依存
    await templatePage.setStepDependency(4, [2, 3]);
    
    await templatePage.saveButton.click();
    
    // 案件を作成して依存関係が正しく反映されることを確認
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + 3);
    await casePage.createCase(`${templateName}_Case`, templateName, targetDate);
    
    // 各ステップの期日が依存関係に従って設定されていることを確認
    const dueDates = [];
    for (let i = 0; i < 5; i++) {
      const dateStr = await casePage.getStepDueDate(i);
      dueDates.push(new Date(dateStr));
    }
    
    // A < B < C < D < E の順序を確認
    for (let i = 0; i < dueDates.length - 1; i++) {
      expect(dueDates[i].getTime()).toBeLessThanOrEqual(dueDates[i + 1].getTime());
    }
  });
});