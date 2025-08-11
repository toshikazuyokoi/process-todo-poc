import { Injectable, ConflictException, Inject } from '@nestjs/common';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { User } from '@domain/entities/user';

export class CreateUserDto {
  name: string;
  email?: string;
  role?: string;
  timezone?: string;
}

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(dto: CreateUserDto): Promise<User> {
    // Check if email already exists
    if (dto.email) {
      const existingUser = await this.userRepository.findByEmail(dto.email);
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }
    }

    // Create new user entity
    const user = new User({
      name: dto.name,
      email: dto.email,
      role: dto.role || 'member',
      timezone: dto.timezone || 'Asia/Tokyo',
    });

    // Save to repository
    return await this.userRepository.save(user);
  }
}