import { AppShell } from '@/components/layout/app-shell'
import { QueryProvider } from '@/providers/query-provider'

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <QueryProvider>
      <AppShell>{children}</AppShell>
    </QueryProvider>
  )
}
