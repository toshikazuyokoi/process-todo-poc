'use client'

import { ChatInterface } from '@/app/ai-agent/components/chat-interface'
import { useSessionManagement } from '@/app/ai-agent/hooks/use-session-management'
import { ErrorBoundary } from '@/app/components/ui/error-boundary'
import { Loader2 } from 'lucide-react'

export default function AIAgentPage() {
  const { 
    currentSession, 
    sessionStatus, 
    isLoading,
    createSession,
    endSession 
  } = useSessionManagement()

  // ローディング状態の処理（プロジェクトの標準パターンに従う）
  if (isLoading && !currentSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">AI エージェント</h1>
          
          <ChatInterface
            sessionId={currentSession?.id}
            className=""
            height="h-[600px]"
          />
        </div>
      </div>
    </ErrorBoundary>
  )
}