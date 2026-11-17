type NativeTheme = {
  fontFamily: Record<string, readonly string[]>
}

const nativeTheme = require('../../theme/tailwind-theme.cjs') as NativeTheme

export const FONT_FAMILY_CLASSES = new Set(
  Object.keys(nativeTheme.fontFamily).map((family) => `font-${family}`),
)

export function hasExplicitFontFamily(className?: string): boolean {
  return className?.split(/\s+/).some((name) => FONT_FAMILY_CLASSES.has(name)) ?? false
}

export function withDefaultBodyFont(
  className: string | undefined,
  applyDefault = true,
): string | undefined {
  const family = applyDefault && !hasExplicitFontFamily(className) ? 'font-body' : undefined
  return [family, className].filter(Boolean).join(' ') || undefined
}
