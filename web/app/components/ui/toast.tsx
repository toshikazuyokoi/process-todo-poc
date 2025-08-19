'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { clsx } from 'clsx'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  clearToasts: () => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 5000,
    }
    
    setToasts(prev => [...prev, newToast])

    // 自動削除
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, newToast.duration)
    }
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const clearToasts = useCallback(() => {
    setToasts([])
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

const ToastContainer: React.FC<{ 
  toasts: Toast[]
  removeToast: (id: string) => void 
}> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-0 right-0 z-50 p-4 space-y-2 pointer-events-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  )
}

const ToastItem: React.FC<{ 
  toast: Toast
  onClose: () => void 
}> = ({ toast, onClose }) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // アニメーション用
    setTimeout(() => setIsVisible(true), 10)
    
    return () => setIsVisible(false)
  }, [])

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />
    }
  }

  const getStyles = () => {
    const base = 'pointer-events-auto flex items-start gap-3 w-full max-w-sm p-4 rounded-lg shadow-lg transition-all duration-300'
    
    const variants = {
      success: 'bg-white border border-green-200',
      error: 'bg-white border border-red-200',
      warning: 'bg-white border border-yellow-200',
      info: 'bg-white border border-blue-200',
    }

    const visibility = isVisible 
      ? 'translate-x-0 opacity-100' 
      : 'translate-x-full opacity-0'

    return clsx(base, variants[toast.type], visibility)
  }

  return (
    <div className={getStyles()} data-testid={`toast-${toast.id}`}>
      <div className="flex-shrink-0">
        {getIcon()}
      </div>
      
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">
          {toast.title}
        </p>
        {toast.message && (
          <p className="mt-1 text-sm text-gray-500">
            {toast.message}
          </p>
        )}
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      
      <button
        onClick={onClose}
        className="flex-shrink-0 inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <span className="sr-only">閉じる</span>
        <X className="w-5 h-5" />
      </button>
    </div>
  )
}

// 便利なヘルパー関数 - これらは useToast フックを使用するコンポーネント内で使用する必要があります
// 直接呼び出すのではなく、useToast フックから addToast を取得して使用してください
export const createToast = {
  success: (addToast: (toast: Omit<Toast, 'id'>) => void) => (title: string, message?: string) => {
    addToast({ type: 'success', title, message })
  },
  error: (addToast: (toast: Omit<Toast, 'id'>) => void) => (title: string, message?: string) => {
    addToast({ type: 'error', title, message })
  },
  warning: (addToast: (toast: Omit<Toast, 'id'>) => void) => (title: string, message?: string) => {
    addToast({ type: 'warning', title, message })
  },
  info: (addToast: (toast: Omit<Toast, 'id'>) => void) => (title: string, message?: string) => {
    addToast({ type: 'info', title, message })
  },
}