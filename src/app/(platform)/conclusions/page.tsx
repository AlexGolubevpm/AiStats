'use client'

import { Suspense } from 'react'
import { Box, Stack, SimpleGrid, Text, Card, Group, ThemeIcon } from '@mantine/core'
import { motion } from 'framer-motion'
import { fadeInUp } from '@/lib/motion'
import { TopContextBar } from '@/components/layout/topbar'
import { WinnerCard, LoserCard, RiskCard, OpportunityCard } from '@/components/shared/insight-card'
import { KPICardSkeleton } from '@/components/shared/loading-skeleton'
import { useConclusions } from '@/hooks/use-api'
import { usePeriod } from '@/hooks/use-period'
import { Trophy, TrendingDown, AlertTriangle, Lightbulb } from 'lucide-react'

interface InsightItem {
  entity: string
  entityType: string
  metric: string
  value: string
  delta?: number
  reason: string
  action?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}


function Section({
  title,
  icon: Icon,
  iconColor,
  bgColor,
  items,
  CardComponent,
}: {
  title: string
  icon: typeof Trophy
  iconColor: string
  bgColor: string
  items: InsightItem[]
  CardComponent: typeof WinnerCard
}) {
  if (!items || items.length === 0) return null

  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  const sorted = [...items].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  return (
    <Box component="section">
      <Group gap="sm" mb="md">
        <ThemeIcon size={32} radius="md" variant="light" style={{ backgroundColor: bgColor }}>
          <Icon size={16} style={{ color: iconColor }} />
        </ThemeIcon>
        <Box>
          <Text size="md" fw={600} c="#111827">{title}</Text>
          <Text size="xs" c="#6B7280" fw={500}>{items.length} item{items.length > 1 ? 's' : ''}</Text>
        </Box>
      </Group>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        {sorted.map((item, i) => (
          <motion.div key={i} custom={i} variants={fadeInUp}>
            <CardComponent {...item} />
          </motion.div>
        ))}
      </SimpleGrid>
    </Box>
  )
}

function ConclusionsContent() {
  const { period } = usePeriod()
  const { data, isLoading } = useConclusions(period)

  if (isLoading || !data) {
    return (
      <Stack gap="xl" px="xl" py="xl">
        {Array.from({ length: 4 }).map((_, i) => (
          <SimpleGrid key={i} cols={{ base: 1, md: 2 }} spacing="md">
            <KPICardSkeleton />
            <KPICardSkeleton />
          </SimpleGrid>
        ))}
      </Stack>
    )
  }

  const winners = data.winners || []
  const losers = data.losers || []
  const risks = data.risks || []
  const opportunities = data.opportunities || []

  const hasAny = winners.length > 0 || losers.length > 0 || risks.length > 0 || opportunities.length > 0

  if (!hasAny) {
    return (
      <Box px="xl" py="xl">
        <Card padding="xl" radius="xl" withBorder styles={{ root: { borderColor: '#D7DCE5', borderStyle: 'dashed' } }}>
          <Stack align="center" py="xl" gap="xs">
            <Text size="sm" c="#6B7280">No conclusions available</Text>
            <Text size="xs" fw={500} c="#6B7280">Conclusions will be generated once metric data is synced</Text>
          </Stack>
        </Card>
      </Box>
    )
  }

  return (
    <motion.div initial="hidden" animate="visible">
      <Stack gap="xl" px="xl" py="xl">
        <Section
          title="Winners"
          icon={Trophy}
          iconColor="var(--color-success-dark)"
          bgColor="var(--color-success-bg)"
          items={winners}
          CardComponent={WinnerCard}
        />
        <Section
          title="Losers"
          icon={TrendingDown}
          iconColor="var(--color-danger-dark)"
          bgColor="var(--color-danger-bg)"
          items={losers}
          CardComponent={LoserCard}
        />
        <Section
          title="Risks"
          icon={AlertTriangle}
          iconColor="var(--color-warning-dark)"
          bgColor="var(--color-warning-bg)"
          items={risks}
          CardComponent={RiskCard}
        />
        <Section
          title="Opportunities"
          icon={Lightbulb}
          iconColor="var(--color-primary-700)"
          bgColor="var(--color-primary-50)"
          items={opportunities}
          CardComponent={OpportunityCard}
        />
      </Stack>
    </motion.div>
  )
}

export default function ConclusionsPage() {
  return (
    <Box>
      <TopContextBar title="Conclusions" subtitle="Daily executive summary" showExport />
      <Suspense fallback={
        <Stack gap="xl" px="xl" py="xl">
          {Array.from({ length: 4 }).map((_, i) => (
            <SimpleGrid key={i} cols={{ base: 1, md: 2 }} spacing="md">
              <KPICardSkeleton />
              <KPICardSkeleton />
            </SimpleGrid>
          ))}
        </Stack>
      }>
        <ConclusionsContent />
      </Suspense>
    </Box>
  )
}
