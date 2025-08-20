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
  FileText,
  Settings,
  Copy,
  Edit,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Tag,
  Clock,
  User,
  Calendar
} from 'lucide-react'

interface TemplateSearchResult {
  id: number
  name: string
  description: string | null
  category: string | null
  tags: string[]
  isActive: boolean
  version: number
  createdById: number | null
  createdByName: string
  createdAt: string
  updatedAt: string
  stepTemplates?: any[]
  cases?: any[]
}

interface SearchResultsDto {
  items: TemplateSearchResult[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export default function TemplatesPage() {
  const router = useRouter()
  const [searchResults, setSearchResults] = useState<SearchResultsDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [activeFilter, setActiveFilter] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [categories, setCategories] = useState<string[]>([])
  const limit = 10

  useEffect(() => {
    fetchCategories()
    searchTemplates()
  }, [])

  useEffect(() => {
    searchTemplates()
  }, [currentPage, categoryFilter, activeFilter])

  const fetchCategories = async () => {
    try {
      const response = await api.getProcessTemplates()
      const uniqueCategories = Array.from(new Set(response.data
        .map((t: any) => t.category)
        .filter((c: string | null) => c !== null)
      )) as string[]
      setCategories(uniqueCategories)
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const searchTemplates = async () => {
    setLoading(true)
    try {
      // テンプレート一覧を取得
      const response = await api.getProcessTemplates()
      let templates = response.data || []
      
      // クライアント側でフィルタリング
      if (searchQuery) {
        templates = templates.filter((t: any) => 
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }
      
      if (categoryFilter) {
        templates = templates.filter((t: any) => t.category === categoryFilter)
      }
      
      if (activeFilter) {
        templates = templates.filter((t: any) => 
          activeFilter === 'active' ? t.isActive !== false : t.isActive === false
        )
      }
      
      // ページネーション（クライアント側）
      const startIndex = (currentPage - 1) * limit
      const endIndex = startIndex + limit
      const paginatedTemplates = templates.slice(startIndex, endIndex)
      
      setSearchResults({
        items: paginatedTemplates,
        total: templates.length,
        page: currentPage,
        limit,
        totalPages: Math.ceil(templates.length / limit),
      })
    } catch (error) {
      console.error('Failed to search templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    searchTemplates()
  }

  const handleDelete = async (templateId: number) => {
    if (!confirm('このテンプレートを削除してもよろしいですか？')) return
    
    try {
      await api.deleteProcessTemplate(templateId)
      searchTemplates()
    } catch (error) {
      console.error('Failed to delete template:', error)
      alert('テンプレートの削除に失敗しました')
    }
  }

  const handleDuplicate = async (templateId: number) => {
    try {
      // TODO: Implement duplicate template API
      // await api.duplicateTemplate(templateId)
      // searchTemplates()
      alert('テンプレート複製機能は未実装です')
    } catch (error) {
      console.error('Failed to duplicate template:', error)
      alert('テンプレートの複製に失敗しました')
    }
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
              テンプレート管理
            </h1>
            <Button onClick={() => router.push('/templates/new')}>
              <Plus className="w-4 h-4 mr-2" />
              新規テンプレート作成
            </Button>
          </div>
          <p className="text-gray-600">
            プロセステンプレートの作成と管理
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
                    placeholder="テンプレート名で検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-48"
                options={[
                  { value: '', label: 'すべてのカテゴリ' },
                  ...categories.map(cat => ({ value: cat, label: cat }))
                ]}
              />
              <Select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                className="w-32"
                options={[
                  { value: '', label: 'すべて' },
                  { value: 'active', label: '有効' },
                  { value: 'inactive', label: '無効' }
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
              {searchResults.total}件のテンプレートが見つかりました
            </div>
          )}
        </div>

        {/* テンプレートグリッド */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {searchResults?.items?.map((template) => (
            <div key={template.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">
                      {template.name}
                    </h3>
                    {template.category && (
                      <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                        {template.category}
                      </span>
                    )}
                  </div>
                  <div className={`px-2 py-1 text-xs rounded ${
                    template.isActive 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {template.isActive ? '有効' : '無効'}
                  </div>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {template.description || '説明なし'}
                </p>

                {/* タグ */}
                {template.tags && template.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {template.tags.map((tag, index) => (
                      <span key={index} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                        <Tag className="w-3 h-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* 統計情報 */}
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <div className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    <span>{template.stepTemplates?.length || 0}ステップ</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Copy className="w-4 h-4" />
                    <span>{template.cases?.length || 0}案件</span>
                  </div>
                </div>

                {/* メタ情報 */}
                <div className="text-xs text-gray-400 mb-4">
                  <div className="flex items-center gap-1 mb-1">
                    <User className="w-3 h-3" />
                    {template.createdByName}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(template.updatedAt)}更新
                  </div>
                </div>

                {/* アクション */}
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(`/templates/${template.id}`)}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    編集
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDuplicate(template.id)}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(template.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {searchResults?.items?.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>該当するテンプレートが見つかりませんでした</p>
          </div>
        )}

        {/* ページネーション */}
        {searchResults && searchResults.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center">
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
  )
}