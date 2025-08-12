import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from './input'

describe('Input', () => {
  it('renders basic input', () => {
    render(<Input />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('renders with label', () => {
    render(<Input label="Email Address" />)
    expect(screen.getByText('Email Address')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('shows error message', () => {
    render(<Input error="This field is required" />)
    expect(screen.getByText('This field is required')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveClass('border-red-500')
  })

  it('renders with label and error', () => {
    render(<Input label="Username" error="Username is taken" />)
    expect(screen.getByText('Username')).toBeInTheDocument()
    expect(screen.getByText('Username is taken')).toBeInTheDocument()
  })

  it('accepts input value', async () => {
    const user = userEvent.setup()
    render(<Input />)
    const input = screen.getByRole('textbox')
    
    await user.type(input, 'test input')
    expect(input).toHaveValue('test input')
  })

  it('handles onChange event', async () => {
    const user = userEvent.setup()
    const handleChange = jest.fn()
    render(<Input onChange={handleChange} />)
    
    const input = screen.getByRole('textbox')
    await user.type(input, 'a')
    
    expect(handleChange).toHaveBeenCalled()
  })

  it('can be disabled', () => {
    render(<Input disabled />)
    const input = screen.getByRole('textbox')
    expect(input).toBeDisabled()
    expect(input).toHaveClass('disabled:opacity-50')
  })

  it('accepts placeholder', () => {
    render(<Input placeholder="Enter your email" />)
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument()
  })

  it('accepts different input types', () => {
    const { rerender, container } = render(<Input type="email" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email')

    rerender(<Input type="password" />)
    // Password inputs don't have role="textbox", query by input element
    const passwordInput = container.querySelector('input')
    expect(passwordInput).toHaveAttribute('type', 'password')

    rerender(<Input type="tel" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'tel')
  })

  it('accepts additional className', () => {
    render(<Input className="custom-input" />)
    expect(screen.getByRole('textbox')).toHaveClass('custom-input')
  })

  it('forwards ref correctly', () => {
    const ref = jest.fn()
    render(<Input ref={ref} />)
    expect(ref).toHaveBeenCalled()
  })

  it('passes through other HTML input props', () => {
    render(
      <Input
        name="email"
        id="email-input"
        maxLength={50}
        required
        autoComplete="email"
      />
    )
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('name', 'email')
    expect(input).toHaveAttribute('id', 'email-input')
    expect(input).toHaveAttribute('maxLength', '50')
    expect(input).toHaveAttribute('required')
    expect(input).toHaveAttribute('autoComplete', 'email')
  })

  it('applies correct styles when error is present', () => {
    const { rerender } = render(<Input />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('border-gray-300')
    expect(input).not.toHaveClass('border-red-500')

    rerender(<Input error="Error message" />)
    expect(input).toHaveClass('border-red-500')
    expect(input).toHaveClass('focus:ring-red-600')
  })
})