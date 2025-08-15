'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WebSocketWrapper } from '@/app/providers/websocket-wrapper';
import { GlobalShortcutsProvider } from '@/app/components/shortcuts/global-shortcuts-provider';
import { AuthProvider } from '@/app/contexts/auth-context';

// QueryClientのインスタンスを作成
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1分
      retry: 1,
    },
  },
});

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WebSocketWrapper>
          <GlobalShortcutsProvider>
            {children}
          </GlobalShortcutsProvider>
        </WebSocketWrapper>
      </AuthProvider>
    </QueryClientProvider>
  );
}