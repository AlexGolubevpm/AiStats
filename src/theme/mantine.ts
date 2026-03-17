'use client'

import { createTheme, MantineColorsTuple } from '@mantine/core'

const indigo: MantineColorsTuple = [
  '#EEF2FF', // 0 - primary-50
  '#E0E7FF', // 1 - primary-100
  '#C7D2FE', // 2 - primary-200
  '#A5B4FC', // 3 - primary-300
  '#818CF8', // 4 - primary-400
  '#6366F1', // 5 - primary-500
  '#4F46E5', // 6 - primary-600
  '#4338CA', // 7 - primary-700
  '#3730A3', // 8
  '#312E81', // 9
]

export const theme = createTheme({
  primaryColor: 'indigo',
  colors: {
    indigo,
  },
  fontFamily: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
  fontFamilyMonospace: "'JetBrains Mono', ui-monospace, monospace",
  headings: {
    fontFamily: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
    fontWeight: '700',
  },
  radius: {
    xs: '4px',
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },
  defaultRadius: 'lg',
  shadows: {
    xs: '0 1px 2px rgba(16,24,40,0.04)',
    sm: '0 1px 3px rgba(16,24,40,0.06), 0 1px 2px rgba(16,24,40,0.04)',
    md: '0 4px 10px rgba(16,24,40,0.08), 0 2px 4px rgba(16,24,40,0.04)',
    lg: '0 8px 24px rgba(16,24,40,0.12), 0 4px 8px rgba(16,24,40,0.06)',
    xl: '0 16px 48px rgba(16,24,40,0.16), 0 8px 16px rgba(16,24,40,0.08)',
  },
  other: {
    // Color tokens
    appBg: '#F6F8FB',
    sidebarBg: '#F7F8FC',
    surface: '#FFFFFF',
    surfaceSecondary: '#F9FAFB',
    surfaceHover: '#F1F5F9',
    borderSubtle: '#E5E7EB',
    borderDefault: '#D7DCE5',
    borderStrong: '#C6CDD8',
    textPrimary: '#111827',
    textSecondary: '#4B5563',
    textMuted: '#6B7280',
    textDisabled: '#9CA3AF',
    // Semantic
    successBg: '#ECFDF3',
    success: '#12B76A',
    successDark: '#039855',
    warningBg: '#FFFAEB',
    warning: '#F79009',
    warningDark: '#DC6803',
    dangerBg: '#FEF3F2',
    danger: '#F04438',
    dangerDark: '#D92D20',
    infoBg: '#EFF8FF',
    info: '#2E90FA',
    // Bundles
    bundleGays: '#3B82F6',
    bundleTrans: '#EC4899',
    bundleJav: '#EF4444',
    bundleHentai: '#8B5CF6',
    // Chart
    chartTraffic: '#06B6D4',
    chartAdRevenue: '#4F46E5',
    chartAffiliate: '#EC4899',
    chartTotalRevenue: '#6366F1',
    chartCosts: '#F59E0B',
    chartProfit: '#10B981',
    chartRomi: '#8B5CF6',
    chartRpm: '#14B8A6',
  },
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
    Card: {
      defaultProps: {
        radius: 'xl',
        shadow: 'sm',
        withBorder: true,
      },
      styles: {
        root: {
          borderColor: '#E5E7EB',
        },
      },
    },
    Badge: {
      defaultProps: {
        radius: 'xl',
        variant: 'light',
      },
    },
    Tooltip: {
      defaultProps: {
        radius: 'md',
        withArrow: true,
      },
    },
  },
})
