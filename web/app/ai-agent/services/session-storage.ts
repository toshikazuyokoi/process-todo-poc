import { AISession } from '../types'

const SESSION_KEY = 'ai-agent-session'
const SESSION_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours

interface StoredSession {
  session: AISession;
  timestamp: number;
}

/**
 * Session storage service for persisting AI Agent sessions
 * Uses localStorage for client-side persistence
 */
export const sessionStorage = {
  /**
   * Save session to storage
   */
  save(session: AISession): void {
    try {
      const data: StoredSession = {
        session,
        timestamp: Date.now()
      }
      
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(data))
        console.log('Session saved to storage:', session.id)
      }
    } catch (error) {
      console.error('Failed to save session to storage:', error)
    }
  },

  /**
   * Load session from storage
   */
  load(): AISession | null {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return null
      }

      const stored = localStorage.getItem(SESSION_KEY)
      if (!stored) {
        return null
      }

      const data: StoredSession = JSON.parse(stored)
      const age = Date.now() - data.timestamp

      // Check if session has expired
      if (age > SESSION_EXPIRY) {
        console.log('Session expired, clearing storage')
        this.clear()
        return null
      }

      // Check if session expiration date has passed
      if (data.session.expiresAt) {
        const expiresAt = new Date(data.session.expiresAt).getTime()
        if (Date.now() > expiresAt) {
          console.log('Session expiration date passed, clearing storage')
          this.clear()
          return null
        }
      }

      console.log('Session loaded from storage:', data.session.id)
      return data.session
    } catch (error) {
      console.error('Failed to load session from storage:', error)
      this.clear()
      return null
    }
  },

  /**
   * Clear session from storage
   */
  clear(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(SESSION_KEY)
        console.log('Session cleared from storage')
      }
    } catch (error) {
      console.error('Failed to clear session from storage:', error)
    }
  },

  /**
   * Update session in storage
   */
  update(session: Partial<AISession>): void {
    const current = this.load()
    if (current) {
      const updated = { ...current, ...session }
      this.save(updated as AISession)
    }
  },

  /**
   * Check if a session exists in storage
   */
  exists(): boolean {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false
    }
    return localStorage.getItem(SESSION_KEY) !== null
  },

  /**
   * Get session age in milliseconds
   */
  getAge(): number | null {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return null
      }

      const stored = localStorage.getItem(SESSION_KEY)
      if (!stored) {
        return null
      }

      const data: StoredSession = JSON.parse(stored)
      return Date.now() - data.timestamp
    } catch {
      return null
    }
  },

  /**
   * Refresh session timestamp
   */
  refresh(): void {
    const session = this.load()
    if (session) {
      this.save(session)
    }
  }
}

// Export for convenience
export default sessionStorage