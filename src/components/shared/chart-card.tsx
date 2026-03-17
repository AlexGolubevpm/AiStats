'use client'

import { Card, Group, Text, Box } from '@mantine/core'

interface ChartCardProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
  action?: React.ReactNode
  delta?: number
}

export function ChartCard({ title, description, children, action, delta }: ChartCardProps) {
  return (
    <Card
      padding={0}
      radius="xl"
      shadow="sm"
      withBorder
      styles={{
        root: {
          borderColor: '#E5E7EB',
          transition: 'all 0.2s ease',
          '&:hover': {
            boxShadow: '0 4px 10px rgba(16,24,40,0.08), 0 2px 4px rgba(16,24,40,0.04)',
          },
        },
      }}
    >
      <Group justify="space-between" px="lg" py="md">
        <Box>
          <Group gap="sm" align="center">
            <Text size="sm" fw={600} c="#111827">
              {title}
            </Text>
            {delta !== undefined && (
              <Text
                size="xs"
                fw={600}
                style={{ fontVariantNumeric: 'tabular-nums' }}
                c={delta >= 0 ? '#039855' : '#D92D20'}
              >
                {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
              </Text>
            )}
          </Group>
          {description && (
            <Text size="xs" c="#6B7280" fw={500} mt={2}>
              {description}
            </Text>
          )}
        </Box>
        {action}
      </Group>
      <Box px="lg" pb="lg">
        {children}
      </Box>
    </Card>
  )
}

export function TrendChartCard({ title, description, children, className, action, delta }: ChartCardProps) {
  return <ChartCard title={title} description={description} action={action} delta={delta}>{children}</ChartCard>
}
