'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import { Button } from './button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // エラーをコンソールに記録
    console.error(`[ErrorBoundary ${errorId}]`, error)
    
    return {
      hasError: true,
      error,
      errorId,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // エラー詳細をログに記録
    console.error('Error caught by boundary:', {
      error: error.toString(),
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
    })

    // 本番環境では外部のエラートラッキングサービスに送信
    if (process.env.NODE_ENV === 'production') {
      // TODO: Sentryなどのエラートラッキングサービスに送信
      this.reportErrorToService(error, errorInfo)
    }

    this.setState({ errorInfo })
  }

  reportErrorToService(error: Error, errorInfo: ErrorInfo) {
    // エラーレポート送信の実装
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      errorId: this.state.errorId,
    }

    // APIエンドポイントに送信
    const fetchPromise = fetch('/api/errors/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorReport),
    })
    
    if (fetchPromise && typeof fetchPromise.catch === 'function') {
      fetchPromise.catch(err => {
        console.error('Failed to report error:', err)
      })
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      // カスタムフォールバックが提供されている場合
      if (this.props.fallback) {
        return <>{this.props.fallback}</>
      }

      // デフォルトのエラー表示
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                エラーが発生しました
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                申し訳ございません。予期しないエラーが発生しました。
              </p>
              {this.state.errorId && (
                <p className="mt-1 text-xs text-gray-500">
                  エラーID: {this.state.errorId}
                </p>
              )}
            </div>

            {/* 開発環境でのみエラー詳細を表示 */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mt-4 p-4 bg-red-50 rounded-md">
                <h3 className="text-sm font-medium text-red-800 mb-2">
                  エラー詳細（開発環境のみ）
                </h3>
                <pre className="text-xs text-red-700 whitespace-pre-wrap break-words">
                  {this.state.error.toString()}
                </pre>
                {this.state.error.stack && (
                  <details className="mt-2">
                    <summary className="text-xs text-red-600 cursor-pointer">
                      スタックトレース
                    </summary>
                    <pre className="mt-2 text-xs text-red-600 whitespace-pre-wrap break-words">
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
                {this.state.errorInfo?.componentStack && (
                  <details className="mt-2">
                    <summary className="text-xs text-red-600 cursor-pointer">
                      コンポーネントスタック
                    </summary>
                    <pre className="mt-2 text-xs text-red-600 whitespace-pre-wrap break-words">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="mt-8 space-y-3">
              <Button
                onClick={this.handleReset}
                className="w-full flex justify-center items-center"
                variant="primary"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                もう一度試す
              </Button>
              
              <Button
                onClick={this.handleReload}
                className="w-full flex justify-center items-center"
                variant="secondary"
              >
                ページを再読み込み
              </Button>
              
              <Button
                onClick={this.handleGoHome}
                className="w-full flex justify-center items-center"
                variant="ghost"
              >
                <Home className="w-4 h-4 mr-2" />
                ホームに戻る
              </Button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                問題が解決しない場合は、サポートまでお問い合わせください。
              </p>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}