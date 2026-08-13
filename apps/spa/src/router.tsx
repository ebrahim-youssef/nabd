import { createBrowserRouter } from 'react-router'
import type { RouteObject } from 'react-router'

import { SettingsRoute } from './settings/SettingsRoute'
import { LibrariesRoute } from './app/LibrariesRoute'
import { AdhkarRoute } from './adhkar/AdhkarRoute'
import { IntentionsRoute } from './intentions/IntentionsRoute'
import { PrayerTimesRoute } from './prayer-times/PrayerTimesRoute'
import { QadaRoute } from './qada/QadaRoute'
import { StatsRoute } from './stats/StatsRoute'
import { AppNotFound } from './app/NotFound'
import { AppRouteError, FatalRouteError } from './app/RouteError'
import { AppShell } from './app/AppShell'
import { LandingPage } from './routes/landing'
import { PublicNotFound } from './routes/not-found'
import { GatedAppIndex } from './onboarding/GatedAppIndex'

// Data-mode route tree (NBD-83): the public landing keeps `/`; everything product-like lives
// under `/app` inside the application shell. Each route uses the React Router v7
// `Component`/`ErrorBoundary` fields.
//
// Every route in the tree is covered by a boundary, at two levels. `AppRouteError` is a
// pathless child boundary inside the shell, so a failing page keeps the navigation usable.
// `FatalRouteError` sits on the routes where no layout can be trusted — the landing, the `/app`
// route that renders the shell itself, and the public catch-all — so a shell or catch-all
// failure still gets a friendly Arabic surface instead of React Router's default error UI.
//
// An application-scoped catch-all inside the shell owns unmatched `/app` paths; a public
// catch-all owns every other unmatched path. The tree is exported so tests drive the real
// routes through a memory router.
export const routes: RouteObject[] = [
  {
    path: '/',
    Component: LandingPage,
    ErrorBoundary: FatalRouteError,
  },
  {
    path: '/app',
    Component: AppShell,
    ErrorBoundary: FatalRouteError,
    children: [
      {
        ErrorBoundary: AppRouteError,
        children: [
          { index: true, Component: GatedAppIndex },
          { path: 'libraries', Component: LibrariesRoute },
          { path: 'adhkar', Component: AdhkarRoute },
          { path: 'niyyat', Component: IntentionsRoute },
          { path: 'prayer-times', Component: PrayerTimesRoute },
          { path: 'stats', Component: StatsRoute },
          { path: 'qada', Component: QadaRoute },
          { path: 'settings', Component: SettingsRoute },
          { path: '*', Component: AppNotFound },
        ],
      },
    ],
  },
  {
    path: '*',
    Component: PublicNotFound,
    ErrorBoundary: FatalRouteError,
  },
]

export const router = createBrowserRouter(routes)
