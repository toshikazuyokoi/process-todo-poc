import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI エージェント | Process Todo',
  description: 'AIアシスタントによるプロセステンプレート生成',
}

export default function AIAgentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
}