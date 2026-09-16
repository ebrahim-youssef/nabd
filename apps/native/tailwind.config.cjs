const sharedTheme = require('./generated/nativewind-theme.cjs')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    // NativeWind serves both box-shadow and box-shadow-color from the shadow-* namespace.
    // colors.card and boxShadow.card collide, so the color utility would win and paint the
    // shadow white unless the color namespace is disabled at the theme root.
    boxShadowColor: {},
    extend: sharedTheme,
  },
}
