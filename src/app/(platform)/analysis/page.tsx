'use client'

import { Suspense } from 'react'
import { Box, Stack, SimpleGrid, Text, Card, Group, Button } from '@mantine/core'
import { motion } from 'framer-motion'
import { fadeInUp } from '@/lib/motion'
import { TopContextBar } from '@/components/layout/topbar'
import { ChartCard } from '@/components/shared/chart-card'
import { ChartSkeleton } from '@/components/shared/loading-skeleton'
import { Brain, RefreshCw, Loader2 } from 'lucide-react'
import { useAnalysis, useRunAnalysis } from '@/hooks/use-api'

function AnalysisContent() {
  const { data, isLoading } = useAnalysis()
  const runAnalysis = useRunAnalysis()

  if (isLoading) {
    return (
      <Stack gap="xl" px="xl" py="xl">
        <ChartSkeleton />
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          <ChartSkeleton />
          <ChartSkeleton />
        </SimpleGrid>
      </Stack>
    )
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeInUp} custom={0}>
      <Stack gap="xl" px="xl" py="xl">
        <ChartCard
          title="Executive Summary"
          description="AI-generated analysis powered by Claude"
          action={
            <Button
              size="sm"
              radius="md"
              onClick={() => runAnalysis.mutate()}
              disabled={runAnalysis.isPending}
              leftSection={runAnalysis.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            >
              {runAnalysis.isPending ? 'Running...' : 'Run Analysis'}
            </Button>
          }
        >
          <Box
            p="md"
            style={{
              borderRadius: 'var(--radius-card)',
              backgroundColor: 'var(--color-primary-50)',
            }}
          >
            <Group gap="sm" align="flex-start">
              <Brain size={20} style={{ color: 'var(--color-primary-600)', flexShrink: 0, marginTop: 2 }} />
              <Stack gap="sm" style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
                {data?.summary ? (
                  data.summary.split('\n').map((p: string, i: number) => <Text key={i} size="sm" c="var(--color-text-secondary)">{p}</Text>)
                ) : (
                  <Text size="sm" c="var(--color-text-muted)">No analysis available. Click &quot;Run Analysis&quot; to generate one.</Text>
                )}
              </Stack>
            </Group>
          </Box>
        </ChartCard>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          <ChartCard title="Top Risks" description="Issues requiring immediate attention">
            <Stack gap="sm">
              {data?.risks && Array.isArray(data.risks) ? (
                data.risks.map((risk: string | { title: string; description: string }, i: number) => {
                  const title = typeof risk === 'string' ? risk : risk.title
                  const desc = typeof risk === 'string' ? null : risk.description
                  return (
                    <Box
                      key={i}
                      p="sm"
                      style={{
                        borderRadius: 'var(--radius-control)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        backgroundColor: 'var(--color-danger-bg)',
                      }}
                    >
                      <Text size="sm" fw={600} c="var(--color-danger-dark)">{i + 1}. {title}</Text>
                      {desc && <Text size="xs" c="var(--color-danger-dark)" mt={4} style={{ opacity: 0.7 }}>{desc}</Text>}
                    </Box>
                  )
                })
              ) : (
                <Text size="sm" c="var(--color-text-muted)">No risks identified.</Text>
              )}
            </Stack>
          </ChartCard>

          <ChartCard title="Top Opportunities" description="Areas to scale and optimize">
            <Stack gap="sm">
              {data?.opportunities && Array.isArray(data.opportunities) ? (
                data.opportunities.map((opp: string | { title: string; description: string }, i: number) => {
                  const title = typeof opp === 'string' ? opp : opp.title
                  const desc = typeof opp === 'string' ? null : opp.description
                  return (
                    <Box
                      key={i}
                      p="sm"
                      style={{
                        borderRadius: 'var(--radius-control)',
                        border: '1px solid rgba(18, 183, 106, 0.2)',
                        backgroundColor: 'var(--color-success-bg)',
                      }}
                    >
                      <Text size="sm" fw={600} c="var(--color-success-dark)">{i + 1}. {title}</Text>
                      {desc && <Text size="xs" c="var(--color-success-dark)" mt={4} style={{ opacity: 0.7 }}>{desc}</Text>}
                    </Box>
                  )
                })
              ) : (
                <Text size="sm" c="var(--color-text-muted)">No opportunities identified.</Text>
              )}
            </Stack>
          </ChartCard>
        </SimpleGrid>
      </Stack>
    </motion.div>
  )
}

export default function AnalysisPage() {
  return (
    <Box>
      <TopContextBar title="Analysis" subtitle="AI-powered insights and recommendations" showPeriod={false} />
      <Suspense fallback={
        <Stack gap="xl" px="xl" py="xl">
          <ChartSkeleton />
        </Stack>
      }>
        <AnalysisContent />
      </Suspense>
    </Box>
  )
}
