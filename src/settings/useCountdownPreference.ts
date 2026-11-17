import { useSQLiteContext } from 'expo-sqlite'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { logger } from '../observability/logger'
import { createPreferencesRepository, PREFERENCE_KEYS } from '../preferences/db'

const COUNTDOWN_ENABLED = '1'
const COUNTDOWN_DISABLED = '0'
const DEFAULT_COUNTDOWN_ENABLED = false

export type CountdownPreferenceView = {
  enabled: boolean
  setEnabled: (value: boolean) => Promise<void>
}

export function useCountdownPreference(): CountdownPreferenceView {
  const database = useSQLiteContext()
  const preferences = useMemo(() => createPreferencesRepository(database), [database])
  const [enabled, setEnabledState] = useState(DEFAULT_COUNTDOWN_ENABLED)
  // A toggle made before the first read resolves wins over the stored value.
  const hasLocalChange = useRef(false)

  useEffect(() => {
    let active = true
    void preferences
      .read(PREFERENCE_KEYS.countdownEnabled)
      .then((value) => {
        if (active && !hasLocalChange.current) setEnabledState(value === COUNTDOWN_ENABLED)
      })
      .catch((cause: unknown) => {
        logger.error('Native countdown preference read failed', cause, {
          operation: 'read-countdown-preference',
        })
      })

    return () => {
      active = false
    }
  }, [preferences])

  const setEnabled = useCallback(
    async (value: boolean): Promise<void> => {
      hasLocalChange.current = true
      setEnabledState(value)
      try {
        await preferences.write(
          PREFERENCE_KEYS.countdownEnabled,
          value ? COUNTDOWN_ENABLED : COUNTDOWN_DISABLED,
          Date.now(),
        )
      } catch (cause: unknown) {
        setEnabledState(!value)
        logger.error('Native countdown preference write failed', cause, {
          operation: 'write-countdown-preference',
          value,
        })
      }
    },
    [preferences],
  )

  return { enabled, setEnabled }
}
