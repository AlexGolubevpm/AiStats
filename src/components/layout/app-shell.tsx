import { Sidebar } from './sidebar'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[var(--color-app-bg)]">
      <Sidebar />
      <main className="ml-[260px] min-h-screen">{children}</main>
    </div>
  )
}
