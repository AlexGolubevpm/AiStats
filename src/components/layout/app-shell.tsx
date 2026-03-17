'use client'

import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { pageTransition } from '@/lib/motion'
import { Sidebar } from './sidebar'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-[var(--color-app-bg)]">
      <Sidebar />
      <main className="min-h-screen lg:ml-[260px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            variants={pageTransition}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
