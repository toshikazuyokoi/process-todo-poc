import { Artifact } from '../entities/artifact';

export interface IArtifactRepository {
  findById(id: number): Promise<Artifact | null>;
  findByStepId(stepId: number): Promise<Artifact[]>;
  save(artifact: Artifact): Promise<Artifact>;
  update(artifact: Artifact): Promise<Artifact>;
  delete(id: number): Promise<void>;
  findRequiredByStepId(stepId: number): Promise<Artifact[]>;
  countByStepId(stepId: number): Promise<number>;
}