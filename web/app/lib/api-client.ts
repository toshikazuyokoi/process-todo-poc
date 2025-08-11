import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005/api'

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for auth
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if exists
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Debug logging
    console.log('API Request:', {
      url: config.url,
      method: config.method,
      data: config.data,
      headers: config.headers
    })
    
    return config
  },
  (error) => {
    console.error('Request error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    })
    return response
  },
  (error) => {
    console.error('API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    })
    
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// API functions
export const api = {
  // Process Templates
  getProcessTemplates: () => apiClient.get('/process-templates'),
  getProcessTemplate: (id: number) => apiClient.get(`/process-templates/${id}`),
  createProcessTemplate: (data: any) => apiClient.post('/process-templates', data),
  updateProcessTemplate: (id: number, data: any) => apiClient.put(`/process-templates/${id}`, data),
  deleteProcessTemplate: (id: number) => apiClient.delete(`/process-templates/${id}`),

  // Cases
  getCases: () => apiClient.get('/cases'),
  getCase: (id: number) => apiClient.get(`/cases/${id}`),
  createCase: (data: any) => apiClient.post('/cases', data),
  updateCase: (id: number, data: any) => apiClient.put(`/cases/${id}`, data),
  deleteCase: (id: number) => apiClient.delete(`/cases/${id}`),
  
  // Replan
  previewReplan: (caseId: number, data: any) => apiClient.post(`/cases/${caseId}/replan/preview`, data),
  applyReplan: (caseId: number, data: any) => apiClient.post(`/cases/${caseId}/replan/apply`, data),

  // Steps
  getStep: (id: number) => apiClient.get(`/steps/${id}`),
  updateStepStatus: (id: number, status: string) => apiClient.put(`/steps/${id}/status`, { status }),
  updateStepAssignee: (id: number, assigneeId: number) => apiClient.put(`/steps/${id}/assignee`, { assigneeId }),
  lockStep: (id: number) => apiClient.put(`/steps/${id}/lock`),
  unlockStep: (id: number) => apiClient.put(`/steps/${id}/unlock`),

  // Users
  getUsers: () => apiClient.get('/users'),
  createUser: (data: any) => apiClient.post('/users', data),
  updateUser: (id: number, data: any) => apiClient.put(`/users/${id}`, data),
  deleteUser: (id: number) => apiClient.delete(`/users/${id}`),

  // Artifacts
  uploadArtifact: (stepId: number, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post(`/artifacts/steps/${stepId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  getStepArtifacts: (stepId: number) => apiClient.get(`/artifacts/steps/${stepId}`),
  deleteArtifact: (id: number) => apiClient.delete(`/artifacts/${id}`),

  // Comments
  createComment: (data: any) => apiClient.post('/comments', data),
  getStepComments: (stepId: number) => apiClient.get(`/comments/steps/${stepId}`),
  updateComment: (id: number, data: any) => apiClient.put(`/comments/${id}`, data),
  deleteComment: (id: number) => apiClient.delete(`/comments/${id}`),
  replyToComment: (id: number, data: any) => apiClient.post(`/comments/${id}/reply`, data),

  // Notifications
  createNotification: (data: any) => apiClient.post('/notifications', data),
  getUserNotifications: (userId: number, isRead?: boolean) => 
    apiClient.get(`/notifications/users/${userId}`, { params: { isRead } }),
  markAsRead: (id: number) => apiClient.put(`/notifications/${id}/read`),
  markAllAsRead: (userId: number) => apiClient.put(`/notifications/users/${userId}/read-all`),
  deleteNotification: (id: number) => apiClient.delete(`/notifications/${id}`),

  // Gantt
  getGanttData: (caseId?: number) => 
    apiClient.get('/gantt', { params: { caseId } }),

  // Search
  searchCases: (params: any) => apiClient.get('/search/cases', { params }),
  searchSteps: (params: any) => apiClient.get('/search/steps', { params }),
}