'use client'

import { Stack, Text, Box, ThemeIcon } from '@mantine/core'
import { Database, AlertCircle, Inbox } from 'lucide-react'
import { motion } from 'framer-motion'

type EmptyStateVariant = 'default' | 'error' | 'no-data'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  variant?: EmptyStateVariant
  className?: string
}

const variantConfig = {
  default: {
    icon: Database,
    iconColor: '#6B7280',
    iconBg: '#F9FAFB',
  },
  error: {
    icon: AlertCircle,
    iconColor: '#F04438',
    iconBg: '#FEF3F2',
  },
  'no-data': {
    icon: Inbox,
    iconColor: '#9CA3AF',
    iconBg: '#F9FAFB',
  },
}

export function EmptyState({ title, description, icon, action, variant = 'default' }: EmptyStateProps) {
  const config = variantConfig[variant]
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Stack align="center" justify="center" py={64} gap="md">
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        >
          <Box
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              border: '2px dashed #E5E7EB',
              background: config.iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon || <Icon size={28} color={config.iconColor} />}
          </Box>
        </motion.div>
        <Text size="sm" fw={500} c="#111827">
          {title}
        </Text>
        {description && (
          <Text size="sm" c="#6B7280" maw={360} ta="center">
            {description}
          </Text>
        )}
        {action && <Box mt="xs">{action}</Box>}
      </Stack>
    </motion.div>
  )
}
