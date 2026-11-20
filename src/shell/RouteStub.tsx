import { shellCopy } from './copy'
import { Text } from './Text'

import { PageHeader } from './PageHeader'
import { ScreenContainer } from './ScreenContainer'

export function RouteStub({
  title,
  subPage = false,
  backHref = '/',
}: {
  title: string
  subPage?: boolean
  backHref?: string
}) {
  return (
    <ScreenContainer testID="route-stub">
      {subPage ? (
        <PageHeader title={title} backHref={backHref} />
      ) : (
        <Text accessibilityRole="header" className="text-sheet-title text-start text-accent">
          {title}
        </Text>
      )}
      <Text className="mt-4 text-body text-start text-ink">{shellCopy.appNotFoundHint}</Text>
    </ScreenContainer>
  )
}
