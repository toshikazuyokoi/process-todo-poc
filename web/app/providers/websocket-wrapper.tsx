'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// WebSocketProviderを動的インポート（SSR無効化）
const DynamicWebSocketProvider = dynamic(
  () => import('@/app/contexts/websocket-context').then(mod => mod.WebSocketProvider),
  { 
    ssr: false,
    loading: () => null 
  }
);

export function WebSocketWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // クライアントサイドでマウントされた後のみWebSocketProviderをレンダリング
  if (!mounted) {
    return <>{children}</>;
  }

  return <DynamicWebSocketProvider>{children}</DynamicWebSocketProvider>;
}