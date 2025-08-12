import { Page, Locator } from '@playwright/test';

export class CasePage {
  readonly page: Page;
  readonly createButton: Locator;
  readonly titleInput: Locator;
  readonly templateSelect: Locator;
  readonly targetDateInput: Locator;
  readonly saveButton: Locator;
  readonly caseList: Locator;
  readonly statusFilter: Locator;
  readonly sortSelect: Locator;
  readonly replanButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createButton = page.locator('button:has-text("新規作成")');
    this.titleInput = page.locator('input[name="title"]');
    this.templateSelect = page.locator('select[name="templateId"]');
    this.targetDateInput = page.locator('input[type="date"]');
    this.saveButton = page.locator('button:has-text("作成")');
    this.caseList = page.locator('.case-card');
    this.statusFilter = page.locator('select[name="status"]');
    this.sortSelect = page.locator('select[name="sort"]');
    this.replanButton = page.locator('button:has-text("再計画")');
  }

  async goto() {
    await this.page.goto('http://localhost:3000/cases');
  }

  async gotoNew() {
    await this.page.goto('http://localhost:3000/cases/new');
  }

  async gotoCase(id: number) {
    await this.page.goto(`http://localhost:3000/cases/${id}`);
  }

  async createCase(title: string, templateName: string, targetDate: Date) {
    await this.gotoNew();
    await this.titleInput.fill(title);
    await this.templateSelect.selectOption({ label: templateName });
    await this.targetDateInput.fill(targetDate.toISOString().split('T')[0]);
    await this.saveButton.click();
    await this.page.waitForURL(/\/cases\/\d+$/);
  }

  async filterByStatus(status: string) {
    await this.statusFilter.selectOption(status);
    await this.page.waitForTimeout(500); // フィルタリングの反映を待つ
  }

  async sortBy(criteria: string) {
    await this.sortSelect.selectOption(criteria);
    await this.page.waitForTimeout(500); // ソートの反映を待つ
  }

  async getCaseCount(): Promise<number> {
    return await this.caseList.count();
  }

  async isCaseVisible(title: string): Promise<boolean> {
    return await this.page.locator(`text=${title}`).isVisible();
  }

  async openCase(title: string) {
    await this.page.click(`text=${title}`);
    await this.page.waitForURL(/\/cases\/\d+$/);
  }

  async updateStepStatus(stepIndex: number, action: 'start' | 'complete' | 'block' | 'cancel') {
    const step = this.page.locator('.step-instance').nth(stepIndex);
    const actionText = {
      start: '開始',
      complete: '完了',
      block: 'ブロック',
      cancel: 'キャンセル'
    };
    await step.locator(`button:has-text("${actionText[action]}")`).click();
  }

  async addComment(stepIndex: number, comment: string) {
    const step = this.page.locator('.step-instance').nth(stepIndex);
    await step.locator('button:has-text("コメント")').click();
    await this.page.fill('textarea[placeholder="コメントを入力"]', comment);
    await this.page.click('button:has-text("投稿")');
  }

  async lockStep(stepIndex: number) {
    const step = this.page.locator('.step-instance').nth(stepIndex);
    await step.locator('button[aria-label="ロック"]').click();
  }

  async unlockStep(stepIndex: number) {
    const step = this.page.locator('.step-instance').nth(stepIndex);
    await step.locator('button[aria-label="ロック解除"]').click();
  }

  async assignStep(stepIndex: number, userName: string) {
    const step = this.page.locator('.step-instance').nth(stepIndex);
    await step.locator('button:has-text("担当者")').click();
    await this.page.selectOption('select[name="assignee"]', { label: userName });
    await this.page.click('button:has-text("割り当て")');
  }

  async uploadArtifact(stepIndex: number, filePath: string) {
    const step = this.page.locator('.step-instance').nth(stepIndex);
    await step.locator('button:has-text("成果物")').click();
    const fileInput = this.page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    await this.page.click('button:has-text("アップロード")');
  }

  async replanCase(newTargetDate: Date) {
    await this.replanButton.click();
    await this.page.fill('input[name="targetDate"]', newTargetDate.toISOString().split('T')[0]);
    await this.page.click('button:has-text("プレビュー")');
    await this.page.waitForSelector('text=再計画プレビュー');
    await this.page.click('button:has-text("適用")');
    await this.page.waitForSelector('text=再計画が適用されました');
  }

  async getStepStatus(stepIndex: number): Promise<string> {
    const step = this.page.locator('.step-instance').nth(stepIndex);
    return await step.locator('.step-status').textContent() || '';
  }

  async getStepDueDate(stepIndex: number): Promise<string> {
    const step = this.page.locator('.step-instance').nth(stepIndex);
    return await step.locator('.step-due-date').textContent() || '';
  }

  async isStepLocked(stepIndex: number): Promise<boolean> {
    const step = this.page.locator('.step-instance').nth(stepIndex);
    return await step.locator('.lock-icon').isVisible();
  }

  async getCommentCount(stepIndex: number): Promise<number> {
    const step = this.page.locator('.step-instance').nth(stepIndex);
    const commentBadge = step.locator('.comment-count');
    const text = await commentBadge.textContent();
    return parseInt(text || '0');
  }

  async exportCaseData() {
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.click('button:has-text("エクスポート")');
    await this.page.click('button:has-text("CSVダウンロード")');
    return await downloadPromise;
  }

  async navigateToGantt() {
    await this.page.click('a:has-text("ガントチャート")');
    await this.page.waitForURL(/\/gantt/);
  }

  async getProgressPercentage(): Promise<number> {
    const progressText = await this.page.locator('.progress-percentage').textContent();
    return parseInt(progressText?.replace('%', '') || '0');
  }
}