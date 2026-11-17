const MINUTE_MS = 60_000

export function currentTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

export function clockTimePartsInTimeZone(
  instant: number,
  timeZone: string,
): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(instant)
  const partValue = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value)
  const hour = partValue('hour')

  return { hour: hour === 24 ? 0 : hour, minute: partValue('minute') }
}

export function dateForCalendarDayInTimeZone(
  instant: number,
  timeZone: string,
  dayOffset = 0,
): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(instant)
  const partValue = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value)
  const utcNoon = Date.UTC(
    partValue('year'),
    partValue('month') - 1,
    partValue('day') + dayOffset,
    12,
  )

  // adhan reads local calendar fields from Date, whose timezone offset can be stale in Hermes.
  return new Date(utcNoon + new Date(utcNoon).getTimezoneOffset() * MINUTE_MS)
}
