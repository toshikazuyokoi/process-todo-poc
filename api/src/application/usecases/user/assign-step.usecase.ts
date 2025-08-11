import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { IStepInstanceRepository } from '@domain/repositories/step-instance.repository.interface';
import { StepInstance } from '@domain/entities/step-instance';

export class AssignStepDto {
  stepId: number;
  userId: number | null; // null to unassign
}

@Injectable()
export class AssignStepUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('IStepInstanceRepository')
    private readonly stepRepository: IStepInstanceRepository,
  ) {}

  async execute(dto: AssignStepDto): Promise<StepInstance> {
    // Find step
    const step = await this.stepRepository.findById(dto.stepId);
    if (!step) {
      throw new NotFoundException(`Step with ID ${dto.stepId} not found`);
    }

    // If assigning a user, verify they exist
    if (dto.userId !== null) {
      const user = await this.userRepository.findById(dto.userId);
      if (!user) {
        throw new NotFoundException(`User with ID ${dto.userId} not found`);
      }
    }

    // Update assignee
    step.setAssigneeId(dto.userId);

    // Save changes
    return await this.stepRepository.save(step);
  }
}