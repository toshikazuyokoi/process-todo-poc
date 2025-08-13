'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { NotificationBell } from '@/app/components/notifications/notification-bell'
import { Button } from '@/app/components/ui/button'
import { Home, FileText, BarChart3, Users, Settings, Search, CalendarDays, Columns } from 'lucide-react'

export function Header() {
  const router = useRouter()
  // TODO: Get actual logged-in user ID from auth context
  // For now, using user ID 13 (管理者) which exists in the database
  const userId = 13
  const userName = '管理者'

  return (
    <header className="bg-white border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold text-gray-900">
              Process Todo
            </Link>
            
            <nav className="flex gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <Home className="w-4 h-4" />
                ホーム
              </Link>
              <Link
                href="/cases"
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <FileText className="w-4 h-4" />
                案件
              </Link>
              <Link
                href="/calendar"
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <CalendarDays className="w-4 h-4" />
                カレンダー
              </Link>
              <Link
                href="/kanban"
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <Columns className="w-4 h-4" />
                カンバン
              </Link>
              <Link
                href="/gantt"
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                ガントチャート
              </Link>
              <Link
                href="/templates"
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <FileText className="w-4 h-4" />
                テンプレート
              </Link>
              <Link
                href="/search"
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <Search className="w-4 h-4" />
                検索
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <NotificationBell userId={userId} />
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-gray-600" />
              </div>
              <span className="text-sm text-gray-700">{userName}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}