import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'
import clsx from 'clsx'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

const toastConfig = {
  success: {
    icon: <CheckCircle className="w-4 h-4" />,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    borderColor: 'border-l-emerald-500',
    titleColor: 'text-emerald-900',
  },
  error: {
    icon: <AlertCircle className="w-4 h-4" />,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    borderColor: 'border-l-red-500',
    titleColor: 'text-red-900',
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4" />,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    borderColor: 'border-l-amber-500',
    titleColor: 'text-amber-900',
  },
  info: {
    icon: <Info className="w-4 h-4" />,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    borderColor: 'border-l-blue-500',
    titleColor: 'text-blue-900',
  },
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const config = toastConfig[toast.type]

  return (
    <div
      className={clsx(
        'bg-white rounded-lg shadow-lg border border-gray-200 border-l-4 p-3 min-w-[280px] max-w-sm',
        'animate-in slide-in-from-right duration-300',
        config.borderColor
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className={clsx(
          'p-1.5 rounded-lg flex-shrink-0',
          config.iconBg, config.iconColor
        )}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <p className={clsx('text-sm font-medium', config.titleColor)}>
            {toast.title}
          </p>
          {toast.message && (
            <p className="text-xs text-gray-500 mt-0.5">{toast.message}</p>
          )}
        </div>
        <button
          onClick={onRemove}
          className="p-0.5 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
        >
          <X className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast = { ...toast, id }

    setToasts((prev) => [...prev, newToast])

    // Auto remove after duration (default 4 seconds)
    const duration = toast.duration ?? 4000
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }, [removeToast])

  const success = useCallback((title: string, message?: string) => {
    addToast({ type: 'success', title, message })
  }, [addToast])

  const error = useCallback((title: string, message?: string) => {
    addToast({ type: 'error', title, message, duration: 6000 })
  }, [addToast])

  const warning = useCallback((title: string, message?: string) => {
    addToast({ type: 'warning', title, message })
  }, [addToast])

  const info = useCallback((title: string, message?: string) => {
    addToast({ type: 'info', title, message })
  }, [addToast])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}

      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onRemove={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// Standalone toast functions for use outside React components
let toastFunctions: ToastContextType | null = null

export function setToastFunctions(fns: ToastContextType) {
  toastFunctions = fns
}

export const toast = {
  success: (title: string, message?: string) => toastFunctions?.success(title, message),
  error: (title: string, message?: string) => toastFunctions?.error(title, message),
  warning: (title: string, message?: string) => toastFunctions?.warning(title, message),
  info: (title: string, message?: string) => toastFunctions?.info(title, message),
}
