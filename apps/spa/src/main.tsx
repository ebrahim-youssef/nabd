import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'

import './app.css'
// Self-hosted Arabic font weights (Fontsource), mirroring the legacy next/font/google set:
// body Tajawal, scripture Amiri, display Aref Ruqaa (classic) / Reem Kufi (modern).
import '@fontsource/tajawal/400.css'
import '@fontsource/tajawal/500.css'
import '@fontsource/tajawal/700.css'
import '@fontsource/amiri/400.css'
import '@fontsource/amiri/700.css'
import '@fontsource/aref-ruqaa/400.css'
import '@fontsource/aref-ruqaa/700.css'
import '@fontsource/reem-kufi/400.css'
import '@fontsource/reem-kufi/500.css'
import '@fontsource/reem-kufi/600.css'
import '@fontsource/reem-kufi/700.css'

import { router } from './router'
import { initializeSentry } from './observability/sentry'

initializeSentry()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
