import { renderHook } from '@testing-library/react';
import { useRoles } from './useRoles';
import { useAuth } from '../contexts/auth-context';

jest.mock('../contexts/auth-context');

describe('useRoles', () => {
  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('with authenticated admin user', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 1,
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin',
        },
        isAuthenticated: true,
        isLoading: false,
        login: jest.fn(),
        signup: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
      } as any);
    });

    it('should identify admin role correctly', () => {
      const { result } = renderHook(() => useRoles());

      expect(result.current.currentRole).toBe('admin');
      expect(result.current.isAdmin()).toBe(true);
      expect(result.current.isEditor()).toBe(false);
      expect(result.current.isViewer()).toBe(false);
      expect(result.current.isMember()).toBe(false);
    });

    it('should allow edit and view permissions for admin', () => {
      const { result } = renderHook(() => useRoles());

      expect(result.current.canEdit()).toBe(true);
      expect(result.current.canView()).toBe(true);
    });

    it('should correctly check hasRole', () => {
      const { result } = renderHook(() => useRoles());

      expect(result.current.hasRole('admin')).toBe(true);
      expect(result.current.hasRole('editor')).toBe(false);
    });

    it('should correctly check hasAnyRole', () => {
      const { result } = renderHook(() => useRoles());

      expect(result.current.hasAnyRole('admin', 'editor')).toBe(true);
      expect(result.current.hasAnyRole('editor', 'viewer')).toBe(false);
    });
  });

  describe('with authenticated editor user', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 2,
          email: 'editor@example.com',
          name: 'Editor User',
          role: 'editor',
        },
        isAuthenticated: true,
        isLoading: false,
        login: jest.fn(),
        signup: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
      } as any);
    });

    it('should identify editor role correctly', () => {
      const { result } = renderHook(() => useRoles());

      expect(result.current.currentRole).toBe('editor');
      expect(result.current.isAdmin()).toBe(false);
      expect(result.current.isEditor()).toBe(true);
      expect(result.current.isViewer()).toBe(false);
      expect(result.current.isMember()).toBe(false);
    });

    it('should allow edit and view permissions for editor', () => {
      const { result } = renderHook(() => useRoles());

      expect(result.current.canEdit()).toBe(true);
      expect(result.current.canView()).toBe(true);
    });
  });

  describe('with authenticated viewer user', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 3,
          email: 'viewer@example.com',
          name: 'Viewer User',
          role: 'viewer',
        },
        isAuthenticated: true,
        isLoading: false,
        login: jest.fn(),
        signup: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
      } as any);
    });

    it('should identify viewer role correctly', () => {
      const { result } = renderHook(() => useRoles());

      expect(result.current.currentRole).toBe('viewer');
      expect(result.current.isAdmin()).toBe(false);
      expect(result.current.isEditor()).toBe(false);
      expect(result.current.isViewer()).toBe(true);
      expect(result.current.isMember()).toBe(false);
    });

    it('should only allow view permission for viewer', () => {
      const { result } = renderHook(() => useRoles());

      expect(result.current.canEdit()).toBe(false);
      expect(result.current.canView()).toBe(true);
    });
  });

  describe('with unauthenticated user', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: jest.fn(),
        signup: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
      } as any);
    });

    it('should have no role', () => {
      const { result } = renderHook(() => useRoles());

      expect(result.current.currentRole).toBeUndefined();
      expect(result.current.isAdmin()).toBe(false);
      expect(result.current.isEditor()).toBe(false);
      expect(result.current.isViewer()).toBe(false);
      expect(result.current.isMember()).toBe(false);
    });

    it('should not have any permissions', () => {
      const { result } = renderHook(() => useRoles());

      expect(result.current.canEdit()).toBe(false);
      expect(result.current.canView()).toBe(false);
    });

    it('should return false for all role checks', () => {
      const { result } = renderHook(() => useRoles());

      expect(result.current.hasRole('admin')).toBe(false);
      expect(result.current.hasAnyRole('admin', 'editor', 'viewer')).toBe(false);
    });
  });
});