import { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import clsx from 'clsx'

interface ToolbarHeaderProps {
  title: string
  subtitle?: string
  backTo?: string
  onBack?: () => void
  leftContent?: ReactNode
  rightContent?: ReactNode
  badge?: ReactNode
  className?: string
}

export default function ToolbarHeader({
  title,
  subtitle,
  backTo,
  onBack,
  leftContent,
  rightContent,
  badge,
  className,
}: ToolbarHeaderProps) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else if (backTo) {
      navigate(backTo)
    } else {
      navigate(-1)
    }
  }

  return (
    <div className={clsx('sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200/80', className)}>
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left side */}
        <div className="flex items-center gap-4">
          {(backTo || onBack) && (
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          )}

          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
              {badge}
            </div>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
            )}
          </div>

          {leftContent}
        </div>

        {/* Right side */}
        {rightContent && (
          <div className="flex items-center gap-2">{rightContent}</div>
        )}
      </div>
    </div>
  )
}
