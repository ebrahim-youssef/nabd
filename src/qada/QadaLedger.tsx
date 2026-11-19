import { QADA_COPY } from './copy'
import { QADA_PRAYERS, daysFromPeriod } from './logic'
import { Check, Plus } from 'lucide-react-native'
import { useState } from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'

import { Text } from '../shell/Text'
import { TextInput } from '../shell/TextInput'
import { ICON_SIZE, useThemeColors } from '../../theme/tokens'
import { useQada } from './useQada'

const LEDGER_TEST_ID = 'qada-ledger'
const ADD_TEST_ID = 'qada-add'
const MODAL_TEST_ID = 'qada-modal'
const COUNT_TEST_PREFIX = 'qada-count-'
const PAY_TEST_PREFIX = 'qada-pay-'
const ROW_TEST_PREFIX = 'qada-row-'
const FIELD_TEST_IDS = {
  years: 'qada-years',
  months: 'qada-months',
  days: 'qada-days',
} as const
const PERIOD_FIELDS = [
  { key: 'years', label: QADA_COPY.years, testID: FIELD_TEST_IDS.years },
  { key: 'months', label: QADA_COPY.months, testID: FIELD_TEST_IDS.months },
  { key: 'days', label: QADA_COPY.days, testID: FIELD_TEST_IDS.days },
] as const
const CONFIRM_TEST_ID = 'qada-confirm'
const TOTAL_TEST_ID = 'qada-total'
const CHECKMARK = '✓'

export function QadaLedger() {
  const { isLoading, hasAny, remaining, addDebt, payPrayer } = useQada()
  const theme = useThemeColors()
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [period, setPeriod] = useState({ years: '', months: '', days: '' })
  const { years, months, days } = period
  const totalDays = daysFromPeriod(Number(years), Number(months), Number(days))

  function openModal() {
    setPeriod({ years: '', months: '', days: '' })
    setIsModalVisible(true)
  }

  function dismissModal() {
    setIsModalVisible(false)
  }

  async function confirm() {
    await addDebt(totalDays)
    dismissModal()
  }

  if (isLoading) return <View className="h-40 w-full rounded-card bg-bg" />

  return (
    <View className="gap-4" testID={LEDGER_TEST_ID}>
      <Text className="text-body text-ink">{hasAny ? QADA_COPY.intro : QADA_COPY.empty}</Text>
      <Pressable
        accessibilityRole="button"
        className="self-start flex-row items-center justify-center gap-2 rounded-button bg-accent px-5 py-2.5 text-body text-on-accent shadow-card"
        onPress={openModal}
        testID={ADD_TEST_ID}
      >
        <Plus accessible={false} color={theme['on-accent']} size={ICON_SIZE} />
        <Text className="text-body text-on-accent">{QADA_COPY.addButton}</Text>
      </Pressable>
      <View className="gap-2">
        {QADA_PRAYERS.map((prayer) => {
          const count = remaining[prayer.id]
          const clear = count === 0
          return (
            <View
              className="flex-row items-center justify-between gap-3 rounded-card border border-line bg-surface p-4 shadow-card"
              key={prayer.id}
              testID={`${ROW_TEST_PREFIX}${prayer.id}`}
            >
              <View className="min-w-0 flex-1 flex-row items-center gap-3">
                <Text className="text-body text-ink">{prayer.label}</Text>
                <Text
                  className={`shrink-0 rounded-pill border px-2.5 py-0.5 text-meta ${clear ? 'border-gold-ink/40 bg-now text-gold-ink' : 'border-line bg-bg text-ink'}`}
                  testID={`${COUNT_TEST_PREFIX}${prayer.id}`}
                >
                  {clear ? QADA_COPY.done : QADA_COPY.remaining(count)}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: clear }}
                className={`shrink-0 flex-row items-center gap-1.5 rounded-pill border px-3 py-1.5 text-meta ${clear ? 'border-line opacity-50' : 'border-accent/40 bg-accent/10'}`}
                disabled={clear}
                onPress={() => void payPrayer(prayer.id)}
                testID={`${PAY_TEST_PREFIX}${prayer.id}`}
              >
                <Check
                  accessible={false}
                  color={clear ? theme['mute'] : theme.accent}
                  size={ICON_SIZE - 4}
                />
                <Text className={clear ? 'text-meta text-ink' : 'text-meta text-accent'}>
                  {QADA_COPY.pay}
                </Text>
              </Pressable>
            </View>
          )
        })}
      </View>
      <Modal
        animationType="slide"
        onRequestClose={dismissModal}
        transparent
        visible={isModalVisible}
        testID={MODAL_TEST_ID}
      >
        <Pressable className="flex-1 justify-end bg-scrim" onPress={dismissModal}>
          <View
            className="max-h-[85%] w-full rounded-t-card bg-surface p-6 pt-3 shadow-card"
            onStartShouldSetResponder={() => true}
          >
            <ScrollView className="flex-grow-0" contentContainerClassName="gap-4">
              <View className="mx-auto mb-3 h-1 w-10 rounded-pill bg-line" />
              <Text className="font-display text-sheet-title text-accent">
                {QADA_COPY.modalTitle}
              </Text>
              <Text className="text-meta text-ink">{QADA_COPY.modalNote}</Text>
              <View className="flex-row gap-3">
                {PERIOD_FIELDS.map(({ key, label, testID }) => (
                  <PeriodField
                    key={key}
                    label={label}
                    testID={testID}
                    value={period[key]}
                    onChange={(value) => setPeriod((current) => ({ ...current, [key]: value }))}
                  />
                ))}
              </View>
              <Text className="text-body text-accent" testID={TOTAL_TEST_ID}>
                {QADA_COPY.total(totalDays)}
              </Text>
              <View className="flex-row justify-end gap-2">
                <Pressable
                  accessibilityRole="button"
                  className="rounded-button border border-line bg-surface px-4 py-2"
                  onPress={dismissModal}
                >
                  <Text className="text-body text-ink">{QADA_COPY.cancel}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: totalDays === 0 }}
                  className={`rounded-button bg-accent px-5 py-2 ${totalDays === 0 ? 'opacity-50' : ''}`}
                  disabled={totalDays === 0}
                  onPress={() => void confirm()}
                  testID={CONFIRM_TEST_ID}
                >
                  <Text className="text-body text-on-accent">{QADA_COPY.confirm}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  )
}

function PeriodField({
  label,
  testID,
  value,
  onChange,
}: {
  label: string
  testID: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <View className="min-w-0 flex-1 gap-1">
      <Text className="text-meta text-ink">{label}</Text>
      <TextInput
        className="w-full rounded-pill border border-line bg-bg px-3 py-2 text-center text-body"
        keyboardType="number-pad"
        onChangeText={onChange}
        testID={testID}
        value={value}
      />
    </View>
  )
}
