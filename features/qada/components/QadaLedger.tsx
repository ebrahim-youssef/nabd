'use client'

import { Check, Plus } from 'lucide-react'
import { useRef, useState } from 'react'

import { toArabicIndic } from '@/lib/pure/format'
import { cn } from '@/lib/utils'

import { useQada } from '../hooks/useQada'
import { DAYS_PER_MONTH, DAYS_PER_YEAR, daysFromPeriod, QADA_PRAYERS } from '../logic'

const COPY = {
  intro:
    'قدّر المدة التي فاتتك فيها الصلاة، وسيوزّعها السجلّ على الصلوات الخمس — وكلما قضيت صلاةً أنقصها بضغطة.',
  empty: 'لا فوائت مسجّلة — أضف تقديرك لتبدأ.',
  addButton: 'إضافة فوائت',
  modalTitle: 'إضافة فوائت',
  modalNote: `تُحسب السنة ${toArabicIndic(DAYS_PER_YEAR)} يومًا والشهر ${toArabicIndic(DAYS_PER_MONTH)} يومًا، وتُضاف الأيام لكل صلاة من الخمس.`,
  years: 'سنين',
  months: 'شهور',
  days: 'أيام',
  total: (days: number) => `= ${toArabicIndic(days)} يومًا لكل صلاة`,
  confirm: 'إضافة',
  cancel: 'إلغاء',
  pay: 'تم قضاء صلاة',
  // Arabic number agreement: ١ فائتة واحدة، ٢ فائتتان، ٣–١٠ فوائت، ١١+ فائتة.
  remaining: (count: number) => {
    if (count === 1) return 'فائتة واحدة'
    if (count === 2) return 'فائتتان'
    if (count <= 10) return `${toArabicIndic(count)} فوائت`
    return `${toArabicIndic(count)} فائتة`
  },
  done: 'لا فوائت ✦',
} as const

// The قضاء الفوائت ledger (NBD-39, ADR-0010): five prayer rows with their remaining debt,
// and a native <dialog> modal that turns a rough سنين/شهور/أيام estimate into per-prayer
// counters.
export function QadaLedger() {
  const { isLoading, hasAny, remaining, addDebt, payPrayer } = useQada()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [years, setYears] = useState('')
  const [months, setMonths] = useState('')
  const [days, setDays] = useState('')

  const totalDays = daysFromPeriod(Number(years), Number(months), Number(days))

  const openModal = () => {
    setYears('')
    setMonths('')
    setDays('')
    dialogRef.current?.showModal()
  }

  const confirm = async () => {
    await addDebt(totalDays)
    dialogRef.current?.close()
  }

  if (isLoading) {
    return <div className="bg-surface-2 h-40 w-full animate-pulse rounded-card" aria-hidden />
  }

  return (
    <div className="flex flex-col gap-4" data-testid="qada-ledger">
      <p className="text-muted-foreground text-body">{hasAny ? COPY.intro : COPY.empty}</p>

      <button
        type="button"
        onClick={openModal}
        data-testid="qada-add"
        className="bg-primary text-on-primary shadow-card-sm hover:bg-primary-deep flex items-center justify-center gap-2 self-start rounded-full px-5 py-2.5 text-body font-medium transition-colors"
      >
        <Plus className="size-5" aria-hidden />
        {COPY.addButton}
      </button>

      <ul className="flex flex-col gap-2">
        {QADA_PRAYERS.map((prayer) => {
          const count = remaining[prayer.id]
          const clear = count === 0
          return (
            <li
              key={prayer.id}
              data-testid={`qada-row-${prayer.id}`}
              className="border-border bg-surface shadow-card-sm flex items-center justify-between gap-3 rounded-card border p-4"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="text-body text-foreground font-medium">{prayer.label}</span>
                <span
                  data-testid={`qada-count-${prayer.id}`}
                  className={cn(
                    'rounded-chip border px-2.5 py-0.5 text-small shrink-0',
                    clear
                      ? 'border-gold/40 bg-gold-soft text-gold'
                      : 'border-border bg-surface-2 text-muted-foreground',
                  )}
                >
                  {clear ? COPY.done : COPY.remaining(count)}
                </span>
              </span>
              <button
                type="button"
                disabled={clear}
                onClick={() => void payPrayer(prayer.id)}
                data-testid={`qada-pay-${prayer.id}`}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-chip border px-3 py-1.5 text-small font-medium transition-all',
                  clear
                    ? 'border-border text-muted-foreground cursor-not-allowed opacity-50'
                    : 'border-primary/40 bg-primary/10 text-primary hover:bg-primary hover:text-on-primary active:scale-[0.98]',
                )}
              >
                <Check className="size-4" aria-hidden />
                {COPY.pay}
              </button>
            </li>
          )
        })}
      </ul>

      <dialog
        ref={dialogRef}
        data-testid="qada-modal"
        className="bg-surface text-foreground shadow-card m-auto w-full max-w-sm rounded-card p-6 backdrop:bg-black/40"
      >
        <form
          method="dialog"
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            void confirm()
          }}
        >
          <h2 className="font-display text-title text-primary">{COPY.modalTitle}</h2>
          <p className="text-muted-foreground text-small">{COPY.modalNote}</p>

          <div className="flex gap-3">
            {(
              [
                { label: COPY.years, value: years, set: setYears, testId: 'qada-years' },
                { label: COPY.months, value: months, set: setMonths, testId: 'qada-months' },
                { label: COPY.days, value: days, set: setDays, testId: 'qada-days' },
              ] as const
            ).map((field) => (
              <label key={field.testId} className="flex flex-1 flex-col gap-1">
                <span className="text-small text-muted-foreground">{field.label}</span>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={field.value}
                  onChange={(event) => field.set(event.target.value)}
                  data-testid={field.testId}
                  className="border-border bg-surface-2 text-body w-full rounded-chip border px-3 py-2 text-center tabular-nums"
                />
              </label>
            ))}
          </div>

          <p className="text-primary text-body font-medium" data-testid="qada-total">
            {COPY.total(totalDays)}
          </p>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="border-border bg-surface text-muted-foreground hover:text-foreground rounded-full border px-4 py-2 text-body transition-colors"
            >
              {COPY.cancel}
            </button>
            <button
              type="submit"
              disabled={totalDays === 0}
              data-testid="qada-confirm"
              className="bg-primary text-on-primary hover:bg-primary-deep rounded-full px-5 py-2 text-body font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {COPY.confirm}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  )
}
