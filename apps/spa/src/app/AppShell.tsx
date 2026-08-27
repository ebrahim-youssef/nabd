import { Outlet, useLocation } from 'react-router'

import { BottomNav } from './BottomNav'
import { RouteLoading } from './RouteLoading'
import { useNoindex } from './useNoindex'
import { NotificationScheduler } from '../notifications/NotificationScheduler'

// Application shell for everything under /app (NBD-83). It owns the fixed bottom
// navigation, the bottom clearance that keeps page content clear of it, and the live
// route-loading status. The public landing page sits outside this shell.
export function AppShell() {
  const location = useLocation()
  useNoindex()

  return (
    <div className="flex min-h-dvh flex-col pb-20">
      <NotificationScheduler />
      <RouteLoading />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 pb-10 pt-4 md:px-6 md:pt-8">
        <div
          key={location.key}
          className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:ease-out"
        >
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
