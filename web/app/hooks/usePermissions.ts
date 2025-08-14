import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/auth-context';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Permission {
  resource: string;
  action: string;
}

export function usePermissions(teamId?: number) {
  const { user, isAuthenticated } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!isAuthenticated || !user) {
        setPermissions([]);
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/users/${user.id}/permissions`, {
          params: teamId ? { teamId } : undefined,
        });
        setPermissions(response.data);
      } catch (error) {
        console.error('Failed to fetch permissions:', error);
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [isAuthenticated, user, teamId]);

  const hasPermission = (resource: string, action: string): boolean => {
    const permission = `${resource}:${action}`;
    return permissions.includes(permission) || permissions.includes('*:*');
  };

  const hasAnyPermission = (...perms: string[]): boolean => {
    return perms.some(perm => permissions.includes(perm));
  };

  const hasAllPermissions = (...perms: string[]): boolean => {
    return perms.every(perm => permissions.includes(perm));
  };

  const canCreate = (resource: string) => hasPermission(resource, 'create');
  const canRead = (resource: string) => hasPermission(resource, 'read');
  const canUpdate = (resource: string) => hasPermission(resource, 'update');
  const canDelete = (resource: string) => hasPermission(resource, 'delete');

  return {
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canCreate,
    canRead,
    canUpdate,
    canDelete,
  };
}