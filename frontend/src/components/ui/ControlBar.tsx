import { ReactNode } from 'react'
import { Grid3X3, List } from 'lucide-react'
import clsx from 'clsx'
import { themeColors, type ThemeSection } from './theme'

type ViewMode = 'grid' | 'list'

interface ControlBarProps {
  children: ReactNode
  theme?: ThemeSection
  viewMode?: ViewMode
  onViewModeChange?: (mode: ViewMode) => void
  showViewToggle?: boolean
  className?: string
}

export default function ControlBar({
  children,
  theme = 'dashboards',
  viewMode = 'grid',
  onViewModeChange,
  showViewToggle = true,
  className,
}: ControlBarProps) {
  const colors = themeColors[theme]

  return (
    <div className={clsx('bg-white rounded-xl border border-gray-200 shadow-sm p-4', className)}>
      <div className="flex flex-col sm:flex-row gap-4">
        {children}

        {showViewToggle && onViewModeChange && (
          <>
            {/* Divider */}
            <div className="w-px h-8 bg-gray-200 hidden sm:block self-center" />

            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1 self-center">
              <button
                onClick={() => onViewModeChange('grid')}
                className={clsx(
                  'p-2 rounded-md transition-colors',
                  viewMode === 'grid'
                    ? `bg-white text-${colors.text} shadow-sm`
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onViewModeChange('list')}
                className={clsx(
                  'p-2 rounded-md transition-colors',
                  viewMode === 'list'
                    ? `bg-white text-${colors.text} shadow-sm`
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
