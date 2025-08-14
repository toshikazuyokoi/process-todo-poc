'use client';

import React from 'react';
import { WebSocketWrapper } from '@/app/providers/websocket-wrapper';
import { GlobalShortcutsProvider } from '@/app/components/shortcuts/global-shortcuts-provider';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <WebSocketWrapper>
      <GlobalShortcutsProvider>
        {children}
      </GlobalShortcutsProvider>
    </WebSocketWrapper>
  );
}