import { ReactNode, ButtonHTMLAttributes } from 'react'
import clsx from 'clsx'
import { themeColors, type ThemeSection } from './theme'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'hero'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  theme?: ThemeSection
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  loading?: boolean
  children: ReactNode
}

export default function Button({
  variant = 'primary',
  size = 'md',
  theme = 'dashboards',
  icon,
  iconPosition = 'left',
  loading = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const colors = themeColors[theme]

  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-offset-2'

  const variantStyles: Record<ButtonVariant, string> = {
    primary: clsx(
      `bg-${colors.primary}-600 text-white`,
      `hover:bg-${colors.primary}-700`,
      `focus:ring-${colors.ring}`,
      'shadow-sm'
    ),
    secondary: clsx(
      'bg-gray-50 border border-gray-200 text-gray-700',
      'hover:bg-gray-100',
      'focus:ring-gray-400'
    ),
    ghost: clsx(
      'text-gray-600',
      'hover:bg-gray-100',
      'focus:ring-gray-400'
    ),
    danger: clsx(
      'bg-red-50 border border-red-200 text-red-700',
      'hover:bg-red-100',
      'focus:ring-red-400'
    ),
    hero: clsx(
      `bg-white text-${colors.text}`,
      `hover:bg-${colors.light}`,
      `focus:ring-white`,
      `shadow-lg shadow-${colors.primary}-900/20`
    ),
  }

  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'gap-1.5 px-3 py-1.5 text-sm',
    md: 'gap-2 px-4 py-2 text-sm',
    lg: 'gap-2 px-5 py-2.5 text-base',
  }

  const disabledStyles = 'opacity-50 cursor-not-allowed'

  return (
    <button
      className={clsx(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        (disabled || loading) && disabledStyles,
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span>Loading...</span>
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && icon}
          {children}
          {icon && iconPosition === 'right' && icon}
        </>
      )}
    </button>
  )
}
