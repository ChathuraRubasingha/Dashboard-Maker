import { useState, ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import { themeColors, type ThemeSection } from './theme'

interface DropdownOption<T> {
  value: T
  label: string
}

interface DropdownProps<T> {
  value: T
  onChange: (value: T) => void
  options: DropdownOption<T>[]
  icon?: ReactNode
  theme?: ThemeSection
  className?: string
  buttonClassName?: string
  showLabelOnMobile?: boolean
}

export default function Dropdown<T extends string | number>({
  value,
  onChange,
  options,
  icon,
  theme = 'dashboards',
  className,
  buttonClassName,
  showLabelOnMobile = false,
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const colors = themeColors[theme]

  const selectedOption = options.find((o) => o.value === value)

  return (
    <div className={clsx('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition-colors',
          buttonClassName
        )}
      >
        {icon}
        <span className={clsx(!showLabelOnMobile && 'hidden sm:inline')}>
          {selectedOption?.label}
        </span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20">
            {options.map((option) => (
              <button
                key={String(option.value)}
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className={clsx(
                  'w-full px-4 py-2 text-sm text-left transition-colors',
                  value === option.value
                    ? `bg-${colors.light} text-${colors.text}`
                    : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
