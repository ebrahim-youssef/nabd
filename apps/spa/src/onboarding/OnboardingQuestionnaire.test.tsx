import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { ONBOARDING_COPY, QUESTIONS, WIRD_LEVELS } from '@nabd/shared'

import { db } from '../db/db'
import { renderApp } from '../test/memoryApp'

beforeEach(async () => {
  await db.wirdVersions.clear()
})

describe('OnboardingQuestionnaire', () => {
  it('introduces the product before asking the shared questions', async () => {
    renderApp('/app')

    await screen.findByTestId('onboarding-welcome')
    expect(screen.getByText(ONBOARDING_COPY.welcomeBody)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: ONBOARDING_COPY.welcomeStart }))

    expect(screen.getByTestId('onboarding-questionnaire')).toBeInTheDocument()
    for (const question of QUESTIONS) {
      expect(screen.getByRole('group', { name: question.prompt })).toBeInTheDocument()
    }
  })

  it('recommends the scored level and still permits another selection', async () => {
    renderApp('/app')
    fireEvent.click(await screen.findByRole('button', { name: ONBOARDING_COPY.welcomeStart }))

    fireEvent.click(screen.getByTestId('onboarding-prayers-mostly'))
    fireEvent.click(screen.getByTestId('onboarding-quran-pages'))
    fireEvent.click(screen.getByTestId('onboarding-adhkar-sometimes'))
    fireEvent.click(screen.getByRole('button', { name: ONBOARDING_COPY.submit }))

    const recommended = screen.getByTestId('onboarding-level-level-2')
    expect(recommended).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByTestId('onboarding-level-level-3'))
    expect(recommended).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByTestId('onboarding-level-level-3')).toHaveAttribute('aria-pressed', 'true')
  })

  it('persists the selected level and reveals the existing app index', async () => {
    renderApp('/app')
    fireEvent.click(await screen.findByRole('button', { name: ONBOARDING_COPY.welcomeStart }))

    fireEvent.click(screen.getByTestId('onboarding-prayers-struggling'))
    fireEvent.click(screen.getByTestId('onboarding-quran-rarely'))
    fireEvent.click(screen.getByTestId('onboarding-adhkar-rarely'))
    fireEvent.click(screen.getByRole('button', { name: ONBOARDING_COPY.submit }))
    fireEvent.click(screen.getByRole('button', { name: ONBOARDING_COPY.confirm }))

    await waitFor(() =>
      expect(screen.queryByTestId('onboarding-recommendation')).not.toBeInTheDocument(),
    )
    const versions = await db.wirdVersions.toArray()
    expect(versions).toHaveLength(1)
    expect(versions[0]?.definition).toEqual(WIRD_LEVELS[0].wird)
  })
})
