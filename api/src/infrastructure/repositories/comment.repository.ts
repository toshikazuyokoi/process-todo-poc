import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Comment } from '@domain/entities/comment';
import { ICommentRepository } from '@domain/repositories/comment.repository.interface';

@Injectable()
export class CommentRepository implements ICommentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<Comment | null> {
    const data = await this.prisma.comment.findUnique({
      where: { id },
      include: {
        replies: true,
      },
    });

    return data ? this.toDomain(data) : null;
  }

  async findByStepId(stepId: number): Promise<Comment[]> {
    const data = await this.prisma.comment.findMany({
      where: { 
        stepId,
        parentId: null, // Only get top-level comments
      },
      include: {
        replies: {
          include: {
            replies: true, // Include nested replies
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return data.map((d) => this.toDomainWithReplies(d));
  }

  async findByUserId(userId: number): Promise<Comment[]> {
    const data = await this.prisma.comment.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return data.map((d) => this.toDomain(d));
  }

  async findByParentId(parentId: number): Promise<Comment[]> {
    const data = await this.prisma.comment.findMany({
      where: { parentId },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return data.map((d) => this.toDomain(d));
  }

  async save(comment: Comment): Promise<Comment> {
    const id = comment.getId();
    
    if (id) {
      // Update existing comment
      const data = await this.prisma.comment.update({
        where: { id },
        data: {
          content: comment.getContent(),
          updatedAt: new Date(),
        },
      });
      return this.toDomain(data);
    } else {
      // Create new comment
      const data = await this.prisma.comment.create({
        data: {
          stepId: comment.getStepId(),
          parentId: comment.getParentId(),
          userId: comment.getUserId(),
          content: comment.getContent(),
        },
      });
      return this.toDomain(data);
    }
  }

  async update(comment: Comment): Promise<Comment> {
    const id = comment.getId();
    if (!id) {
      throw new Error('Cannot update comment without ID');
    }

    const data = await this.prisma.comment.update({
      where: { id },
      data: {
        content: comment.getContent(),
        updatedAt: new Date(),
      },
    });

    return this.toDomain(data);
  }

  async delete(id: number): Promise<void> {
    // Delete replies first (cascade)
    await this.prisma.comment.deleteMany({
      where: { parentId: id },
    });
    
    // Then delete the comment
    await this.prisma.comment.delete({
      where: { id },
    });
  }

  async countByStepIds(stepIds: number[]): Promise<Map<number, number>> {
    if (stepIds.length === 0) {
      return new Map<number, number>();
    }

    const counts = await this.prisma.comment.groupBy({
      by: ['stepId'],
      where: {
        stepId: {
          in: stepIds,
        },
      },
      _count: {
        id: true,
      },
    });

    const countMap = new Map<number, number>();
    counts.forEach(count => {
      countMap.set(count.stepId, count._count.id);
    });
    
    // Ensure all stepIds have an entry (0 if no comments)
    stepIds.forEach(stepId => {
      if (!countMap.has(stepId)) {
        countMap.set(stepId, 0);
      }
    });

    return countMap;
  }

  private toDomain(data: any): Comment {
    return new Comment({
      id: data.id,
      stepId: data.stepId,
      parentId: data.parentId,
      userId: data.userId,
      content: data.content,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  private toDomainWithReplies(data: any): Comment {
    const comment = this.toDomain(data);
    
    if (data.replies && data.replies.length > 0) {
      const replies = data.replies.map((r: any) => this.toDomainWithReplies(r));
      comment.setReplies(replies);
    }
    
    return comment;
  }
}