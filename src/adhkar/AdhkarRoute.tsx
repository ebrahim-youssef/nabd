import { useFocusEffect, useRouter } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import { useCallback, useMemo, useState } from 'react'
import { View } from 'react-native'

import { ADHKAR_LIBRARY } from '../content/adhkar'
import type { AdhkarCategory } from '../content/adhkar'
import { useWirdToday } from '../day-plan/WirdTodayProvider'
import { useHomeDayPlan } from '../home/useHomeDayPlan'
import { createOnboardingRepository } from '../onboarding/db'
import type { PersistedOnboarding } from '../onboarding/db'
import { logger } from '../observability/logger'
import { PageHeader } from '../shell/PageHeader'
import { ScreenContainer } from '../shell/ScreenContainer'
import { Text } from '../shell/Text'
import { Button } from '../ui/Button'
import { ListGroup } from '../ui/ListGroup'
import { ListRow } from '../ui/ListRow'
import { ProgressBar } from '../ui/ProgressBar'
import { SectionHeader } from '../ui/SectionHeader'
import { COPY, formatAdhkarCount } from './copy'
import { createAdhkarRepository } from './db'

export function AdhkarRoute() {
  const database = useSQLiteContext()
  const repository = useMemo(() => createOnboardingRepository(database), [database])
  const [persisted, setPersisted] = useState<PersistedOnboarding | null>(null)

  useFocusEffect(
    useCallback(() => {
      let active = true
      void repository
        .load()
        .then((value) => {
          if (active) setPersisted(value)
        })
        .catch((cause: unknown) => logger.error('Native adhkar onboarding load failed', cause))
      return () => {
        active = false
      }
    }, [repository]),
  )

  return persisted ? <AdhkarWithPlan persisted={persisted} /> : <AdhkarHub />
}

function AdhkarWithPlan({ persisted }: { persisted: PersistedOnboarding }) {
  const home = useHomeDayPlan(persisted)
  const current =
    home.status === 'ready'
      ? home.plan.openTimedActs.find(
          (act) => act.id === 'morning-adhkar' || act.id === 'evening-adhkar',
        )
      : undefined
  const currentId =
    current?.id === 'morning-adhkar'
      ? 'morning'
      : current?.id === 'evening-adhkar'
        ? 'evening'
        : undefined
  const linkedIds =
    home.status === 'ready'
      ? home.plan.timedActs.filter((act) => act.items.length > 0).map((act) => act.id)
      : []
  return <AdhkarHub currentId={currentId} linkedIds={linkedIds} />
}

function AdhkarHub({ currentId, linkedIds = [] }: { currentId?: string; linkedIds?: string[] }) {
  const router = useRouter()
  const database = useSQLiteContext()
  const day = useWirdToday()
  const repository = useMemo(() => createAdhkarRepository(database), [database])
  const [done, setDone] = useState(0)
  const current = ADHKAR_LIBRARY.find((category) => category.id === currentId)

  useFocusEffect(
    useCallback(() => {
      let active = true
      setDone(0)
      if (current) {
        void Promise.all([
          repository.readFlowProgress(current.id, day),
          repository.isLinkedWirdItemDone(day, current.id),
        ])
          .then(([progress, linked]) => {
            if (active)
              setDone(
                progress
                  ? progress.finished
                    ? current.items.length
                    : Math.min(progress.index, current.items.length)
                  : linked
                    ? current.items.length
                    : 0,
              )
          })
          .catch((cause: unknown) =>
            logger.error('Native adhkar progress load failed', cause, { day }),
          )
      }
      return () => {
        active = false
      }
    }, [current, day, repository]),
  )

  const open = (category: AdhkarCategory) => router.push(`/adhkar/${category.id}`)
  return (
    <ScreenContainer testID="adhkar-screen">
      <View className="gap-6">
        <PageHeader title={COPY.libraryTitle} />
        {current ? (
          <View className="gap-3" testID={`adhkar-now-${current.id}`}>
            <SectionHeader title={COPY.nowInWird} />
            <View className="gap-3 rounded-card border border-line bg-now p-4">
              <Text className="self-start rounded-pill bg-surface px-2 py-1 text-chip text-gold-ink">
                {COPY.now}
              </Text>
              <Text className="font-display text-card-title text-ink">{current.title}</Text>
              <ProgressBar
                done={done}
                total={current.items.length}
                meta={COPY.progress(done, current.items.length)}
              />
              <Button
                label={done === 0 ? COPY.begin : COPY.continue}
                onPress={() => open(current)}
                variant="solid"
              />
            </View>
          </View>
        ) : null}
        <ListGroup>
          {ADHKAR_LIBRARY.filter((category) => category.id !== currentId).map((category) => {
            const hint =
              category.id === 'morning' && linkedIds.includes('morning-adhkar')
                ? COPY.morningHint
                : category.id === 'evening' && linkedIds.includes('evening-adhkar')
                  ? COPY.eveningHint
                  : null
            return (
              <ListRow
                key={category.id}
                label={category.title}
                description={`${formatAdhkarCount(category.items.length)}${hint ? ` · ${hint}` : ''}`}
                onPress={() => open(category)}
                testID={`adhkar-row-${category.id}`}
              />
            )
          })}
        </ListGroup>
        <Text className="text-meta text-mute">{COPY.footer}</Text>
      </View>
    </ScreenContainer>
  )
}
