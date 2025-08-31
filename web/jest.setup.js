// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock Socket.IO client
jest.mock('socket.io-client')

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3005/api'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock fetch for tests
global.fetch = jest.fn()

// Mock scrollIntoView for jsdom
Element.prototype.scrollIntoView = jest.fn()

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks()
})