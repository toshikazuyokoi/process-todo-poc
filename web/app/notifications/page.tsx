'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/app/lib/api-client'
import { Button } from '@/app/components/ui/button'
import { 
  ArrowLeft,
  Bell,
  Check,
  Clock,
  AlertCircle,
  X,
  CheckCircle,
  Info,
  Loader2,
  Filter,
  Trash2
} from 'lucide-react'

interface Notification {
  id: number
  userId: number
  type: string
  title: string
  message: string
  isRead: boolean
  relatedType: string | null
  relatedId: number | null
  createdAt: string
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const userId = 1 // TODO: Get actual logged-in user ID

  useEffect(() => {
    fetchNotifications()
  }, [filter])

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      let response
      if (filter === 'unread') {
        response = await api.getUserNotifications(userId, false)
      } else if (filter === 'read') {
        response = await api.getUserNotifications(userId, true)
      } else {
        // Fetch both read and unread
        const [unreadRes, readRes] = await Promise.all([
          api.getUserNotifications(userId, false),
          api.getUserNotifications(userId, true)
        ])
        response = { data: [...(unreadRes.data || []), ...(readRes.data || [])] }
      }
      
      const data = response.data || []
      // Sort by date, newest first
      data.sort((a: Notification, b: Notification) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      setNotifications(data)
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: number) => {
    try {
      await api.markAsRead(notificationId)
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      ))
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await api.markAllAsRead(userId)
      setNotifications(notifications.map(n => ({ ...n, isRead: true })))
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  const deleteNotification = async (notificationId: number) => {
    try {
      await api.deleteNotification(notificationId)
      setNotifications(notifications.filter(n => n.id !== notificationId))
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  const deleteAllRead = async () => {
    if (!confirm('既読の通知をすべて削除してもよろしいですか？')) return
    
    try {
      const readNotifications = notifications.filter(n => n.isRead)
      await Promise.all(readNotifications.map(n => api.deleteNotification(n.id)))
      setNotifications(notifications.filter(n => !n.isRead))
    } catch (error) {
      console.error('Failed to delete read notifications:', error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      default:
        return <Bell className="w-5 h-5 text-gray-500" />
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffMins < 1) return 'たった今'
    if (diffMins < 60) return `${diffMins}分前`
    if (diffHours < 24) return `${diffHours}時間前`
    if (diffDays < 7) return `${diffDays}日前`
    
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      markAsRead(notification.id)
    }
    
    // Navigate to related content if available
    if (notification.relatedType && notification.relatedId) {
      switch (notification.relatedType) {
        case 'case':
          router.push(`/cases/${notification.relatedId}`)
          break
        case 'step':
          // Could open step detail modal
          break
        default:
          break
      }
    }
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => router.back()}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                戻る
              </Button>
              <h1 className="text-2xl font-bold">通知</h1>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-sm px-2 py-1 rounded-full">
                  {unreadCount}件の未読
                </span>
              )}
            </div>
            
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button variant="secondary" onClick={markAllAsRead}>
                  <Check className="w-4 h-4 mr-1" />
                  すべて既読
                </Button>
              )}
              {notifications.some(n => n.isRead) && (
                <Button variant="danger" onClick={deleteAllRead}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  既読を削除
                </Button>
              )}
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 border-b">
            <button
              className={`px-4 py-2 border-b-2 transition-colors ${
                filter === 'all' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setFilter('all')}
            >
              すべて ({notifications.length})
            </button>
            <button
              className={`px-4 py-2 border-b-2 transition-colors ${
                filter === 'unread' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setFilter('unread')}
            >
              未読 ({unreadCount})
            </button>
            <button
              className={`px-4 py-2 border-b-2 transition-colors ${
                filter === 'read' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => setFilter('read')}
            >
              既読 ({notifications.filter(n => n.isRead).length})
            </button>
          </div>
        </div>

        {/* Notification list */}
        <div className="bg-white rounded-lg shadow">
          {notifications.length > 0 ? (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                    !notification.isRead ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">{notification.title}</p>
                            {!notification.isRead && (
                              <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded">
                                未読
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(notification.createdAt)}
                          </p>
                        </div>
                        <div className="flex gap-1 ml-2">
                          {!notification.isRead && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                markAsRead(notification.id)
                              }}
                              title="既読にする"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteNotification(notification.id)
                            }}
                            title="削除"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>通知はありません</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}