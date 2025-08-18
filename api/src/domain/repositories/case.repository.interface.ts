import { Case } from '../entities/case';
import { CaseStatus } from '../values/case-status';

export interface ICaseRepository {
  findById(id: number): Promise<Case | null>;
  findAll(status?: CaseStatus): Promise<Case[]>;
  findAllWithStepInstances(status?: CaseStatus): Promise<Case[]>;
  findByProcessId(processId: number): Promise<Case[]>;
  findByUserId(userId: number): Promise<Case[]>;
  save(caseEntity: Case): Promise<Case>;
  update(caseEntity: Case): Promise<Case>;
  delete(id: number): Promise<void>;
  findWithStepInstances(id: number): Promise<Case | null>;
  findUpcoming(days: number): Promise<Case[]>;
  findOverdue(): Promise<Case[]>;
}