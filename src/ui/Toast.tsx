import { Pressable, View } from 'react-native'

import { Text } from '../shell/Text'

type ToastProps = { message: string; onUndo: () => void; testID?: string }

export function Toast({ message, onUndo, testID }: ToastProps) {
  return (
    <View
      accessibilityLiveRegion="polite"
      className="flex-row items-center justify-between rounded-button bg-ink px-4 py-2.5"
      testID={testID}
    >
      <Text className="flex-1 font-sans-medium text-body text-bg">{message}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="تراجع" onPress={onUndo}>
        <Text className="ms-4 font-sans-bold text-body text-toast-action">تراجع</Text>
      </Pressable>
    </View>
  )
}
