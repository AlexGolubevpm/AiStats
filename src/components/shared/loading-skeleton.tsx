'use client'

import { Skeleton as MantineSkeleton, Card, Box, Group, SimpleGrid, Stack } from '@mantine/core'

export function KPICardSkeleton() {
  return (
    <Card
      padding={20}
      radius={20}
      styles={{
        root: {
          background: '#FFFFFF',
          border: '1px solid #E6EAF0',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
          minHeight: 160,
        },
      }}
    >
      <MantineSkeleton height={12} width={80} radius="sm" />
      <MantineSkeleton height={42} width={130} radius="sm" mt={14} />
      <MantineSkeleton height={13} width={90} radius="sm" mt={10} />
      <Box mt={16} style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <MantineSkeleton height={36} width="46%" radius="sm" />
      </Box>
    </Card>
  )
}

export function ChartSkeleton() {
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
        },
      }}
    >
      <Box px={20} pt={20} pb={12}>
        <MantineSkeleton height={20} width={140} radius="sm" />
        <MantineSkeleton height={13} width={90} radius="sm" mt={4} />
      </Box>
      <Box px={20} pb={20}>
        <MantineSkeleton height={280} radius="md" />
      </Box>
    </Card>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card padding={0} radius={20} styles={{ root: { background: '#FFFFFF', border: '1px solid #E6EAF0' } }}>
      <Box px="md" py="sm" style={{ borderBottom: '1px solid #E6EAF0', background: '#F9FAFB' }}>
        <Group gap="xl">
          <MantineSkeleton height={12} width={96} radius="sm" />
          <MantineSkeleton height={12} width={64} radius="sm" />
          <MantineSkeleton height={12} width={64} radius="sm" />
          <MantineSkeleton height={12} width={64} radius="sm" />
          <MantineSkeleton height={12} width={80} radius="sm" />
        </Group>
      </Box>
      <Stack gap={0}>
        {Array.from({ length: rows }).map((_, i) => (
          <Box key={i} px="md" py="sm" style={{ borderBottom: i < rows - 1 ? '1px solid #E6EAF0' : undefined }}>
            <Group gap="xl">
              <MantineSkeleton height={16} width={128} radius="sm" />
              <MantineSkeleton height={16} width={80} radius="sm" />
              <MantineSkeleton height={16} width={64} radius="sm" />
              <MantineSkeleton height={16} width={64} radius="sm" />
              <MantineSkeleton height={16} width={96} radius="sm" />
            </Group>
          </Box>
        ))}
      </Stack>
    </Card>
  )
}

export function PageSkeleton() {
  return (
    <Box maw={1600} w="100%" mx="auto" px={24} py={24}>
      <Stack gap={32}>
        <SimpleGrid cols={{ base: 2, sm: 3, lg: 4, xl: 5 }} spacing={20}>
          {Array.from({ length: 5 }).map((_, i) => <KPICardSkeleton key={i} />)}
        </SimpleGrid>
        <SimpleGrid cols={{ base: 2, lg: 4 }} spacing={20}>
          {Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)}
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing={20}>
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
        </SimpleGrid>
      </Stack>
    </Box>
  )
}
