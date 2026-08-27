import { useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'

import { WIRD_LEVELS, compareDayId, levelMatching } from '@nabd/shared'
import type { DayId, LevelId } from '@nabd/shared'

import { listVersions, setWirdLevel } from './db'

// Which level the user is on, and the one action that changes it. The level is not stored as a
// field: it is recovered by matching the newest version's definition against the level catalogue,
// so a definition the user has since edited by hand simply matches nothing.
export function useWirdLevel() {
  const versions = useLiveQuery(async () => listVersions(), [])

  // Newest first, and a same-day tie breaks on `createdAt` — a level chosen twice in one day must
  // resolve to the later choice.
  const sortedVersions = [...(versions ?? [])].sort((a, b) => {
    const byDay = compareDayId(b.effectiveFrom, a.effectiveFrom)
    if (byDay !== 0) return byDay
    return b.createdAt - a.createdAt
  })
  const latestVersion = sortedVersions[0]
  const currentLevel = latestVersion
    ? levelMatching(latestVersion.definition, WIRD_LEVELS)
    : WIRD_LEVELS[0]

  const changeLevel = useCallback(async (levelId: LevelId, today: DayId, now: number) => {
    const chosenLevel = WIRD_LEVELS.find((level) => level.id === levelId)
    if (!chosenLevel) return
    // The repository decides that this starts tomorrow, not this hook and not the screen.
    return setWirdLevel(chosenLevel.wird, today, now)
  }, [])

  return {
    currentLevelId: currentLevel?.id ?? WIRD_LEVELS[0].id,
    changeLevel,
    isLoading: versions === undefined,
  }
}
