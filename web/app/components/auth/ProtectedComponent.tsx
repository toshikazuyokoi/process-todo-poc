'use client';

import React from 'react';
import { useRoles } from '@/app/hooks/useRoles';
import { usePermissions } from '@/app/hooks/usePermissions';

interface ProtectedComponentProps {
  children: React.ReactNode;
  roles?: string[];
  permissions?: string[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
}

export function ProtectedComponent({
  children,
  roles,
  permissions,
  requireAll = false,
  fallback = null,
}: ProtectedComponentProps) {
  const { hasAnyRole } = useRoles();
  const { hasAnyPermission, hasAllPermissions } = usePermissions();

  let hasAccess = true;

  if (roles && roles.length > 0) {
    hasAccess = hasAnyRole(...(roles as any));
  }

  if (hasAccess && permissions && permissions.length > 0) {
    if (requireAll) {
      hasAccess = hasAllPermissions(...permissions);
    } else {
      hasAccess = hasAnyPermission(...permissions);
    }
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}