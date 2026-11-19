import { resolveSystemPath } from '../src/shell/deepLinks'

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return resolveSystemPath(path)
}
