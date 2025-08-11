import { Comment } from '../entities/comment';

export interface ICommentRepository {
  findById(id: number): Promise<Comment | null>;
  findByStepId(stepId: number): Promise<Comment[]>;
  findByUserId(userId: number): Promise<Comment[]>;
  findByParentId(parentId: number): Promise<Comment[]>;
  save(comment: Comment): Promise<Comment>;
  update(comment: Comment): Promise<Comment>;
  delete(id: number): Promise<void>;
}