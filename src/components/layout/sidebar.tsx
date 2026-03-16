'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Layers,
  Globe,
  TrendingUp,
  FileText,
  Brain,
  Settings,
  Activity,
} from 'lucide-react'

const primaryNav = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Bundles', href: '/bundles', icon: Layers },
  { name: 'Sites', href: '/sites', icon: Globe },
]

const analyticsNav = [
  { name: 'Forecast', href: '/forecast', icon: TrendingUp },
  { name: 'Conclusions', href: '/conclusions', icon: FileText },
  { name: 'Analysis', href: '/analysis', icon: Brain },
]

const utilityNav = [
  { name: 'Settings', href: '/settings', icon: Settings },
]

function SidebarSection({ label, items }: { label?: string; items: typeof primaryNav }) {
  const pathname = usePathname()

  return (
    <div>
      {label && (
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-disabled)]">
          {label}
        </p>
      )}
      <div className="space-y-[6px]">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-150',
                isActive
                  ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)]'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]'
              )}
            >
              <item.icon
                className={cn(
                  'h-[18px] w-[18px] shrink-0',
                  isActive ? 'text-[var(--color-primary-600)]' : ''
                )}
              />
              {item.name}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[260px] flex-col border-r border-[var(--color-border-subtle)] bg-[var(--color-sidebar-bg)]">
      {/* Brand zone */}
      <div className="flex h-[64px] items-center gap-2.5 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary-600)]">
          <Activity className="h-4 w-4 text-white" />
        </div>
        <span className="text-[15px] font-bold tracking-tight text-[var(--color-text-primary)]">
          AiStats
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-2">
        <div className="space-y-6">
          <SidebarSection items={primaryNav} />
          <SidebarSection label="Analytics" items={analyticsNav} />
          <SidebarSection items={utilityNav} />
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-[var(--color-border-subtle)] px-5 py-3">
        <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-disabled)]">
          <div className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
          <span>System online</span>
        </div>
      </div>
    </aside>
  )
}
