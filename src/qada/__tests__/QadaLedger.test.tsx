import { act, fireEvent, render, screen, within } from '@testing-library/react-native'
import { useState } from 'react'

import { QADA_COPY } from '../copy'
import { QADA_PRAYERS, daysFromPeriod } from '../logic'
import { QadaLedger } from '../QadaLedger'
import { useQada } from '../useQada'
import { ToastProvider } from '../../ui/ToastProvider'

jest.mock('../useQada', () => ({ useQada: jest.fn() }))
jest.mock('lucide-react-native', () => ({
  Minus: () => null,
  Plus: () => null,
  ChevronLeft: () => null,
}))

const mockedUseQada = useQada as jest.MockedFunction<typeof useQada>
const addDebt = jest.fn().mockResolvedValue(true)
const payPrayer = jest.fn().mockResolvedValue(true)
const undoPrayer = jest.fn().mockResolvedValue(true)

function useStatefulQada(): ReturnType<typeof useQada> {
  const [count, setCount] = useState(2)
  return {
    isLoading: false,
    hasAny: true,
    remaining: { fajr: count, dhuhr: 2, asr: 0, maghrib: 0, isha: 0 },
    addDebt,
    payPrayer: async (id) => {
      await payPrayer(id)
      setCount((value) => value - 1)
      return true
    },
    undoPrayer: async (id) => {
      await undoPrayer(id)
      setCount((value) => value + 1)
      return true
    },
  }
}

function renderLedger(
  overrides: Partial<Record<(typeof QADA_PRAYERS)[number]['id'], number>> = {},
  hasAny = true,
) {
  const remaining = Object.fromEntries(
    QADA_PRAYERS.map((prayer) => [prayer.id, overrides[prayer.id] ?? 0]),
  ) as Record<(typeof QADA_PRAYERS)[number]['id'], number>
  mockedUseQada.mockReturnValue({
    isLoading: false,
    hasAny,
    remaining,
    addDebt,
    payPrayer,
    undoPrayer,
  })
  return render(
    <ToastProvider>
      <QadaLedger />
    </ToastProvider>,
  )
}

describe('QadaLedger', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    addDebt.mockResolvedValue(true)
    payPrayer.mockResolvedValue(true)
    undoPrayer.mockResolvedValue(true)
  })

  it('renders all five prayers with done and remaining copy', () => {
    renderLedger({ dhuhr: 3 })
    for (const prayer of QADA_PRAYERS)
      expect(screen.getByTestId(`qada-row-${prayer.id}`)).toBeTruthy()
    for (const prayer of QADA_PRAYERS)
      expect(screen.getByRole('button', { name: `تم قضاء صلاة ${prayer.label}` })).toBeTruthy()
    expect(within(screen.getByTestId('qada-row-fajr')).getByText('لا فوائت')).toBeTruthy()
    expect(
      within(screen.getByTestId('qada-row-dhuhr')).getByText(QADA_COPY.remaining(3)),
    ).toBeTruthy()
  })

  it('disables payment for a cleared prayer and enables it for debt', () => {
    renderLedger({ dhuhr: 1 })
    expect(
      screen.getByRole('button', { name: 'تم قضاء صلاة الفجر' }).props.accessibilityState.disabled,
    ).toBe(true)
    expect(
      screen.getByRole('button', { name: 'تم قضاء صلاة الظهر' }).props.accessibilityState.disabled,
    ).toBe(false)
  })

  it('pays only the selected prayer and undoes it', async () => {
    mockedUseQada.mockImplementation(useStatefulQada)
    render(
      <ToastProvider>
        <QadaLedger />
      </ToastProvider>,
    )
    await act(async () =>
      fireEvent.press(screen.getByRole('button', { name: 'تم قضاء صلاة الفجر' })),
    )
    expect(payPrayer).toHaveBeenCalledWith('fajr')
    expect(screen.getByText(QADA_COPY.paid('الفجر', 1))).toBeTruthy()
    await act(async () => fireEvent.press(screen.getByText('تراجع')))
    expect(undoPrayer).toHaveBeenCalledWith('fajr')
    expect(
      within(screen.getByTestId('qada-row-fajr')).getByText(QADA_COPY.remaining(2)),
    ).toBeTruthy()
    expect(
      within(screen.getByTestId('qada-row-dhuhr')).getByText(QADA_COPY.remaining(2)),
    ).toBeTruthy()
  })

  it('shows failure when payment fails', async () => {
    payPrayer.mockResolvedValue(false)
    renderLedger({ fajr: 1 })
    await act(async () =>
      fireEvent.press(screen.getByRole('button', { name: 'تم قضاء صلاة الفجر' })),
    )
    expect(screen.getByText(QADA_COPY.writeError)).toBeTruthy()
  })

  it('opens with zero steppers and resets them on reopen', () => {
    renderLedger({}, false)
    fireEvent.press(screen.getByText(QADA_COPY.addButton))
    fireEvent(screen.getByLabelText(QADA_COPY.years), 'accessibilityAction', {
      nativeEvent: { actionName: 'increment' },
    })
    fireEvent.press(screen.getByText(QADA_COPY.cancel))
    fireEvent.press(screen.getByText(QADA_COPY.addButton))
    expect(screen.getByLabelText(QADA_COPY.years).props.accessibilityValue.now).toBe(0)
  })

  it('computes the total live and confirms only a non-zero debt', async () => {
    renderLedger({}, false)
    fireEvent.press(screen.getByText(QADA_COPY.addButton))
    expect(
      screen.getByRole('button', { name: QADA_COPY.confirm }).props.accessibilityState.disabled,
    ).toBe(true)
    for (const label of [QADA_COPY.years, QADA_COPY.months, QADA_COPY.days])
      fireEvent(screen.getByLabelText(label), 'accessibilityAction', {
        nativeEvent: { actionName: 'increment' },
      })
    expect(screen.getByText(QADA_COPY.total(daysFromPeriod(1, 1, 1)))).toBeTruthy()
    await act(async () => fireEvent.press(screen.getByRole('button', { name: QADA_COPY.confirm })))
    expect(addDebt).toHaveBeenCalledWith(daysFromPeriod(1, 1, 1))
    expect(screen.queryByText(QADA_COPY.modalNote)).toBeNull()
  })

  it('dismisses the sheet through the native back callback', () => {
    renderLedger({}, false)
    fireEvent.press(screen.getByText(QADA_COPY.addButton))
    act(() => screen.getByTestId('bottom-sheet-modal').props.onRequestClose())
    expect(screen.queryByText(QADA_COPY.modalNote)).toBeNull()
  })
})
