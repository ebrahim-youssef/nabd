import { QADA_COPY, QADA_PRAYERS, daysFromPeriod } from '@nabd/shared'
import { Check, Plus } from 'lucide-react-native'
import { useState } from 'react'
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native'

import { ICON_SIZE, NATIVE_THEME } from '../shell/nativeTheme'
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

  if (isLoading) return <View className="h-40 w-full rounded-card bg-surface-2" />

  return (
    <View className="gap-4" testID={LEDGER_TEST_ID}>
      <Text className="text-body text-muted-foreground">
        {hasAny ? QADA_COPY.intro : QADA_COPY.empty}
      </Text>
      <Pressable
        accessibilityRole="button"
        className="self-start flex-row items-center justify-center gap-2 rounded-button bg-primary px-5 py-2.5 text-body text-on-primary shadow-card-small"
        onPress={openModal}
        testID={ADD_TEST_ID}
      >
        <Plus accessible={false} color={NATIVE_THEME.colors['on-primary']} size={ICON_SIZE} />
        <Text className="text-body text-on-primary">{QADA_COPY.addButton}</Text>
      </Pressable>
      <View className="gap-2">
        {QADA_PRAYERS.map((prayer) => {
          const count = remaining[prayer.id]
          const clear = count === 0
          return (
            <View
              className="flex-row items-center justify-between gap-3 rounded-card border border-border bg-surface p-4 shadow-card-small"
              key={prayer.id}
              testID={`${ROW_TEST_PREFIX}${prayer.id}`}
            >
              <View className="min-w-0 flex-1 flex-row items-center gap-3">
                <Text className="text-body text-foreground">{prayer.label}</Text>
                <Text
                  className={`shrink-0 rounded-chip border px-2.5 py-0.5 text-small ${clear ? 'border-gold/40 bg-gold-soft text-gold' : 'border-border bg-surface-2 text-muted-foreground'}`}
                  testID={`${COUNT_TEST_PREFIX}${prayer.id}`}
                >
                  {clear ? QADA_COPY.done : QADA_COPY.remaining(count)}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: clear }}
                className={`shrink-0 flex-row items-center gap-1.5 rounded-chip border px-3 py-1.5 text-small ${clear ? 'border-border opacity-50' : 'border-primary/40 bg-primary/10'}`}
                disabled={clear}
                onPress={() => void payPrayer(prayer.id)}
                testID={`${PAY_TEST_PREFIX}${prayer.id}`}
              >
                <Check
                  accessible={false}
                  color={
                    clear ? NATIVE_THEME.colors['muted-foreground'] : NATIVE_THEME.colors.primary
                  }
                  size={ICON_SIZE - 4}
                />
                <Text
                  className={clear ? 'text-small text-muted-foreground' : 'text-small text-primary'}
                >
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
        <Pressable className="flex-1 justify-end bg-black/50" onPress={dismissModal}>
          <View
            className="max-h-[85%] w-full rounded-t-card bg-surface p-6 pt-3 shadow-card"
            onStartShouldSetResponder={() => true}
          >
            <ScrollView className="flex-grow-0" contentContainerClassName="gap-4">
              <View className="mx-auto mb-3 h-1 w-10 rounded-chip bg-border" />
              <Text className="text-title text-primary">{QADA_COPY.modalTitle}</Text>
              <Text className="text-small text-muted-foreground">{QADA_COPY.modalNote}</Text>
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
              <Text className="text-body text-primary" testID={TOTAL_TEST_ID}>
                {QADA_COPY.total(totalDays)}
              </Text>
              <View className="flex-row justify-end gap-2">
                <Pressable
                  accessibilityRole="button"
                  className="rounded-button border border-border bg-surface px-4 py-2"
                  onPress={dismissModal}
                >
                  <Text className="text-body text-muted-foreground">{QADA_COPY.cancel}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: totalDays === 0 }}
                  className={`rounded-button bg-primary px-5 py-2 ${totalDays === 0 ? 'opacity-50' : ''}`}
                  disabled={totalDays === 0}
                  onPress={() => void confirm()}
                  testID={CONFIRM_TEST_ID}
                >
                  <Text className="text-body text-on-primary">{QADA_COPY.confirm}</Text>
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
      <Text className="text-small text-muted-foreground">{label}</Text>
      <TextInput
        className="w-full rounded-chip border border-border bg-surface-2 px-3 py-2 text-center text-body"
        keyboardType="number-pad"
        onChangeText={onChange}
        testID={testID}
        value={value}
      />
    </View>
  )
}
