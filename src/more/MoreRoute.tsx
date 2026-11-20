import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import { BarChart3, BookHeart, Clock, DatabaseBackup, History, Settings } from 'lucide-react-native'
import { View } from 'react-native'

import { WIRD_LEVELS } from '../content/levels'
import { toArabicIndic } from '../lib/format'
import { formatPrayerTime } from '../prayer-times/formatPrayerTime'
import { useTodayPrayerTimes } from '../prayer-times/useTodayPrayerTimes'
import { PageHeader } from '../shell/PageHeader'
import { ScreenContainer } from '../shell/ScreenContainer'
import { Text } from '../shell/Text'
import { currentStreak, useStats } from '../stats/useStats'
import { ListGroup } from '../ui/ListGroup'
import { ListRow } from '../ui/ListRow'
import { SectionHeader } from '../ui/SectionHeader'
import { useWirdLevel } from '../wird/useWirdLevel'
import { formatQadaCount, formatStreak, MORE_COPY } from './copy'

export function MoreRoute() {
  const router = useRouter()
  const { nextPrayer } = useTodayPrayerTimes()
  const { data, isLoading, error } = useStats()
  const level = useWirdLevel()
  const prayerValue = nextPrayer
    ? `${nextPrayer.label}\u00a0${formatPrayerTime(nextPrayer.at)}`
    : undefined
  const qadaTotal = Object.values(data.qada).reduce((total, count) => total + count, 0)
  const levelTitle = WIRD_LEVELS.find((entry) => entry.id === level.currentLevelId)?.title
  const version = Constants.expoConfig?.version?.replace(/\d/g, (digit) =>
    toArabicIndic(Number(digit)),
  )

  return (
    <ScreenContainer testID="more-screen">
      <View className="gap-6">
        <PageHeader title={MORE_COPY.title} />
        <View className="gap-2">
          <SectionHeader title={MORE_COPY.day} />
          <ListGroup>
            <ListRow
              label={MORE_COPY.prayerTimes}
              value={prayerValue}
              icon={Clock}
              onPress={() => router.push('/prayer-times')}
              testID="more-row-prayer-times"
            />
            <ListRow
              label={MORE_COPY.stats}
              value={
                !isLoading && !error ? formatStreak(currentStreak(data.completions)) : undefined
              }
              icon={BarChart3}
              onPress={() => router.push('/stats')}
              testID="more-row-stats"
            />
            <ListRow
              label={MORE_COPY.qada}
              value={!isLoading && !error ? formatQadaCount(qadaTotal) : undefined}
              icon={History}
              onPress={() => router.push('/qada')}
              testID="more-row-qada"
            />
          </ListGroup>
        </View>
        <View className="gap-2">
          <SectionHeader title={MORE_COPY.library} />
          <ListGroup>
            <ListRow
              label={MORE_COPY.intentions}
              description={MORE_COPY.intentionsDescription}
              icon={BookHeart}
              onPress={() => router.push('/niyyat')}
              testID="more-row-niyyat"
            />
          </ListGroup>
        </View>
        <View className="gap-2">
          <SectionHeader title={MORE_COPY.application} />
          <ListGroup>
            <ListRow
              label={MORE_COPY.settings}
              value={!level.isLoading && level.canChangeLevel ? levelTitle : undefined}
              icon={Settings}
              onPress={() => router.push('/settings')}
              testID="more-row-settings"
            />
            <ListRow
              label={MORE_COPY.backup}
              icon={DatabaseBackup}
              onPress={() => router.push('/backup')}
              testID="more-row-backup"
            />
          </ListGroup>
        </View>
        <Text className="text-center font-sans text-meta text-mute">
          {MORE_COPY.appName}
          {version ? ` ${version}` : ''}
        </Text>
      </View>
    </ScreenContainer>
  )
}
