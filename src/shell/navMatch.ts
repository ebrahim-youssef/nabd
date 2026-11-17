export function isNavMatch(pathname: string, match: readonly string[], exact = false): boolean {
  return match.some((prefix) =>
    exact ? pathname === prefix : pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}
