import { QADA_COPY } from './copy'
import { DAYS_PER_MONTH, DAYS_PER_YEAR, QADA_PRAYERS, daysFromPeriod } from './logic'
import type { QadaPrayerId } from './logic'
import { useRef, useState } from 'react'
import { Pressable, View } from 'react-native'

import { Text } from '../shell/Text'
import { BottomSheet } from '../ui/BottomSheet'
import { Button } from '../ui/Button'
import { ListGroup } from '../ui/ListGroup'
import { ListRow } from '../ui/ListRow'
import { StateView } from '../ui/StateView'
import { Stepper } from '../ui/Stepper'
import { useToast } from '../ui/ToastProvider'
import { useQada } from './useQada'

const MAX_PERIOD = Math.floor(Number.MAX_SAFE_INTEGER / (DAYS_PER_YEAR + DAYS_PER_MONTH + 1))
const EMPTY_PERIOD = { years: 0, months: 0, days: 0 }
const PERIOD_FIELDS = [
  { key: 'years', label: QADA_COPY.years },
  { key: 'months', label: QADA_COPY.months },
  { key: 'days', label: QADA_COPY.days },
] as const

export function QadaLedger() {
  const { isLoading, hasAny, remaining, addDebt, payPrayer, undoPrayer } = useQada()
  const toast = useToast()
  const [isSheetVisible, setIsSheetVisible] = useState(false)
  const [isWriting, setIsWriting] = useState(false)
  const writing = useRef(false)
  const [period, setPeriod] = useState(EMPTY_PERIOD)
  const totalDays = daysFromPeriod(period.years, period.months, period.days)
  const total = QADA_PRAYERS.reduce((sum, prayer) => sum + remaining[prayer.id], 0)

  function openSheet() {
    setPeriod(EMPTY_PERIOD)
    setIsSheetVisible(true)
  }

  async function pay(id: QadaPrayerId, label: string, count: number) {
    if (writing.current) return
    writing.current = true
    setIsWriting(true)
    try {
      if (!(await payPrayer(id))) {
        toast.show({ message: QADA_COPY.writeError })
        return
      }
      toast.show({
        message: QADA_COPY.paid(label, Math.max(0, count - 1)),
        onUndo: () => {
          void undo(id)
        },
      })
    } catch {
      toast.show({ message: QADA_COPY.writeError })
    } finally {
      writing.current = false
      setIsWriting(false)
    }
  }

  async function undo(id: QadaPrayerId) {
    try {
      if (!(await undoPrayer(id))) toast.show({ message: QADA_COPY.writeError })
    } catch {
      toast.show({ message: QADA_COPY.writeError })
    }
  }

  async function confirm() {
    if (writing.current || totalDays === 0) return
    writing.current = true
    setIsWriting(true)
    try {
      if (!(await addDebt(totalDays))) {
        toast.show({ message: QADA_COPY.writeError })
        return
      }
      setIsSheetVisible(false)
      toast.show({ message: QADA_COPY.added })
    } catch {
      toast.show({ message: QADA_COPY.writeError })
    } finally {
      writing.current = false
      setIsWriting(false)
    }
  }

  if (isLoading) return <StateView kind="loading" />

  const footer = (
    <View className="gap-2">
      <Button
        busy={isWriting}
        disabled={totalDays === 0}
        label={QADA_COPY.confirm}
        onPress={() => void confirm()}
        variant="solid"
      />
      <Button label={QADA_COPY.cancel} onPress={() => setIsSheetVisible(false)} />
    </View>
  )
  return (
    <View className="gap-4" testID="qada-ledger">
      {!hasAny && total === 0 ? (
        <StateView
          action={{ label: QADA_COPY.addButton, onPress: openSheet }}
          body={QADA_COPY.intro}
          kind="empty"
          title={QADA_COPY.emptyTitle}
        />
      ) : (
        <>
          <View className="gap-1 rounded-card border border-line bg-surface p-4">
            <Text className="text-meta text-mute">{QADA_COPY.remainingLabel}</Text>
            <Text className="font-display text-sheet-title text-gold-ink">
              {QADA_COPY.remaining(total)}
            </Text>
          </View>
          <ListGroup>
            {QADA_PRAYERS.map((prayer) => {
              const count = remaining[prayer.id]
              const disabled = count === 0 || isWriting
              const accessory = (
                <Pressable
                  accessibilityLabel={QADA_COPY.payPrayer(prayer.label)}
                  accessibilityRole="button"
                  accessibilityState={{ disabled }}
                  className={`rounded-pill border border-line px-3 py-1.5 ${disabled ? 'opacity-[0.45]' : ''}`}
                  disabled={disabled}
                  onPress={() => void pay(prayer.id, prayer.label, count)}
                  testID={`qada-pay-${prayer.id}`}
                >
                  <Text className="text-meta text-accent">{QADA_COPY.pay}</Text>
                </Pressable>
              )
              return (
                <ListRow
                  accessory={accessory}
                  description={QADA_COPY.remaining(count)}
                  key={prayer.id}
                  label={prayer.label}
                  testID={`qada-row-${prayer.id}`}
                />
              )
            })}
          </ListGroup>
          <Button label={QADA_COPY.addButton} onPress={openSheet} />
          <Text className="text-meta text-mute">{QADA_COPY.addDescription}</Text>
        </>
      )}
      <BottomSheet
        explanation={QADA_COPY.modalNote}
        footer={footer}
        onClose={() => setIsSheetVisible(false)}
        title={QADA_COPY.modalTitle}
        visible={isSheetVisible}
      >
        <ListGroup>
          {PERIOD_FIELDS.map(({ key, label }) => (
            <View className="px-3.5" key={key}>
              <Stepper
                label={label}
                max={MAX_PERIOD}
                onChange={(value) => setPeriod((current) => ({ ...current, [key]: value }))}
                value={period[key]}
              />
            </View>
          ))}
        </ListGroup>
        <Text className="mt-3 text-body text-accent">{QADA_COPY.total(totalDays)}</Text>
      </BottomSheet>
    </View>
  )
}
