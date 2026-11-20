import { useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { View } from 'react-native'

import { WIRD_LEVELS, type LevelId } from '../content/levels'
import { useWirdToday } from '../day-plan/WirdTodayProvider'
import { logger } from '../observability/logger'
import { versionInForce } from '../lib/wird'
import { PageHeader } from '../shell/PageHeader'
import { ScreenContainer } from '../shell/ScreenContainer'
import { Text } from '../shell/Text'
import { useLiveRepositoryQuery } from '../shell/useLiveRepositoryQuery'
import { Button } from '../ui/Button'
import { OptionCard } from '../ui/OptionCard'
import { useToast } from '../ui/ToastProvider'
import { useWirdLevel } from '../wird/useWirdLevel'
import { useWirdRepository } from '../wird/useWirdRepository'
import { levelMatching } from '../wird/logic'
import { LEVEL_PAGE_COPY, SETTINGS_COPY } from './copy'

export function LevelRoute() {
  const router = useRouter()
  const today = useWirdToday()
  const toast = useToast()
  const { currentLevelId, canChangeLevel, changeLevel, isLoading } = useWirdLevel()
  const repository = useWirdRepository()
  const readVersions = useCallback(() => repository.listVersions(), [repository])
  const { data: versions } = useLiveRepositoryQuery(readVersions)
  const currentVersion = versionInForce(versions ?? [], today)
  const levelInForce = currentVersion ? levelMatching(currentVersion.definition, WIRD_LEVELS) : null
  const [selection, setSelection] = useState<LevelId | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const selectedLevelId = selection ?? currentLevelId

  async function saveLevel() {
    setIsSaving(true)
    try {
      const result = await changeLevel(selectedLevelId, today, Date.now())
      if (!result?.ok) {
        toast.show({ message: LEVEL_PAGE_COPY.failure })
        return
      }
      toast.show({ message: LEVEL_PAGE_COPY.success })
      router.back()
    } catch (cause: unknown) {
      logger.error('Native wird level write failed', cause, { operation: 'change-wird-level' })
      toast.show({ message: LEVEL_PAGE_COPY.failure })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <ScreenContainer testID="level-screen">
      <View className="gap-6">
        <PageHeader title={SETTINGS_COPY.level.title} backHref="/settings" directBack />
        <Text className="font-sans text-body text-start text-mute">{LEVEL_PAGE_COPY.intro}</Text>
        <View accessibilityRole="radiogroup" className="gap-2">
          {WIRD_LEVELS.map((level) => (
            <OptionCard
              key={level.id}
              title={level.title}
              description={level.description}
              selected={selectedLevelId === level.id}
              badge={levelInForce?.id === level.id ? LEVEL_PAGE_COPY.current : undefined}
              disabled={isLoading || !canChangeLevel || isSaving}
              onPress={() => setSelection(level.id)}
            />
          ))}
        </View>
        <Button
          label={LEVEL_PAGE_COPY.save}
          variant="solid"
          disabled={isLoading || !canChangeLevel || selectedLevelId === currentLevelId}
          busy={isSaving}
          onPress={() => void saveLevel()}
        />
      </View>
    </ScreenContainer>
  )
}
