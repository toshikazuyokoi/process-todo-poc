'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ProcessTemplate } from '@/app/types'
import { api } from '@/app/lib/api-client'
import { Button } from '@/app/components/ui/button'
import { ArrowLeft, Edit, Trash2, FileText, Calendar, Loader2 } from 'lucide-react'

export default function ViewTemplatePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const templateId = parseInt(params.id)
  const [template, setTemplate] = useState<ProcessTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchTemplate()
  }, [templateId])

  const fetchTemplate = async () => {
    setLoading(true)
    try {
      const response = await api.getProcessTemplate(templateId)
      setTemplate(response.data)
    } catch (error) {
      console.error('Failed to fetch template:', error)
      alert('テンプレートの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('このテンプレートを削除してもよろしいですか？')) {
      return
    }

    setDeleting(true)
    try {
      await api.deleteProcessTemplate(templateId)
      alert('テンプレートを削除しました')
      router.push('/')
    } catch (error) {
      console.error('Failed to delete template:', error)
      alert('削除に失敗しました')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">テンプレートが見つかりません</p>
          <Link href="/">
            <Button variant="primary">ホームに戻る</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              戻る
            </Button>
            <h1 className="text-2xl font-bold">{template.name}</h1>
          </div>
          
          <div className="flex gap-2">
            <Link href={`/templates/${templateId}`}>
              <Button variant="secondary">
                <Edit className="w-4 h-4 mr-1" />
                編集
              </Button>
            </Link>
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

        {/* 基本情報 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">基本情報</h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">バージョン</dt>
              <dd className="mt-1 text-sm text-gray-900">{template.version}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">ステータス</dt>
              <dd className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  template.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {template.isActive ? '有効' : '無効'}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">作成日時</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {template.createdAt ? new Date(template.createdAt).toLocaleString('ja-JP') : '-'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">更新日時</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {template.updatedAt ? new Date(template.updatedAt).toLocaleString('ja-JP') : '-'}
              </dd>
            </div>
          </dl>
        </div>

        {/* ステップ一覧 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">ステップ一覧</h2>
          {template.stepTemplates && template.stepTemplates.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      順序
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ステップ名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      基準
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      所要日数
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      依存関係
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {template.stepTemplates.map((step) => (
                    <tr key={step.id || step.seq}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {step.seq}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {step.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {step.basis === 'goal' ? 'ゴール基準' : '前工程基準'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {step.offsetDays > 0 ? '+' : ''}{step.offsetDays}日
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {step.dependsOn && step.dependsOn.length > 0 
                          ? `ステップ ${step.dependsOn.join(', ')}`
                          : '-'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">ステップが登録されていません</p>
          )}
        </div>

        {/* アクション */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">アクション</h2>
          <div className="flex gap-4">
            <Link href={`/cases/new?templateId=${templateId}`}>
              <Button variant="primary">
                <FileText className="w-4 h-4 mr-1" />
                このテンプレートから案件を作成
              </Button>
            </Link>
            <Button variant="secondary" disabled>
              <Calendar className="w-4 h-4 mr-1" />
              スケジュールシミュレーション（準備中）
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}