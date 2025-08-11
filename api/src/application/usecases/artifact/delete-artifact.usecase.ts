import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { IArtifactRepository } from '@domain/repositories/artifact.repository.interface';
import { StorageService } from '@infrastructure/storage/storage.service';

@Injectable()
export class DeleteArtifactUseCase {
  constructor(
    @Inject('IArtifactRepository')
    private readonly artifactRepository: IArtifactRepository,
    private readonly storageService: StorageService,
  ) {}

  async execute(id: number, userId: number): Promise<void> {
    const artifact = await this.artifactRepository.findById(id);
    
    if (!artifact) {
      throw new NotFoundException(`Artifact with ID ${id} not found`);
    }

    // Check if user can delete (for MVP, only uploader can delete)
    if (artifact.getUploadedBy() !== userId) {
      throw new ForbiddenException('You can only delete artifacts you uploaded');
    }

    // Delete file from storage
    try {
      await this.storageService.deleteFile(artifact.getS3Key());
    } catch (error) {
      console.error('Failed to delete file from storage:', error);
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database
    await this.artifactRepository.delete(id);
  }
}