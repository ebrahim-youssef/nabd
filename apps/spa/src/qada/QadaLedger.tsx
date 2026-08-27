import { QADA_COPY, QADA_PRAYERS, daysFromPeriod } from '@nabd/shared'
import { Check, Plus } from 'lucide-react'
import { useRef, useState } from 'react'

import { useQada } from './useQada'

// The قضاء الفوائت ledger (NBD-39, ADR-0010): five prayer rows with their remaining debt, and a
// native <dialog> bottom sheet that turns a rough سنين/شهور/أيام estimate into per-prayer counters.
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

  if (isLoading)
    return <div className="h-40 w-full animate-pulse rounded-card bg-surface2" aria-hidden />

  return (
    <div className="flex flex-col gap-4" data-testid="qada-ledger">
      <p className="text-body text-muted-foreground">
        {hasAny ? QADA_COPY.intro : QADA_COPY.empty}
      </p>
      <button
        type="button"
        onClick={openModal}
        data-testid="qada-add"
        className="flex self-start items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-body font-medium text-on-primary shadow-card-small transition-colors hover:bg-primary-deep"
      >
        <Plus className="size-5" aria-hidden />
        {QADA_COPY.addButton}
      </button>
      <ul className="flex flex-col gap-2">
        {QADA_PRAYERS.map((prayer) => {
          const count = remaining[prayer.id]
          const clear = count === 0
          return (
            <li
              key={prayer.id}
              data-testid={`qada-row-${prayer.id}`}
              className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface p-4 shadow-card-small"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="text-body font-medium text-foreground">{prayer.label}</span>
                <span
                  data-testid={`qada-count-${prayer.id}`}
                  className={`shrink-0 rounded-chip border px-2.5 py-0.5 text-small ${clear ? 'border-gold/40 bg-gold-soft text-gold' : 'border-border bg-surface2 text-muted-foreground'}`}
                >
                  {clear ? QADA_COPY.done : QADA_COPY.remaining(count)}
                </span>
              </span>
              <button
                type="button"
                disabled={clear}
                onClick={() => void payPrayer(prayer.id)}
                data-testid={`qada-pay-${prayer.id}`}
                className={`flex shrink-0 items-center gap-1.5 rounded-chip border px-3 py-1.5 text-small font-medium transition-all ${clear ? 'cursor-not-allowed border-border text-muted-foreground opacity-50' : 'border-primary/40 bg-primary/10 text-primary hover:bg-primary hover:text-on-primary active:scale-[0.98]'}`}
              >
                <Check className="size-4" aria-hidden />
                {QADA_COPY.pay}
              </button>
            </li>
          )
        })}
      </ul>
      <dialog
        ref={dialogRef}
        data-testid="qada-modal"
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close()
        }}
        // A bottom sheet, not a centered web modal (NBD-77): rises from the bottom edge with a
        // grab handle and dismisses on a backdrop tap. Stays a native <dialog> so focus-trap and
        // Escape keep working. Legacy also wires the Android hardware back button through
        // useBackDismiss; that hook listens for an event only the Capacitor chrome dispatches, so
        // it would be inert here. Hardware back belongs to the native target (ADR-0014).
        className="fixed inset-x-0 bottom-0 top-auto mx-auto my-0 max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-card rounded-b-none bg-surface p-6 pt-3 text-foreground shadow-card backdrop:bg-black/50 motion-safe:animate-in motion-safe:slide-in-from-bottom-4 motion-safe:fade-in motion-safe:duration-200"
      >
        <span aria-hidden className="mx-auto mb-3 block h-1 w-10 shrink-0 rounded-full bg-border" />
        <form
          method="dialog"
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            void confirm()
          }}
        >
          <h2 className="font-display text-title text-primary">{QADA_COPY.modalTitle}</h2>
          <p className="text-small text-muted-foreground">{QADA_COPY.modalNote}</p>
          <div className="flex gap-3">
            {[
              { label: QADA_COPY.years, value: years, set: setYears, testId: 'qada-years' },
              { label: QADA_COPY.months, value: months, set: setMonths, testId: 'qada-months' },
              { label: QADA_COPY.days, value: days, set: setDays, testId: 'qada-days' },
            ].map((field) => (
              <label key={field.testId} className="flex flex-1 flex-col gap-1">
                <span className="text-small text-muted-foreground">{field.label}</span>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={field.value}
                  onChange={(event) => field.set(event.target.value)}
                  data-testid={field.testId}
                  className="w-full rounded-chip border border-border bg-surface2 px-3 py-2 text-center text-body tabular-nums"
                />
              </label>
            ))}
          </div>
          <p className="text-body font-medium text-primary" data-testid="qada-total">
            {QADA_COPY.total(totalDays)}
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded-full border border-border bg-surface px-4 py-2 text-body text-muted-foreground transition-colors hover:text-foreground"
            >
              {QADA_COPY.cancel}
            </button>
            <button
              type="submit"
              disabled={totalDays === 0}
              data-testid="qada-confirm"
              className="rounded-full bg-primary px-5 py-2 text-body font-medium text-on-primary transition-colors hover:bg-primary-deep disabled:cursor-not-allowed disabled:opacity-50"
            >
              {QADA_COPY.confirm}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  )
}
