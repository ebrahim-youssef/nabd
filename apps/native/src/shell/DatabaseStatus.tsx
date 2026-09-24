import { ActivityIndicator, Pressable, View } from 'react-native'

import { shellCopy } from '@nabd/shared'

import { NATIVE_SHELL_COPY } from './constants'
import { Text } from './Text'

export function DatabaseLoading() {
  return (
    <View
      accessibilityLabel={NATIVE_SHELL_COPY.databaseLoading}
      className="flex-1 items-center justify-center gap-3 bg-background px-6"
      testID="database-loading"
    >
      <ActivityIndicator />
      <Text className="text-body text-center text-muted-foreground">
        {NATIVE_SHELL_COPY.databaseLoading}
      </Text>
    </View>
  )
}

export function DatabaseError({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="flex-1 justify-center gap-4 bg-background px-6" testID="database-error">
      <Text accessibilityRole="header" className="text-title text-start text-primary">
        {NATIVE_SHELL_COPY.databaseError}
      </Text>
      <Pressable
        accessibilityLabel={shellCopy.retry}
        accessibilityRole="button"
        className="rounded-button bg-primary px-5 py-4"
        onPress={onRetry}
      >
        <Text className="text-body text-center font-body-medium text-primary-foreground">
          {shellCopy.retry}
        </Text>
      </Pressable>
    </View>
  )
}
