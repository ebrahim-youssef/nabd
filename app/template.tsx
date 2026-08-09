import type { ReactNode } from 'react'

// A route template re-mounts on every navigation, unlike the persistent layout. Wrapping the
// page in it gives each screen a short native-feeling entrance instead of the web-instant swap
// (NBD-78). Transform/opacity only — no layout shift — and gated on `motion-safe`, so anyone
// with prefers-reduced-motion set gets the instant swap back. The fixed bottom nav and status
// bar live in the layout, so they stay put while only the page content animates.
export default function Template({ children }: { children: ReactNode }) {
  return (
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:ease-out">
      {children}
    </div>
  )
}
