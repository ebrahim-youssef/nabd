import {
  getPrayerAlarmSyncOutcome,
  requestPrayerReschedule,
  setPrayerAlarmSyncOutcome,
  subscribePrayerAlarmSyncOutcome,
  subscribePrayerReschedule,
} from '../prayerAlarms'

describe('prayer alarm reschedule events', () => {
  it('stores the last sync outcome and publishes changes', () => {
    const listener = jest.fn()
    const unsubscribe = subscribePrayerAlarmSyncOutcome(listener)

    setPrayerAlarmSyncOutcome('failed')

    expect(getPrayerAlarmSyncOutcome()).toBe('failed')
    expect(listener).toHaveBeenCalledWith('failed')

    unsubscribe()
    setPrayerAlarmSyncOutcome('ok')
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('notifies subscribers and unsubscribes cleanly', () => {
    const first = jest.fn()
    const second = jest.fn()
    const unsubscribeFirst = subscribePrayerReschedule(first)
    const unsubscribeSecond = subscribePrayerReschedule(second)

    requestPrayerReschedule()
    unsubscribeFirst()
    unsubscribeSecond()
    requestPrayerReschedule()

    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
  })
})
