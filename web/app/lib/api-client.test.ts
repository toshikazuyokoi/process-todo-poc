import { apiClient, api } from './api-client'

describe('API Client', () => {
  // Mock the axios instance that was created
  const mockGet = jest.fn()
  const mockPost = jest.fn()
  const mockPut = jest.fn()
  const mockDelete = jest.fn()

  beforeAll(() => {
    // @ts-ignore
    apiClient.get = mockGet
    // @ts-ignore
    apiClient.post = mockPost
    // @ts-ignore
    apiClient.put = mockPut
    // @ts-ignore
    apiClient.delete = mockDelete
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Process Templates API', () => {
    it('gets all process templates', async () => {
      mockGet.mockResolvedValue({ data: [] })
      
      await api.getProcessTemplates()
      
      expect(mockGet).toHaveBeenCalledWith('/process-templates')
    })

    it('gets single process template', async () => {
      mockGet.mockResolvedValue({ data: {} })
      
      await api.getProcessTemplate(1)
      
      expect(mockGet).toHaveBeenCalledWith('/process-templates/1')
    })

    it('creates process template', async () => {
      const templateData = { name: 'Test Template' }
      mockPost.mockResolvedValue({ data: { id: 1, ...templateData } })
      
      await api.createProcessTemplate(templateData)
      
      expect(mockPost).toHaveBeenCalledWith('/process-templates', templateData)
    })

    it('updates process template', async () => {
      const templateData = { name: 'Updated Template' }
      mockPut.mockResolvedValue({ data: { id: 1, ...templateData } })
      
      await api.updateProcessTemplate(1, templateData)
      
      expect(mockPut).toHaveBeenCalledWith('/process-templates/1', templateData)
    })

    it('deletes process template', async () => {
      mockDelete.mockResolvedValue({ data: {} })
      
      await api.deleteProcessTemplate(1)
      
      expect(mockDelete).toHaveBeenCalledWith('/process-templates/1')
    })
  })

  describe('Cases API', () => {
    it('gets all cases', async () => {
      mockGet.mockResolvedValue({ data: [] })
      
      await api.getCases()
      
      expect(mockGet).toHaveBeenCalledWith('/cases')
    })

    it('gets single case', async () => {
      mockGet.mockResolvedValue({ data: {} })
      
      await api.getCase(1)
      
      expect(mockGet).toHaveBeenCalledWith('/cases/1')
    })

    it('creates case', async () => {
      const caseData = { title: 'Test Case' }
      mockPost.mockResolvedValue({ data: { id: 1, ...caseData } })
      
      await api.createCase(caseData)
      
      expect(mockPost).toHaveBeenCalledWith('/cases', caseData)
    })

    it('updates case', async () => {
      const caseData = { title: 'Updated Case' }
      mockPut.mockResolvedValue({ data: { id: 1, ...caseData } })
      
      await api.updateCase(1, caseData)
      
      expect(mockPut).toHaveBeenCalledWith('/cases/1', caseData)
    })

    it('deletes case', async () => {
      mockDelete.mockResolvedValue({ data: {} })
      
      await api.deleteCase(1)
      
      expect(mockDelete).toHaveBeenCalledWith('/cases/1')
    })
  })

  describe('Replan API', () => {
    it('previews replan', async () => {
      const replanData = { targetDate: '2025-12-31' }
      mockPost.mockResolvedValue({ data: {} })
      
      await api.previewReplan(1, replanData)
      
      expect(mockPost).toHaveBeenCalledWith('/cases/1/replan/preview', replanData)
    })

    it('applies replan', async () => {
      const replanData = { targetDate: '2025-12-31' }
      mockPost.mockResolvedValue({ data: {} })
      
      await api.applyReplan(1, replanData)
      
      expect(mockPost).toHaveBeenCalledWith('/cases/1/replan/apply', replanData)
    })
  })

  describe('Steps API', () => {
    it('gets step', async () => {
      mockGet.mockResolvedValue({ data: {} })
      
      await api.getStep(1)
      
      expect(mockGet).toHaveBeenCalledWith('/steps/1')
    })

    it('updates step status', async () => {
      mockPut.mockResolvedValue({ data: {} })
      
      await api.updateStepStatus(1, 'completed')
      
      expect(mockPut).toHaveBeenCalledWith('/steps/1/status', { status: 'completed' })
    })

    it('updates step assignee', async () => {
      mockPut.mockResolvedValue({ data: {} })
      
      await api.updateStepAssignee(1, 5)
      
      expect(mockPut).toHaveBeenCalledWith('/steps/1/assignee', { assigneeId: 5 })
    })

    it('locks step', async () => {
      mockPut.mockResolvedValue({ data: {} })
      
      await api.lockStep(1)
      
      expect(mockPut).toHaveBeenCalledWith('/steps/1/lock')
    })

    it('unlocks step', async () => {
      mockPut.mockResolvedValue({ data: {} })
      
      await api.unlockStep(1)
      
      expect(mockPut).toHaveBeenCalledWith('/steps/1/unlock')
    })
  })

  describe('Users API', () => {
    it('gets all users', async () => {
      mockGet.mockResolvedValue({ data: [] })
      
      await api.getUsers()
      
      expect(mockGet).toHaveBeenCalledWith('/users')
    })

    it('creates user', async () => {
      const userData = { name: 'Test User', email: 'test@example.com' }
      mockPost.mockResolvedValue({ data: { id: 1, ...userData } })
      
      await api.createUser(userData)
      
      expect(mockPost).toHaveBeenCalledWith('/users', userData)
    })

    it('updates user', async () => {
      const userData = { name: 'Updated User' }
      mockPut.mockResolvedValue({ data: { id: 1, ...userData } })
      
      await api.updateUser(1, userData)
      
      expect(mockPut).toHaveBeenCalledWith('/users/1', userData)
    })

    it('deletes user', async () => {
      mockDelete.mockResolvedValue({ data: {} })
      
      await api.deleteUser(1)
      
      expect(mockDelete).toHaveBeenCalledWith('/users/1')
    })
  })
})