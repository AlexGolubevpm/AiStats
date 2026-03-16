import { cn } from '@/lib/utils'
import { Database, AlertCircle, Inbox } from 'lucide-react'

type EmptyStateVariant = 'default' | 'error' | 'no-data'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  variant?: EmptyStateVariant
  className?: string
}

const variantConfig = {
  default: {
    icon: <Database className="h-8 w-8 text-[var(--color-text-muted)]" />,
    iconBg: 'bg-[var(--color-background)]',
    titleClass: 'text-sm font-medium text-[var(--color-text-primary)]',
    descClass: 'mt-1 max-w-sm text-sm text-[var(--color-text-muted)]',
  },
  error: {
    icon: <AlertCircle className="h-8 w-8 text-[var(--color-danger)]" />,
    iconBg: 'bg-[var(--color-danger-bg)]',
    titleClass: 'text-sm font-medium text-[var(--color-text-primary)]',
    descClass: 'mt-1 max-w-sm text-sm text-[var(--color-text-muted)]',
  },
  'no-data': {
    icon: <Inbox className="h-8 w-8 text-[var(--color-text-disabled)]" />,
    iconBg: 'bg-[var(--color-surface-secondary)]',
    titleClass: 'text-sm font-medium text-[var(--color-text-muted)]',
    descClass: 'mt-1 max-w-sm text-sm text-[var(--color-text-disabled)]',
  },
}

export function EmptyState({ title, description, icon, action, variant = 'default', className }: EmptyStateProps) {
  const config = variantConfig[variant]

  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <div className={cn('mb-4 rounded-full p-4', config.iconBg)}>
        {icon || config.icon}
      </div>
      <h3 className={config.titleClass}>{title}</h3>
      {description && (
        <p className={config.descClass}>{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
