export const themeTokens = {
  typography: {
    display: { size: '40px', lineHeight: '1.2' },
    title: { size: '24px', lineHeight: '1.2' },
    subtitle: { size: '22px', lineHeight: '1.3' },
    body: { size: '16px', lineHeight: '1.7' },
    small: { size: '13px', lineHeight: '1.5' },
    xsmall: { size: '12px', lineHeight: '1.5' },
    label: { size: '11px', lineHeight: '1.4' },
    scripture: { size: '16px', lineHeight: '2' },
  },
  spacing: {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
  },
  radii: {
    sm: 8.4,
    md: 11.2,
    lg: 14,
    xl: 19.6,
    '2xl': 25.2,
    icon: 9999,
    button: 14,
    chip: 22,
    card: 16,
    ring: 9999,
  },
  shadows: {
    card: 'var(--shadow)',
    cardSmall: 'var(--shadow-sm)',
    values: {
      light: {
        card: '0 8px 24px rgba(14, 90, 90, 0.1)',
        cardSmall: '0 2px 8px rgba(14, 90, 90, 0.08)',
      },
      dark: {
        card: '0 10px 30px rgba(0, 0, 0, 0.35)',
        cardSmall: '0 3px 12px rgba(0, 0, 0, 0.3)',
      },
    },
  },
} as const

export type ThemeTokens = typeof themeTokens
