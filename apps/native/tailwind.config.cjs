const nativeTheme = require('./theme/tailwind-theme.cjs')

const withOpacity = (variable, defaultOpacity = '<alpha-value>') =>
  `rgb(var(${variable}) / ${defaultOpacity})`
const withThemeOpacity = (color) => `rgb(var(--color-${color}) / var(--alpha-${color}))`

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    // NativeWind serves both box-shadow and box-shadow-color from the shadow-* namespace.
    // colors.card and boxShadow.card collide, so the color utility would win and paint the
    // shadow white unless the color namespace is disabled at the theme root.
    boxShadowColor: {},
    extend: {
      ...nativeTheme,
      colors: {
        background: withOpacity('--color-background'),
        foreground: withOpacity('--color-foreground'),
        card: withOpacity('--color-card'),
        'card-foreground': withOpacity('--color-card-foreground'),
        popover: withOpacity('--color-popover'),
        'popover-foreground': withOpacity('--color-popover-foreground'),
        primary: withOpacity('--color-primary'),
        'primary-foreground': withOpacity('--color-primary-foreground'),
        secondary: withOpacity('--color-secondary'),
        'secondary-foreground': withOpacity('--color-secondary-foreground'),
        muted: withOpacity('--color-muted'),
        'muted-foreground': withOpacity('--color-muted-foreground'),
        accent: withOpacity('--color-accent'),
        'accent-foreground': withOpacity('--color-accent-foreground'),
        destructive: withOpacity('--color-destructive'),
        border: withThemeOpacity('border'),
        input: withThemeOpacity('input'),
        ring: withOpacity('--color-ring'),
        'primary-deep': withOpacity('--color-primary-deep'),
        gold: withOpacity('--color-gold'),
        'gold-soft': withOpacity('--color-gold-soft'),
        faint: withOpacity('--color-faint'),
        surface: withOpacity('--color-surface'),
        'surface-2': withOpacity('--color-surface-2'),
        line: withThemeOpacity('line'),
        'on-primary': withOpacity('--color-on-primary'),
        'ring-track': withThemeOpacity('ring-track'),
        'chart-1': withOpacity('--color-chart-1'),
        'chart-2': withOpacity('--color-chart-2'),
        'chart-3': withOpacity('--color-chart-3'),
        'chart-4': withOpacity('--color-chart-4'),
        'chart-5': withOpacity('--color-chart-5'),
        sidebar: withOpacity('--color-sidebar'),
        'sidebar-foreground': withOpacity('--color-sidebar-foreground'),
        'sidebar-primary': withOpacity('--color-sidebar-primary'),
        'sidebar-primary-foreground': withOpacity('--color-sidebar-primary-foreground'),
        'sidebar-accent': withOpacity('--color-sidebar-accent'),
        'sidebar-accent-foreground': withOpacity('--color-sidebar-accent-foreground'),
        'sidebar-border': withThemeOpacity('sidebar-border'),
        'sidebar-ring': withOpacity('--color-sidebar-ring'),
      },
    },
  },
}
