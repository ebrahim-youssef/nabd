import { WIRD_LEVELS, compareDayId, levelMatching } from '@nabd/shared'
import type { DayId, LevelId } from '@nabd/shared'
import { useCallback } from 'react'

import { useLiveRepositoryQuery } from '../shell/useLiveRepositoryQuery'
import { useWirdRepository } from './useWirdRepository'

export function useWirdLevel() {
  const repository = useWirdRepository()
  const read = useCallback(() => repository.listVersions(), [repository])
  const { data: versions, isLoading, refresh } = useLiveRepositoryQuery(read)

  const sortedVersions = [...(versions ?? [])].sort((a, b) => {
    const byDay = compareDayId(b.effectiveFrom, a.effectiveFrom)
    return byDay !== 0 ? byDay : b.createdAt - a.createdAt
  })
  const latestVersion = sortedVersions[0]
  const currentLevel = latestVersion
    ? levelMatching(latestVersion.definition, WIRD_LEVELS)
    : WIRD_LEVELS[0]
  const canChangeLevel = Boolean(latestVersion)

  const changeLevel = useCallback(
    async (levelId: LevelId, today: DayId, now: number) => {
      // Settings can be reached directly before onboarding has created the first
      // version. Do not create a standalone version here: onboarding completion
      // intentionally owns the initial version and rejects a pre-existing one.
      if (!latestVersion) return
      const chosenLevel = WIRD_LEVELS.find((level) => level.id === levelId)
      if (!chosenLevel) return
      const result = await repository.setWirdLevel(chosenLevel.wird, today, now)
      if (result.ok) refresh()
      return result
    },
    [latestVersion, refresh, repository],
  )

  return {
    currentLevelId: currentLevel?.id ?? WIRD_LEVELS[0].id,
    canChangeLevel,
    changeLevel,
    isLoading,
  }
}
