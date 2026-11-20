import type { ReactNode } from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'

import { Text } from '../shell/Text'

type BottomSheetProps = {
  visible: boolean
  onClose: () => void
  title: string
  explanation?: string
  children?: ReactNode
  footer?: ReactNode
}

export function BottomSheet({
  visible,
  onClose,
  title,
  explanation,
  children,
  footer,
}: BottomSheetProps) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      testID="bottom-sheet-modal"
      transparent
      visible={visible}
    >
      <View className="flex-1 justify-end bg-scrim">
        <Pressable
          accessibilityLabel="إغلاق"
          accessibilityRole="button"
          className="absolute inset-0"
          onPress={onClose}
          testID="bottom-sheet-scrim"
        />
        <View
          accessibilityViewIsModal
          className="max-h-[88%] rounded-t-sheet bg-bg px-[18px] pb-7 pt-2.5 dark:border-t dark:border-line"
        >
          <View className="mb-3 h-1 w-10 self-center rounded-pill bg-box" />
          <Text accessibilityRole="header" className="font-display text-sheet-title text-ink">
            {title}
          </Text>
          {explanation ? (
            <Text className="mt-0.5 font-sans text-meta text-mute">{explanation}</Text>
          ) : null}
          <ScrollView className={explanation ? 'mt-3' : 'mt-1'} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View className="mt-3">{footer}</View> : null}
        </View>
      </View>
    </Modal>
  )
}
