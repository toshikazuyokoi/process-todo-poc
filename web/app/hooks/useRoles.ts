import { useAuth } from '../contexts/auth-context';

export type Role = 'admin' | 'editor' | 'viewer' | 'member';

export function useRoles() {
  const { user } = useAuth();

  const hasRole = (role: Role): boolean => {
    return user?.role === role;
  };

  const hasAnyRole = (...roles: Role[]): boolean => {
    return roles.some(role => user?.role === role);
  };

  const isAdmin = () => hasRole('admin');
  const isEditor = () => hasRole('editor');
  const isViewer = () => hasRole('viewer');
  const isMember = () => hasRole('member');

  const canEdit = () => hasAnyRole('admin', 'editor');
  const canView = () => hasAnyRole('admin', 'editor', 'viewer', 'member');

  return {
    currentRole: user?.role as Role | undefined,
    hasRole,
    hasAnyRole,
    isAdmin,
    isEditor,
    isViewer,
    isMember,
    canEdit,
    canView,
  };
}