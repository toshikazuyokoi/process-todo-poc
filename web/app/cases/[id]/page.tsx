'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Case, StepInstance } from '@/app/types'
import { api } from '@/app/lib/api-client'
import { Button } from '@/app/components/ui/button'
import { StepInstanceList } from '@/app/components/cases/step-instance-list'
import { ReplanDialog } from '@/app/components/cases/replan-dialog'
import { ArrowLeft, Edit, Trash2, Calendar, RefreshCw, Loader2, Target } from 'lucide-react'
import { useRealtimeUpdates } from '@/app/hooks/use-realtime-updates'

export default function CaseDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const caseId = parseInt(params.id)
  const [caseData, setCaseData] = useState<Case | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [showReplan, setShowReplan] = useState(false)

  // リアルタイム更新を設定
  const { isConnected } = useRealtimeUpdates({
    caseId,
    onCaseUpdate: (event) => {
      console.log('Case updated in real-time:', event)
      // ケースデータを更新
      setCaseData(prev => prev ? { ...prev, ...event.data } : null)
    },
    onStepUpdate: (event) => {
      console.log('Step updated in real-time:', event)
      // ステップデータを更新
      setCaseData(prev => {
        if (!prev || !prev.steps) return prev
        const updatedSteps = prev.steps.map(step =>
          step.id === event.stepId ? { ...step, ...event.data } : step
        )
        return { ...prev, steps: updatedSteps }
      })
    },
  })

  useEffect(() => {
    fetchCase()
  }, [caseId])

  const fetchCase = async () => {
    setLoading(true)
    try {
      const response = await api.getCase(caseId)
      setCaseData(response.data)
    } catch (error) {
      console.error('Failed to fetch case:', error)
      alert('案件の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('この案件を削除してもよろしいですか？')) {
      return
    }
    
    setDeleting(true)
    try {
      await api.deleteCase(caseId)
      alert('案件を削除しました')
      router.push('/')
    } catch (error) {
      console.error('Failed to delete case:', error)
      alert('削除に失敗しました')
    } finally {
      setDeleting(false)
    }
  }

  const calculateProgress = (steps: StepInstance[]) => {
    if (!steps || steps.length === 0) return 0
    const completed = steps.filter(s => s.status === 'done').length
    return Math.round((completed / steps.length) * 100)
  }

  const getStatusColor = (status: Case['status']) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: Case['status']) => {
    switch (status) {
      case 'COMPLETED':
        return '完了'
      case 'IN_PROGRESS':
        return '進行中'
      case 'CANCELLED':
        return 'キャンセル'
      default:
        return 'オープン'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">案件が見つかりません</p>
          <Button onClick={() => router.push('/')}>
            ホームに戻る
          </Button>
        </div>
      </div>
    )
  }

  const progress = calculateProgress(caseData.stepInstances || [])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-start gap-4">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              戻る
            </Button>
            <div>
              <h1 className="text-2xl font-bold mb-2">{caseData.title}</h1>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(caseData.status)}`}>
                  {getStatusLabel(caseData.status)}
                </span>
                <span className="text-sm text-gray-600">
                  作成日: {caseData.createdAt ? new Date(caseData.createdAt).toLocaleDateString('ja-JP') : '-'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowReplan(true)}>
              <RefreshCw className="w-4 h-4 mr-1" />
              再計画
            </Button>
            <Button variant="secondary" onClick={() => router.push(`/cases/${caseId}/edit`)}>
              <Edit className="w-4 h-4 mr-1" />
              編集
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-1" />
              )}
              削除
            </Button>
          </div>
        </div>

        {/* 基本情報カード */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Target className="w-4 h-4" />
                ゴール日付
              </div>
              <p className="text-lg font-medium">
                {caseData.goalDateUtc ? new Date(caseData.goalDateUtc).toLocaleDateString('ja-JP') : '-'}
              </p>
              {caseData.goalDateUtc && (
                <p className="text-sm text-gray-500 mt-1">
                  あと{Math.ceil((new Date(caseData.goalDateUtc).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}日
                </p>
              )}
            </div>
            
            <div>
              <div className="text-sm text-gray-500 mb-1">進捗状況</div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-lg font-medium">{progress}%</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {caseData.stepInstances?.filter(s => s.status === 'done').length || 0} / {caseData.stepInstances?.length || 0} 完了
              </p>
            </div>
            
            <div>
              <div className="text-sm text-gray-500 mb-1">ステータスサマリー</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  未着手: {caseData.stepInstances?.filter(s => s.status === 'todo').length || 0}
                </div>
                <div>
                  進行中: {caseData.stepInstances?.filter(s => s.status === 'in_progress').length || 0}
                </div>
                <div>
                  完了: {caseData.stepInstances?.filter(s => s.status === 'done').length || 0}
                </div>
                <div>
                  ブロック: {caseData.stepInstances?.filter(s => s.status === 'blocked').length || 0}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ステップ一覧 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">ステップ一覧</h2>
          <StepInstanceList
            steps={caseData.stepInstances || []}
            onUpdate={fetchCase}
          />
        </div>
      </div>

      {/* 再計画ダイアログ */}
      {showReplan && (
        <ReplanDialog
          caseData={caseData}
          steps={caseData.stepInstances || []}
          onClose={() => setShowReplan(false)}
          onReplan={fetchCase}
        />
      )}
    </div>
  )
}