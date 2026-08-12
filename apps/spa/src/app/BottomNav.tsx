import { BarChart3, Clock, Home, LibraryBig, Settings } from 'lucide-react'
import { Link, useLocation } from 'react-router'

import { NAV_ORDER, shellCopy } from '@nabd/shared'

type NavItem = {
  href: string
  label: string
  icon: typeof Home
  match: string[]
  testId: string
}

// Fixed bottom navigation (NBD-22; five items since r6 §2-amendment): libraries, prayer
// times, centered home, statistics, settings. RTL: the array renders right-to-left with
// home dead center. Each section owns a route; the active tab is highlighted by path
// prefix so sub-pages keep their section lit (القضاء lights الإحصائيات — its door is the
// stats page). `/app` itself uses exact matching so it is never active for a descendant.
const NAV_ITEMS: readonly NavItem[] = [
  {
    href: '/app/libraries',
    label: shellCopy.nav[NAV_ORDER[0]],
    icon: LibraryBig,
    match: ['/app/libraries', '/app/adhkar', '/app/niyyat'],
    testId: 'nav-libraries',
  },
  {
    href: '/app/prayer-times',
    label: shellCopy.nav[NAV_ORDER[1]],
    icon: Clock,
    match: ['/app/prayer-times'],
    testId: 'nav-prayer-times',
  },
  {
    href: '/app',
    label: shellCopy.nav[NAV_ORDER[2]],
    icon: Home,
    match: ['/app$'],
    testId: 'nav-home',
  },
  {
    href: '/app/stats',
    label: shellCopy.nav[NAV_ORDER[3]],
    icon: BarChart3,
    match: ['/app/stats', '/app/qada'],
    testId: 'nav-stats',
  },
  {
    href: '/app/settings',
    label: shellCopy.nav[NAV_ORDER[4]],
    icon: Settings,
    match: ['/app/settings'],
    testId: 'nav-settings',
  },
]

function isActive(pathname: string, match: readonly string[]): boolean {
  return match.some((prefix) => {
    if (prefix.endsWith('$')) return pathname === prefix.slice(0, -1)
    return pathname === prefix || pathname.startsWith(`${prefix}/`)
  })
}

export function BottomNav() {
  const { pathname } = useLocation()

  return (
    <nav
      aria-label={shellCopy.navAriaLabel}
      data-testid="bottom-nav"
      className="fixed inset-x-0 bottom-3 z-40 px-4 pb-[env(safe-area-inset-bottom)]"
    >
      {/* Floating pill (design-notes-r3 §1); the active tab gets a filled chip. */}
      <ul className="mx-auto flex w-full max-w-md items-stretch justify-around rounded-chip border border-border bg-surface px-2 py-1 shadow-card">
        {NAV_ITEMS.map(({ href, label, icon: Icon, match, testId }) => {
          const active = isActive(pathname, match)
          return (
            <li key={href} className="flex-1">
              <Link
                to={href}
                data-testid={testId}
                aria-current={active ? 'page' : undefined}
                className={
                  // px-0.5 (not px-3): five labeled tabs must fit a 360px viewport inside the
                  // pill — الإحصائيات alone is ~72px of label.
                  `flex flex-col items-center gap-0.5 rounded-chip px-0.5 py-1.5 text-label transition-all duration-200 ${
                    active
                      ? 'bg-primary text-on-primary shadow-card-small'
                      : 'text-muted-foreground hover:text-primary'
                  }`
                }
              >
                <Icon className="size-5" aria-hidden />
                <span>{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
