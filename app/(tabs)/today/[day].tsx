import { Redirect, useLocalSearchParams } from 'expo-router'

import { resolveTodayDay } from '../../../src/today/logic'
import { TodayRoute } from '../../../src/today/TodayRoute'

export default function TodayDayRoute() {
  const { day } = useLocalSearchParams<{ day?: string | string[] }>()
  const resolvedDay = resolveTodayDay(Array.isArray(day) ? day[0] : day)
  if (!resolvedDay) return <Redirect href="/today" />
  return <TodayRoute day={resolvedDay} />
}
