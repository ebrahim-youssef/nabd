import { ChevronDown, ChevronUp } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { INTENTIONS_COPY, INTENTIONS_LIBRARY, toArabicIndic } from '@nabd/shared'

import { PageHeader } from '../shell/PageHeader'
import { ScreenContainer } from '../shell/ScreenContainer'
import { ICON_SIZE, NATIVE_THEME } from '../shell/nativeTheme'

const DEED_GLYPH = '۞'
const INTENTION_GLYPH = '✦'

export function IntentionsRoute() {
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set())

  function toggleDeed(entryId: string) {
    setExpandedIds((previous) => {
      const next = new Set(previous)
      if (next.has(entryId)) next.delete(entryId)
      else next.add(entryId)
      return next
    })
  }

  return (
    <ScreenContainer testID="intentions-screen">
      <View className="gap-6">
        <PageHeader backHref="/libraries" title={INTENTIONS_COPY.libraryTitle} />
        <Text className="text-body text-start text-muted-foreground">
          {INTENTIONS_COPY.introduction}
        </Text>
        <View className="gap-3" testID="intentions-library">
          {INTENTIONS_LIBRARY.map((entry) => {
            const expanded = expandedIds.has(entry.id)
            return (
              <View
                className={`rounded-card border border-border bg-surface ${expanded ? 'shadow-card' : 'shadow-card-small'}`}
                key={entry.id}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  className="flex-row items-center gap-3 p-4"
                  onPress={() => toggleDeed(entry.id)}
                  testID={`deed-${entry.id}`}
                >
                  <Text className="shrink-0 text-small text-gold">{DEED_GLYPH}</Text>
                  <Text className="min-w-0 flex-1 text-body text-foreground">{entry.deed}</Text>
                  <Text
                    className="shrink-0 rounded-chip bg-surface-2 px-2.5 py-0.5 text-small text-muted-foreground"
                    testID={`deed-count-${entry.id}`}
                  >
                    {toArabicIndic(entry.intentions.length)} {INTENTIONS_COPY.countLabel}
                  </Text>
                  {expanded ? (
                    <ChevronUp
                      accessible={false}
                      color={NATIVE_THEME.colors['muted-foreground']}
                      size={ICON_SIZE}
                    />
                  ) : (
                    <ChevronDown
                      accessible={false}
                      color={NATIVE_THEME.colors['muted-foreground']}
                      size={ICON_SIZE}
                    />
                  )}
                </Pressable>
                {expanded && (
                  <View className="mb-4 me-4 ms-6 gap-3 border-s-2 border-gold/40 ps-3">
                    {entry.intentions.map((intention, intentionIndex) => (
                      <View className="gap-0.5" key={intention.text}>
                        <View className="flex-row items-start gap-2">
                          <Text className="shrink-0 pt-1 text-small text-gold">
                            {INTENTION_GLYPH}
                          </Text>
                          <Text className="min-w-0 flex-1 text-body text-foreground">
                            {intention.text}
                          </Text>
                        </View>
                        {intention.evidence && (
                          <Text
                            className="ms-6 text-small text-muted-foreground"
                            testID={`deed-evidence-${entry.id}-${intentionIndex}`}
                          >
                            {intention.evidence}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )
          })}
        </View>
        <Text className="text-label text-muted-foreground">{INTENTIONS_COPY.attribution}</Text>
      </View>
    </ScreenContainer>
  )
}
