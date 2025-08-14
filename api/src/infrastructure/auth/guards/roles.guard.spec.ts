import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
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
      };

      mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as any;
    });

    it('should allow access when no roles are required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const result = guard.canActivate(mockExecutionContext);
      expect(result).toBe(true);
    });

    it('should allow access when empty roles array is required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

      const result = guard.canActivate(mockExecutionContext);
      expect(result).toBe(true);
    });

    it('should allow access when user has required role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['member', 'admin']);
      
      const result = guard.canActivate(mockExecutionContext);
      expect(result).toBe(true);
    });

    it('should deny access when user does not have required role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin', 'editor']);
      
      const result = guard.canActivate(mockExecutionContext);
      expect(result).toBe(false);
    });

    it('should deny access when user is not authenticated', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['member']);
      mockRequest.user = null;
      
      const result = guard.canActivate(mockExecutionContext);
      expect(result).toBe(false);
    });

    it('should check admin role correctly', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
      mockRequest.user.role = 'admin';
      
      const result = guard.canActivate(mockExecutionContext);
      expect(result).toBe(true);
    });
  });
});