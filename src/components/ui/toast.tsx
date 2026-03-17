'use client'

import { useState, useCallback, createContext, useContext, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, AlertTriangle, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning'

interface Toast {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const icons = {
    success: <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />,
    error: <XCircle className="h-4 w-4 text-[var(--color-danger)]" />,
    warning: <AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" />,
  }

  const bgColors = {
    success: 'bg-[var(--color-success-bg)] border-[var(--color-success)]',
    error: 'bg-[var(--color-danger-bg)] border-[var(--color-danger)]',
    warning: 'bg-[var(--color-warning-bg)] border-[var(--color-warning)]',
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`flex items-center gap-2.5 rounded-[var(--radius-control)] border px-4 py-3 shadow-[var(--shadow-elevated)] ${bgColors[t.type]}`}
            >
              {icons[t.type]}
              <span className="text-[13px] font-medium text-[var(--color-text-primary)]">{t.message}</span>
              <button onClick={() => dismiss(t.id)} className="ml-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
