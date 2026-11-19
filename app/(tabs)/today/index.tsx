import { Redirect } from 'expo-router'

import { useWirdToday } from '../../../src/day-plan/WirdTodayProvider'

export default function TodayIndexRoute() {
  const day = useWirdToday()
  return <Redirect href={`/today/${day}`} />
}
