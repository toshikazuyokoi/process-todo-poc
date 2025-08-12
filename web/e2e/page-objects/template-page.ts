import { Page, Locator } from '@playwright/test';

export class TemplatePage {
  readonly page: Page;
  readonly createButton: Locator;
  readonly nameInput: Locator;
  readonly addStepButton: Locator;
  readonly saveButton: Locator;
  readonly templateList: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createButton = page.locator('button:has-text("新規作成")');
    this.nameInput = page.locator('input[name="name"]');
    this.addStepButton = page.locator('button:has-text("ステップを追加")');
    this.saveButton = page.locator('button:has-text("保存")');
    this.templateList = page.locator('.template-card');
    this.searchInput = page.locator('input[placeholder*="検索"]');
  }

  async goto() {
    await this.page.goto('http://localhost:3000/templates');
  }

  async gotoNew() {
    await this.page.goto('http://localhost:3000/templates/new');
  }

  async createTemplate(name: string, steps: Array<{ name: string; basis: string; offsetDays: number }>) {
    await this.gotoNew();
    await this.nameInput.fill(name);

    for (const step of steps) {
      await this.addStepButton.click();
      const stepEditor = this.page.locator('.step-editor').last();
      await stepEditor.locator('[placeholder="ステップ名"]').fill(step.name);
      await stepEditor.locator('select[name="basis"]').selectOption(step.basis);
      await stepEditor.locator('input[name="offsetDays"]').fill(step.offsetDays.toString());
    }

    await this.saveButton.click();
    await this.page.waitForURL(/\/templates$/);
  }

  async searchTemplate(query: string) {
    await this.searchInput.fill(query);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(500); // 検索結果の更新を待つ
  }

  async editTemplate(name: string) {
    await this.page.click(`text=${name}`);
    await this.page.click('button:has-text("編集")');
  }

  async deleteTemplate(name: string) {
    await this.page.click(`text=${name}`);
    await this.page.click('button:has-text("削除")');
    await this.page.click('button:has-text("確認")');
  }

  async getTemplateCount(): Promise<number> {
    return await this.templateList.count();
  }

  async isTemplateVisible(name: string): Promise<boolean> {
    return await this.page.locator(`text=${name}`).isVisible();
  }

  async addStepToCurrentTemplate(step: { name: string; basis: string; offsetDays: number }) {
    await this.addStepButton.click();
    const stepEditor = this.page.locator('.step-editor').last();
    await stepEditor.locator('[placeholder="ステップ名"]').fill(step.name);
    await stepEditor.locator('select[name="basis"]').selectOption(step.basis);
    await stepEditor.locator('input[name="offsetDays"]').fill(step.offsetDays.toString());
  }

  async setStepDependency(stepIndex: number, dependsOnIndices: number[]) {
    const stepEditor = this.page.locator('.step-editor').nth(stepIndex);
    for (const depIndex of dependsOnIndices) {
      await stepEditor.locator(`input[value="${depIndex}"]`).check();
    }
  }

  async validateTemplate(): Promise<string[]> {
    await this.saveButton.click();
    const errors = await this.page.locator('.error-message').allTextContents();
    return errors;
  }

  async exportTemplate(name: string) {
    await this.page.click(`text=${name}`);
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.click('button:has-text("エクスポート")');
    return await downloadPromise;
  }

  async importTemplate(filePath: string) {
    await this.page.click('button:has-text("インポート")');
    const fileInput = this.page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    await this.page.click('button:has-text("インポート実行")');
    await this.page.waitForSelector('text=インポートが完了しました');
  }
}