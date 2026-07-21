'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback } from 'react'

import { WIRD_LEVELS, type LevelId } from '@/content/levels'
import { compareDayId } from '@/lib/pure/day'
import type { DayId } from '@/types/wird'

import { listVersions, setWirdLevel } from '../db'
import { levelMatching } from '../logic'

export function useWirdLevel() {
  const versions = useLiveQuery(async () => listVersions(), [])

  const isLoading = versions === undefined

  const sortedVersions = [...(versions ?? [])].sort((a, b) => {
    const byDay = compareDayId(b.effectiveFrom, a.effectiveFrom)
    if (byDay !== 0) return byDay
    return b.createdAt - a.createdAt
  })

  const latestVersion = sortedVersions[0]
  const currentLevel = latestVersion
    ? levelMatching(latestVersion.definition, WIRD_LEVELS)
    : WIRD_LEVELS[0]
  const currentLevelId: LevelId = currentLevel?.id ?? 'level-1'

  const changeLevel = useCallback(async (levelId: LevelId, today: DayId, now: number) => {
    const chosenLevel = WIRD_LEVELS.find((level) => level.id === levelId)
    if (!chosenLevel) return
    return setWirdLevel(chosenLevel.wird, today, now)
  }, [])

  return {
    currentLevelId,
    changeLevel,
    isLoading,
  }
}
