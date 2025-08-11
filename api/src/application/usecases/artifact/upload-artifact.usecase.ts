import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { Artifact } from '@domain/entities/artifact';
import { IArtifactRepository } from '@domain/repositories/artifact.repository.interface';
import { IStepInstanceRepository } from '@domain/repositories/step-instance.repository.interface';
import { StorageService } from '@infrastructure/storage/storage.service';

export interface UploadArtifactDto {
  stepId: number;
  kind: string;
  required: boolean;
  uploadedBy: number;
  file: Express.Multer.File;
}

export interface ArtifactResponseDto {
  id: number;
  stepId: number;
  kind: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  required: boolean;
  uploadedBy: number | null;
  uploadedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UploadArtifactUseCase {
  constructor(
    @Inject('IArtifactRepository')
    private readonly artifactRepository: IArtifactRepository,
    @Inject('IStepInstanceRepository')
    private readonly stepInstanceRepository: IStepInstanceRepository,
    private readonly storageService: StorageService,
  ) {}

  async execute(dto: UploadArtifactDto): Promise<ArtifactResponseDto> {
    // Validate step exists
    const step = await this.stepInstanceRepository.findById(dto.stepId);
    if (!step) {
      throw new NotFoundException(`Step with ID ${dto.stepId} not found`);
    }

    // Validate file size (max 10MB for MVP)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (dto.file.size > maxSize) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    // Validate file type
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ];

    if (!allowedMimeTypes.includes(dto.file.mimetype)) {
      throw new BadRequestException('File type not allowed');
    }

    // Upload file to storage
    const uploadResult = await this.storageService.uploadFile(
      dto.file,
      `artifacts/step-${dto.stepId}`,
    );

    // Create artifact entity
    const artifact = new Artifact(
      null,
      dto.stepId,
      dto.kind,
      dto.file.originalname,
      dto.file.size,
      dto.file.mimetype,
      uploadResult.key,
      dto.required,
      dto.uploadedBy,
      new Date(),
      new Date(),
      new Date(),
    );

    // Save artifact to database
    const savedArtifact = await this.artifactRepository.save(artifact);

    return this.toResponseDto(savedArtifact);
  }

  private toResponseDto(artifact: Artifact): ArtifactResponseDto {
    return {
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
    };
  }
}