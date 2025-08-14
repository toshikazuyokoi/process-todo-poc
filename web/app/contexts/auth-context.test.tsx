import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { AuthProvider, useAuth } from './auth-context';
import axios from 'axios';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

// Mock dependencies
jest.mock('axios');
jest.mock('js-cookie');
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedCookies = Cookies as jest.Mocked<typeof Cookies>;

describe('AuthContext', () => {
  const mockPush = jest.fn();
  const mockUser = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    role: 'member',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    mockedAxios.get = jest.fn();
    mockedAxios.post = jest.fn();
    mockedAxios.interceptors = {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(() => 1), eject: jest.fn() },
    } as any;
    mockedAxios.defaults = { headers: { common: {} } } as any;
  });

  describe('AuthProvider', () => {
    it('should provide auth context to children', () => {
      const TestComponent = () => {
        const auth = useAuth();
        return <div>{auth.isLoading ? 'Loading' : 'Loaded'}</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByText(/Loading|Loaded/)).toBeInTheDocument();
    });

    it('should throw error when useAuth is used outside provider', () => {
      const TestComponent = () => {
        const auth = useAuth();
        return <div>Test</div>;
      };

      // Suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => render(<TestComponent />)).toThrow(
        'useAuth must be used within an AuthProvider'
      );

      console.error = originalError;
    });
  });

  describe('Token Validation', () => {
    it('should validate token on mount', async () => {
      mockedCookies.get = jest.fn().mockReturnValue('valid-token');
      mockedAxios.get.mockResolvedValue({
        data: { valid: true, user: mockUser },
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle invalid token', async () => {
      mockedCookies.get = jest.fn().mockReturnValue('invalid-token');
      mockedCookies.remove = jest.fn();
      mockedAxios.get.mockRejectedValue(new Error('Invalid token'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(mockedCookies.remove).toHaveBeenCalledWith('accessToken');
      expect(mockedCookies.remove).toHaveBeenCalledWith('refreshToken');
    });
  });

  describe('Login', () => {
    it('should login successfully', async () => {
      mockedCookies.get = jest.fn().mockReturnValue(null);
      mockedCookies.set = jest.fn();
      mockedAxios.post.mockResolvedValue({
        data: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          user: mockUser,
        },
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await act(async () => {
        await result.current.login('test@example.com', 'password');
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        {
          email: 'test@example.com',
          password: 'password',
        }
      );
      expect(mockedCookies.set).toHaveBeenCalledWith(
        'accessToken',
        'access-token',
        expect.any(Object)
      );
      expect(mockedCookies.set).toHaveBeenCalledWith(
        'refreshToken',
        'refresh-token',
        expect.any(Object)
      );
      expect(result.current.user).toEqual(mockUser);
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    it('should handle login error', async () => {
      mockedCookies.get = jest.fn().mockReturnValue(null);
      mockedAxios.post.mockRejectedValue({
        response: { data: { message: 'Invalid credentials' } },
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await expect(
        result.current.login('test@example.com', 'wrong-password')
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('Signup', () => {
    it('should signup successfully', async () => {
      mockedCookies.get = jest.fn().mockReturnValue(null);
      mockedCookies.set = jest.fn();
      mockedAxios.post.mockResolvedValue({
        data: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          user: mockUser,
        },
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await act(async () => {
        await result.current.signup('test@example.com', 'password', 'Test User');
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/auth/signup'),
        {
          email: 'test@example.com',
          password: 'password',
          name: 'Test User',
        }
      );
      expect(result.current.user).toEqual(mockUser);
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('Logout', () => {
    it('should logout successfully', async () => {
      mockedCookies.get = jest.fn()
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      mockedCookies.remove = jest.fn();
      mockedAxios.post.mockResolvedValue({});
      mockedAxios.get.mockResolvedValue({
        data: { valid: true, user: mockUser },
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/auth/logout'),
        { refreshToken: 'refresh-token' }
      );
      expect(mockedCookies.remove).toHaveBeenCalledWith('accessToken');
      expect(mockedCookies.remove).toHaveBeenCalledWith('refreshToken');
      expect(result.current.user).toBeNull();
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  describe('Token Refresh', () => {
    it('should refresh token successfully', async () => {
      mockedCookies.get = jest.fn().mockReturnValue('old-refresh-token');
      mockedCookies.set = jest.fn();
      mockedAxios.post.mockResolvedValue({
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        },
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await act(async () => {
        await result.current.refreshToken();
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/auth/refresh'),
        { refreshToken: 'old-refresh-token' }
      );
      expect(mockedCookies.set).toHaveBeenCalledWith(
        'accessToken',
        'new-access-token',
        expect.any(Object)
      );
      expect(mockedCookies.set).toHaveBeenCalledWith(
        'refreshToken',
        'new-refresh-token',
        expect.any(Object)
      );
    });

    it('should throw error when no refresh token available', async () => {
      mockedCookies.get = jest.fn().mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await expect(result.current.refreshToken()).rejects.toThrow(
        'No refresh token available'
      );
    });
  });
});