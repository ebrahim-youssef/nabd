import { requestPrayerReschedule, subscribePrayerReschedule } from '../prayerAlarms'

describe('prayer alarm reschedule events', () => {
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
