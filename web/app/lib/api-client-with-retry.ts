import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import Cookies from 'js-cookie'

interface RetryConfig {
  maxRetries?: number
  retryDelay?: number
  retryCondition?: (error: AxiosError) => boolean
  onRetry?: (retryCount: number, error: AxiosError) => void
}

interface ExtendedAxiosRequestConfig extends AxiosRequestConfig {
  retry?: RetryConfig
  skipRetry?: boolean
}

class ApiClientWithRetry {
  private client: AxiosInstance
  private defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    retryCondition: (error: AxiosError) => {
      // ネットワークエラーまたは5xxエラーの場合リトライ
      return !error.response || (error.response.status >= 500 && error.response.status < 600)
    },
    onRetry: (retryCount: number, error: AxiosError) => {
      console.log(`Retry attempt ${retryCount} after error:`, error.message)
    }
  }

  constructor(baseURL: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api') {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // リクエストインターセプター
    this.client.interceptors.request.use(
      (config) => {
        // リクエストIDの追加
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        config.headers['X-Request-ID'] = requestId
        
        // 認証トークンの追加（あれば）
        const token = this.getAuthToken()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }

        // デバッグログ
        if (process.env.NODE_ENV === 'development') {
          console.log(`[API Request ${requestId}]`, config.method?.toUpperCase(), config.url)
        }

        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // レスポンスインターセプター
    this.client.interceptors.response.use(
      (response) => {
        // 成功レスポンスのログ
        if (process.env.NODE_ENV === 'development') {
          const requestId = response.config.headers?.['X-Request-ID']
          console.log(`[API Response ${requestId}]`, response.status, response.statusText)
        }
        return response
      },
      async (error: AxiosError) => {
        const config = error.config as ExtendedAxiosRequestConfig

        // リトライをスキップする場合
        if (config?.skipRetry) {
          return Promise.reject(error)
        }

        // リトライ設定の取得
        const retryConfig = { ...this.defaultRetryConfig, ...config?.retry }
        
        // リトライカウントの初期化
        if (!config) {
          return Promise.reject(error)
        }
        
        config.retryCount = config.retryCount || 0

        // リトライ条件のチェック
        const shouldRetry = retryConfig.retryCondition!(error) && 
                          config.retryCount < retryConfig.maxRetries!

        if (shouldRetry) {
          config.retryCount++
          
          // リトライコールバック
          if (retryConfig.onRetry) {
            retryConfig.onRetry(config.retryCount, error)
          }

          // 指数バックオフ
          const delay = this.calculateDelay(config.retryCount, retryConfig.retryDelay!)
          
          // 遅延実行
          await this.sleep(delay)
          
          // リトライ実行
          return this.client.request(config)
        }

        // エラーハンドリング
        return Promise.reject(this.handleError(error))
      }
    )
  }

  private calculateDelay(retryCount: number, baseDelay: number): number {
    // 指数バックオフ with ジッター
    const exponentialDelay = baseDelay * Math.pow(2, retryCount - 1)
    const jitter = Math.random() * 1000
    return Math.min(exponentialDelay + jitter, 30000) // 最大30秒
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private getAuthToken(): string | null {
    // Cookieからトークンを取得
    if (typeof window !== 'undefined') {
      return Cookies.get('accessToken') || null
    }
    return null
  }

  private handleError(error: AxiosError): Error {
    if (error.response) {
      // サーバーがエラーレスポンスを返した
      const data = error.response.data as any
      const message = data?.message || data?.error || error.message
      const errorCode = data?.errorCode || data?.code || 'UNKNOWN_ERROR'
      
      const customError = new Error(message) as any
      customError.code = errorCode
      customError.status = error.response.status
      customError.details = data?.details
      customError.requestId = error.config?.headers?.['X-Request-ID']
      
      return customError
    } else if (error.request) {
      // リクエストは送信されたがレスポンスがない
      const customError = new Error('ネットワークエラーが発生しました。接続を確認してください。') as any
      customError.code = 'NETWORK_ERROR'
      customError.isNetworkError = true
      return customError
    } else {
      // リクエストの設定中にエラーが発生
      const customError = new Error(error.message || '予期しないエラーが発生しました') as any
      customError.code = 'REQUEST_ERROR'
      return customError
    }
  }

  // APIメソッド
  async get<T>(url: string, config?: ExtendedAxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config)
    return response.data
  }

  async post<T>(url: string, data?: any, config?: ExtendedAxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config)
    return response.data
  }

  async put<T>(url: string, data?: any, config?: ExtendedAxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config)
    return response.data
  }

  async patch<T>(url: string, data?: any, config?: ExtendedAxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config)
    return response.data
  }

  async delete<T>(url: string, config?: ExtendedAxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config)
    return response.data
  }

  // ファイルアップロード用
  async upload<T>(url: string, formData: FormData, onProgress?: (progress: number) => void): Promise<T> {
    const response = await this.client.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      },
      skipRetry: true, // ファイルアップロードはリトライしない
    } as ExtendedAxiosRequestConfig)
    return response.data
  }

  // 設定の更新
  setDefaultRetryConfig(config: RetryConfig) {
    this.defaultRetryConfig = { ...this.defaultRetryConfig, ...config }
  }

  // 認証トークンの設定
  setAuthToken(token: string, refreshToken?: string) {
    if (typeof window !== 'undefined') {
      Cookies.set('accessToken', token, { expires: 1 }) // 1 day
      if (refreshToken) {
        Cookies.set('refreshToken', refreshToken, { expires: 7 }) // 7 days
      }
    }
  }

  // 認証トークンのクリア
  clearAuthToken() {
    if (typeof window !== 'undefined') {
      Cookies.remove('accessToken')
      Cookies.remove('refreshToken')
    }
  }
}

// シングルトンインスタンス
const apiClientWithRetry = new ApiClientWithRetry()

export default apiClientWithRetry

// 型定義をエクスポート
export type { RetryConfig, ExtendedAxiosRequestConfig }