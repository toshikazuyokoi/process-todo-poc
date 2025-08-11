import { Basis, BasisValue } from '../values/basis';
import { Offset } from '../values/offset';

export interface RequiredArtifact {
  kind: string;
  description?: string;
}

export class StepTemplate {
  private basis: BasisValue;
  private offset: Offset;
  private requiredArtifacts: RequiredArtifact[];
  private dependsOn: number[];

  constructor(
    private readonly id: number | null,
    private readonly processId: number,
    private seq: number,
    private name: string,
    basis: Basis | string,
    offsetDays: number,
    requiredArtifacts: RequiredArtifact[] | string,
    dependsOn: number[] | string,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {
    this.basis = new BasisValue(typeof basis === 'string' ? (basis as Basis) : basis);
    this.offset = new Offset(offsetDays);
    
    if (typeof requiredArtifacts === 'string') {
      this.requiredArtifacts = JSON.parse(requiredArtifacts);
    } else {
      this.requiredArtifacts = requiredArtifacts;
    }
    
    if (typeof dependsOn === 'string') {
      this.dependsOn = JSON.parse(dependsOn);
    } else {
      this.dependsOn = dependsOn;
    }
  }

  getId(): number | null {
    return this.id;
  }

  getProcessId(): number {
    return this.processId;
  }

  getSeq(): number {
    return this.seq;
  }

  getName(): string {
    return this.name;
  }

  getBasis(): BasisValue {
    return this.basis;
  }

  getOffset(): Offset {
    return this.offset;
  }

  getRequiredArtifacts(): RequiredArtifact[] {
    return [...this.requiredArtifacts];
  }

  getDependsOn(): number[] {
    return [...this.dependsOn];
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  updateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Step template name cannot be empty');
    }
    this.name = name;
    this.updatedAt = new Date();
  }

  updateSeq(seq: number): void {
    if (seq < 0) {
      throw new Error('Sequence number must be non-negative');
    }
    this.seq = seq;
    this.updatedAt = new Date();
  }

  updateBasis(basis: Basis): void {
    this.basis = new BasisValue(basis);
    this.updatedAt = new Date();
  }

  updateOffset(offsetDays: number): void {
    this.offset = new Offset(offsetDays);
    this.updatedAt = new Date();
  }

  addRequiredArtifact(artifact: RequiredArtifact): void {
    this.requiredArtifacts.push(artifact);
    this.updatedAt = new Date();
  }

  removeRequiredArtifact(kind: string): void {
    this.requiredArtifacts = this.requiredArtifacts.filter((a) => a.kind !== kind);
    this.updatedAt = new Date();
  }

  setRequiredArtifacts(artifacts: RequiredArtifact[]): void {
    this.requiredArtifacts = [...artifacts];
    this.updatedAt = new Date();
  }

  addDependency(stepTemplateId: number): void {
    if (!this.dependsOn.includes(stepTemplateId)) {
      this.dependsOn.push(stepTemplateId);
      this.updatedAt = new Date();
    }
  }

  removeDependency(stepTemplateId: number): void {
    this.dependsOn = this.dependsOn.filter((id) => id !== stepTemplateId);
    this.updatedAt = new Date();
  }

  setDependencies(dependencies: number[]): void {
    this.dependsOn = [...dependencies];
    this.updatedAt = new Date();
  }

  hasDependencies(): boolean {
    return this.dependsOn.length > 0;
  }

  isGoalBased(): boolean {
    return this.basis.isGoal();
  }

  isPrevBased(): boolean {
    return this.basis.isPrev();
  }

  getRequiredArtifactsJson(): string {
    return JSON.stringify(this.requiredArtifacts);
  }

  getDependsOnJson(): string {
    return JSON.stringify(this.dependsOn);
  }
}