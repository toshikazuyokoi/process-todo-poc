import { ProcessTemplate } from '../entities/process-template';

export interface IProcessTemplateRepository {
  findById(id: number): Promise<ProcessTemplate | null>;
  findAll(isActive?: boolean): Promise<ProcessTemplate[]>;
  findByName(name: string): Promise<ProcessTemplate | null>;
  save(processTemplate: ProcessTemplate): Promise<ProcessTemplate>;
  update(processTemplate: ProcessTemplate): Promise<ProcessTemplate>;
  delete(id: number): Promise<void>;
  findWithStepTemplates(id: number): Promise<ProcessTemplate | null>;
}