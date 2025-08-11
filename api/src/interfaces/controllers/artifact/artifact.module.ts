import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ArtifactController } from './artifact.controller';
import { UploadArtifactUseCase } from '@application/usecases/artifact/upload-artifact.usecase';
import { DeleteArtifactUseCase } from '@application/usecases/artifact/delete-artifact.usecase';
import { GetStepArtifactsUseCase } from '@application/usecases/artifact/get-step-artifacts.usecase';
import { ArtifactRepository } from '@infrastructure/repositories/artifact.repository';
import { StorageService } from '@infrastructure/storage/storage.service';
import { InfrastructureModule } from '@infrastructure/infrastructure.module';
import { memoryStorage } from 'multer';

@Module({
  imports: [
    InfrastructureModule,
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  ],
  controllers: [ArtifactController],
  providers: [
    UploadArtifactUseCase,
    DeleteArtifactUseCase,
    GetStepArtifactsUseCase,
    StorageService,
    {
      provide: 'IArtifactRepository',
      useClass: ArtifactRepository,
    },
  ],
  exports: [
    UploadArtifactUseCase,
    DeleteArtifactUseCase,
    GetStepArtifactsUseCase,
  ],
})
export class ArtifactModule {}