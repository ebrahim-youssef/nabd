import type { CalculationMethodId } from './logic'
import { View } from 'react-native'
import { BottomSheet } from '../ui/BottomSheet'
import { OptionCard } from '../ui/OptionCard'
import { COPY } from './copy'
import { CALCULATION_METHODS } from './logic'

export function MethodSheet({
  visible,
  onClose,
  methodId,
  onSelect,
}: {
  visible: boolean
  onClose: () => void
  methodId: CalculationMethodId
  onSelect: (id: CalculationMethodId) => void
}) {
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={COPY.methodTitle}
      explanation={COPY.methodExplanation}
    >
      <View className="gap-2" accessibilityRole="radiogroup">
        {CALCULATION_METHODS.map((method) => (
          <OptionCard
            key={method.id}
            title={method.label}
            selected={method.id === methodId}
            onPress={() => {
              onSelect(method.id)
              onClose()
            }}
          />
        ))}
      </View>
    </BottomSheet>
  )
}
