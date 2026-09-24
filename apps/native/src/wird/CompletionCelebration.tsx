import { summarizeChecklist, WIRD_COPY } from '@nabd/shared'
import { useSQLiteContext } from 'expo-sqlite'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal, Pressable, Share, View } from 'react-native'

import { createPreferencesRepository, PREFERENCE_KEYS } from '../preferences/db'
import { logger } from '../observability/logger'
import { Text } from '../shell/Text'
import { useWirdDay } from './WirdDayProvider'

const AWARD_MARK = '✦'
const MODAL_ANIMATION = 'fade' as const
const CELEBRATION_TEST_ID = 'completion-celebration'
const SHARE_TEST_ID = 'celebration-share'
const DISMISS_TEST_ID = 'celebration-dismiss'

export function CompletionCelebration() {
  const { day: initialDay, areas, isLoading } = useWirdDay()
  const database = useSQLiteContext()
  const preferences = useMemo(() => createPreferencesRepository(database), [database])
  const [show, setShow] = useState(false)
  const fired = useRef(false)
  const summary = useMemo(() => summarizeChecklist(areas), [areas])
  const complete = !isLoading && summary.total > 0 && summary.remaining === 0

  useEffect(() => {
    if (!complete || fired.current) return
    fired.current = true
    let active = true
    void preferences
      .read(PREFERENCE_KEYS.celebratedDay)
      .then(async (lastCelebratedDay) => {
        if (!active || lastCelebratedDay === initialDay) return
        await preferences.write(PREFERENCE_KEYS.celebratedDay, initialDay, Date.now())
        if (active) setShow(true)
      })
      .catch((cause: unknown) => {
        logger.error('Native completion celebration state failed', cause)
      })
    return () => {
      active = false
    }
  }, [complete, initialDay, preferences])

  if (!show) return null

  return (
    <Modal
      accessibilityLabel={WIRD_COPY.celebrationTitle}
      animationType={MODAL_ANIMATION}
      onRequestClose={() => setShow(false)}
      transparent
      visible
    >
      <View
        accessibilityViewIsModal
        className="flex-1 items-center justify-center gap-6 bg-primary px-6"
        testID={CELEBRATION_TEST_ID}
      >
        <View className="h-28 w-28 items-center justify-center rounded-ring border-4 border-gold">
          <Text accessibilityElementsHidden className="text-display text-gold">
            {AWARD_MARK}
          </Text>
        </View>
        <Text className="font-display text-display text-center text-on-primary">
          {WIRD_COPY.celebrationTitle}
        </Text>
        <Text className="font-scripture text-scripture text-center text-on-primary">
          {WIRD_COPY.celebrationHadith}
        </Text>
        <View className="flex-row items-center gap-3">
          <Pressable
            accessibilityLabel={WIRD_COPY.celebrationShare}
            accessibilityRole="button"
            className="rounded-button border border-on-primary px-6 py-3"
            onPress={() => {
              void Share.share({ message: WIRD_COPY.celebrationShareText }).catch(
                (cause: unknown) => logger.error('Native celebration share failed', cause),
              )
            }}
            testID={SHARE_TEST_ID}
          >
            <Text className="text-body text-on-primary">{WIRD_COPY.celebrationShare}</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={WIRD_COPY.celebrationDismiss}
            accessibilityRole="button"
            className="rounded-button bg-surface px-6 py-3"
            onPress={() => setShow(false)}
            testID={DISMISS_TEST_ID}
          >
            <Text className="text-body text-primary">{WIRD_COPY.celebrationDismiss}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}
