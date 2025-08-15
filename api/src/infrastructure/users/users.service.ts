import { Injectable } from '@nestjs/common';
import { PrismaClient, User } from '@prisma/client';

@Injectable()
export class UsersService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findAll(): Promise<Omit<User, 'password'>[]> {
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
    });
    
    // Remove password from each user
    return users.map(({ password, ...user }) => user);
  }

  async update(id: number, data: Partial<User>): Promise<User> {
    // Remove sensitive fields that shouldn't be updated directly
    const { password, ...safeData } = data;
    
    return this.prisma.user.update({
      where: { id },
      data: safeData,
    });
  }

  async delete(id: number): Promise<void> {
    // Soft delete - just mark as inactive
    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getUserWithRoles(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
            team: true,
          },
        },
        teamMembers: {
          include: {
            team: {
              include: {
                organization: true,
              },
            },
          },
        },
      },
    });
  }

  async getUserPermissions(userId: number, teamId?: number): Promise<string[]> {
    const user = await this.getUserWithRoles(userId);
    
    if (!user) {
      return [];
    }

    const permissions = new Set<string>();

    // Get permissions from all roles
    for (const userRole of user.userRoles) {
      // If teamId is specified, only get permissions for that team
      if (teamId && userRole.teamId !== teamId) {
        continue;
      }

      for (const rolePerm of userRole.role.rolePermissions) {
        const perm = `${rolePerm.permission.resource}:${rolePerm.permission.action}`;
        permissions.add(perm);
      }
    }

    return Array.from(permissions);
  }

  async hasPermission(
    userId: number,
    resource: string,
    action: string,
    teamId?: number,
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId, teamId);
    const requiredPermission = `${resource}:${action}`;
    
    return permissions.includes(requiredPermission) || permissions.includes('*:*');
  }
}