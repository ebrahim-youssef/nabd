import { shellCopy } from '@nabd/shared'
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
        <Text accessibilityRole="header" className="text-title text-start text-primary">
          {title}
        </Text>
      )}
      <Text className="mt-4 text-body text-start text-muted-foreground">
        {shellCopy.appNotFoundHint}
      </Text>
    </ScreenContainer>
  )
}
