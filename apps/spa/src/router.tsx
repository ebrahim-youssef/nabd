import { createBrowserRouter } from 'react-router'

import { LandingPage } from './routes/landing'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
])
