import { useNavigation } from 'react-router'

import { shellCopy } from '@nabd/shared'

// Accessible route-loading region: announces in-flight data-route navigation once per
// navigation instead of flashing per fragment. The live region is always in the document;
// the message renders only while a route is loading.
export function RouteLoading() {
  const navigation = useNavigation()
  const isLoading = navigation.state === 'loading'

  return (
    <div role="status" aria-live="polite" aria-busy={isLoading} data-testid="route-loading">
      {isLoading ? (
        <p className="m-0 px-1 text-small text-muted-foreground">{shellCopy.loading}</p>
      ) : null}
    </div>
  )
}
