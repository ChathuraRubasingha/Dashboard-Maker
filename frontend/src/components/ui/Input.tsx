import { InputHTMLAttributes, ReactNode, forwardRef } from 'react'
import clsx from 'clsx'
import { themeColors, type ThemeSection } from './theme'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: ReactNode
  theme?: ThemeSection
  fullWidth?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, theme = 'dashboards', fullWidth = true, className, ...props }, ref) => {
    const colors = themeColors[theme]

    return (
      <div className={clsx(fullWidth && 'w-full')}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={clsx(
              'w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm transition-all',
              'focus:outline-none focus:ring-2 focus:bg-white',
              icon && 'pl-10',
              error
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : `border-gray-200 focus:border-${colors.primary}-500 focus:ring-${colors.ring}`,
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
        {hint && !error && <p className="mt-1.5 text-sm text-gray-500">{hint}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
