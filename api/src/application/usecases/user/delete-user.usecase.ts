import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { IStepInstanceRepository } from '@domain/repositories/step-instance.repository.interface';

@Injectable()
export class DeleteUserUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('IStepInstanceRepository')
    private readonly stepRepository: IStepInstanceRepository,
  ) {}

  async execute(id: number): Promise<void> {
    // Find user
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Check if user has assigned steps
    const assignedSteps = await this.stepRepository.findByAssigneeId(id);
    if (assignedSteps.length > 0) {
      throw new BadRequestException(
        `User cannot be deleted because they have ${assignedSteps.length} assigned steps`,
      );
    }

    // Delete user
    await this.userRepository.delete(id);
  }
}