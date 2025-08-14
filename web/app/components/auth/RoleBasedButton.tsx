'use client';

import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { useRoles } from '@/app/hooks/useRoles';
import { usePermissions } from '@/app/hooks/usePermissions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface RoleBasedButtonProps extends ButtonProps {
  roles?: string[];
  permissions?: string[];
  requireAll?: boolean;
  disabledTooltip?: string;
}

export function RoleBasedButton({
  roles,
  permissions,
  requireAll = false,
  disabledTooltip = '権限がありません',
  children,
  ...buttonProps
}: RoleBasedButtonProps) {
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

  const button = (
    <Button {...buttonProps} disabled={!hasAccess || buttonProps.disabled}>
      {children}
    </Button>
  );

  if (!hasAccess) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>
            <p>{disabledTooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
}