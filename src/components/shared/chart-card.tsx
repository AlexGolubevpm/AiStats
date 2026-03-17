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
      radius={20}
      styles={{
        root: {
          background: '#FFFFFF',
          border: '1px solid #E6EAF0',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)',
          minHeight: 320,
          transition: 'all 0.2s ease',
          '&:hover': {
            boxShadow: '0 12px 28px rgba(15, 23, 42, 0.07)',
          },
        },
      }}
    >
      <Group justify="space-between" px={20} pt={20} pb={12}>
        <Box>
          <Group gap={10} align="center">
            <Text
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: '#0F172A',
                lineHeight: '28px',
              }}
            >
              {title}
            </Text>
            {delta !== undefined && (
              <Text
                style={{
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: 13,
                  fontWeight: 600,
                  color: delta >= 0 ? '#16A34A' : '#DC2626',
                }}
              >
                {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
              </Text>
            )}
          </Group>
          {description && (
            <Text
              mt={4}
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: '#6B7280',
                lineHeight: '18px',
              }}
            >
              {description}
            </Text>
          )}
        </Box>
        {action}
      </Group>
      <Box px={20} pb={20}>
        {children}
      </Box>
    </Card>
  )
}

export function TrendChartCard({ title, description, children, className, action, delta }: ChartCardProps) {
  return <ChartCard title={title} description={description} action={action} delta={delta}>{children}</ChartCard>
}
