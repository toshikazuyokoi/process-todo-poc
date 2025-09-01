'use client';

import React from 'react';
import { QueryProvider } from '@/app/providers/query-provider';
import { WebSocketWrapper } from '@/app/providers/websocket-wrapper';
import { GlobalShortcutsProvider } from '@/app/components/shortcuts/global-shortcuts-provider';
import { AuthProvider } from '@/app/contexts/auth-context';
import { ToastProvider } from '@/app/components/ui/toast';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <ToastProvider>
          <WebSocketWrapper>
            <GlobalShortcutsProvider>
              {children}
            </GlobalShortcutsProvider>
          </WebSocketWrapper>
        </ToastProvider>
      </AuthProvider>
    </QueryProvider>
  );
}