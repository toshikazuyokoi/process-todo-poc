import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Header } from '@/app/components/layout/header'
import { GlobalShortcutsProvider } from '@/app/components/shortcuts/global-shortcuts-provider'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Process Todo App',
  description: 'プロセス指向ToDoアプリケーション',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <GlobalShortcutsProvider>
          <Header />
          {children}
        </GlobalShortcutsProvider>
      </body>
    </html>
  )
}