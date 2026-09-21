import { readStoredTheme } from '../preferences/db'
import type { Theme } from '@nabd/shared'

export async function readThemeWithFallback(
  read: () => Promise<string | null>,
  onError?: (cause: unknown) => void,
): Promise<Theme> {
  try {
    return readStoredTheme(await read())
  } catch (cause) {
    onError?.(cause)
    return readStoredTheme(null)
  }
}
