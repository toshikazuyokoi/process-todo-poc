import { StepInstance } from '../entities/step-instance';
import { StepStatus } from '../values/step-status';

export interface IStepInstanceRepository {
  findById(id: number): Promise<StepInstance | null>;
  findByCaseId(caseId: number): Promise<StepInstance[]>;
  findByAssigneeId(assigneeId: number): Promise<StepInstance[]>;
  findByStatus(status: StepStatus): Promise<StepInstance[]>;
  save(stepInstance: StepInstance): Promise<StepInstance>;
  saveMany(stepInstances: StepInstance[]): Promise<StepInstance[]>;
  update(stepInstance: StepInstance): Promise<StepInstance>;
  updateMany(stepInstances: StepInstance[]): Promise<StepInstance[]>;
  delete(id: number): Promise<void>;
  findOverdue(): Promise<StepInstance[]>;
  findUpcoming(days: number): Promise<StepInstance[]>;
}