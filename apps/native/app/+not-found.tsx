import { shellCopy } from '@nabd/shared'
import { useRouter } from 'expo-router'
import { Pressable } from 'react-native'

import { Text } from '../src/shell/Text'

import { ScreenContainer } from '../src/shell/ScreenContainer'

export default function NotFoundRoute() {
  const router = useRouter()

  return (
    <ScreenContainer testID="not-found">
      <Text accessibilityRole="header" className="text-title text-primary">
        {shellCopy.notFound}
      </Text>
      <Text className="mt-4 text-body text-start text-muted-foreground">
        {shellCopy.appNotFoundHint}
      </Text>
      <Pressable
        accessibilityLabel={shellCopy.returnHome}
        accessibilityRole="button"
        className="mt-6 rounded-button bg-primary px-5 py-4"
        onPress={() => router.replace('/')}
        testID="not-found-home"
      >
        <Text className="text-body text-center font-body-medium text-on-primary">
          {shellCopy.returnHome}
        </Text>
      </Pressable>
    </ScreenContainer>
  )
}
