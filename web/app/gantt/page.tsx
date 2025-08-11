'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { api } from '@/app/lib/api-client'
import { Button } from '@/app/components/ui/button'
import { Select } from '@/app/components/ui/select'
import { ArrowLeft, Calendar, Filter, Loader2, ZoomIn, ZoomOut, Download } from 'lucide-react'
import { Task, ViewMode } from 'gantt-task-react'
import 'gantt-task-react/dist/index.css'

// Dynamic import to avoid SSR issues
const GanttChart = dynamic(
  () => import('gantt-task-react').then((mod) => mod.Gantt),
  { 
    ssr: false,
    loading: () => <div className="p-8 text-center">ガントチャート読み込み中...</div>
  }
)

interface GanttTask {
  id: string
  name: string
  start: string
  end: string
  progress: number
  type: 'case' | 'step'
  parentId?: string
  status: string
}

interface GanttData {
  tasks: GanttTask[]
}

interface ProcessedTask {
  id: string
  name: string
  start: Date
  end: Date
  progress: number
  type: 'case' | 'step'
  status: string
}

export default function GanttPage() {
  const router = useRouter()
  const [ganttData, setGanttData] = useState<GanttData | null>(null)
  const [tasks, setTasks] = useState<ProcessedTask[]>([])
  const [ganttTasks, setGanttTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Week)
  const [showGantt, setShowGantt] = useState(false)
  const [cases, setCases] = useState<any[]>([])

  useEffect(() => {
    fetchCases()
  }, [])

  useEffect(() => {
    fetchGanttData()
  }, [selectedCaseId])

  const fetchCases = async () => {
    try {
      const response = await api.getCases()
      setCases(response.data)
    } catch (error) {
      console.error('Failed to fetch cases:', error)
    }
  }

  const fetchGanttData = async () => {
    setLoading(true)
    try {
      const response = await api.getGanttData(selectedCaseId || undefined)
      const data: GanttData = response.data
      setGanttData(data)
      
      // Safety check
      if (!data || !data.tasks || !Array.isArray(data.tasks)) {
        console.error('Invalid gantt data:', data)
        setTasks([])
        return
      }
      
      // Convert to processed task format
      const processedTasks: ProcessedTask[] = []
      const ganttTaskList: Task[] = []
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      // Process all tasks
      data.tasks.forEach((task) => {
        try {
          let startDate = task.start ? new Date(task.start) : today
          let endDate = task.end ? new Date(task.end) : new Date(today)
          
          // Validate dates
          if (!startDate || isNaN(startDate.getTime())) {
            startDate = new Date(today)
          }
          if (!endDate || isNaN(endDate.getTime()) || endDate.getFullYear() < 2000) {
            endDate = new Date(startDate)
            if (task.type === 'case') {
              endDate.setMonth(startDate.getMonth() + 3) // Default to 3 months for cases
            } else {
              endDate.setDate(startDate.getDate() + 7) // Default to 7 days for steps
            }
          }
          
          // Ensure end date is after start date
          if (endDate <= startDate) {
            endDate = new Date(startDate)
            endDate.setDate(startDate.getDate() + 1)
          }
          
          const processedTask: ProcessedTask = {
            id: task.id || `${task.type}-${Date.now()}`,
            name: task.name || 'Unnamed Task',
            start: startDate,
            end: endDate,
            progress: task.progress || 0,
            type: task.type,
            status: task.status || 'todo'
          }
          processedTasks.push(processedTask)
          
          // Create Gantt task
          const ganttTask: Task = {
            start: startDate,
            end: endDate,
            name: task.name || 'Unnamed Task',
            id: task.id || `${task.type}-${Date.now()}`,
            type: task.type === 'case' ? 'project' : 'task',
            progress: task.progress || 0,
            displayOrder: ganttTaskList.length,
            styles: task.type === 'step' ? {
              backgroundColor: getStepColor(task.status || 'todo'),
              backgroundSelectedColor: getStepColor(task.status || 'todo'),
            } : undefined
          }
          ganttTaskList.push(ganttTask)
        } catch (err) {
          console.error('Error processing task:', task, err)
        }
      })
      
      console.log('Tasks processed:', processedTasks.length)
      setTasks(processedTasks)
      setGanttTasks(ganttTaskList)
    } catch (error) {
      console.error('Failed to fetch gantt data:', error)
      alert('ガントチャートデータの取得に失敗しました')
      setTasks([])
    } finally {
      setLoading(false)
    }
  }


  const getStepProgress = (status: string) => {
    switch (status) {
      case 'done':
        return 100
      case 'in_progress':
        return 50
      case 'cancelled':
        return 0
      default:
        return 0
    }
  }

  const getStepColor = (status: string) => {
    switch (status) {
      case 'done':
        return '#10b981' // green
      case 'in_progress':
        return '#3b82f6' // blue
      case 'blocked':
        return '#ef4444' // red
      case 'cancelled':
        return '#6b7280' // gray
      default:
        return '#d1d5db' // light gray
    }
  }

  const handleTaskClick = (taskId: string) => {
    if (taskId.startsWith('case-')) {
      const caseId = parseInt(taskId.replace('case-', ''))
      router.push(`/cases/${caseId}`)
    } else if (taskId.startsWith('step-')) {
      // Could open step detail modal here
    }
  }

  const exportToPng = () => {
    // This would require additional implementation with html2canvas
    alert('PNG エクスポート機能は今後実装予定です')
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
      <div className="max-w-full mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => router.back()}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                戻る
              </Button>
              <h1 className="text-2xl font-bold">ガントチャート</h1>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Case filter */}
              <Select
                value={selectedCaseId?.toString() || ''}
                onChange={(e) => setSelectedCaseId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-64"
              >
                <option value="">すべての案件</option>
                {cases.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </Select>
              
              {/* View mode selector */}
              <Select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as ViewMode)}
                className="w-32"
              >
                <option value={ViewMode.Hour}>時間</option>
                <option value={ViewMode.QuarterDay}>6時間</option>
                <option value={ViewMode.HalfDay}>12時間</option>
                <option value={ViewMode.Day}>日</option>
                <option value={ViewMode.Week}>週</option>
                <option value={ViewMode.Month}>月</option>
                <option value={ViewMode.Year}>年</option>
              </Select>
              
              <Button 
                variant="secondary" 
                onClick={() => setShowGantt(!showGantt)}
              >
                {showGantt ? 'テーブル表示' : 'ガントチャート表示'}
              </Button>
              
              <Button variant="secondary" onClick={exportToPng}>
                <Download className="w-4 h-4 mr-1" />
                エクスポート
              </Button>
            </div>
          </div>
          
          <div className="text-sm text-gray-600">
            {ganttData?.tasks.filter(t => t.type === 'case').length || 0}件の案件、
            {ganttData?.tasks.filter(t => t.type === 'step').length || 0}件のステップを表示中
          </div>
        </div>

        {/* Gantt Chart */}
        <div className="bg-white rounded-lg shadow p-4">
          {tasks.length > 0 ? (
            showGantt && ganttTasks.length > 0 ? (
              <div className="overflow-x-auto">
                <GanttChart
                  tasks={ganttTasks}
                  viewMode={viewMode}
                  onDateChange={(task: Task, start: Date, end: Date) => {
                    const newTasks = ganttTasks.map(t => 
                      t.id === task.id ? { ...t, start, end } : t
                    )
                    setGanttTasks(newTasks)
                  }}
                  onProgressChange={(task: Task, progress: number) => {
                    const newTasks = ganttTasks.map(t => 
                      t.id === task.id ? { ...t, progress } : t
                    )
                    setGanttTasks(newTasks)
                  }}
                  onClick={(task: Task) => handleTaskClick(task.id)}
                  listCellWidth="155px"
                  columnWidth={60}
                  locale="ja-JP"
                  TooltipContent={({ task, fontSize, fontFamily }) => {
                    const startDate = task.start.toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit'
                    })
                    const endDate = task.end.toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit'
                    })
                    return (
                      <div className="bg-gray-800 text-white p-2 rounded text-sm">
                        <div className="font-semibold">{task.name}</div>
                        <div className="text-xs mt-1">
                          開始: {startDate}<br />
                          終了: {endDate}<br />
                          進捗: {task.progress}%
                        </div>
                      </div>
                    )
                  }}
                />
              </div>
            ) : (
              <div>
                {/* Simple task list as alternative */}
                <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">タスク名</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">開始日</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">終了日</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">進捗</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {tasks.slice(0, 20).map((task) => (
                      <tr 
                        key={task.id} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleTaskClick(task.id)}
                      >
                        <td className="px-4 py-2 text-sm">
                          {task.type === 'case' ? (
                            <span className="font-medium">{task.name}</span>
                          ) : (
                            <span className="ml-4">{task.name}</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {task.start.toLocaleDateString('ja-JP')}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">
                          {task.end.toLocaleDateString('ja-JP')}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className="h-2 rounded-full"
                                style={{ 
                                  width: `${task.progress}%`,
                                  backgroundColor: getStepColor(task.status)
                                }}
                              />
                            </div>
                            <span className="text-xs text-gray-600">{task.progress}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {tasks.length > 20 && (
                  <div className="p-3 bg-gray-50 text-center text-sm text-gray-600">
                    他 {tasks.length - 20} 件のタスク
                  </div>
                )}
              </div>
            </div>
            )
          ) : (
            <div className="text-center py-12 text-gray-500">
              表示するデータがありません
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-semibold mb-3">凡例</h3>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-300 rounded"></div>
              <span>未着手</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span>進行中</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>完了</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>ブロック</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-500 rounded"></div>
              <span>キャンセル</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}