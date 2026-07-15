'use client'

import { BarChart3, Home, LibraryBig } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

// Fixed bottom navigation (NBD-22). RTL order: libraries render on the right, home in the
// center, stats on the left. Each section owns a route; the active tab is highlighted by
// path prefix so library sub-pages keep المكتبات lit.
const NAV_ITEMS = [
  {
    href: '/libraries',
    label: 'المكتبات',
    icon: LibraryBig,
    match: ['/libraries', '/adhkar', '/niyyat'],
  },
  { href: '/', label: 'الرئيسية', icon: Home, match: ['/'] },
  { href: '/stats', label: 'الإحصائيات', icon: BarChart3, match: ['/stats'] },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="التنقل الرئيسي"
      data-testid="bottom-nav"
      className="bg-surface border-border fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex w-full max-w-2xl items-stretch justify-around">
        {NAV_ITEMS.map(({ href, label, icon: Icon, match }) => {
          const active = match.some((m) => (m === '/' ? pathname === '/' : pathname.startsWith(m)))
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                data-testid={`nav-${href === '/' ? 'home' : href.slice(1)}`}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-1 py-2 text-label transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
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
