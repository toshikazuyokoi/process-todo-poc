import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  __esModule: true,
  default: {
    compare: jest.fn(),
    hash: jest.fn(),
  },
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    password: '$2b$10$hashedpassword',
    role: 'member',
    isActive: true,
    emailVerified: true,
    emailVerifiedAt: new Date(),
    lastLoginAt: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    timezone: 'Asia/Tokyo',
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockPrismaClient = {
    user: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    organization: {
      create: jest.fn(),
    },
    team: {
      create: jest.fn(),
    },
    teamMember: {
      create: jest.fn(),
    },
    role: {
      findFirst: jest.fn(),
    },
    userRole: {
      create: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);

    // Mock Prisma client
    (service as any).prisma = mockPrismaClient;

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as unknown as jest.Mock).mockResolvedValue(true);
      mockPrismaClient.user.update.mockResolvedValue(mockUser);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toEqual(mockUser);
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(bcrypt.compare).toHaveBeenCalledWith('password', mockUser.password);
    });

    it('should return null when user not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toBeNull();
    });

    it('should return null when user is inactive', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      mockUsersService.findByEmail.mockResolvedValue(inactiveUser);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toBeNull();
    });

    it('should throw when account is locked', async () => {
      const lockedUser = { 
        ...mockUser, 
        lockedUntil: new Date(Date.now() + 3600000) // 1 hour from now
      };
      mockUsersService.findByEmail.mockResolvedValue(lockedUser);

      await expect(
        service.validateUser('test@example.com', 'password')
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should increment failed login attempts on wrong password', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as unknown as jest.Mock).mockResolvedValue(false);
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaClient.user.update.mockResolvedValue(mockUser);

      const result = await service.validateUser('test@example.com', 'wrongpassword');

      expect(result).toBeNull();
      expect(mockPrismaClient.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUser.id },
          data: expect.objectContaining({
            failedLoginAttempts: 1,
          }),
        })
      );
    });
  });

  describe('login', () => {
    it('should return tokens and user data', async () => {
      const mockToken = 'mock-jwt-token';
      const mockRefreshToken = 'mock-refresh-token';
      
      mockJwtService.sign.mockReturnValue(mockToken);
      mockPrismaClient.refreshToken.create.mockResolvedValue({
        id: 1,
        token: mockRefreshToken,
      });

      const result = await service.login(mockUser);

      expect(result).toHaveProperty('accessToken', mockToken);
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
      });
    });
  });

  describe('signup', () => {
    const signupDto = {
      email: 'new@example.com',
      password: 'Password123!',
      name: 'New User',
    };

    it('should create new user successfully', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as unknown as jest.Mock).mockResolvedValue('hashedpassword');
      
      const newUser = { ...mockUser, ...signupDto, id: 2 };
      mockPrismaClient.user.create.mockResolvedValue(newUser);
      mockPrismaClient.organization.create.mockResolvedValue({ id: 1 });
      mockPrismaClient.team.create.mockResolvedValue({ id: 1 });
      mockPrismaClient.teamMember.create.mockResolvedValue({});
      mockPrismaClient.role.findFirst.mockResolvedValue({ id: 1 });
      mockPrismaClient.userRole.create.mockResolvedValue({});
      mockPrismaClient.refreshToken.create.mockResolvedValue({
        token: 'refresh-token',
      });
      mockJwtService.sign.mockReturnValue('access-token');

      const result = await service.signup(signupDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(bcrypt.hash).toHaveBeenCalledWith(signupDto.password, 10);
    });

    it('should throw ConflictException when user already exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      await expect(service.signup(signupDto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for weak password', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.signup({ ...signupDto, password: 'weak' })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('refreshToken', () => {
    it('should return new tokens when refresh token is valid', async () => {
      const mockRefreshToken = 'valid-refresh-token';
      const tokenRecord = {
        id: 1,
        token: mockRefreshToken,
        userId: 1,
        expiresAt: new Date(Date.now() + 86400000), // 1 day from now
        revokedAt: null,
        user: mockUser,
      };

      mockPrismaClient.refreshToken.findUnique.mockResolvedValue(tokenRecord);
      mockPrismaClient.refreshToken.update.mockResolvedValue({});
      mockPrismaClient.refreshToken.create.mockResolvedValue({
        token: 'new-refresh-token',
      });
      mockJwtService.sign.mockReturnValue('new-access-token');

      const result = await service.refreshToken(mockRefreshToken);

      expect(result).toHaveProperty('accessToken', 'new-access-token');
      expect(result).toHaveProperty('refreshToken');
      expect(mockPrismaClient.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: tokenRecord.id },
          data: { revokedAt: expect.any(Date) },
        })
      );
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      mockPrismaClient.refreshToken.findUnique.mockResolvedValue(null);

      await expect(
        service.refreshToken('invalid-token')
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for expired token', async () => {
      const expiredToken = {
        id: 1,
        token: 'expired-token',
        userId: 1,
        expiresAt: new Date(Date.now() - 86400000), // 1 day ago
        revokedAt: null,
        user: mockUser,
      };

      mockPrismaClient.refreshToken.findUnique.mockResolvedValue(expiredToken);

      await expect(
        service.refreshToken('expired-token')
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as unknown as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newhashed');
      mockPrismaClient.user.update.mockResolvedValue({});
      mockPrismaClient.refreshToken.updateMany.mockResolvedValue({});

      await service.changePassword(1, 'oldpassword', 'NewPassword123!');

      expect(mockPrismaClient.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { password: 'newhashed' },
        })
      );
      expect(mockPrismaClient.refreshToken.updateMany).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for wrong old password', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as unknown as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword(1, 'wrongpassword', 'NewPassword123!')
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException for weak new password', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as unknown as jest.Mock).mockResolvedValue(true);

      await expect(
        service.changePassword(1, 'oldpassword', 'weak')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('logout', () => {
    it('should revoke refresh token on logout', async () => {
      mockPrismaClient.refreshToken.updateMany.mockResolvedValue({});

      await service.logout(1, 'refresh-token');

      expect(mockPrismaClient.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            token: 'refresh-token',
            userId: 1,
          },
          data: { revokedAt: expect.any(Date) },
        })
      );
    });
  });
});