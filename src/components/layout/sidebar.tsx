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

  const renderNavItem = (item: typeof primaryNav[number]) => {
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
        styles={{
          root: {
            borderRadius: 12,
            fontWeight: 500,
            fontSize: 14,
            height: 42,
            paddingLeft: 14,
            paddingRight: 14,
            marginBottom: 2,
            transition: 'background 0.14s ease',
            ...(isActive
              ? {
                  backgroundColor: '#EEF2FF',
                  color: '#4338CA',
                  fontWeight: 600,
                }
              : {}),
            '&:hover': {
              backgroundColor: isActive ? '#EEF2FF' : '#F1F5F9',
            },
          },
          label: {
            fontSize: 14,
            fontWeight: isActive ? 600 : 500,
          },
          section: {
            color: isActive ? '#4F46E5' : undefined,
          },
        }}
      />
    )
  }

  return (
    <Box
      h="100%"
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: '#F7F8FC',
        borderRight: '1px solid #E7EAF0',
        width: 248,
      }}
    >
      {/* Brand zone */}
      <Box
        px={20}
        style={{
          height: 72,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
        }}
      >
        <Box
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
          }}
        >
          <Activity size={17} color="white" />
        </Box>
        <Text fw={700} c="#0F172A" style={{ fontSize: 16, letterSpacing: '-0.01em' }}>
          Analytics
        </Text>
      </Box>

      {/* Navigation */}
      <ScrollArea flex={1} px={10} py={4}>
        {primaryNav.map(renderNavItem)}

        <Divider my="sm" color="#E7EAF0" />

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
        {analyticsNav.map(renderNavItem)}

        <Divider my="sm" color="#E7EAF0" />

        {utilityNav.map(renderNavItem)}
      </ScrollArea>

      {/* Footer */}
      <Box
        px={20}
        py="sm"
        style={{
          borderTop: '1px solid #E7EAF0',
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
