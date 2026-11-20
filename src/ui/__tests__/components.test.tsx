import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { AlertCircle } from 'lucide-react-native'
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
import { SectionHeader } from '../SectionHeader'
import { ListGroup } from '../ListGroup'
import { ListRow } from '../ListRow'
import { SegmentedControl } from '../SegmentedControl'
import { SwitchRow } from '../SwitchRow'
import { OptionCard } from '../OptionCard'
import { Stepper } from '../Stepper'
import { StatusCard } from '../StatusCard'
import { StateView } from '../StateView'
import { ConfirmSheet } from '../ConfirmSheet'
import { Accordion } from '../Accordion'
import { StatTile } from '../StatTile'
import { WeekBars } from '../WeekBars'
import { AudioRow } from '../AudioRow'
import { ToastProvider, TOAST_DURATION_MS, useToast } from '../ToastProvider'
import { shellCopy } from '../../shell/copy'
import { PageHeader } from '../../shell/PageHeader'
import { Text } from '../../shell/Text'
import { useRouter } from 'expo-router'

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({ canGoBack: () => true, back: jest.fn(), replace: jest.fn() })),
}))

jest.mock('lucide-react-native', () => {
  const MockIcon = () => null
  return {
    AlertCircle: MockIcon,
    ArrowRight: MockIcon,
    BookOpen: MockIcon,
    CalendarDays: MockIcon,
    ChevronDown: MockIcon,
    ChevronLeft: MockIcon,
    ChevronUp: MockIcon,
    Ellipsis: MockIcon,
    Home: MockIcon,
    Minus: MockIcon,
    Plus: MockIcon,
    Play: MockIcon,
    Square: MockIcon,
  }
})

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
    expect(screen.getByText('٤٠٪')).toHaveStyle({ direction: 'ltr' })
    expect(screen.getByText('أحافظ عليها')).toBeTruthy()
    expect(screen.getByText('الحمد لله')).toBeTruthy()
  })

  it.each([
    [0, '٠٪'],
    [1, '٣٣٪'],
    [3, '١٠٠٪'],
  ])('shows Arabic percentage %s with stable direction', (done, expected) => {
    render(<ProgressBar done={done as number} total={3} />)
    expect(screen.getByText(expected as string)).toHaveStyle({ direction: 'ltr' })
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

  it('renders the section header as a heading', () => {
    render(<SectionHeader title="المواقيت" />)
    expect(screen.getByRole('header', { name: 'المواقيت' })).toBeTruthy()
  })

  it('separates list rows and disables a disabled row', () => {
    const onPress = jest.fn()
    render(
      <ListGroup>
        <ListRow label="الأول" />
        <ListRow label="الثاني" onPress={onPress} disabled />
        <ListRow label="ثابت معطّل" disabled testID="disabled-static-row" />
      </ListGroup>,
    )
    expect(screen.getByText('الأول')).toBeTruthy()
    fireEvent.press(screen.getByRole('button', { name: 'الثاني' }))
    expect(onPress).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'الثاني' }).props.accessibilityState).toEqual({
      disabled: true,
    })
    expect(screen.getByTestId('disabled-static-row').props.accessibilityState).toEqual({
      disabled: true,
    })
  })

  it('announces the selected segment and changes the value', () => {
    const onChange = jest.fn()
    render(
      <SegmentedControl
        options={[
          { value: 'a', label: 'أ' },
          { value: 'b', label: 'ب' },
        ]}
        value="a"
        onChange={onChange}
        accessibilityLabel="المظهر"
      />,
    )
    expect(screen.getByRole('radio', { name: 'أ' }).props.accessibilityState).toEqual({
      checked: true,
    })
    fireEvent.press(screen.getByRole('radio', { name: 'ب' }))
    expect(onChange).toHaveBeenCalledWith('b')
  })

  it('toggles a switch row and presents the disabled reason', () => {
    const onValueChange = jest.fn()
    render(
      <>
        <SwitchRow label="التنبيهات" value={false} onValueChange={onValueChange} />
        <SwitchRow
          label="التنبيهات المعطلة"
          description="وصف"
          disabled
          disabledReason="السبب"
          value={false}
          onValueChange={onValueChange}
        />
      </>,
    )
    expect(screen.getByText('وصف')).toBeTruthy()
    expect(screen.queryByText('السبب')).toBeNull()
    expect(screen.getByRole('switch', { name: 'التنبيهات المعطلة' }).props.accessibilityHint).toBe(
      'السبب',
    )
    fireEvent.press(screen.getByRole('switch', { name: 'التنبيهات' }))
    expect(onValueChange).toHaveBeenCalledWith(true)
    expect(
      screen.getByRole('switch', { name: 'التنبيهات المعطلة' }).props.accessibilityState,
    ).toMatchObject({ disabled: true })
    expect(onValueChange).toHaveBeenCalledTimes(1)
  })

  it('reports option selection and ignores disabled presses', () => {
    const onPress = jest.fn()
    render(
      <OptionCard
        title="الخيار"
        description="وصف"
        selected
        badge="مقترح"
        disabled
        onPress={onPress}
      />,
    )
    expect(screen.getByRole('radio', { name: /الخيار/ }).props.accessibilityState).toEqual({
      checked: true,
      disabled: true,
    })
    fireEvent.press(screen.getByRole('radio', { name: /الخيار/ }))
    expect(onPress).not.toHaveBeenCalled()
  })

  it('clamps stepper adjustments at the configured bounds', () => {
    const onChange = jest.fn()
    render(<Stepper label="الشهور" value={2} min={0} max={2} onChange={onChange} />)
    fireEvent.press(screen.getByRole('button', { name: 'زيادة' }))
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.press(screen.getByRole('button', { name: 'إنقاص' }))
    expect(onChange).toHaveBeenCalledWith(1)
  })

  it('submits Arabic-Indic stepper input and focuses the editor', () => {
    const onChange = jest.fn()
    render(<Stepper label="العدد" value={2} min={1} max={12} onChange={onChange} />)
    expect(screen.getByText('٢')).toBeTruthy()
    fireEvent.press(screen.getByRole('adjustable', { name: 'العدد' }))
    const input = screen.getByLabelText('العدد')
    expect(input.props.autoFocus).toBe(true)
    expect(input.props.value).toBe('٢')
    fireEvent.changeText(input, '١٢')
    fireEvent(input, 'submitEditing')
    expect(onChange).toHaveBeenCalledWith(12)
  })

  it('accepts Latin digits in the stepper editor', () => {
    const onChange = jest.fn()
    render(<Stepper label="العدد" value={2} min={1} max={5} onChange={onChange} />)
    fireEvent.press(screen.getByRole('adjustable', { name: 'العدد' }))
    fireEvent.changeText(screen.getByLabelText('العدد'), '99')
    fireEvent(screen.getByLabelText('العدد'), 'submitEditing')
    expect(onChange).toHaveBeenCalledWith(5)
  })

  it('renders status actions and a loading state with shell copy', () => {
    const onPress = jest.fn()
    render(
      <>
        <StatusCard
          tone="warn"
          icon={AlertCircle}
          message="تنبيه"
          action={{ label: 'إجراء', onPress }}
        />
        <StateView kind="loading" />
      </>,
    )
    fireEvent.press(screen.getByRole('button', { name: 'إجراء' }))
    expect(onPress).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('progressbar', { name: shellCopy.loading })).toBeTruthy()
  })

  it('uses BottomSheet for confirmation and disables a busy confirmation', () => {
    render(
      <ConfirmSheet
        visible
        onClose={jest.fn()}
        title="تأكيد"
        explanation="توضيح"
        confirmLabel="احذف"
        cancelLabel="إلغاء"
        onConfirm={jest.fn()}
        busy
      />,
    )
    expect(screen.getByText('توضيح')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'احذف' }).props.accessibilityState).toMatchObject({
      disabled: true,
      busy: true,
    })
  })

  it('toggles a controlled accordion and renders its children only when expanded', () => {
    const onToggle = jest.fn()
    render(
      <Accordion title="عنوان" subtitle="وصف" expanded={false} onToggle={onToggle}>
        <Text>المحتوى</Text>
      </Accordion>,
    )
    fireEvent.press(screen.getByRole('button', { name: /عنوان/ }))
    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('المحتوى')).toBeNull()
  })

  it('renders a stat tile action and an accessible week summary', () => {
    const onPress = jest.fn()
    render(
      <>
        <StatTile label="الالتزام" value="٧٨٪" onPress={onPress} />
        <WeekBars
          days={[
            { label: 'س', ratio: 1 },
            { label: 'ح', ratio: 0.4, isToday: true },
            { label: 'ن', ratio: 0 },
          ]}
          summary="ملخص الأسبوع"
        />
      </>,
    )
    fireEvent.press(screen.getByRole('button', { name: /الالتزام/ }))
    expect(onPress).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('ملخص الأسبوع')).toBeTruthy()
  })

  it('labels audio toggle state with the item name', () => {
    const onToggle = jest.fn()
    render(<AudioRow label="الأذان" description="وصف" playing onToggle={onToggle} />)
    fireEvent.press(screen.getByRole('button', { name: 'إيقاف، الأذان' }))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('replaces a toast, supports undo, and auto dismisses after five seconds', () => {
    jest.useFakeTimers()
    const undo = jest.fn()
    render(
      <ToastProvider>
        <ToastTrigger label="اعرض الأول" message="الأول" undo={undo} />
        <ToastTrigger label="اعرض الثاني" message="الثاني" />
      </ToastProvider>,
    )
    fireEvent.press(screen.getByRole('button', { name: 'اعرض الأول' }))
    expect(screen.getByText('الأول')).toBeTruthy()
    fireEvent.press(screen.getByRole('button', { name: 'اعرض الثاني' }))
    expect(screen.queryByText('الأول')).toBeNull()
    expect(screen.getByText('الثاني')).toBeTruthy()
    expect(TOAST_DURATION_MS).toBe(5_000)
    act(() => jest.advanceTimersByTime(TOAST_DURATION_MS))
    expect(screen.queryByText('الثاني')).toBeNull()
    fireEvent.press(screen.getByRole('button', { name: 'اعرض الأول' }))
    fireEvent.press(screen.getByRole('button', { name: 'تراجع' }))
    expect(undo).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('الأول')).toBeNull()
    jest.useRealTimers()
  })

  it('clears the toast dismissal timer when its provider unmounts', () => {
    jest.useFakeTimers()
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')
    const { unmount } = render(
      <ToastProvider>
        <ToastTrigger label="اعرض" message="رسالة" />
      </ToastProvider>,
    )
    fireEvent.press(screen.getByRole('button', { name: 'اعرض' }))
    unmount()
    expect(clearTimeoutSpy).toHaveBeenCalled()
    clearTimeoutSpy.mockRestore()
    jest.useRealTimers()
  })

  it('keeps toast consumers mounted when the toast changes', () => {
    const onRender = jest.fn()
    function Consumer() {
      useToast()
      onRender()
      return null
    }

    render(
      <ToastProvider>
        <Consumer />
        <ToastTrigger label="اعرض" message="رسالة" />
      </ToastProvider>,
    )
    fireEvent.press(screen.getByRole('button', { name: 'اعرض' }))
    expect(onRender).toHaveBeenCalledTimes(1)
  })

  it('keeps the PageHeader API and back control test id', () => {
    jest
      .mocked(useRouter)
      .mockReturnValue({ canGoBack: () => true, back: jest.fn(), replace: jest.fn() } as never)
    render(<PageHeader title="عنوان" backHref="/" />)
    expect(screen.getByRole('header', { name: 'عنوان' })).toBeTruthy()
    expect(screen.getByTestId('page-back')).toBeTruthy()
  })
})

function ToastTrigger({
  label,
  message,
  undo,
}: {
  label: string
  message: string
  undo?: () => void
}) {
  const toast = useToast()
  return <Button label={label} onPress={() => toast.show({ message, onUndo: undo })} />
}
