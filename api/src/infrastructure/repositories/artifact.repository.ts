import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Artifact } from '@domain/entities/artifact';
import { IArtifactRepository } from '@domain/repositories/artifact.repository.interface';

@Injectable()
export class ArtifactRepository implements IArtifactRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<Artifact | null> {
    const data = await this.prisma.artifact.findUnique({
      where: { id },
    });

    return data ? this.toDomain(data) : null;
  }

  async findByStepId(stepId: number): Promise<Artifact[]> {
    const data = await this.prisma.artifact.findMany({
      where: { stepId },
      orderBy: { createdAt: 'desc' },
    });

    return data.map((d) => this.toDomain(d));
  }

  async findRequiredByStepId(stepId: number): Promise<Artifact[]> {
    const data = await this.prisma.artifact.findMany({
      where: {
        stepId,
        required: true,
      },
    });

    return data.map((d) => this.toDomain(d));
  }

  async save(artifact: Artifact): Promise<Artifact> {
    const data = await this.prisma.artifact.create({
      data: {
        stepId: artifact.getStepId(),
        kind: artifact.getKind(),
        fileName: artifact.getFileName(),
        fileSize: artifact.getFileSize(),
        mimeType: artifact.getMimeType(),
        s3Key: artifact.getS3Key(),
        required: artifact.isRequired(),
        uploadedBy: artifact.getUploadedBy(),
        uploadedAt: artifact.getUploadedAt(),
      },
    });

    return this.toDomain(data);
  }

  async update(artifact: Artifact): Promise<Artifact> {
    const id = artifact.getId();
    if (!id) {
      throw new Error('Cannot update artifact without ID');
    }

    const data = await this.prisma.artifact.update({
      where: { id },
      data: {
        kind: artifact.getKind(),
        s3Key: artifact.getS3Key(),
        required: artifact.isRequired(),
      },
    });

    return this.toDomain(data);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.artifact.delete({
      where: { id },
    });
  }

  async countByStepId(stepId: number): Promise<number> {
    return await this.prisma.artifact.count({
      where: { stepId },
    });
  }

  private toDomain(data: any): Artifact {
    return new Artifact(
      data.id,
      data.stepId,
      data.kind,
      data.fileName,
      data.fileSize,
      data.mimeType,
      data.s3Key,
      data.required,
      data.uploadedBy,
      data.uploadedAt,
      data.createdAt,
      data.updatedAt,
    );
  }
}