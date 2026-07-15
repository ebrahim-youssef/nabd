import { db } from '@/lib/db/db'
import { newId } from '@/lib/db/ids'
import { logger } from '@/lib/logger'
import type { Result } from '@/types/result'
import type { DayId, WirdDefinition, WirdVersion } from '@/types/wird'

// Onboarding's single write: seed the user's first wird version from the chosen level.
// Goes straight to the Dexie handle (version + outbox in one transaction) rather than into
// the wird feature's repository — cross-feature repository imports are disallowed (same
// pattern as counter/db.ts). The row shape is identical to any other version, so the
// checklist and stats treat the seeded wird like any later redefinition.

// Seeds only when no version exists yet, so a double-submit or a second device racing sync
// can never produce two competing "first" versions. Returns the created version, or null
// when one already existed.
export async function seedWirdFromLevel(
  definition: WirdDefinition,
  effectiveFrom: DayId,
  createdAt: number,
): Promise<Result<WirdVersion | null>> {
  const version: WirdVersion = { id: newId(), effectiveFrom, definition, createdAt }
  try {
    const created = await db.transaction('rw', db.wirdVersions, db.outbox, async () => {
      const count = await db.wirdVersions.count()
      if (count > 0) return null
      await db.wirdVersions.add(version)
      await db.outbox.add({
        table: 'wirdVersions',
        rowId: version.id,
        payload: version,
        createdAt,
      })
      return version
    })
    return { ok: true, value: created }
  } catch (cause) {
    logger.error('onboarding.seedWirdFromLevel failed', cause, { effectiveFrom })
    return { ok: false, error: 'seed_failed' }
  }
}

// Live check the gate reads: onboarding is needed exactly while no wird version exists.
export async function countWirdVersions(): Promise<number> {
  return db.wirdVersions.count()
}
