import { ReactNode } from 'react'
import { AlertTriangle, Trash2, Info, AlertCircle, CheckCircle, X, Loader2 } from 'lucide-react'
import clsx from 'clsx'

export type ConfirmDialogVariant = 'danger' | 'warning' | 'info' | 'success'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string | ReactNode
  confirmText?: string
  cancelText?: string
  variant?: ConfirmDialogVariant
  isLoading?: boolean
  icon?: ReactNode
}

const variantConfig = {
  danger: {
    icon: <Trash2 className="w-5 h-5" />,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    buttonBg: 'bg-red-600 hover:bg-red-700',
    ringColor: 'ring-red-600/20',
  },
  warning: {
    icon: <AlertTriangle className="w-5 h-5" />,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    buttonBg: 'bg-amber-600 hover:bg-amber-700',
    ringColor: 'ring-amber-600/20',
  },
  info: {
    icon: <Info className="w-5 h-5" />,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    buttonBg: 'bg-blue-600 hover:bg-blue-700',
    ringColor: 'ring-blue-600/20',
  },
  success: {
    icon: <CheckCircle className="w-5 h-5" />,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    buttonBg: 'bg-emerald-600 hover:bg-emerald-700',
    ringColor: 'ring-emerald-600/20',
  },
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
  icon,
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const config = variantConfig[variant]

  const handleConfirm = () => {
    if (!isLoading) {
      onConfirm()
    }
  }

  const handleBackdropClick = () => {
    if (!isLoading) {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleBackdropClick}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={handleBackdropClick}
          disabled={isLoading}
          className="absolute top-3 right-3 p-1 hover:bg-gray-100 rounded-lg transition-colors z-10 disabled:opacity-50"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>

        {/* Content */}
        <div className="p-5 text-center">
          {/* Icon */}
          <div className={clsx(
            'w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4',
            config.iconBg, config.iconColor
          )}>
            {icon || config.icon}
          </div>

          {/* Title */}
          <h3 className="text-base font-semibold text-gray-900 mb-1">
            {title}
          </h3>

          {/* Message */}
          <p className="text-sm text-gray-500 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={handleBackdropClick}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={clsx(
              'flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-all flex items-center justify-center gap-2',
              config.buttonBg,
              'disabled:opacity-70 disabled:cursor-not-allowed',
              `focus:ring-2 ${config.ringColor}`
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// Preset confirmation dialogs for common actions
export function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType = 'item',
  isLoading = false,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  itemName?: string
  itemType?: string
  isLoading?: boolean
}) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`Delete ${itemType}?`}
      message={
        itemName ? (
          <>
            Are you sure you want to delete <span className="font-medium text-gray-900">"{itemName}"</span>? This action cannot be undone.
          </>
        ) : (
          `Are you sure you want to delete this ${itemType}? This action cannot be undone.`
        )
      }
      confirmText="Delete"
      variant="danger"
      isLoading={isLoading}
    />
  )
}

export function DiscardChangesDialog({
  isOpen,
  onClose,
  onConfirm,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Discard changes?"
      message="You have unsaved changes. Are you sure you want to leave? Your changes will be lost."
      confirmText="Discard"
      cancelText="Keep editing"
      variant="warning"
      icon={<AlertCircle className="w-5 h-5" />}
    />
  )
}

export function ResetConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Reset to default?',
  message = 'This will reset all settings to their default values. Are you sure?',
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message?: string
}) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      message={message}
      confirmText="Reset"
      variant="warning"
    />
  )
}
