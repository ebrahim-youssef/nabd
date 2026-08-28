import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import { ONBOARDING_COPY, shellCopy, WIRD_LEVELS } from '@nabd/shared'
import type { Answers, LevelId } from '@nabd/shared'

import { collectPageFailures } from './helpers'

const ANSWER_SETS: ReadonlyArray<{
  name: string
  answers: Answers
  expectedLevel: LevelId
}> = [
  {
    name: 'beginner',
    answers: { prayers: 'struggling', quran: 'rarely', adhkar: 'rarely' },
    expectedLevel: 'level-1',
  },
  {
    name: 'middle',
    answers: { prayers: 'mostly', quran: 'pages', adhkar: 'sometimes' },
    expectedLevel: 'level-2',
  },
  {
    name: 'established',
    answers: { prayers: 'always', quran: 'hizb', adhkar: 'daily' },
    expectedLevel: 'level-3',
  },
]

async function answerQuestionnaire(page: Page, answers: Answers) {
  await page.getByRole('button', { name: ONBOARDING_COPY.welcomeStart }).click()
  for (const [questionId, optionId] of Object.entries(answers)) {
    await page.getByTestId(`onboarding-${questionId}-${optionId}`).check()
  }
  await page.getByRole('button', { name: ONBOARDING_COPY.submit }).click()
}

async function readPersistedDefinition(page: Page) {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('nabd')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    return new Promise<unknown>((resolve, reject) => {
      const request = database.transaction('wirdVersions').objectStore('wirdVersions').getAll()
      request.onsuccess = () => resolve(request.result[0]?.definition)
      request.onerror = () => reject(request.error)
    })
  })
}

for (const { name, answers, expectedLevel } of ANSWER_SETS) {
  test(`${name} answers select ${expectedLevel} and survive reload`, async ({ page }) => {
    const failures = collectPageFailures(page)
    await page.goto('/app')
    await answerQuestionnaire(page, answers)

    await expect(page.getByTestId(`onboarding-level-${expectedLevel}`)).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await page.getByRole('button', { name: ONBOARDING_COPY.confirm }).click()
    await expect(page.getByRole('heading', { level: 1, name: shellCopy.appName })).toBeVisible()

    const expectedDefinition = WIRD_LEVELS.find((level) => level.id === expectedLevel)?.wird
    expect(await readPersistedDefinition(page)).toEqual(expectedDefinition)

    await page.reload()

    await expect(page.getByRole('heading', { level: 1, name: shellCopy.appName })).toBeVisible()
    await expect(page.getByTestId('onboarding-welcome')).toHaveCount(0)
    await expect(page.getByTestId('onboarding-questionnaire')).toHaveCount(0)
    expect(await readPersistedDefinition(page)).toEqual(expectedDefinition)
    expect(failures).toEqual([])
  })
}
