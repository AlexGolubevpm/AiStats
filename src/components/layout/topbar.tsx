'use client'

import { Suspense } from 'react'
import { Group, Box, Text, ActionIcon, Menu, Skeleton, Badge } from '@mantine/core'
import { motion } from 'framer-motion'
import { RefreshCw, Download, GitCompare, Check } from 'lucide-react'
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
          color: '#64748B',
          paddingLeft: 10,
          paddingRight: 10,
          height: 28,
          background: 'rgba(255,255,255,0.6)',
          border: '1px solid #E7EAF0',
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
          border: '1px solid #E7EAF0',
          height: 36,
          width: 36,
          transition: 'all 0.14s ease',
          '&:hover': {
            backgroundColor: '#F1F5F9',
          },
        },
      }}
    >
      <RefreshCw size={15} color="#64748B" />
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
              border: isCustom ? '1px solid rgba(79,70,229,0.3)' : '1px solid #E7EAF0',
              height: 36,
              width: 36,
              transition: 'all 0.14s ease',
              '&:hover': {
                backgroundColor: isCustom ? undefined : '#F1F5F9',
              },
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
        borderBottom: '1px solid #E7EAF0',
        background: 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        height: 72,
      }}
      px={24}
    >
      <Group
        justify="space-between"
        wrap="wrap"
        gap={12}
        style={{ height: 72 }}
        align="center"
      >
        {/* Group 1: Identity */}
        <Box style={{ paddingLeft: 'var(--burger-offset, 0)' }}>
          <motion.div
            key={title}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Text
              fw={700}
              c="#0F172A"
              truncate
              style={{
                fontSize: 32,
                lineHeight: '38px',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {title}
            </Text>
          </motion.div>
          {subtitle && (
            <Text
              c="#64748B"
              fw={500}
              mt={2}
              visibleFrom="sm"
              style={{
                fontSize: 14,
                lineHeight: '20px',
              }}
            >
              {subtitle}
            </Text>
          )}
        </Box>

        {/* Right side: Groups 2 + 3 */}
        <Group gap={16} wrap="wrap">
          {/* Group 2: Data Context */}
          <Group gap={8} wrap="nowrap">
            <Suspense fallback={<Skeleton h={28} w={100} radius="xl" />}>
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
          </Group>

          {/* Group 3: Actions */}
          <Group gap={8} wrap="nowrap">
            {showSync && (
              <Suspense fallback={<Skeleton h={36} w={36} radius="md" />}>
                <SyncButton />
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
                    border: '1px solid #E7EAF0',
                    height: 36,
                    width: 36,
                    transition: 'all 0.14s ease',
                    '&:hover': {
                      backgroundColor: '#F1F5F9',
                    },
                  },
                }}
              >
                <Download size={15} color="#64748B" />
              </ActionIcon>
            )}

            {actions}
          </Group>
        </Group>
      </Group>
    </Box>
  )
}

// Keep backward compat
export const Topbar = TopContextBar
