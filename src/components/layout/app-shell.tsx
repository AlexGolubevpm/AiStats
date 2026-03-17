'use client'

import { usePathname } from 'next/navigation'
import { AppShell as MantineAppShell, Burger, Box } from '@mantine/core'
import { useDisclosure, useMediaQuery } from '@mantine/hooks'
import { AnimatePresence, motion } from 'framer-motion'
import { pageTransition } from '@/lib/motion'
import { AppSidebar } from './sidebar'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [opened, { toggle, close }] = useDisclosure()
  const pathname = usePathname()
  const isMobile = useMediaQuery('(max-width: 75em)')

  return (
    <MantineAppShell
      navbar={{
        width: 256,
        breakpoint: 'lg',
        collapsed: { mobile: !opened },
      }}
      padding={0}
      styles={{
        main: {
          background: '#F6F8FB',
          minHeight: '100vh',
        },
        navbar: {
          borderRight: '1px solid #E5E7EB',
          background: '#F7F8FC',
        },
      }}
    >
      <MantineAppShell.Navbar onClick={isMobile ? close : undefined}>
        <AppSidebar />
      </MantineAppShell.Navbar>

      <MantineAppShell.Main>
        {/* Mobile burger */}
        {isMobile && (
          <Box
            pos="fixed"
            top={16}
            left={16}
            style={{ zIndex: 200 }}
            hiddenFrom="lg"
          >
            <Burger
              opened={opened}
              onClick={toggle}
              size="sm"
              aria-label="Toggle navigation"
              styles={{
                root: {
                  background: 'white',
                  borderRadius: 8,
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 1px 3px rgba(16,24,40,0.06)',
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                },
              }}
            />
          </Box>
        )}

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
      </MantineAppShell.Main>
    </MantineAppShell>
  )
}
