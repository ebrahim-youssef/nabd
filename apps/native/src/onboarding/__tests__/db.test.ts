import { WIRD_LEVELS, type WirdDefinition } from '@nabd/shared'

import { createOnboardingRepository, type OnboardingDatabase } from '../db'

type StateRow = {
  answers_json: string
  selected_level_id: string
  completed_at: number
  effective_from: string
  wird_version_id: string
}

type VersionRow = {
  id: string
  level_id: string
  effective_from: string
  definition_json: string
  created_at: number
}

function fakeDatabase() {
  let state: StateRow | null = null
  let versions = new Map<string, VersionRow>()
  let transactionQueue = Promise.resolve()

  const database: OnboardingDatabase = {
    getFirstAsync: async <T>(source: string, ...parameters: (string | number | null)[]) => {
      if (source.includes('onboarding_state')) return state as T | null
      if (source.includes('LIMIT 1')) return ([...versions.values()][0] ?? null) as T | null
      return (versions.get(String(parameters[0])) ?? null) as T | null
    },
    runAsync: jest.fn(
      async (source: string, ...parameters: (string | number | null)[]): Promise<unknown> => {
        if (source.includes('INSERT INTO wird_versions')) {
          const id = String(parameters[0])
          if (versions.has(id)) throw new Error('duplicate version')
          versions.set(id, {
            id,
            level_id: String(parameters[1]),
            effective_from: String(parameters[2]),
            definition_json: String(parameters[3]),
            created_at: Number(parameters[4]),
          })
          return undefined
        }
        if (source.includes('INSERT INTO onboarding_state')) {
          if (state) throw new Error('duplicate onboarding state')
          const versionId = String(parameters[5])
          if (!versions.has(versionId)) throw new Error('missing wird version')
          state = {
            answers_json: String(parameters[1]),
            selected_level_id: String(parameters[2]),
            completed_at: Number(parameters[3]),
            effective_from: String(parameters[4]),
            wird_version_id: versionId,
          }
        }
        return undefined
      },
    ),
    withExclusiveTransactionAsync: async (task) => {
      const previous = transactionQueue
      let release: () => void = () => undefined
      transactionQueue = new Promise<void>((resolve) => {
        release = resolve
      })
      await previous
      const stateBefore = state ? { ...state } : null
      const versionsBefore = new Map(versions)
      try {
        await task(database)
      } catch (cause) {
        state = stateBefore
        versions = versionsBefore
        throw cause
      } finally {
        release()
      }
    },
  }

  return {
    database,
    versionCount: () => versions.size,
    corruptAnswers: () => {
      if (state) state.answers_json = '{'
    },
    addUnknownAnswer: () => {
      if (state) {
        state.answers_json = JSON.stringify({
          ...JSON.parse(state.answers_json),
          unknown: 'value',
        })
      }
    },
    replaceDefinition: (definition: WirdDefinition) => {
      const version = [...versions.values()][0]
      if (version) version.definition_json = JSON.stringify(definition)
    },
    replaceDefinitionJson: (definition: string) => {
      const version = [...versions.values()][0]
      if (version) version.definition_json = definition
    },
  }
}

const input = {
  answers: { prayers: 'always', quran: 'hizb', adhkar: 'daily' },
  selectedLevelId: 'level-3' as const,
  completedAt: 100,
  effectiveFrom: '2026-08-10',
  versionId: 'initial-wird-level-3',
}

describe('native onboarding repository', () => {
  it('serializes concurrent completion and restores exactly one immutable version', async () => {
    const fake = fakeDatabase()
    const repository = createOnboardingRepository(fake.database)

    const [first, second] = await Promise.all([
      repository.complete(input),
      repository.complete(input),
    ])

    expect(first).toEqual(second)
    expect((await createOnboardingRepository(fake.database).load())?.selectedLevelId).toBe(
      'level-3',
    )
    expect(fake.versionCount()).toBe(1)
    expect(fake.database.runAsync).toHaveBeenCalledTimes(2)
  })

  it('rejects malformed partial persistence instead of overwriting it', async () => {
    const fake = fakeDatabase()
    const repository = createOnboardingRepository(fake.database)
    await repository.complete(input)
    fake.corruptAnswers()

    await expect(repository.load()).resolves.toBeNull()
    await expect(repository.complete(input)).rejects.toThrow('malformed')
    expect(fake.versionCount()).toBe(1)
  })

  it('accepts a structurally valid historical definition without comparing current copy', async () => {
    const fake = fakeDatabase()
    const repository = createOnboardingRepository(fake.database)
    await repository.complete(input)
    fake.replaceDefinition(WIRD_LEVELS[0].wird)

    await expect(repository.load()).resolves.toMatchObject({
      activeWird: { definition: WIRD_LEVELS[0].wird },
    })
  })

  it('rejects a persisted definition with malformed nested items', async () => {
    const fake = fakeDatabase()
    const repository = createOnboardingRepository(fake.database)
    await repository.complete(input)
    fake.replaceDefinitionJson(
      JSON.stringify({ areas: [{ id: 'prayer', label: 'الصلاة', order: 1 }], items: [{}] }),
    )

    await expect(repository.load()).resolves.toBeNull()
  })

  it('rejects persisted answers with unknown fields', async () => {
    const fake = fakeDatabase()
    const repository = createOnboardingRepository(fake.database)
    await repository.complete(input)
    fake.addUnknownAnswer()

    await expect(repository.load()).resolves.toBeNull()
  })

  it.each([
    [{ ...input, selectedLevelId: 'not-a-level' }, 'Invalid'],
    [{ ...input, effectiveFrom: '2026-8-10' }, 'Invalid'],
    [{ ...input, completedAt: Number.NaN }, 'Invalid'],
    [{ ...input, versionId: '' }, 'Invalid'],
  ])('rejects invalid completion input', async (invalid, message) => {
    const fake = fakeDatabase()
    await expect(
      createOnboardingRepository(fake.database).complete(invalid as typeof input),
    ).rejects.toThrow(message)
    expect(fake.versionCount()).toBe(0)
  })
})
