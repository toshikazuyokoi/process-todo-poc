import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { PermissionsGuard } from './permissions.guard';
import { UsersService } from '../../users/users.service';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;
  let usersService: UsersService;

  const mockUsersService = {
    hasPermission: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);
    reflector = module.get<Reflector>(Reflector);
    usersService = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    let mockExecutionContext: ExecutionContext;
    let mockRequest: any;

    beforeEach(() => {
      mockRequest = {
        user: {
          id: 1,
          email: 'test@example.com',
          role: 'member',
        },
        params: {},
        body: {},
        query: {},
      };

      mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as any;
    });

    it('should allow access when no permissions are required', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const result = await guard.canActivate(mockExecutionContext);
      expect(result).toBe(true);
      expect(mockUsersService.hasPermission).not.toHaveBeenCalled();
    });

    it('should allow access when empty permissions array is required', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

      const result = await guard.canActivate(mockExecutionContext);
      expect(result).toBe(true);
      expect(mockUsersService.hasPermission).not.toHaveBeenCalled();
    });

    it('should allow access when user has required permission', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['templates:read']);
      mockUsersService.hasPermission.mockResolvedValue(true);

      const result = await guard.canActivate(mockExecutionContext);
      expect(result).toBe(true);
      expect(mockUsersService.hasPermission).toHaveBeenCalledWith(
        1,
        'templates',
        'read',
        undefined
      );
    });

    it('should deny access when user does not have required permission', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['templates:delete']);
      mockUsersService.hasPermission.mockResolvedValue(false);

      const result = await guard.canActivate(mockExecutionContext);
      expect(result).toBe(false);
      expect(mockUsersService.hasPermission).toHaveBeenCalledWith(
        1,
        'templates',
        'delete',
        undefined
      );
    });

    it('should check multiple permissions and allow if all are granted', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        'templates:read',
        'templates:update',
      ]);
      mockUsersService.hasPermission.mockResolvedValue(true);

      const result = await guard.canActivate(mockExecutionContext);
      expect(result).toBe(true);
      expect(mockUsersService.hasPermission).toHaveBeenCalledTimes(2);
    });

    it('should deny access if any permission is not granted', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        'templates:read',
        'templates:delete',
      ]);
      mockUsersService.hasPermission
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const result = await guard.canActivate(mockExecutionContext);
      expect(result).toBe(false);
      expect(mockUsersService.hasPermission).toHaveBeenCalledTimes(2);
    });

    it('should use teamId from params when available', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['templates:read']);
      mockRequest.params.teamId = '5';
      mockUsersService.hasPermission.mockResolvedValue(true);

      const result = await guard.canActivate(mockExecutionContext);
      expect(result).toBe(true);
      expect(mockUsersService.hasPermission).toHaveBeenCalledWith(
        1,
        'templates',
        'read',
        5
      );
    });

    it('should use teamId from body when params not available', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['templates:create']);
      mockRequest.body.teamId = 3;
      mockUsersService.hasPermission.mockResolvedValue(true);

      const result = await guard.canActivate(mockExecutionContext);
      expect(result).toBe(true);
      expect(mockUsersService.hasPermission).toHaveBeenCalledWith(
        1,
        'templates',
        'create',
        3
      );
    });

    it('should use teamId from query when params and body not available', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['templates:read']);
      mockRequest.query.teamId = '7';
      mockUsersService.hasPermission.mockResolvedValue(true);

      const result = await guard.canActivate(mockExecutionContext);
      expect(result).toBe(true);
      expect(mockUsersService.hasPermission).toHaveBeenCalledWith(
        1,
        'templates',
        'read',
        7
      );
    });

    it('should deny access when user is not authenticated', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['templates:read']);
      mockRequest.user = null;

      const result = await guard.canActivate(mockExecutionContext);
      expect(result).toBe(false);
      expect(mockUsersService.hasPermission).not.toHaveBeenCalled();
    });
  });
});