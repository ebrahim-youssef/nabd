import { useColorScheme } from 'nativewind'

export const LIGHT = {
  bg: '#F5F0E5',
  surface: '#FFFFFF',
  now: '#FBF6EA',
  line: '#E7DECB',
  track: '#EDE5D3',
  ink: '#13302A',
  mute: '#5B6B64',
  hero: '#0B3A32',
  'hero-ink': '#F2E5C6',
  'hero-mute': '#B9C9C2',
  gold: '#CFA552',
  'gold-ink': '#8A6620',
  progress: '#8A6620',
  accent: '#114A40',
  'on-accent': '#FFFFFF',
  box: '#9A8866',
  tick: '#13302A',
  'toast-action': '#CFA552',
  scrim: 'rgba(11,30,26,0.45)',
  sun: '#FFE3A3',
  moon: '#F4E2B4',
  'path-rest': 'rgba(242,229,198,0.22)',
  'mark-rest': 'rgba(242,229,198,0.4)',
} as const

export const DARK = {
  bg: '#06171A',
  surface: '#0D2527',
  now: '#102C2E',
  line: '#183539',
  track: '#183539',
  ink: '#ECF2EE',
  mute: '#93A8A3',
  hero: '#030D10',
  'hero-ink': '#F2E5C6',
  'hero-mute': '#8DA19C',
  gold: '#D9B25E',
  'gold-ink': '#D9B25E',
  progress: '#D9B25E',
  accent: '#D9B25E',
  'on-accent': '#1A1405',
  box: '#5E7E80',
  tick: '#06171A',
  'toast-action': '#8A6620',
  scrim: 'rgba(0,0,0,0.6)',
  sun: '#FFE3A3',
  moon: '#F4E2B4',
  'path-rest': 'rgba(242,229,198,0.22)',
  'mark-rest': 'rgba(242,229,198,0.4)',
} as const

export type ThemeColors = { [Key in keyof typeof LIGHT]: string }

export const RADII = {
  control: 10,
  button: 14,
  tile: 18,
  card: 20,
  widget: 26,
  tabs: 26,
  sheet: 28,
  hero: 30,
  pill: 9999,
} as const

export const TYPE_SCALE = {
  'screen-title': { size: '30px', lineHeight: '38px' },
  'prayer-name': { size: '27px', lineHeight: '31.05px' },
  'sheet-title': { size: '22px', lineHeight: '30px' },
  'tile-count': { size: '20px', lineHeight: '26px' },
  'card-title': { size: '18px', lineHeight: '26px' },
  countdown: { size: '22px', lineHeight: '27.5px', letterSpacing: '0.5px' },
  'row-label': { size: '15px', lineHeight: '20.25px' },
  button: { size: '15px', lineHeight: '20px' },
  body: { size: '14px', lineHeight: '22.4px' },
  meta: { size: '12.5px', lineHeight: '17.5px' },
  caption: { size: '12px', lineHeight: '16.2px' },
  chip: { size: '11px', lineHeight: '16px' },
  'daily-line': { size: '13.5px', lineHeight: '21.6px' },
} as const

export const SHADOWS = {
  light: {
    card: '0 10px 26px -18px rgba(11,58,50,0.45)',
    sheet: '0 -10px 40px rgba(0,0,0,0.25)',
  },
  dark: {
    card: '0 0 0 0 rgba(0,0,0,0)',
    sheet: '0 -10px 40px rgba(0,0,0,0.25)',
  },
} as const

export const ROW_HEIGHT = 46
export const STAR_SIZE = 28
export const ICON_SIZE = 24
export const PATTERN_SIZE = 56
export const TABBAR_HEIGHT = 86
export const HERO_HEIGHT = 262

export function useThemeColors(): ThemeColors {
  const { colorScheme } = useColorScheme()
  return colorScheme === 'dark' ? DARK : LIGHT
}
