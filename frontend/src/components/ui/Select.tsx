import { SelectHTMLAttributes, ReactNode, forwardRef } from 'react'
import clsx from 'clsx'
import { themeColors, type ThemeSection } from './theme'

interface SelectOption {
  value: string | number
  label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  options: SelectOption[]
  theme?: ThemeSection
  fullWidth?: boolean
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, theme = 'dashboards', fullWidth = true, className, ...props }, ref) => {
    const colors = themeColors[theme]

    return (
      <div className={clsx(fullWidth && 'w-full')}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={clsx(
            'w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm transition-all appearance-none cursor-pointer',
            'focus:outline-none focus:ring-2 focus:bg-white',
            'bg-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%239ca3af\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")] bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat pr-10',
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : `border-gray-200 focus:border-${colors.primary}-500 focus:ring-${colors.ring}`,
            className
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
        {hint && !error && <p className="mt-1.5 text-sm text-gray-500">{hint}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'

export default Select
