'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/app/lib/api-client'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Select } from '@/app/components/ui/select'
import { 
  Plus, 
  Search,
  Filter,
  Calendar,
  Target,
  CheckCircle,
  Circle,
  XCircle,
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  User
} from 'lucide-react'

interface CaseSearchResult {
  id: number
  title: string
  status: string
  createdById: number | null
  createdByName: string
  goalDate: string
  createdAt: string
  updatedAt: string
}

interface SearchResultsDto {
  cases: CaseSearchResult[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export default function CasesPage() {
  const router = useRouter()
  const [searchResults, setSearchResults] = useState<SearchResultsDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [users, setUsers] = useState<any[]>([])
  const limit = 10

  useEffect(() => {
    fetchUsers()
    searchCases()
  }, [])

  useEffect(() => {
    searchCases()
  }, [currentPage, statusFilter])

  const fetchUsers = async () => {
    try {
      const response = await api.getUsers()
      setUsers(response.data)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

  const searchCases = async () => {
    setLoading(true)
    try {
      const params: any = {
        page: currentPage,
        limit,
      }
      
      if (searchQuery) {
        params.query = searchQuery
      }
      
      if (statusFilter) {
        params.status = statusFilter
      }

      const response = await api.searchCases(params)
      setSearchResults(response.data)
    } catch (error) {
      console.error('Failed to search cases:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    searchCases()
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-500" />
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-gray-400" />
      default:
        return <Circle className="w-5 h-5 text-gray-300" />
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return '完了'
      case 'in_progress':
        return '進行中'
      case 'cancelled':
        return 'キャンセル'
      case 'draft':
        return '下書き'
      default:
        return status
    }
  }

  const getDaysRemaining = (goalDate: string) => {
    const days = Math.ceil((new Date(goalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (days < 0) return { text: `${Math.abs(days)}日超過`, color: 'text-red-600' }
    if (days === 0) return { text: '今日', color: 'text-orange-600' }
    if (days === 1) return { text: '明日', color: 'text-orange-500' }
    if (days <= 7) return { text: `あと${days}日`, color: 'text-yellow-600' }
    return { text: `あと${days}日`, color: 'text-gray-600' }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  if (loading && !searchResults) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-900">
              案件一覧
            </h1>
            <Button onClick={() => router.push('/cases/new')}>
              <Plus className="w-4 h-4 mr-2" />
              新規案件作成
            </Button>
          </div>
          <p className="text-gray-600">
            すべての案件を検索・管理
          </p>
        </div>

        {/* 検索・フィルタ */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="text"
                    placeholder="案件名で検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-48"
                options={[
                  { value: '', label: 'すべてのステータス' },
                  { value: 'draft', label: '下書き' },
                  { value: 'in_progress', label: '進行中' },
                  { value: 'completed', label: '完了' },
                  { value: 'cancelled', label: 'キャンセル' }
                ]}
              />
              <Button type="submit">
                <Search className="w-4 h-4 mr-2" />
                検索
              </Button>
            </div>
          </form>

          {searchResults && (
            <div className="mt-4 text-sm text-gray-600">
              {searchResults.total}件の案件が見つかりました
            </div>
          )}
        </div>

        {/* 案件リスト */}
        <div className="bg-white rounded-lg shadow">
          <div className="divide-y">
            {searchResults?.cases.map((caseItem) => {
              const daysInfo = getDaysRemaining(caseItem.goalDate)
              return (
                <Link
                  key={caseItem.id}
                  href={`/cases/${caseItem.id}`}
                  className="block p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        {getStatusIcon(caseItem.status)}
                        <h3 className="text-lg font-medium">{caseItem.title}</h3>
                        <span className="px-2 py-1 text-xs bg-gray-100 rounded">
                          {getStatusLabel(caseItem.status)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Target className="w-4 h-4" />
                          <span className={daysInfo.color}>
                            {daysInfo.text}
                          </span>
                          <span className="text-gray-400 ml-1">
                            ({formatDate(caseItem.goalDate)})
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>{caseItem.createdByName}</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>作成: {formatDate(caseItem.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
            
            {searchResults?.cases.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                該当する案件が見つかりませんでした
              </div>
            )}
          </div>

          {/* ページネーション */}
          {searchResults && searchResults.totalPages > 1 && (
            <div className="p-4 border-t flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {searchResults.total}件中 {((currentPage - 1) * limit) + 1}-
                {Math.min(currentPage * limit, searchResults.total)}件を表示
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  前へ
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, searchResults.totalPages) }, (_, i) => {
                    const page = i + 1
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    )
                  })}
                </div>
                
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(searchResults.totalPages, p + 1))}
                  disabled={currentPage === searchResults.totalPages}
                >
                  次へ
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}