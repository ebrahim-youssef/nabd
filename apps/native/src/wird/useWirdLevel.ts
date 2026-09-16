import { WIRD_LEVELS, compareDayId, levelMatching } from '@nabd/shared'
import type { DayId, LevelId } from '@nabd/shared'
import { useCallback } from 'react'

import { useLiveRepositoryQuery } from '../app/useLiveRepositoryQuery'
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

  const changeLevel = useCallback(
    async (levelId: LevelId, today: DayId, now: number) => {
      const chosenLevel = WIRD_LEVELS.find((level) => level.id === levelId)
      if (!chosenLevel) return
      const result = await repository.setWirdLevel(chosenLevel.wird, today, now)
      if (result.ok) refresh()
      return result
    },
    [refresh, repository],
  )

  return {
    currentLevelId: currentLevel?.id ?? WIRD_LEVELS[0].id,
    changeLevel,
    isLoading,
  }
}
