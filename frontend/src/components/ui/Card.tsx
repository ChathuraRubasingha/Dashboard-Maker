import { ReactNode } from 'react'
import clsx from 'clsx'
import { themeColors, type ThemeSection } from './theme'

interface CardProps {
  children: ReactNode
  theme?: ThemeSection
  hover?: boolean
  selected?: boolean
  onClick?: () => void
  className?: string
}

export default function Card({
  children,
  theme = 'dashboards',
  hover = false,
  selected = false,
  onClick,
  className,
}: CardProps) {
  const colors = themeColors[theme]

  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-white rounded-xl border overflow-hidden transition-all duration-200',
        hover && !selected && `border-gray-200 hover:border-${colors.border} hover:shadow-lg hover:shadow-${colors.primary}-100 cursor-pointer`,
        selected && `border-2 border-${colors.primary}-500 shadow-lg`,
        !hover && !selected && 'border-gray-200',
        className
      )}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  children: ReactNode
  className?: string
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={clsx('px-4 py-3 border-b border-gray-100', className)}>
      {children}
    </div>
  )
}

interface CardBodyProps {
  children: ReactNode
  className?: string
}

export function CardBody({ children, className }: CardBodyProps) {
  return <div className={clsx('p-4', className)}>{children}</div>
}

interface CardFooterProps {
  children: ReactNode
  className?: string
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div className={clsx('px-4 py-3 border-t border-gray-100 bg-gray-50', className)}>
      {children}
    </div>
  )
}
