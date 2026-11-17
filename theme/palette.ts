import { useColorScheme } from 'nativewind'

export const LIGHT = {
  background: '#eaf2f0',
  foreground: '#0e3234',
  card: '#ffffff',
  'card-foreground': '#0e3234',
  popover: '#ffffff',
  'popover-foreground': '#0e3234',
  primary: '#0e5a5a',
  'primary-foreground': '#eaf2f0',
  secondary: '#eaf2f0',
  'secondary-foreground': '#0e3234',
  muted: '#eaf2f0',
  'muted-foreground': '#4a706d',
  accent: '#2fa6a0',
  'accent-foreground': '#0e3234',
  destructive: '#c79a3a',
  border: 'rgba(16,48,47,0.1)',
  input: 'rgba(16,48,47,0.1)',
  ring: '#2fa6a0',
  'primary-deep': '#0e4f52',
  gold: '#c79a3a',
  'gold-soft': '#fbf3df',
  faint: '#9bbebb',
  surface: '#ffffff',
  'surface-2': '#eaf2f0',
  line: 'rgba(16,48,47,0.1)',
  'on-primary': '#eaf2f0',
  'ring-track': 'rgba(234,242,240,0.22)',
  'chart-1': '#0e5a5a',
  'chart-2': '#2fa6a0',
  'chart-3': '#c79a3a',
  'chart-4': '#0e4f52',
  'chart-5': '#9bbebb',
  sidebar: '#ffffff',
  'sidebar-foreground': '#0e3234',
  'sidebar-primary': '#0e5a5a',
  'sidebar-primary-foreground': '#eaf2f0',
  'sidebar-accent': '#eaf2f0',
  'sidebar-accent-foreground': '#0e3234',
  'sidebar-border': 'rgba(16,48,47,0.1)',
  'sidebar-ring': '#2fa6a0',
} as const

export const DARK = {
  background: '#08201f',
  foreground: '#eaf2f0',
  card: '#0e3234',
  'card-foreground': '#eaf2f0',
  popover: '#0e3234',
  'popover-foreground': '#eaf2f0',
  primary: '#12736f',
  'primary-foreground': '#eaf2f0',
  secondary: '#103a38',
  'secondary-foreground': '#eaf2f0',
  muted: '#103a38',
  'muted-foreground': '#7fa6a3',
  accent: '#3fbdb6',
  'accent-foreground': '#08201f',
  destructive: '#d9ae4e',
  border: 'rgba(234,242,240,0.1)',
  input: 'rgba(234,242,240,0.1)',
  ring: '#3fbdb6',
  'primary-deep': '#0e5a5a',
  gold: '#d9ae4e',
  'gold-soft': '#2a2a18',
  faint: '#4e6e6b',
  surface: '#0e3234',
  'surface-2': '#103a38',
  line: 'rgba(234,242,240,0.1)',
  'on-primary': '#eaf2f0',
  'ring-track': 'rgba(234,242,240,0.14)',
  'chart-1': '#12736f',
  'chart-2': '#3fbdb6',
  'chart-3': '#d9ae4e',
  'chart-4': '#0e5a5a',
  'chart-5': '#4e6e6b',
  sidebar: '#0e3234',
  'sidebar-foreground': '#eaf2f0',
  'sidebar-primary': '#12736f',
  'sidebar-primary-foreground': '#eaf2f0',
  'sidebar-accent': '#103a38',
  'sidebar-accent-foreground': '#eaf2f0',
  'sidebar-border': 'rgba(234,242,240,0.1)',
  'sidebar-ring': '#3fbdb6',
} as const

export type ThemeName = 'light' | 'dark'
export type ThemeColors = { [key in keyof typeof LIGHT]: string }
export type ThemeTokens = {
  hex: ThemeColors
}

export const THEME_TOKENS: Record<ThemeName, ThemeTokens> = {
  light: {
    hex: LIGHT,
  },
  dark: {
    hex: DARK,
  },
}

export const ICON_SIZE = 20

export function useThemeTokens(): ThemeTokens {
  const { colorScheme } = useColorScheme()
  return THEME_TOKENS[colorScheme === 'dark' ? 'dark' : 'light']
}
