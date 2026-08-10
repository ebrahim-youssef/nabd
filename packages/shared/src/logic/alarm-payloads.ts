export type NotificationMomentKind = 'before' | 'adhan' | 'iqamah' | 'adhkar'

export type NotificationMoment = {
  at: number
  kind: NotificationMomentKind
  prayerId: string
}

export type AlarmChannelKey = 'before' | 'adhan' | 'adhanFajr' | 'iqamah' | 'adhkarReminder'

export type AlarmPayload = {
  id: number
  title: string
  body: string
  channelKey: AlarmChannelKey
  at: number
}

export type AlarmCopy = Record<
  NotificationMomentKind,
  (label: string) => { title: string; body: string }
>

const MS_PER_MINUTE = 60_000
const KIND_SLOT: Record<NotificationMomentKind, number> = {
  before: 0,
  adhan: 1,
  iqamah: 2,
  adhkar: 3,
}
const ID_SLOTS = 4
const INT32_SAFE = 2_000_000_000

/** Builds stable Android-safe notification identifiers and routes Fajr to its own adhan. */
export function buildAlarmPayloads(
  moments: NotificationMoment[],
  labels: Record<string, string>,
  copy: AlarmCopy,
): AlarmPayload[] {
  return moments.map((moment) => {
    const label = labels[moment.prayerId] ?? moment.prayerId
    const { title, body } = copy[moment.kind](label)
    return {
      id: (Math.floor(moment.at / MS_PER_MINUTE) * ID_SLOTS + KIND_SLOT[moment.kind]) % INT32_SAFE,
      title,
      body,
      channelKey:
        moment.kind === 'adhan' && moment.prayerId === 'fajr'
          ? 'adhanFajr'
          : moment.kind === 'adhan'
            ? 'adhan'
            : moment.kind === 'adhkar'
              ? 'adhkarReminder'
              : moment.kind,
      at: moment.at,
    }
  })
}
