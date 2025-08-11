import { StepTemplate } from './step-template';

export class ProcessTemplate {
  private _stepTemplates: StepTemplate[] = [];

  constructor(
    private readonly id: number | null,
    private name: string,
    private version: number,
    private isActive: boolean,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  getId(): number | null {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getVersion(): number {
    return this.version;
  }

  getIsActive(): boolean {
    return this.isActive;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  getStepTemplates(): StepTemplate[] {
    return [...this._stepTemplates];
  }

  setStepTemplates(stepTemplates: StepTemplate[]): void {
    this._stepTemplates = [...stepTemplates];
    this.sortStepTemplates();
  }

  addStepTemplate(stepTemplate: StepTemplate): void {
    this._stepTemplates.push(stepTemplate);
    this.sortStepTemplates();
  }

  removeStepTemplate(stepTemplateId: number): void {
    this._stepTemplates = this._stepTemplates.filter((st) => st.getId() !== stepTemplateId);
  }

  private sortStepTemplates(): void {
    this._stepTemplates.sort((a, b) => a.getSeq() - b.getSeq());
  }

  updateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Process template name cannot be empty');
    }
    this.name = name;
    this.updatedAt = new Date();
  }

  activate(): void {
    this.isActive = true;
    this.updatedAt = new Date();
  }

  deactivate(): void {
    this.isActive = false;
    this.updatedAt = new Date();
  }

  incrementVersion(): void {
    this.version++;
    this.updatedAt = new Date();
  }

  validateStepDependencies(): boolean {
    const stepIds = new Set(this._stepTemplates.map((st) => st.getId()).filter((id) => id !== null));
    
    for (const step of this._stepTemplates) {
      const dependencies = step.getDependsOn();
      for (const depId of dependencies) {
        if (!stepIds.has(depId)) {
          return false;
        }
      }
    }
    
    return true;
  }

  hasCircularDependencies(): boolean {
    const visited = new Set<number>();
    const recursionStack = new Set<number>();
    
    const hasCycle = (stepId: number): boolean => {
      if (recursionStack.has(stepId)) {
        return true;
      }
      if (visited.has(stepId)) {
        return false;
      }
      
      visited.add(stepId);
      recursionStack.add(stepId);
      
      const step = this._stepTemplates.find((st) => st.getId() === stepId);
      if (step) {
        for (const depId of step.getDependsOn()) {
          if (hasCycle(depId)) {
            return true;
          }
        }
      }
      
      recursionStack.delete(stepId);
      return false;
    };
    
    for (const step of this._stepTemplates) {
      const stepId = step.getId();
      if (stepId !== null && hasCycle(stepId)) {
        return true;
      }
    }
    
    return false;
  }
}