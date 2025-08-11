import { Injectable, Inject } from '@nestjs/common';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { User } from '@domain/entities/user';

export class GetUsersFilterDto {
  role?: string;
  searchTerm?: string;
}

@Injectable()
export class GetUsersUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(filter?: GetUsersFilterDto): Promise<User[]> {
    if (!filter || (!filter.role && !filter.searchTerm)) {
      return await this.userRepository.findAll();
    }

    // Apply filters
    let users = await this.userRepository.findAll();

    if (filter.role) {
      users = users.filter(user => user.getRole() === filter.role);
    }

    if (filter.searchTerm) {
      const term = filter.searchTerm.toLowerCase();
      users = users.filter(user => {
        const nameMatch = user.getName().toLowerCase().includes(term);
        const email = user.getEmail();
        const emailMatch = email ? email.toLowerCase().includes(term) : false;
        return nameMatch || emailMatch;
      });
    }

    return users;
  }
}