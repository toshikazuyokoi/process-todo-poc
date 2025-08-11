'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ProcessTemplate, Case } from '@/app/types'
import { api } from '@/app/lib/api-client'
import { Button } from '@/app/components/ui/button'
import { 
  Plus, 
  FileText, 
  Calendar, 
  Target,
  Clock,
  CheckCircle,
  Circle,
  XCircle,
  ArrowRight,
  Loader2,
  BarChart3
} from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<ProcessTemplate[]>([])
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [templatesRes, casesRes] = await Promise.all([
        api.getProcessTemplates(),
        api.getCases()
      ])
      setTemplates(templatesRes.data)
      setCases(casesRes.data)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: Case['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'IN_PROGRESS':
        return <Clock className="w-5 h-5 text-blue-500" />
      case 'CANCELLED':
        return <XCircle className="w-5 h-5 text-gray-400" />
      default:
        return <Circle className="w-5 h-5 text-gray-300" />
    }
  }

  const calculateProgress = (caseData: Case) => {
    if (!caseData.stepInstances || caseData.stepInstances.length === 0) return 0
    const completed = caseData.stepInstances.filter(s => s.status === 'done').length
    return Math.round((completed / caseData.stepInstances.length) * 100)
  }

  const getDaysRemaining = (goalDate: string) => {
    const days = Math.ceil((new Date(goalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (days < 0) return `${Math.abs(days)}日超過`
    if (days === 0) return '今日'
    if (days === 1) return '明日'
    return `あと${days}日`
  }

  if (loading) {
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            プロセス指向ToDoアプリ
          </h1>
          <p className="text-gray-600">
            プロセステンプレートを使って案件のスケジュールを管理
          </p>
        </div>

        {/* クイックアクション */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">クイックアクション</h2>
            <div className="space-y-3">
              <Button
                className="w-full justify-start"
                onClick={() => router.push('/cases/new')}
              >
                <Plus className="w-4 h-4 mr-2" />
                新規案件作成
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-start"
                onClick={() => router.push('/templates/new')}
              >
                <FileText className="w-4 h-4 mr-2" />
                新規テンプレート作成
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-start"
                onClick={() => router.push('/gantt')}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                ガントチャート表示
              </Button>
            </div>
          </div>

          {/* サマリー */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">サマリー</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-3xl font-bold text-blue-600">{cases.length}</p>
                <p className="text-sm text-gray-600">アクティブな案件</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-green-600">{templates.length}</p>
                <p className="text-sm text-gray-600">利用可能なテンプレート</p>
              </div>
            </div>
          </div>
        </div>

        {/* 案件一覧 */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">進行中の案件</h2>
              <Link href="/cases">
                <Button variant="ghost" size="sm">
                  すべて見る
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="divide-y">
            {cases.slice(0, 5).map((caseItem) => {
              const progress = calculateProgress(caseItem)
              return (
                <Link
                  key={caseItem.id}
                  href={`/cases/${caseItem.id}`}
                  className="block p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusIcon(caseItem.status)}
                        <h3 className="text-lg font-medium">{caseItem.title}</h3>
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Target className="w-4 h-4" />
                          {caseItem.goalDateUtc && getDaysRemaining(caseItem.goalDateUtc)}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span>{progress}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
            
            {cases.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                まだ案件がありません
              </div>
            )}
          </div>
        </div>

        {/* テンプレート一覧 */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">プロセステンプレート</h2>
              <Link href="/templates">
                <Button variant="ghost" size="sm">
                  すべて見る
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {templates.filter(t => t.isActive).slice(0, 6).map((template) => (
              <div
                key={template.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <h3 className="font-medium mb-2">{template.name}</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>バージョン: {template.version}</p>
                  <p>ステップ数: {template.stepTemplates?.length || 0}</p>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => router.push(`/cases/new?templateId=${template.id}`)}
                  >
                    案件作成
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => router.push(`/templates/${template.id}/view`)}
                  >
                    詳細
                  </Button>
                </div>
              </div>
            ))}
            
            {templates.length === 0 && (
              <div className="col-span-full p-8 text-center text-gray-500">
                まだテンプレートがありません
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}