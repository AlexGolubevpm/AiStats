'use client'

import { Skeleton as MantineSkeleton, Card, Box, Group, SimpleGrid, Stack } from '@mantine/core'

export function KPICardSkeleton() {
  return (
    <Card padding="lg" radius="xl" shadow="sm" withBorder styles={{ root: { borderColor: '#E5E7EB', minHeight: 144 } }}>
      <MantineSkeleton height={12} width={80} radius="sm" />
      <MantineSkeleton height={38} width={120} radius="sm" mt={16} />
      <Group justify="space-between" align="flex-end" mt={16}>
        <MantineSkeleton height={12} width={64} radius="sm" />
        <MantineSkeleton height={28} width={120} radius="sm" />
      </Group>
    </Card>
  )
}

export function ChartSkeleton() {
  return (
    <Card padding={0} radius="xl" shadow="sm" withBorder styles={{ root: { borderColor: '#E5E7EB' } }}>
      <Box px="lg" py="md">
        <MantineSkeleton height={16} width={128} radius="sm" />
        <MantineSkeleton height={12} width={80} radius="sm" mt={4} />
      </Box>
      <Box px="lg" pb="lg">
        <MantineSkeleton height={280} radius="md" />
      </Box>
    </Card>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card padding={0} radius="xl" shadow="sm" withBorder styles={{ root: { borderColor: '#E5E7EB' } }}>
      <Box px="md" py="sm" style={{ borderBottom: '1px solid #E5E7EB', background: '#F9FAFB' }}>
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
          <Box key={i} px="md" py="sm" style={{ borderBottom: i < rows - 1 ? '1px solid #E5E7EB' : undefined }}>
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
    <Box maw={1600} mx="auto" px="xl" py="xl">
      <Stack gap="xl">
        <SimpleGrid cols={{ base: 2, sm: 3, lg: 4, xl: 5 }} spacing="md">
          {Array.from({ length: 5 }).map((_, i) => <KPICardSkeleton key={i} />)}
        </SimpleGrid>
        <SimpleGrid cols={{ base: 2, lg: 4 }} spacing="md">
          {Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)}
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="md">
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
        </SimpleGrid>
      </Stack>
    </Box>
  )
}
