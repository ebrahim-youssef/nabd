import type { OnboardingRepository, Result, WirdDefinition, WirdVersion } from '@nabd/shared'

import { SQLITE_ID, type ProductDatabase } from '../db/productDatabase'

type Row = { id: string; effective_from: string; definition_json: string; created_at: number }

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
          const row = await transaction.getFirstAsync<Row>(
            `INSERT INTO wird_versions (id, effective_from, definition_json, created_at) VALUES (${SQLITE_ID}, ?, ?, ?) RETURNING id, effective_from, definition_json, created_at`,
            effectiveFrom,
            JSON.stringify(definition),
            createdAt,
          )
          if (!row) throw new Error('missing version')
          value = {
            id: row.id,
            effectiveFrom: row.effective_from,
            definition: JSON.parse(row.definition_json) as WirdDefinition,
            createdAt: row.created_at,
          }
        })
        return { ok: true, value }
      } catch {
        return { ok: false, error: 'seed_failed' }
      }
    },
  }
}
