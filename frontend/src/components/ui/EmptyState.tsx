import { ReactNode } from 'react'
import clsx from 'clsx'
import { themeColors, type ThemeSection } from './theme'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
  theme?: ThemeSection
  className?: string
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  theme = 'dashboards',
  className,
}: EmptyStateProps) {
  const colors = themeColors[theme]

  return (
    <div className={clsx('text-center py-16 bg-white rounded-2xl border border-gray-200', className)}>
      <div className={clsx(
        'w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4',
        `bg-${colors.light}`
      )}>
        <div className={`text-${colors.text}`}>{icon}</div>
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 mb-6 max-w-sm mx-auto">{description}</p>
      {action}
    </div>
  )
}
