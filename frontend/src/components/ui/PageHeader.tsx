import { ReactNode } from 'react'
import clsx from 'clsx'
import { themeColors, type ThemeSection } from './theme'

interface StatItem {
  icon: ReactNode
  label: string
  value: string | number
}

interface PageHeaderProps {
  theme: ThemeSection
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
  stats?: StatItem[]
  className?: string
}

export default function PageHeader({
  theme,
  icon,
  title,
  description,
  action,
  stats,
  className,
}: PageHeaderProps) {
  const colors = themeColors[theme]

  return (
    <div className={clsx('relative overflow-hidden rounded-2xl', className)}>
      {/* Gradient background */}
      <div className={clsx('absolute inset-0 bg-gradient-to-br', colors.gradient)} />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-grid-white/10" />

      {/* Decorative blur elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className={clsx(
        'absolute bottom-0 left-0 w-64 h-64 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2',
        `bg-${colors.primary}-400/20`
      )} />

      {/* Content */}
      <div className="relative px-6 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                {icon}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{title}</h1>
            </div>
            <p className={clsx('max-w-lg', `text-${colors.primary}-100`)}>
              {description}
            </p>
          </div>
          {action}
        </div>

        {/* Stats */}
        {stats && stats.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
                <div className={clsx('flex items-center gap-2 text-sm mb-1', `text-${colors.primary}-200`)}>
                  {stat.icon}
                  {stat.label}
                </div>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
