import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from '../../../infrastructure/auth/auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    login: jest.fn(),
    signup: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
    changePassword: jest.fn(),
  };

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    role: 'member',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return auth tokens and user data', async () => {
      const mockRequest = { user: mockUser };
      const mockResponse = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: mockUser,
      };

      mockAuthService.login.mockResolvedValue(mockResponse);

      const result = await controller.login(mockRequest);

      expect(result).toEqual(mockResponse);
      expect(mockAuthService.login).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('signup', () => {
    it('should create new user and return auth tokens', async () => {
      const signupDto = {
        email: 'new@example.com',
        password: 'Password123!',
        name: 'New User',
      };

      const mockResponse = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: { ...mockUser, ...signupDto },
      };

      mockAuthService.signup.mockResolvedValue(mockResponse);

      const result = await controller.signup(signupDto);

      expect(result).toEqual(mockResponse);
      expect(mockAuthService.signup).toHaveBeenCalledWith(signupDto);
    });
  });

  describe('refresh', () => {
    it('should return new auth tokens', async () => {
      const refreshTokenDto = { refreshToken: 'old-refresh-token' };
      const mockResponse = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: mockUser,
      };

      mockAuthService.refreshToken.mockResolvedValue(mockResponse);

      const result = await controller.refresh(refreshTokenDto);

      expect(result).toEqual(mockResponse);
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith('old-refresh-token');
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      const mockRequest = { user: { id: 1 } };
      const body = { refreshToken: 'refresh-token' };

      mockAuthService.logout.mockResolvedValue(undefined);

      await controller.logout(mockRequest, body);

      expect(mockAuthService.logout).toHaveBeenCalledWith(1, 'refresh-token');
    });

    it('should logout without refresh token', async () => {
      const mockRequest = { user: { id: 1 } };
      const body = {};

      mockAuthService.logout.mockResolvedValue(undefined);

      await controller.logout(mockRequest, body);

      expect(mockAuthService.logout).toHaveBeenCalledWith(1, undefined);
    });
  });

  describe('getProfile', () => {
    it('should return current user profile', async () => {
      const mockRequest = { user: mockUser };

      const result = await controller.getProfile(mockRequest);

      expect(result).toEqual(mockUser);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const mockRequest = { user: { id: 1 } };
      const changePasswordDto = {
        oldPassword: 'oldPassword123!',
        newPassword: 'newPassword123!',
      };

      mockAuthService.changePassword.mockResolvedValue(undefined);

      await controller.changePassword(mockRequest, changePasswordDto);

      expect(mockAuthService.changePassword).toHaveBeenCalledWith(
        1,
        changePasswordDto.oldPassword,
        changePasswordDto.newPassword
      );
    });
  });

  describe('validate', () => {
    it('should validate token and return user', async () => {
      const mockRequest = { user: mockUser };

      const result = await controller.validate(mockRequest);

      expect(result).toEqual({
        valid: true,
        user: mockUser,
      });
    });
  });
});