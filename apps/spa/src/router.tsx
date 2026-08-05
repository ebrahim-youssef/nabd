import { landingCopy, themeTokens } from '@nabd/shared'
import { createBrowserRouter } from 'react-router'

function PlaceholderPage() {
  return (
    <main>
      <h1>{landingCopy.appName}</h1>
      <p>{landingCopy.tagline}</p>
      <p>لون الواجهة الأساسي: {themeTokens.colors.primary}</p>
    </main>
  )
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PlaceholderPage />,
  },
])
