import { InputHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  testId?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, testId, name, ...props }, ref) => {
    // nameが指定されていない場合、labelから生成
    const inputName = name || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)
    
    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={inputName}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputName}
          name={inputName}
          data-testid={testId || inputName}
          aria-label={label}
          className={clsx(
            'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500 focus:ring-red-600',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-600" role="alert">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'