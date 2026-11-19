import { useState } from 'react'
import { View } from 'react-native'

import { BackupSection } from '../../src/backup/BackupSection'
import { requestPrayerReschedule } from '../../src/device/prayerAlarms'
import { useRefreshWirdDay } from '../../src/day-plan/WirdTodayProvider'
import { PageHeader } from '../../src/shell/PageHeader'
import { ScreenContainer } from '../../src/shell/ScreenContainer'
import { BACKUP_COPY } from '../../src/backup/copy'

function BackupContent({ onRestored }: { onRestored: () => void }) {
  return <BackupSection onRestored={onRestored} />
}

export default function BackupRoute() {
  const refreshWirdDay = useRefreshWirdDay()
  const [refreshKey, setRefreshKey] = useState(0)
  const onRestored = () => {
    refreshWirdDay()
    requestPrayerReschedule()
    setRefreshKey((current) => current + 1)
  }

  return (
    <ScreenContainer testID="backup-screen">
      <View className="gap-6">
        <PageHeader backHref="/more" title={BACKUP_COPY.title} />
        <BackupContent key={refreshKey} onRestored={onRestored} />
      </View>
    </ScreenContainer>
  )
}
