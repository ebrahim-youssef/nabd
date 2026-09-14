import { WIRD_LEVELS, compareDayId, levelMatching } from '@nabd/shared'
import type { DayId, LevelId } from '@nabd/shared'
import { useCallback, useEffect, useState } from 'react'

import { useWirdRepository } from './useWirdRepository'

export function useWirdLevel() {
  const repository = useWirdRepository()
  const [versions, setVersions] = useState<Awaited<ReturnType<typeof repository.listVersions>>>()
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    let active = true
    void repository.listVersions().then((nextVersions) => {
      if (active) setVersions(nextVersions)
    })
    return () => {
      active = false
    }
  }, [refreshToken, repository])

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
      if (result.ok) setRefreshToken((current) => current + 1)
      return result
    },
    [repository],
  )

  return {
    currentLevelId: currentLevel?.id ?? WIRD_LEVELS[0].id,
    changeLevel,
    isLoading: versions === undefined,
  }
}
