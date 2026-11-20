import type { ReactNode } from 'react'
import { View } from 'react-native'

import { BottomSheet } from './BottomSheet'
import { Button } from './Button'

export function ConfirmSheet({
  visible,
  onClose,
  title,
  explanation,
  children,
  confirmLabel,
  cancelLabel,
  onConfirm,
  confirmDisabled = false,
  busy = false,
}: {
  visible: boolean
  onClose: () => void
  title: string
  explanation: string
  children?: ReactNode
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  confirmDisabled?: boolean
  busy?: boolean
}) {
  const footer = (
    <View className="flex-row gap-2">
      <View className="flex-1">
        <Button
          label={confirmLabel}
          onPress={onConfirm}
          variant="solid"
          disabled={confirmDisabled}
          busy={busy}
        />
      </View>
      <View className="flex-1">
        <Button label={cancelLabel} onPress={onClose} />
      </View>
    </View>
  )

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      explanation={explanation}
      footer={footer}
    >
      {children}
    </BottomSheet>
  )
}
