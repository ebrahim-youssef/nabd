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
      className="fixed inset-x-0 bottom-3 z-40 px-4 pb-[env(safe-area-inset-bottom)]"
    >
      {/* Floating pill (design-notes-r3 §1); the active tab gets a filled chip. */}
      <ul className="border-border bg-surface shadow-card mx-auto flex w-full max-w-md items-stretch justify-around rounded-chip border px-2 py-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon, match }) => {
          const active = match.some((m) => (m === '/' ? pathname === '/' : pathname.startsWith(m)))
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                data-testid={`nav-${href === '/' ? 'home' : href.slice(1)}`}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-chip px-3 py-1.5 text-label transition-colors',
                  active ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
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
