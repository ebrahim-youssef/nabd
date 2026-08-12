import { NavLink } from 'react-router'

import { landingCopy, shellCopy } from '@nabd/shared'

import { useNoindex } from '../app/useNoindex'

export function PublicNotFound() {
  useNoindex()

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="m-0 font-display text-display font-bold text-primary-deep">
          {shellCopy.notFound}
        </p>
        <p className="m-0 max-w-sm text-body text-muted-foreground">
          {shellCopy.publicNotFoundHint} {landingCopy.appName} {landingCopy.tagline}
        </p>
        <NavLink
          to="/"
          end
          className="mt-2 rounded-button bg-primary px-5 py-2.5 text-body font-medium text-on-primary shadow-card-small"
        >
          {shellCopy.returnLanding}
        </NavLink>
      </main>
    </div>
  )
}
