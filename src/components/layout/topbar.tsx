'use client'

import { Suspense, useState } from 'react'
import { Group, Box, Text, ActionIcon, Menu, Skeleton, Badge } from '@mantine/core'
import { motion } from 'framer-motion'
import { RefreshCw, Loader2, Download, GitCompare, Check } from 'lucide-react'
import { PeriodSelector } from '@/components/features/period-selector'
import { useSyncStatus } from '@/hooks/use-sync-status'
import { usePeriod } from '@/hooks/use-period'

function SyncStatusBadge() {
  const { latestBySource } = useSyncStatus()
  const latest = latestBySource('adspyglass')
  if (!latest?.completedAt) return null

  const ago = getTimeAgo(latest.completedAt)
  return (
    <Badge
      variant="dot"
      color="green"
      size="sm"
      radius="xl"
      styles={{
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: 12,
          color: '#6B7280',
          paddingLeft: 8,
          paddingRight: 8,
          height: 24,
          background: 'transparent',
        },
      }}
    >
      Synced {ago}
    </Badge>
  )
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function SyncButton() {
  const { triggerSync, isSyncing } = useSyncStatus()

  return (
    <ActionIcon
      variant="default"
      size="lg"
      radius="md"
      onClick={() => triggerSync()}
      loading={isSyncing}
      aria-label="Sync data"
      styles={{
        root: {
          border: '1px solid #E5E7EB',
          height: 36,
          width: 36,
        },
      }}
    >
      <RefreshCw size={15} />
    </ActionIcon>
  )
}

const COMPARE_OPTIONS = [
  { value: 'prev_period', label: 'vs Previous Period' },
  { value: 'prev_7d', label: 'vs Previous 7 Days' },
  { value: 'prev_day', label: 'vs Previous Day' },
] as const

function CompareModeSelect() {
  const { compare, setCompare } = usePeriod()
  const isCustom = compare !== 'prev_period'

  return (
    <Menu shadow="lg" radius="lg" width={200}>
      <Menu.Target>
        <ActionIcon
          variant={isCustom ? 'light' : 'default'}
          color={isCustom ? 'indigo' : undefined}
          size="lg"
          radius="md"
          aria-label="Compare mode"
          styles={{
            root: {
              border: isCustom ? '1px solid rgba(79,70,229,0.3)' : '1px solid #E5E7EB',
              height: 36,
              width: 36,
            },
          }}
        >
          <GitCompare size={15} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Comparison Period</Menu.Label>
        {COMPARE_OPTIONS.map((opt) => (
          <Menu.Item
            key={opt.value}
            onClick={() => setCompare(opt.value)}
            rightSection={compare === opt.value ? <Check size={14} /> : null}
            style={{
              fontWeight: compare === opt.value ? 600 : 400,
              color: compare === opt.value ? '#4F46E5' : undefined,
              fontSize: 13,
            }}
          >
            {opt.label}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  )
}

interface TopContextBarProps {
  title: string
  subtitle?: string
  showPeriod?: boolean
  showSync?: boolean
  showExport?: boolean
  showCompare?: boolean
  actions?: React.ReactNode
}

export function TopContextBar({
  title,
  subtitle,
  showPeriod = true,
  showSync = true,
  showExport = false,
  showCompare = false,
  actions,
}: TopContextBarProps) {
  return (
    <Box
      component="header"
      pos="sticky"
      top={0}
      style={{
        zIndex: 100,
        borderBottom: '1px solid #E5E7EB',
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        minHeight: 72,
      }}
      px={{ base: 'md', sm: 'xl' }}
      py={{ base: 'sm', sm: 0 }}
    >
      <Group
        justify="space-between"
        wrap="wrap"
        gap="sm"
        style={{ minHeight: 72 }}
        align="center"
      >
        {/* Left: Title */}
        <Box maw="50%" style={{ paddingLeft: 'var(--burger-offset, 0)' }}>
          <motion.div
            key={title}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Text
              size="xl"
              fw={700}
              c="#111827"
              truncate
              style={{ fontSize: 24, lineHeight: '32px' }}
            >
              {title}
            </Text>
          </motion.div>
          {subtitle && (
            <Text size="sm" c="#6B7280" fw={500} mt={2} visibleFrom="sm">
              {subtitle}
            </Text>
          )}
        </Box>

        {/* Right: Controls */}
        <Group gap="xs" wrap="wrap">
          <Suspense fallback={<Skeleton h={24} w={100} radius="xl" />}>
            <SyncStatusBadge />
          </Suspense>

          {showPeriod && (
            <Suspense fallback={<Skeleton h={36} w={160} radius="md" />}>
              <PeriodSelector />
            </Suspense>
          )}

          {showCompare && (
            <Suspense fallback={<Skeleton h={36} w={36} radius="md" />}>
              <CompareModeSelect />
            </Suspense>
          )}

          {showExport && (
            <ActionIcon
              variant="default"
              size="lg"
              radius="md"
              aria-label="Export"
              styles={{
                root: {
                  border: '1px solid #E5E7EB',
                  height: 36,
                  width: 36,
                },
              }}
            >
              <Download size={15} />
            </ActionIcon>
          )}

          {showSync && (
            <Suspense fallback={<Skeleton h={36} w={36} radius="md" />}>
              <SyncButton />
            </Suspense>
          )}

          {actions}
        </Group>
      </Group>
    </Box>
  )
}

// Keep backward compat
export const Topbar = TopContextBar
