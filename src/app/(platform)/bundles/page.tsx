'use client'

import { Suspense } from 'react'
import { Box, Card, SimpleGrid, Group, Text, Stack } from '@mantine/core'
import { motion } from 'framer-motion'
import { fadeInUp } from '@/lib/motion'
import { TopContextBar } from '@/components/layout/topbar'
import { HealthBadge } from '@/components/shared/health-badge'
import { MetricDelta } from '@/components/shared/delta-indicator'
import { KPICardSkeleton } from '@/components/shared/loading-skeleton'
import { useBundles } from '@/hooks/use-api'
import { usePeriod } from '@/hooks/use-period'
import { formatCurrency, formatCompact } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'


function BundlesContent() {
  const { period } = usePeriod()
  const { data: bundles, isLoading } = useBundles(period)

  if (isLoading || !bundles) {
    return (
      <Box px="xl" py="xl">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)}
        </SimpleGrid>
      </Box>
    )
  }

  if (bundles.length === 0) {
    return (
      <Box px="xl" py="xl">
        <Card padding="xl" radius="xl" withBorder styles={{ root: { borderColor: '#D7DCE5', borderStyle: 'dashed' } }}>
          <Stack align="center" py="xl" gap="xs">
            <Text size="sm" c="#6B7280">No bundles configured</Text>
            <Text size="xs" c="#6B7280" fw={500}>Add bundles in Settings to get started</Text>
          </Stack>
        </Card>
      </Box>
    )
  }

  return (
    <motion.div initial="hidden" animate="visible">
      <Box px="xl" py="xl">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {bundles.map((bundle: { id: string; name: string; slug: string; color: string; sitesCount: number; traffic: number; adRevenue: number; affiliateRevenue: number; totalRevenue: number; costs: number; profit: number; romi: number; rpm: number; health: number | null; delta: number }, i: number) => (
            <motion.div key={bundle.id} custom={i} variants={fadeInUp}>
              <Card
                component={Link}
                href={`/bundles/${bundle.slug}`}
                padding="lg"
                radius="xl"
                shadow="sm"
                withBorder
                styles={{
                  root: {
                    borderColor: '#E5E7EB',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      boxShadow: '0 4px 10px rgba(16,24,40,0.08), 0 2px 4px rgba(16,24,40,0.04)',
                    },
                  },
                }}
              >
                <Group justify="space-between">
                  <Group gap="sm">
                    <Box style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: bundle.color }} />
                    <Text size="lg" fw={700}>{bundle.name}</Text>
                    <Text size="xs" c="#6B7280" fw={500}>{bundle.sitesCount || 0} sites</Text>
                  </Group>
                  <Group gap="xs">
                    {bundle.health != null && <HealthBadge score={bundle.health} />}
                    <ChevronRight size={16} color="#9CA3AF" />
                  </Group>
                </Group>

                <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm" mt="lg">
                  {[
                    { label: 'Requests', value: formatCompact(bundle.traffic || 0) },
                    { label: 'Ad Revenue', value: formatCurrency(bundle.adRevenue || 0) },
                    { label: 'Affiliate', value: formatCurrency(bundle.affiliateRevenue || 0) },
                    { label: 'Total Revenue', value: formatCurrency(bundle.totalRevenue || 0) },
                  ].map(({ label, value }) => (
                    <Box key={label}>
                      <Text size="xs" c="#6B7280" fw={500}>{label}</Text>
                      <Text size="sm" fw={600} mt={4} style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</Text>
                    </Box>
                  ))}
                </SimpleGrid>

                <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm" mt="sm">
                  <Box>
                    <Text size="xs" c="#6B7280" fw={500}>Costs</Text>
                    <Text size="sm" fw={600} mt={4} style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(bundle.costs || 0)}</Text>
                  </Box>
                  <Box>
                    <Text size="xs" c="#6B7280" fw={500}>Profit</Text>
                    <Text size="sm" fw={600} mt={4} c="#039855" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(bundle.profit || 0)}</Text>
                  </Box>
                  <Box>
                    <Text size="xs" c="#6B7280" fw={500}>ROMI</Text>
                    <Text size="sm" fw={600} mt={4} style={{ fontVariantNumeric: 'tabular-nums' }}>{(bundle.romi || 0).toFixed(1)}%</Text>
                  </Box>
                  <Box>
                    <Text size="xs" c="#6B7280" fw={500}>RPM</Text>
                    <Text size="sm" fw={600} mt={4} style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(bundle.rpm || 0)}</Text>
                  </Box>
                </SimpleGrid>

                <Group justify="flex-end" mt="md" pt="md" style={{ borderTop: '1px solid #E5E7EB' }}>
                  <MetricDelta value={bundle.delta || 0} />
                </Group>
              </Card>
            </motion.div>
          ))}
        </SimpleGrid>
      </Box>
    </motion.div>
  )
}

export default function BundlesPage() {
  return (
    <Box>
      <TopContextBar title="Bundles" subtitle="Performance by bundle group" />
      <Suspense fallback={<Box px="xl" py="xl"><SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">{Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)}</SimpleGrid></Box>}>
        <BundlesContent />
      </Suspense>
    </Box>
  )
}
