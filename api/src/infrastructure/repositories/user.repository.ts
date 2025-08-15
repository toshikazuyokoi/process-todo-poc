import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, UserRole } from '@domain/entities/user';
import { IUserRepository } from '@domain/repositories/user.repository.interface';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<User | null> {
    const data = await this.prisma.user.findUnique({
      where: { id },
    });

    return data ? this.toDomain(data) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const data = await this.prisma.user.findUnique({
      where: { email },
    });

    return data ? this.toDomain(data) : null;
  }

  async findByRole(role: UserRole): Promise<User[]> {
    const data = await this.prisma.user.findMany({
      where: { role },
    });

    return data.map((d) => this.toDomain(d));
  }

  async findAll(): Promise<User[]> {
    const data = await this.prisma.user.findMany();
    return data.map((d) => this.toDomain(d));
  }

  async save(user: User): Promise<User> {
    // Note: This method is not currently used for auth users.
    // Auth user creation is handled by AuthService with password hashing.
    throw new Error('Use AuthService for creating users with passwords');
  }

  async update(user: User): Promise<User> {
    const id = user.getId();
    if (!id) {
      throw new Error('Cannot update user without ID');
    }

    const email = user.getEmail();
    if (!email) {
      throw new Error('Email is required for user');
    }
    const data = await this.prisma.user.update({
      where: { id },
      data: {
        name: user.getName(),
        email: email,
        role: user.getRole(),
        timezone: user.getTimezone(),
      },
    });

    return this.toDomain(data);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    });
  }

  private toDomain(data: any): User {
    return new User({
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      timezone: data.timezone,
    });
  }
}