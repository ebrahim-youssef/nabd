'use client'

import { BarChart3, Clock, Home, LibraryBig, Settings } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

// Fixed bottom navigation (NBD-22; five items since r6 §2-amendment — the owner moved
// مواقيت الصلاة and الإعدادات here from the home header). RTL: the array renders
// right-to-left with home dead center. Each section owns a route; the active tab is
// highlighted by path prefix so sub-pages keep their section lit (قضاء lights الإحصائيات —
// its door is the stats page).
const NAV_ITEMS = [
  {
    href: '/libraries',
    label: 'المكتبات',
    icon: LibraryBig,
    match: ['/libraries', '/adhkar', '/niyyat'],
  },
  { href: '/prayer-times', label: 'المواقيت', icon: Clock, match: ['/prayer-times'] },
  { href: '/', label: 'الرئيسية', icon: Home, match: ['/'] },
  { href: '/stats', label: 'الإحصائيات', icon: BarChart3, match: ['/stats', '/qada'] },
  { href: '/settings', label: 'الإعدادات', icon: Settings, match: ['/settings'] },
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
                  // px-0.5 (not px-3): five labeled tabs must fit a 360px viewport inside the
                  // pill — الإحصائيات alone is ~72px of label.
                  'flex flex-col items-center gap-0.5 rounded-chip px-0.5 py-1.5 text-label transition-all duration-200',
                  active
                    ? 'bg-primary text-on-primary shadow-card-sm'
                    : 'text-muted-foreground hover:text-primary',
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
