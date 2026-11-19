import { ADHKAR_LIBRARY } from '../content/adhkar'
import { isDayId } from '../lib/day'

const ADHKAR_IDS = new Set(ADHKAR_LIBRARY.map(({ id }) => id))

function splitPathAndSuffix(path: string): { pathname: string; suffix: string } {
  const suffixIndex = path.search(/[?#]/)
  return suffixIndex < 0
    ? { pathname: path, suffix: '' }
    : { pathname: path.slice(0, suffixIndex), suffix: path.slice(suffixIndex) }
}

function pathFromScheme(path: string): string | null {
  const match = /^nabd:\/\/([^/?#]+)([^?#]*)([?#].*)?$/i.exec(path)
  return match ? `/${match[1]}${match[2]}${match[3] ?? ''}` : null
}

export function resolveSystemPath(path: string): string {
  const incomingPath = pathFromScheme(path) ?? path
  const { pathname, suffix } = splitPathAndSuffix(incomingPath)
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname

  if (normalizedPath === '/home') return `/${suffix}`
  if (normalizedPath === '/today' || normalizedPath.startsWith('/today/')) {
    const day = normalizedPath.slice('/today/'.length)
    return isDayId(day) ? `/today/${day}${suffix}` : '/today'
  }
  if (normalizedPath === '/adhkar' || normalizedPath.startsWith('/adhkar/')) {
    const setId = normalizedPath.slice('/adhkar/'.length)
    return ADHKAR_IDS.has(setId) ? `/adhkar/${setId}${suffix}` : '/adhkar'
  }

  return path
}
