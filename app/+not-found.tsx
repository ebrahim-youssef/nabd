import { shellCopy } from '../src/shell/copy'
import { useRouter } from 'expo-router'
import { Pressable } from 'react-native'

import { Text } from '../src/shell/Text'

import { ScreenContainer } from '../src/shell/ScreenContainer'
import { StateView } from '../src/ui/StateView'

export default function NotFoundRoute() {
  const router = useRouter()

  return (
    <ScreenContainer testID="not-found">
      <StateView kind="empty" title={shellCopy.notFound} body={shellCopy.publicNotFoundHint} />
      <Pressable
        accessibilityLabel={shellCopy.returnHome}
        accessibilityRole="button"
        className="mt-6 rounded-button bg-accent px-5 py-4"
        onPress={() => router.replace('/')}
        testID="not-found-home"
      >
        <Text className="text-body text-center font-sans-medium text-on-accent">
          {shellCopy.returnHome}
        </Text>
      </Pressable>
    </ScreenContainer>
  )
}
