import { useState } from 'react'
import { Minus, Plus } from 'lucide-react-native'
import { Pressable, View } from 'react-native'

import { ICON_SIZE, useThemeColors } from '../../theme/tokens'
import { toArabicIndic } from '../lib/format'
import { Text } from '../shell/Text'
import { TextInput } from '../shell/TextInput'
import { uiCopy } from './copy'

const DEFAULT_MIN = 0
const DEFAULT_STEP = 1
const ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'

function toLatinDigits(value: string): string {
  return value.replace(/[٠-٩]/g, (digit) => String(ARABIC_INDIC_DIGITS.indexOf(digit)))
}

export function Stepper({
  label,
  value,
  onChange,
  min = DEFAULT_MIN,
  max,
  step = DEFAULT_STEP,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max: number
  step?: number
}) {
  const theme = useThemeColors()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(toArabicIndic(value))
  const clamp = (number: number) => Math.min(max, Math.max(min, number))
  const finishEditing = () => {
    if (!editing) return
    const parsed = Number(toLatinDigits(draft.trim()))
    if (draft.trim() !== '' && Number.isFinite(parsed)) onChange(clamp(parsed))
    else setDraft(toArabicIndic(value))
    setEditing(false)
  }
  const adjust = (amount: number) => onChange(clamp(value + amount))

  return (
    <View className="min-h-[54px] flex-row items-center justify-between">
      <Text className="font-sans-medium text-row-label text-ink">{label}</Text>
      <View className="flex-row items-center gap-3">
        <Pressable
          accessibilityLabel={uiCopy.decrease}
          accessibilityRole="button"
          className={`size-9 items-center justify-center rounded-control border border-line bg-surface ${value <= min ? 'opacity-[0.45]' : ''}`}
          disabled={value <= min}
          onPress={() => adjust(-step)}
        >
          <Minus color={theme.ink} size={ICON_SIZE} />
        </Pressable>
        {editing ? (
          <TextInput
            accessibilityLabel={label}
            autoFocus
            className="min-w-12 text-center font-display text-sheet-title text-ink"
            keyboardType="number-pad"
            onBlur={finishEditing}
            onChangeText={setDraft}
            onSubmitEditing={finishEditing}
            selectTextOnFocus
            value={draft}
          />
        ) : (
          <Pressable
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            accessibilityLabel={label}
            accessibilityRole="adjustable"
            accessibilityValue={{ min, max, now: value }}
            className="min-w-12 items-center"
            onAccessibilityAction={({ nativeEvent }) => {
              if (nativeEvent.actionName === 'increment') adjust(step)
              if (nativeEvent.actionName === 'decrement') adjust(-step)
            }}
            onPress={() => {
              setDraft(toArabicIndic(value))
              setEditing(true)
            }}
          >
            <Text className="font-display text-sheet-title text-ink">{toArabicIndic(value)}</Text>
          </Pressable>
        )}
        <Pressable
          accessibilityLabel={uiCopy.increase}
          accessibilityRole="button"
          className={`size-9 items-center justify-center rounded-control border border-line bg-surface ${value >= max ? 'opacity-[0.45]' : ''}`}
          disabled={value >= max}
          onPress={() => adjust(step)}
        >
          <Plus color={theme.ink} size={ICON_SIZE} />
        </Pressable>
      </View>
    </View>
  )
}
