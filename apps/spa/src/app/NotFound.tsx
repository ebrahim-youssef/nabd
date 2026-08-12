import { NavLink } from 'react-router'

import { shellCopy } from '@nabd/shared'

// Application-scoped not-found, rendered inside the app shell for any unmatched /app path.
export function AppNotFound() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card border border-border bg-surface p-6 text-center shadow-card-small">
      <span aria-hidden="true" className="text-small font-bold text-gold">
        ۞
      </span>
      <p className="m-0 font-display text-subtitle text-primary">{shellCopy.notFound}</p>
      <p className="m-0 text-small text-muted-foreground">{shellCopy.appNotFoundHint}</p>
      <NavLink
        to="/app"
        end
        className="mt-2 rounded-button bg-primary px-4 py-2 text-small font-medium text-on-primary shadow-card-small"
      >
        {shellCopy.returnHome}
      </NavLink>
    </div>
  )
}
