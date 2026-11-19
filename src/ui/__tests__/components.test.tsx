import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { PixelRatio, View } from 'react-native'

import { StarCheckbox } from '../StarCheckbox'
import { ChecklistRow } from '../ChecklistRow'
import { BlockCard } from '../BlockCard'
import { Tile } from '../Tile'
import { ProgressBar } from '../ProgressBar'
import { DailyLines } from '../DailyLines'
import { Button } from '../Button'
import { Toast } from '../Toast'
import { BottomSheet } from '../BottomSheet'
import { HeroHeader } from '../HeroHeader'
import { heroPathGeometry } from '../heroPathGeometry'

describe('Home design components', () => {
  it('announces checkbox state and toggles from the whole checklist row', () => {
    const onToggle = jest.fn()
    render(<ChecklistRow label="صلاة الظهر" done={false} onToggle={onToggle} />)

    expect(
      screen.getByRole('checkbox', { name: 'صلاة الظهر، لم يُسجَّل' }).props.accessibilityState,
    ).toEqual({ checked: false })
    fireEvent.press(screen.getByRole('checkbox', { name: 'صلاة الظهر، لم يُسجَّل' }))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('toggles the checklist row when its star is pressed', () => {
    const onToggle = jest.fn()
    render(
      <ChecklistRow label="صلاة الظهر" done={false} onToggle={onToggle} testID="checklist-row" />,
    )

    const star = screen.getByTestId('checklist-row-star')
    expect(star.props.pointerEvents).toBe('none')
    fireEvent.press(star)

    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('renders an accessible star checkbox and updates its checked state', () => {
    const onChange = jest.fn()
    const { rerender } = render(
      <StarCheckbox checked={false} label="صلاة الفجر" onChange={onChange} />,
    )

    const checkbox = screen.getByRole('checkbox', { name: 'صلاة الفجر، لم يُسجَّل' })
    fireEvent.press(checkbox)
    expect(onChange).toHaveBeenCalledWith(true)
    rerender(<StarCheckbox checked label="صلاة الفجر" onChange={onChange} />)
    expect(
      screen.getByRole('checkbox', { name: 'صلاة الفجر، تم' }).props.accessibilityState,
    ).toEqual({ checked: true })
  })

  it('marks one block as current and keeps optional items visibly voluntary', () => {
    render(
      <BlockCard title="الظهر" now meta="١١:٤٠ ص">
        <ChecklistRow label="صلاة الظهر" done={false} onToggle={jest.fn()} optional />
      </BlockCard>,
    )

    expect(screen.getByText('الآن')).toBeTruthy()
    expect(screen.getByText('تطوّع')).toBeTruthy()
  })

  it('shows an empty tile without a zero count', () => {
    render(<Tile title="لم يُسجَّل" sub="لا شيء قبل الآن" quiet onPress={jest.fn()} />)
    expect(screen.getByText('لا شيء قبل الآن')).toBeTruthy()
    expect(screen.queryByText('٠')).toBeNull()
  })

  it('renders required progress and daily lines as non-interactive content', () => {
    render(
      <>
        <ProgressBar done={2} total={5} />
        <DailyLines intention={{ deed: 'الصلاة', text: 'أحافظ عليها' }} dhikr="الحمد لله" />
      </>,
    )

    expect(screen.getByText('٢ من ٥ مطلوبة')).toBeTruthy()
    expect(screen.getByText('أحافظ عليها')).toBeTruthy()
    expect(screen.getByText('الحمد لله')).toBeTruthy()
  })

  it('renders outline and solid buttons with their labels', () => {
    render(
      <>
        <Button label="افتح اليوم" onPress={jest.fn()} />
        <Button label="حدّد موقعك" onPress={jest.fn()} variant="solid" />
      </>,
    )
    expect(screen.getByRole('button', { name: 'افتح اليوم' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'حدّد موقعك' })).toBeTruthy()
  })

  it('offers undo from a toast', () => {
    const undo = jest.fn()
    render(<Toast message="سُجّلت صلاة الفجر" onUndo={undo} />)
    fireEvent.press(screen.getByRole('button', { name: 'تراجع' }))
    expect(undo).toHaveBeenCalledTimes(1)
  })

  it('closes a bottom sheet on scrim press and Android back', () => {
    const onClose = jest.fn()
    render(<BottomSheet visible onClose={onClose} title="أعمال اليوم" explanation="في أي وقت." />)
    fireEvent.press(screen.getByTestId('bottom-sheet-scrim', { includeHiddenElements: true }))
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent(
      screen.getByTestId('bottom-sheet-modal', { includeHiddenElements: true }),
      'requestClose',
    )
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('uses stable pure path geometry and collapses for large text', () => {
    expect(heroPathGeometry(350, 124, 0.5).travelledPath).toContain('A')
    jest.spyOn(PixelRatio, 'getFontScale').mockReturnValue(1.2999999523)
    const { getByTestId } = render(
      <HeroHeader
        header={{
          mode: 'day',
          position: 0.4,
          markers: [],
          nextEvent: { id: 'asr', label: 'العصر', at: 1_000 },
          countdownTarget: 1_000,
        }}
        times={{ fajr: 1, sunrise: 2, dhuhr: 3, asr: 4, maghrib: 5, isha: 6 }}
        nextFajr={7}
        now={0}
        dateLabel="الأربعاء"
        noLocationPrompt="لا نعرف مواقيت الصلاة بعد"
      />,
    )
    expect(getByTestId('hero-collapsed')).toBeTruthy()
    jest.restoreAllMocks()
  })

  it('clears the countdown interval when the hero unmounts', () => {
    jest.useFakeTimers()
    const setIntervalSpy = jest.spyOn(global, 'setInterval')
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval')
    const { unmount } = render(
      <HeroHeader
        header={{ mode: 'day', position: 0.4, markers: [], nextEvent: null, countdownTarget: null }}
        times={null}
        now={0}
        dateLabel="الأربعاء"
        noLocationPrompt="لا نعرف مواقيت الصلاة بعد"
      />,
    )
    expect(setIntervalSpy).toHaveBeenCalledTimes(1)
    unmount()
    expect(clearIntervalSpy).toHaveBeenCalled()
    setIntervalSpy.mockRestore()
    clearIntervalSpy.mockRestore()
    jest.useRealTimers()
  })

  it('updates the countdown once per second', () => {
    jest.useFakeTimers({ now: 0 })
    const { getByText } = render(
      <HeroHeader
        header={{
          mode: 'day',
          position: 0.4,
          markers: [],
          nextEvent: { id: 'asr', label: 'العصر', at: 3_600_000 },
          countdownTarget: 3_600_000,
        }}
        times={{ fajr: 1, sunrise: 2, dhuhr: 3, asr: 4, maghrib: 5, isha: 6 }}
        nextFajr={7}
        now={0}
        dateLabel="الأربعاء"
        noLocationPrompt="لا نعرف مواقيت الصلاة بعد"
      />,
    )

    expect(getByText('بعد ١:٠٠:٠٠')).toBeTruthy()
    act(() => jest.advanceTimersByTime(1_000))
    expect(getByText('بعد ٠:٥٩:٥٩')).toBeTruthy()
    jest.useRealTimers()
  })
})
