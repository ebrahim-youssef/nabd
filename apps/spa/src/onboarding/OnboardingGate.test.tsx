import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { ONBOARDING_COPY, shellCopy, WIRD_LEVELS } from '@nabd/shared'

import { db } from '../db/db'
import { renderApp } from '../test/memoryApp'
import { seedWirdFromLevel } from './db'

const EFFECTIVE_FROM = '2026-08-12'
const CREATED_AT = 1_755_000_000_000

beforeEach(async () => {
  await db.wirdVersions.clear()
})

describe('OnboardingGate', () => {
  it('shows loading before showing onboarding to a new user', async () => {
    renderApp('/app')

    expect(screen.getByTestId('onboarding-loading')).toBeInTheDocument()
    await screen.findByRole('heading', { level: 2, name: ONBOARDING_COPY.title })
  })

  it('never flashes onboarding when a version already exists', async () => {
    await seedWirdFromLevel(WIRD_LEVELS[1].wird, EFFECTIVE_FROM, CREATED_AT)

    renderApp('/app')

    expect(screen.getByTestId('onboarding-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('onboarding-welcome')).not.toBeInTheDocument()
    await screen.findByRole('heading', { level: 1, name: shellCopy.appName })
    expect(screen.queryByTestId('onboarding-welcome')).not.toBeInTheDocument()
  })

  it('keeps onboarding dismissed after the route tree is remounted', async () => {
    await seedWirdFromLevel(WIRD_LEVELS[2].wird, EFFECTIVE_FROM, CREATED_AT)
    const first = renderApp('/app')
    await screen.findByRole('heading', { level: 1, name: shellCopy.appName })
    first.unmount()

    renderApp('/app')

    await waitFor(() =>
      expect(
        screen.getByRole('heading', { level: 1, name: shellCopy.appName }),
      ).toBeInTheDocument(),
    )
    expect(screen.queryByTestId('onboarding-welcome')).not.toBeInTheDocument()
  })
})
