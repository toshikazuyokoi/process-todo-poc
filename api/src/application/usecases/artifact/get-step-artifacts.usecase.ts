import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { IArtifactRepository } from '@domain/repositories/artifact.repository.interface';
import { IStepInstanceRepository } from '@domain/repositories/step-instance.repository.interface';
import { StorageService } from '@infrastructure/storage/storage.service';
import { ArtifactResponseDto } from './upload-artifact.usecase';

@Injectable()
export class GetStepArtifactsUseCase {
  constructor(
    @Inject('IArtifactRepository')
    private readonly artifactRepository: IArtifactRepository,
    @Inject('IStepInstanceRepository')
    private readonly stepInstanceRepository: IStepInstanceRepository,
    private readonly storageService: StorageService,
  ) {}

  async execute(stepId: number): Promise<ArtifactResponseDto[]> {
    // Validate step exists
    const step = await this.stepInstanceRepository.findById(stepId);
    if (!step) {
      throw new NotFoundException(`Step with ID ${stepId} not found`);
    }

    // Get all artifacts for the step
    const artifacts = await this.artifactRepository.findByStepId(stepId);

    return artifacts.map((artifact) => ({
      id: artifact.getId()!,
      stepId: artifact.getStepId(),
      kind: artifact.getKind(),
      fileName: artifact.getFileName(),
      fileSize: artifact.getFileSize(),
      mimeType: artifact.getMimeType(),
      url: this.storageService.getFileUrl(artifact.getS3Key()),
      required: artifact.isRequired(),
      uploadedBy: artifact.getUploadedBy(),
      uploadedAt: artifact.getUploadedAt(),
      createdAt: artifact.getCreatedAt(),
      updatedAt: artifact.getUpdatedAt(),
    }));
  }
}