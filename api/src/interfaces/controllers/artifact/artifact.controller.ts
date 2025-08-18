import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UploadArtifactUseCase } from '@application/usecases/artifact/upload-artifact.usecase';
import { DeleteArtifactUseCase } from '@application/usecases/artifact/delete-artifact.usecase';
import { GetStepArtifactsUseCase } from '@application/usecases/artifact/get-step-artifacts.usecase';
import { JwtAuthGuard } from '@infrastructure/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@infrastructure/auth/decorators/current-user.decorator';

@ApiTags('artifacts')
@ApiBearerAuth()
@Controller('artifacts')
@UseGuards(JwtAuthGuard)
export class ArtifactController {
  constructor(
    private readonly uploadArtifactUseCase: UploadArtifactUseCase,
    private readonly deleteArtifactUseCase: DeleteArtifactUseCase,
    private readonly getStepArtifactsUseCase: GetStepArtifactsUseCase,
  ) {}

  @Post('steps/:stepId')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload artifact for a step' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        kind: {
          type: 'string',
          example: 'proposal',
        },
        required: {
          type: 'boolean',
          example: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Artifact uploaded successfully',
  })
  async uploadArtifact(
    @Param('stepId', ParseIntPipe) stepId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { kind: string; required?: string },
    @CurrentUser('id') userId: number,
  ) {
    if (!file) {
      throw new Error('File is required');
    }

    return this.uploadArtifactUseCase.execute({
      stepId,
      kind: body.kind || 'document',
      required: body.required === 'true',
      uploadedBy: userId,
      file,
    });
  }

  @Get('steps/:stepId')
  @ApiOperation({ summary: 'Get all artifacts for a step' })
  @ApiResponse({
    status: 200,
    description: 'List of artifacts',
  })
  async getStepArtifacts(@Param('stepId', ParseIntPipe) stepId: number) {
    return this.getStepArtifactsUseCase.execute(stepId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an artifact' })
  @ApiResponse({
    status: 204,
    description: 'Artifact deleted successfully',
  })
  async deleteArtifact(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    await this.deleteArtifactUseCase.execute(id, userId);
  }
}