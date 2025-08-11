import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { User } from '@domain/entities/user';

export class UpdateUserDto {
  name?: string;
  email?: string;
  role?: string;
  timezone?: string;
}

@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(id: number, dto: UpdateUserDto): Promise<User> {
    // Find user
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Check email uniqueness if changing
    if (dto.email && dto.email !== user.getEmail()) {
      const existingUser = await this.userRepository.findByEmail(dto.email);
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }
    }

    // Update user properties
    if (dto.name !== undefined) user.setName(dto.name);
    if (dto.email !== undefined) user.setEmail(dto.email);
    if (dto.role !== undefined) user.setRole(dto.role);
    if (dto.timezone !== undefined) user.setTimezone(dto.timezone);

    // Save changes
    return await this.userRepository.save(user);
  }
}