'use client';

import React from 'react';
import { QueryProvider } from '@/app/providers/query-provider';
import { WebSocketWrapper } from '@/app/providers/websocket-wrapper';
import { GlobalShortcutsProvider } from '@/app/components/shortcuts/global-shortcuts-provider';
import { AuthProvider } from '@/app/contexts/auth-context';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <WebSocketWrapper>
          <GlobalShortcutsProvider>
            {children}
          </GlobalShortcutsProvider>
        </WebSocketWrapper>
      </AuthProvider>
    </QueryProvider>
  );
}