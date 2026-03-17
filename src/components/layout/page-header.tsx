import { Group, Box, Text } from '@mantine/core'

interface PageHeaderProps {
  title: string
  description?: string
  children?: React.ReactNode
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <Group justify="space-between">
      <Box>
        <Text size="xl" fw={600} c="var(--color-text-primary)" style={{ letterSpacing: '-0.01em' }}>
          {title}
        </Text>
        {description && (
          <Text size="sm" c="var(--color-text-muted)" mt={4}>
            {description}
          </Text>
        )}
      </Box>
      {children && <Group gap="sm">{children}</Group>}
    </Group>
  )
}
