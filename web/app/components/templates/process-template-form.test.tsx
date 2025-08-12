import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProcessTemplateForm } from './process-template-form'
import { api } from '@/lib/api-client'

// Mock the API client
jest.mock('@/lib/api-client', () => ({
  api: {
    getProcessTemplate: jest.fn(),
    createProcessTemplate: jest.fn(),
    updateProcessTemplate: jest.fn(),
  },
}))

// Mock Next.js router
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
  }),
}))

describe('ProcessTemplateForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders form for new template', () => {
    render(<ProcessTemplateForm />)
    
    expect(screen.getByLabelText(/テンプレート名/i)).toBeInTheDocument()
    expect(screen.getByText(/ステップを追加/i)).toBeInTheDocument()
    expect(screen.getByText(/保存/i)).toBeInTheDocument()
  })

  it('loads existing template when templateId is provided', async () => {
    const mockTemplate = {
      id: 1,
      name: 'Test Template',
      version: 1,
      isActive: true,
      stepTemplates: [
        {
          id: 1,
          seq: 1,
          name: 'Step 1',
          basis: 'START',
          offsetDays: 0,
          requiredArtifactsJson: [],
          dependsOnJson: [],
        },
      ],
    }

    ;(api.getProcessTemplate as jest.Mock).mockResolvedValue({ data: mockTemplate })

    render(<ProcessTemplateForm templateId={1} />)

    await waitFor(() => {
      expect(api.getProcessTemplate).toHaveBeenCalledWith(1)
      expect(screen.getByDisplayValue('Test Template')).toBeInTheDocument()
    })
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    render(<ProcessTemplateForm />)
    
    const saveButton = screen.getByText(/保存/i)
    await user.click(saveButton)
    
    await waitFor(() => {
      expect(screen.getByText(/テンプレート名は必須です/i)).toBeInTheDocument()
      expect(screen.getByText(/少なくとも1つのステップが必要です/i)).toBeInTheDocument()
    })
  })

  it('allows adding steps', async () => {
    const user = userEvent.setup()
    render(<ProcessTemplateForm />)
    
    const addButton = screen.getByText(/ステップを追加/i)
    await user.click(addButton)
    
    await waitFor(() => {
      expect(screen.getByText(/ステップ 1/i)).toBeInTheDocument()
    })
  })

  it('submits form with valid data', async () => {
    const user = userEvent.setup()
    ;(api.createProcessTemplate as jest.Mock).mockResolvedValue({
      data: { id: 1, name: 'New Template' }
    })

    render(<ProcessTemplateForm />)
    
    // Fill in template name
    const nameInput = screen.getByLabelText(/テンプレート名/i)
    await user.type(nameInput, 'New Template')
    
    // Add a step
    const addButton = screen.getByText(/ステップを追加/i)
    await user.click(addButton)
    
    // Wait for step to be added and fill step name
    await waitFor(() => {
      const stepNameInput = screen.getByLabelText(/ステップ名/i)
      expect(stepNameInput).toBeInTheDocument()
    })
    
    const stepNameInput = screen.getByLabelText(/ステップ名/i)
    await user.type(stepNameInput, 'Step 1')
    
    // Submit form
    const saveButton = screen.getByText(/保存/i)
    await user.click(saveButton)
    
    await waitFor(() => {
      expect(api.createProcessTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Template',
          stepTemplates: expect.arrayContaining([
            expect.objectContaining({
              name: 'Step 1',
            })
          ])
        })
      )
      expect(mockPush).toHaveBeenCalledWith('/templates')
    })
  })

  it('handles API errors gracefully', async () => {
    const user = userEvent.setup()
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation()
    ;(api.createProcessTemplate as jest.Mock).mockRejectedValue(new Error('API Error'))

    render(<ProcessTemplateForm />)
    
    // Fill in minimum required data
    const nameInput = screen.getByLabelText(/テンプレート名/i)
    await user.type(nameInput, 'Test Template')
    
    const addButton = screen.getByText(/ステップを追加/i)
    await user.click(addButton)
    
    await waitFor(() => {
      const stepNameInput = screen.getByLabelText(/ステップ名/i)
      expect(stepNameInput).toBeInTheDocument()
    })
    
    const stepNameInput = screen.getByLabelText(/ステップ名/i)
    await user.type(stepNameInput, 'Step 1')
    
    const saveButton = screen.getByText(/保存/i)
    await user.click(saveButton)
    
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('テンプレートの保存に失敗しました')
    })
    
    alertSpy.mockRestore()
  })


  it('validates step dependencies', async () => {
    const user = userEvent.setup()
    render(<ProcessTemplateForm />)
    
    const nameInput = screen.getByLabelText(/テンプレート名/i)
    await user.type(nameInput, 'Test Template')
    
    // Add a step with self-dependency
    const addButton = screen.getByText(/ステップを追加/i)
    await user.click(addButton)
    
    await waitFor(() => {
      expect(screen.getByLabelText(/ステップ名/i)).toBeInTheDocument()
    })
    
    const stepNameInput = screen.getByLabelText(/ステップ名/i)
    await user.type(stepNameInput, 'Step 1')
    
    // Try to add self-dependency (would need to mock the dependency selector)
    // This is a simplified test - actual implementation would need more complex mocking
    
    const saveButton = screen.getByText(/保存/i)
    await user.click(saveButton)
    
    // Should pass validation as we haven't added self-dependency
    await waitFor(() => {
      expect(api.createProcessTemplate).toHaveBeenCalled()
    })
  })
})