import { shellCopy } from '@nabd/shared'
import { Text } from 'react-native'

import { PageHeader } from './PageHeader'
import { ScreenContainer } from './ScreenContainer'

export function RouteStub({ title, subPage = false }: { title: string; subPage?: boolean }) {
  return (
    <ScreenContainer testID="route-stub">
      {subPage ? (
        <PageHeader title={title} />
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
