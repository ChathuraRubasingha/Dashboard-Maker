import clsx from 'clsx'
import { themeColors, type ThemeSection } from './theme'

interface LoadingSpinnerProps {
  theme?: ThemeSection
  size?: 'sm' | 'md' | 'lg'
  text?: string
  className?: string
}

export default function LoadingSpinner({
  theme = 'dashboards',
  size = 'md',
  text,
  className,
}: LoadingSpinnerProps) {
  const colors = themeColors[theme]

  const sizeStyles = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-12 h-12 border-4',
  }

  return (
    <div className={clsx('flex flex-col items-center justify-center py-20', className)}>
      <div
        className={clsx(
          'rounded-full animate-spin border-t-transparent',
          sizeStyles[size],
          `border-${colors.primary}-600`
        )}
      />
      {text && <p className="text-gray-500 text-sm mt-4">{text}</p>}
    </div>
  )
}
