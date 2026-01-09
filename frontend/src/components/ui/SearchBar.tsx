import { Search, X } from 'lucide-react'
import clsx from 'clsx'
import { themeColors, type ThemeSection } from './theme'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  theme?: ThemeSection
  className?: string
}

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  theme = 'dashboards',
  className,
}: SearchBarProps) {
  const colors = themeColors[theme]

  return (
    <div className={clsx('relative flex-1', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={clsx(
          'w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm',
          'focus:outline-none focus:ring-2 focus:border-transparent focus:bg-white transition-all',
          `focus:ring-${colors.ring}`
        )}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-200 rounded-full transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      )}
    </div>
  )
}
