import { AppShell } from '@/components/layout/app-shell'
import { QueryProvider } from '@/providers/query-provider'
import { ToastProvider } from '@/components/ui/toast'

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <QueryProvider>
      <ToastProvider>
        <AppShell>{children}</AppShell>
      </ToastProvider>
    </QueryProvider>
  )
}
