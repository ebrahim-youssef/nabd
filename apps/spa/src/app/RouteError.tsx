import { NavLink, useRouteError } from 'react-router'

import { shellCopy } from '@nabd/shared'

import { useNoindex } from './useNoindex'

// Route error surfaces for NBD-83. Both render a friendly Arabic line and a real way out; the
// raw error and its stack are deliberately never rendered. Sentry reporting is out of scope
// for this ticket.
//
// `AppRouteError` is the in-shell boundary: it draws a card inside the application layout, so
// the bottom navigation stays usable. `FatalRouteError` is the full-page boundary for failures
// that happen where no layout can be trusted — the shell component itself, the public landing,
// and the public catch-all — so it always sends the user back to the landing page.

export function AppRouteError() {
  useRouteError()

  return (
    <div className="flex flex-col items-center gap-2 rounded-card border border-border bg-surface p-6 text-center shadow-card-small">
      <span aria-hidden="true" className="text-small font-bold text-gold">
        ✦
      </span>
      <p className="m-0 text-body text-foreground">{shellCopy.error}</p>
      <NavLink
        to="/app"
        end
        className="mt-2 rounded-button bg-primary px-4 py-2 text-small font-medium text-on-primary shadow-card-small"
      >
        {shellCopy.retry}
      </NavLink>
    </div>
  )
}

export function FatalRouteError() {
  useRouteError()
  useNoindex()

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="m-0 text-body text-foreground">{shellCopy.error}</p>
      <NavLink
        to="/"
        end
        className="rounded-button bg-primary px-5 py-2.5 text-body font-medium text-on-primary shadow-card-small"
      >
        {shellCopy.returnLanding}
      </NavLink>
    </main>
  )
}
