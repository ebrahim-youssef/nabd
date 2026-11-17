export type NativeThemePreference = 'light' | 'dark' | 'system'

export const DEFAULT_NATIVE_THEME: NativeThemePreference = 'system'

export function readStoredTheme(value: string | null): NativeThemePreference {
  return value === 'light' || value === 'dark' || value === 'system' ? value : DEFAULT_NATIVE_THEME
}
