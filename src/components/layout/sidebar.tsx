'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { slideInLeft } from '@/lib/motion'
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
  Menu,
  X,
} from 'lucide-react'

const primaryNav = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Bundles', href: '/bundles', icon: Layers },
  { name: 'Sites', href: '/sites', icon: Globe },
  { name: 'Costs', href: '/costs', icon: DollarSign },
  { name: 'Affiliate', href: '/affiliate', icon: Handshake },
]

const analyticsNav = [
  { name: 'Forecast', href: '/forecast', icon: TrendingUp },
  { name: 'Conclusions', href: '/conclusions', icon: FileText },
  { name: 'Analysis', href: '/analysis', icon: Brain },
]

const utilityNav = [
  { name: 'Settings', href: '/settings', icon: Settings },
]

function SidebarSection({ label, items, onNavigate }: { label?: string; items: typeof primaryNav; onNavigate?: () => void }) {
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
              onClick={onNavigate}
              className={cn(
                'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-150',
                isActive
                  ? 'text-[var(--color-primary-700)]'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl bg-[var(--color-primary-50)]"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                />
              )}
              <item.icon
                className={cn(
                  'relative z-10 h-[18px] w-[18px] shrink-0',
                  isActive ? 'text-[var(--color-primary-600)]' : ''
                )}
              />
              <span className="relative z-10">{item.name}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  const closeMobile = () => setMobileOpen(false)

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface)] shadow-sm lg:hidden"
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5 text-[var(--color-text-secondary)]" />
      </button>

      {/* Mobile sidebar with AnimatePresence */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Overlay backdrop for mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={closeMobile}
            />

            {/* Mobile sidebar */}
            <motion.aside
              variants={slideInLeft}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed left-0 top-0 z-50 flex h-screen w-[260px] flex-col border-r border-[var(--color-border-subtle)] bg-[var(--color-sidebar-bg)] lg:hidden"
            >
              {/* Brand zone */}
              <div className="flex h-[64px] items-center justify-between px-5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary-600)] hover:shadow-[var(--shadow-glow-primary)]">
                    <Activity className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-[15px] font-bold tracking-tight text-[var(--color-text-primary)]">
                    AiStats
                  </span>
                </div>
                <button
                  onClick={closeMobile}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] lg:hidden"
                  aria-label="Close sidebar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 overflow-y-auto px-4 py-2">
                <div className="space-y-6">
                  <SidebarSection items={primaryNav} onNavigate={closeMobile} />
                  <SidebarSection label="Analytics" items={analyticsNav} onNavigate={closeMobile} />
                  <SidebarSection items={utilityNav} onNavigate={closeMobile} />
                </div>
              </nav>

              {/* Footer */}
              <div className="border-t border-[var(--color-border-subtle)] px-5 py-3">
                <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-disabled)]">
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-success)]" />
                  <span>System online</span>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar (always visible on lg+) */}
      <aside
        className="fixed left-0 top-0 z-40 hidden h-screen w-[260px] flex-col border-r border-[var(--color-border-subtle)] bg-[var(--color-sidebar-bg)] lg:flex"
      >
        {/* Brand zone */}
        <div className="flex h-[64px] items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary-600)] hover:shadow-[var(--shadow-glow-primary)]">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <span className="text-[15px] font-bold tracking-tight text-[var(--color-text-primary)]">
              AiStats
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-2">
          <div className="space-y-6">
            <SidebarSection items={primaryNav} onNavigate={closeMobile} />
            <SidebarSection label="Analytics" items={analyticsNav} onNavigate={closeMobile} />
            <SidebarSection items={utilityNav} onNavigate={closeMobile} />
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-[var(--color-border-subtle)] px-5 py-3">
          <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-disabled)]">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-success)]" />
            <span>System online</span>
          </div>
        </div>
      </aside>
    </>
  )
}
