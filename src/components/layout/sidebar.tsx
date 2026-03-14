'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Layers,
  Globe,
  DollarSign,
  Handshake,
  TrendingUp,
  FileText,
  Brain,
  Settings,
  Activity,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Bundles', href: '/bundles', icon: Layers },
  { name: 'Sites', href: '/sites', icon: Globe },
  { name: 'Costs', href: '/costs', icon: DollarSign },
  { name: 'Affiliate', href: '/affiliate', icon: Handshake },
  { name: 'Forecast', href: '/forecast', icon: TrendingUp },
  { name: 'Conclusions', href: '/conclusions', icon: FileText },
  { name: 'Analysis', href: '/analysis', icon: Brain },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[260px] flex-col border-r border-[var(--color-border)] bg-[var(--color-sidebar)]">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-[var(--color-border)] px-6">
        <Activity className="h-6 w-6 text-[var(--color-accent)]" />
        <span className="text-lg font-semibold tracking-tight">AiStats</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[var(--color-sidebar-active)] text-[var(--color-text-primary)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-sidebar-active)] hover:text-[var(--color-text-primary)]'
                )}
              >
                <item.icon className={cn('h-4.5 w-4.5', isActive && 'text-[var(--color-accent)]')} />
                {item.name}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-[var(--color-border)] px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>System online</span>
        </div>
      </div>
    </aside>
  )
}
