'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/app/lib/api-client'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Select } from '@/app/components/ui/select'
import { 
  Search,
  Filter,
  Calendar,
  Target,
  CheckCircle,
  Circle,
  XCircle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  FileText,
  User,
  Tag,
  X
} from 'lucide-react'

interface AdvancedSearchResults {
  cases: any[]
  templates: any[]
  steps: any[]
  total: number
}

interface SearchFilters {
  query: string
  type: 'all' | 'cases' | 'templates' | 'steps'
  status?: string
  createdBy?: number
  dateFrom?: string
  dateTo?: string
  tags?: string[]
  category?: string
}

export default function AdvancedSearchPage() {
  const router = useRouter()
  const [searchResults, setSearchResults] = useState<AdvancedSearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    type: 'all'
  })
  const [users, setUsers] = useState<any[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    fetchUsers()
    fetchCategories()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await api.getUsers()
      setUsers(response.data)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await api.getTemplates()
      const uniqueCategories = [...new Set(response.data
        .map((t: any) => t.category)
        .filter((c: string | null) => c !== null)
      )] as string[]
      setCategories(uniqueCategories)
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!filters.query && !showAdvanced) return

    setLoading(true)
    try {
      const results: AdvancedSearchResults = {
        cases: [],
        templates: [],
        steps: [],
        total: 0
      }

      // Search cases
      if (filters.type === 'all' || filters.type === 'cases') {
        const caseParams: any = { query: filters.query }
        if (filters.status) caseParams.status = filters.status
        if (filters.createdBy) caseParams.createdBy = filters.createdBy
        if (filters.dateFrom) caseParams.dateFrom = filters.dateFrom
        if (filters.dateTo) caseParams.dateTo = filters.dateTo
        
        const response = await api.searchCases(caseParams)
        results.cases = response.data.cases || []
      }

      // Search templates
      if (filters.type === 'all' || filters.type === 'templates') {
        const templateParams: any = { query: filters.query }
        if (filters.category) templateParams.category = filters.category
        if (filters.tags && filters.tags.length > 0) {
          templateParams.tags = filters.tags.join(',')
        }
        
        const response = await api.searchTemplates(templateParams)
        results.templates = response.data.templates || []
      }

      // Search steps
      if (filters.type === 'all' || filters.type === 'steps') {
        const stepParams: any = { query: filters.query }
        if (filters.status) stepParams.status = filters.status
        
        const response = await api.searchSteps(stepParams)
        results.steps = response.data || []
      }

      results.total = results.cases.length + results.templates.length + results.steps.length
      setSearchResults(results)
    } catch (error) {
      console.error('Failed to search:', error)
    } finally {
      setLoading(false)
    }
  }

  const addTag = () => {
    if (tagInput && (!filters.tags || !filters.tags.includes(tagInput))) {
      setFilters({
        ...filters,
        tags: [...(filters.tags || []), tagInput]
      })
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setFilters({
      ...filters,
      tags: filters.tags?.filter(t => t !== tag)
    })
  }

  const clearFilters = () => {
    setFilters({
      query: '',
      type: 'all'
    })
    setSearchResults(null)
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'done':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-500" />
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-gray-400" />
      default:
        return <Circle className="w-5 h-5 text-gray-300" />
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            詳細検索
          </h1>
          <p className="text-gray-600">
            案件、テンプレート、ステップを横断的に検索
          </p>
        </div>

        {/* 検索フォーム */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <form onSubmit={handleSearch}>
            {/* 基本検索 */}
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="text"
                    placeholder="キーワードで検索..."
                    value={filters.query}
                    onChange={(e) => setFilters({ ...filters, query: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value as any })}
                className="w-40"
                options={[
                  { value: 'all', label: 'すべて' },
                  { value: 'cases', label: '案件のみ' },
                  { value: 'templates', label: 'テンプレートのみ' },
                  { value: 'steps', label: 'ステップのみ' }
                ]}
              />
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                検索
              </Button>
            </div>

            {/* 詳細フィルタ切り替え */}
            <button
              type="button"
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 mb-4"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Filter className="w-4 h-4" />
              詳細フィルタ
              {showAdvanced ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {/* 詳細フィルタ */}
            {showAdvanced && (
              <div className="border-t pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* ステータス */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ステータス
                    </label>
                    <Select
                      value={filters.status || ''}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      options={[
                        { value: '', label: 'すべて' },
                        { value: 'draft', label: '下書き' },
                        { value: 'in_progress', label: '進行中' },
                        { value: 'completed', label: '完了' },
                        { value: 'cancelled', label: 'キャンセル' }
                      ]}
                    />
                  </div>

                  {/* 作成者 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      作成者
                    </label>
                    <Select
                      value={filters.createdBy?.toString() || ''}
                      onChange={(e) => setFilters({ 
                        ...filters, 
                        createdBy: e.target.value ? parseInt(e.target.value) : undefined 
                      })}
                      options={[
                        { value: '', label: 'すべて' },
                        ...users.map(user => ({ value: user.id.toString(), label: user.name }))
                      ]}
                    />
                  </div>

                  {/* カテゴリ */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      カテゴリ
                    </label>
                    <Select
                      value={filters.category || ''}
                      onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                      options={[
                        { value: '', label: 'すべて' },
                        ...categories.map(cat => ({ value: cat, label: cat }))
                      ]}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 期間 */}
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        期間（開始）
                      </label>
                      <Input
                        type="date"
                        value={filters.dateFrom || ''}
                        onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                      />
                    </div>
                    <span className="pb-2">〜</span>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        期間（終了）
                      </label>
                      <Input
                        type="date"
                        value={filters.dateTo || ''}
                        onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* タグ */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      タグ
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="タグを追加..."
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      />
                      <Button type="button" variant="secondary" onClick={addTag}>
                        追加
                      </Button>
                    </div>
                    {filters.tags && filters.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {filters.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded"
                          >
                            <Tag className="w-3 h-3" />
                            {tag}
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="hover:text-blue-900"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="button" variant="ghost" onClick={clearFilters}>
                    フィルタをクリア
                  </Button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* 検索結果 */}
        {searchResults && (
          <div className="space-y-6">
            {/* 結果サマリー */}
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">
                {searchResults.total}件の結果が見つかりました
                {searchResults.cases.length > 0 && ` (案件: ${searchResults.cases.length}件)`}
                {searchResults.templates.length > 0 && ` (テンプレート: ${searchResults.templates.length}件)`}
                {searchResults.steps.length > 0 && ` (ステップ: ${searchResults.steps.length}件)`}
              </p>
            </div>

            {/* 案件結果 */}
            {searchResults.cases.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  案件 ({searchResults.cases.length}件)
                </h2>
                <div className="bg-white rounded-lg shadow divide-y">
                  {searchResults.cases.slice(0, 5).map((caseItem: any) => (
                    <Link
                      key={caseItem.id}
                      href={`/cases/${caseItem.id}`}
                      className="block p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(caseItem.status)}
                        <div className="flex-1">
                          <h3 className="font-medium">{caseItem.title}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                            <span className="flex items-center gap-1">
                              <Target className="w-4 h-4" />
                              {formatDate(caseItem.goalDate)}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              {caseItem.createdByName}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                  {searchResults.cases.length > 5 && (
                    <div className="p-3 text-center">
                      <Link href="/cases" className="text-sm text-blue-600 hover:text-blue-800">
                        すべての案件を表示 →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* テンプレート結果 */}
            {searchResults.templates.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  テンプレート ({searchResults.templates.length}件)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {searchResults.templates.slice(0, 4).map((template: any) => (
                    <Link
                      key={template.id}
                      href={`/templates/${template.id}`}
                      className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow"
                    >
                      <h3 className="font-medium mb-2">{template.name}</h3>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {template.description || '説明なし'}
                      </p>
                      {template.category && (
                        <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                          {template.category}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
                {searchResults.templates.length > 4 && (
                  <div className="mt-3 text-center">
                    <Link href="/templates" className="text-sm text-blue-600 hover:text-blue-800">
                      すべてのテンプレートを表示 →
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* ステップ結果 */}
            {searchResults.steps.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  ステップ ({searchResults.steps.length}件)
                </h2>
                <div className="bg-white rounded-lg shadow divide-y">
                  {searchResults.steps.slice(0, 5).map((step: any) => (
                    <div key={step.id} className="p-4">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(step.status)}
                        <div className="flex-1">
                          <h3 className="font-medium">{step.name}</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            案件: {step.caseName} | {step.estimatedHours}時間
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchResults.total === 0 && (
              <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>検索結果が見つかりませんでした</p>
                <p className="text-sm mt-2">別のキーワードやフィルタで検索してください</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}