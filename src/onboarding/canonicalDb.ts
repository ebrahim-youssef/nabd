import type { OnboardingRepository } from '../db/contracts'
import type { Result } from '../lib/result'
import type { WirdDefinition, WirdVersion } from '../wird/types'

import { SQLITE_ID, type ProductDatabase } from '../db/productDatabase'
import { asVersion } from '../db/wirdState'
import type { VersionRow } from '../db/wirdState'

export function createCanonicalOnboardingRepository(
  database: ProductDatabase,
): OnboardingRepository {
  return {
    async countWirdVersions() {
      return (
        (
          await database.getFirstAsync<{ count: number }>(
            'SELECT COUNT(*) AS count FROM wird_versions',
          )
        )?.count ?? 0
      )
    },
    async seedWirdFromLevel(
      definition: WirdDefinition,
      effectiveFrom: string,
      createdAt: number,
    ): Promise<Result<WirdVersion | null>> {
      try {
        let value: WirdVersion | null = null
        await database.withExclusiveTransactionAsync(async (transaction) => {
          if (
            ((
              await transaction.getFirstAsync<{ count: number }>(
                'SELECT COUNT(*) AS count FROM wird_versions',
              )
            )?.count ?? 0) > 0
          )
            return
          const row = await transaction.getFirstAsync<VersionRow>(
            `INSERT INTO wird_versions (id, effective_from, definition_json, created_at) VALUES (${SQLITE_ID}, ?, ?, ?) RETURNING id, effective_from, definition_json, created_at`,
            effectiveFrom,
            JSON.stringify(definition),
            createdAt,
          )
          if (!row) throw new Error('missing version')
          value = asVersion(row)
        })
        return { ok: true, value }
      } catch {
        return { ok: false, error: 'seed_failed' }
      }
    },
  }
}
