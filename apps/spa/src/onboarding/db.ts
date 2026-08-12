import type { DayId, OnboardingRepository, Result, WirdDefinition, WirdVersion } from '@nabd/shared'

import { db } from '../db/db'
import { newId } from '../db/ids'
import { logger } from '../logger'

export async function countWirdVersions(): Promise<number> {
  return db.wirdVersions.count()
}

export async function seedWirdFromLevel(
  definition: WirdDefinition,
  effectiveFrom: DayId,
  createdAt: number,
): Promise<Result<WirdVersion | null>> {
  const version: WirdVersion = { id: newId(), effectiveFrom, definition, createdAt }

  try {
    const created = await db.transaction('rw', db.wirdVersions, async () => {
      if ((await db.wirdVersions.count()) > 0) return null
      await db.wirdVersions.add(version)
      return version
    })
    return { ok: true, value: created }
  } catch (cause) {
    logger.error('onboarding.seedWirdFromLevel failed', cause, { effectiveFrom })
    return { ok: false, error: 'seed_failed' }
  }
}

export const onboardingRepository: OnboardingRepository = {
  countWirdVersions,
  seedWirdFromLevel,
}
