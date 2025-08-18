import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IStepInstanceRepository } from '@domain/repositories/step-instance.repository.interface';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { StepResponseDto } from '@application/dto/step/step-response.dto';
import { GetStepDto } from '@application/dto/step/get-step.dto';
import { StepResponseMapper } from '@application/services/step-response.mapper';

@Injectable()
export class GetStepByIdUseCase {
  constructor(
    @Inject('IStepInstanceRepository')
    private readonly stepRepository: IStepInstanceRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly stepResponseMapper: StepResponseMapper,
  ) {}

  async execute(dto: GetStepDto): Promise<StepResponseDto> {
    const step = await this.stepRepository.findById(dto.stepId);
    
    if (!step) {
      throw new NotFoundException(`Step with ID ${dto.stepId} not found`);
    }

    // Get assignee name if assigned
    let assigneeName: string | undefined;
    if (step.getAssigneeId()) {
      const user = await this.userRepository.findById(step.getAssigneeId()!);
      assigneeName = user?.getName();
    }

    return this.stepResponseMapper.toResponseDto(step, assigneeName);
  }
}