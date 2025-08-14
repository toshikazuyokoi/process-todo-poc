import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsersService } from '../../users/users.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    const teamId = request.params?.teamId || request.body?.teamId || request.query?.teamId;

    for (const permission of requiredPermissions) {
      const [resource, action] = permission.split(':');
      const hasPermission = await this.usersService.hasPermission(
        user.id,
        resource,
        action,
        teamId ? parseInt(teamId) : undefined,
      );

      if (!hasPermission) {
        return false;
      }
    }

    return true;
  }
}