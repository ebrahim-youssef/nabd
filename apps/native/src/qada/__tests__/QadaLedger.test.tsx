import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'

import { QADA_COPY, QADA_PRAYERS, daysFromPeriod } from '@nabd/shared'

import { QadaLedger } from '../QadaLedger'
import { useQada } from '../useQada'

jest.mock('../useQada', () => ({ useQada: jest.fn() }))
jest.mock('lucide-react-native', () => ({
  Check: () => null,
  Plus: () => null,
}))

const mockedUseQada = useQada as jest.MockedFunction<typeof useQada>
const addDebt = jest.fn<Promise<void>, [number]>().mockResolvedValue(undefined)
const payPrayer = jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined)

function remainingWith(
  overrides: Partial<Record<(typeof QADA_PRAYERS)[number]['id'], number>> = {},
) {
  return Object.fromEntries(
    QADA_PRAYERS.map((prayer) => [prayer.id, overrides[prayer.id] ?? 0]),
  ) as Record<(typeof QADA_PRAYERS)[number]['id'], number>
}

function renderLedger(
  overrides: Partial<Record<(typeof QADA_PRAYERS)[number]['id'], number>> = {},
) {
  mockedUseQada.mockReturnValue({
    isLoading: false,
    hasAny: Object.values(overrides).some((count) => count > 0),
    remaining: remainingWith(overrides),
    addDebt,
    payPrayer,
  })
  return render(<QadaLedger />)
}

describe('QadaLedger', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    addDebt.mockResolvedValue(undefined)
    payPrayer.mockResolvedValue(undefined)
  })

  it('renders all five prayers with done and remaining copy', () => {
    renderLedger({ fajr: 0, dhuhr: 3 })

    for (const prayer of QADA_PRAYERS)
      expect(screen.getByTestId(`qada-row-${prayer.id}`)).toBeTruthy()
    expect(screen.getByText('الفجر')).toBeTruthy()
    expect(screen.getByTestId('qada-count-fajr')).toHaveTextContent(QADA_COPY.done)
    expect(screen.getByTestId('qada-count-dhuhr')).toHaveTextContent(QADA_COPY.remaining(3))
  })

  it('disables payment for a cleared prayer and enables it for debt', () => {
    renderLedger({ fajr: 0, dhuhr: 1 })

    expect(screen.getByTestId('qada-pay-fajr').props.accessibilityState.disabled).toBe(true)
    expect(screen.getByTestId('qada-pay-dhuhr').props.accessibilityState.disabled).toBe(false)
  })

  it('pays only the selected prayer', async () => {
    renderLedger({ fajr: 2, dhuhr: 2 })

    await act(async () => {
      fireEvent.press(screen.getByTestId('qada-pay-fajr'))
    })

    expect(payPrayer).toHaveBeenCalledTimes(1)
    expect(payPrayer).toHaveBeenCalledWith('fajr')
  })

  it('opens with empty fields and resets them on reopen', () => {
    renderLedger()

    fireEvent.press(screen.getByTestId('qada-add'))
    fireEvent.changeText(screen.getByTestId('qada-years'), '2')
    fireEvent.changeText(screen.getByTestId('qada-months'), '3')
    fireEvent.changeText(screen.getByTestId('qada-days'), '4')
    fireEvent.press(screen.getByText(QADA_COPY.cancel))
    fireEvent.press(screen.getByTestId('qada-add'))

    expect(screen.getByTestId('qada-years').props.value).toBe('')
    expect(screen.getByTestId('qada-months').props.value).toBe('')
    expect(screen.getByTestId('qada-days').props.value).toBe('')
  })

  it('computes the total live and confirms only a non-zero debt', async () => {
    renderLedger()

    fireEvent.press(screen.getByTestId('qada-add'))
    expect(screen.getByTestId('qada-confirm').props.accessibilityState.disabled).toBe(true)
    fireEvent.changeText(screen.getByTestId('qada-years'), '1')
    fireEvent.changeText(screen.getByTestId('qada-months'), '2')
    fireEvent.changeText(screen.getByTestId('qada-days'), '3')
    expect(screen.getByTestId('qada-total')).toHaveTextContent(
      QADA_COPY.total(daysFromPeriod(1, 2, 3)),
    )
    expect(screen.getByTestId('qada-confirm').props.accessibilityState.disabled).toBe(false)

    await act(async () => {
      fireEvent.press(screen.getByTestId('qada-confirm'))
    })

    await waitFor(() => expect(addDebt).toHaveBeenCalledWith(daysFromPeriod(1, 2, 3)))
    expect(screen.queryByTestId('qada-modal')).toBeNull()
  })

  it('dismisses the sheet through the native back callback', () => {
    renderLedger()
    fireEvent.press(screen.getByTestId('qada-add'))

    const modal = screen.getByTestId('qada-modal')
    expect(modal.props.visible).toBe(true)
    act(() => modal.props.onRequestClose())
    expect(screen.queryByTestId('qada-modal')).toBeNull()
  })
})
