'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Box, NavLink, ScrollArea, Text, Divider } from '@mantine/core'
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

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Box
      h="100%"
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: '#F7F8FC',
      }}
    >
      {/* Brand zone */}
      <Box
        px="lg"
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
        }}
      >
        <Box
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: '#4F46E5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Activity size={16} color="white" />
        </Box>
        <Text fw={700} size="sm" c="#111827" style={{ letterSpacing: '-0.01em' }}>
          AiStats
        </Text>
      </Box>

      {/* Navigation */}
      <ScrollArea flex={1} px="sm" py={4}>
        {primaryNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <NavLink
              key={item.name}
              component={Link}
              href={item.href}
              label={item.name}
              leftSection={<item.icon size={18} />}
              active={isActive}
              variant="light"
              color="indigo"
              style={{
                borderRadius: 12,
                fontWeight: 500,
                fontSize: 13,
                marginBottom: 2,
              }}
              styles={{
                root: {
                  '&[dataActive]': {
                    backgroundColor: '#EEF2FF',
                    color: '#4338CA',
                    fontWeight: 600,
                  },
                },
                label: {
                  fontSize: 13,
                },
              }}
            />
          )
        })}

        <Divider my="sm" color="#E5E7EB" />

        <Text
          size="xs"
          fw={600}
          tt="uppercase"
          c="#9CA3AF"
          px="sm"
          mb={4}
          style={{ letterSpacing: '0.06em', fontSize: 11 }}
        >
          Analytics
        </Text>
        {analyticsNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <NavLink
              key={item.name}
              component={Link}
              href={item.href}
              label={item.name}
              leftSection={<item.icon size={18} />}
              active={isActive}
              variant="light"
              color="indigo"
              style={{
                borderRadius: 12,
                fontWeight: 500,
                fontSize: 13,
                marginBottom: 2,
              }}
              styles={{
                label: {
                  fontSize: 13,
                },
              }}
            />
          )
        })}

        <Divider my="sm" color="#E5E7EB" />

        {utilityNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <NavLink
              key={item.name}
              component={Link}
              href={item.href}
              label={item.name}
              leftSection={<item.icon size={18} />}
              active={isActive}
              variant="light"
              color="indigo"
              style={{
                borderRadius: 12,
                fontWeight: 500,
                fontSize: 13,
                marginBottom: 2,
              }}
              styles={{
                label: {
                  fontSize: 13,
                },
              }}
            />
          )
        })}
      </ScrollArea>

      {/* Footer */}
      <Box
        px="lg"
        py="sm"
        style={{
          borderTop: '1px solid #E5E7EB',
          flexShrink: 0,
        }}
      >
        <Box style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Box
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#12B76A',
              animation: 'pulse 2s infinite',
            }}
          />
          <Text size="xs" c="#9CA3AF" fw={500}>
            System online
          </Text>
        </Box>
      </Box>
    </Box>
  )
}
