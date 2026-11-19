import { ChevronDown, ChevronUp } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, View } from 'react-native'

import { INTENTIONS_LIBRARY } from '../content/intentions'
import { toArabicIndic } from '../lib/format'
import { INTENTIONS_COPY } from './copy'

import { PageHeader } from '../shell/PageHeader'
import { ScreenContainer } from '../shell/ScreenContainer'
import { Text } from '../shell/Text'
import { ICON_SIZE, useThemeColors } from '../../theme/tokens'

const DEED_GLYPH = '۞'
const INTENTION_GLYPH = '✦'

export function IntentionsRoute() {
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set())
  const theme = useThemeColors()

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
        <Text className="text-body text-start text-ink">{INTENTIONS_COPY.introduction}</Text>
        <View className="gap-3" testID="intentions-library">
          {INTENTIONS_LIBRARY.map((entry) => {
            const expanded = expandedIds.has(entry.id)
            return (
              <View
                className={`rounded-card border border-line bg-surface ${expanded ? 'shadow-card' : 'shadow-card'}`}
                key={entry.id}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  className="flex-row items-center gap-3 p-4"
                  onPress={() => toggleDeed(entry.id)}
                  testID={`deed-${entry.id}`}
                >
                  <Text className="shrink-0 text-meta text-gold">{DEED_GLYPH}</Text>
                  <Text className="min-w-0 flex-1 text-body text-ink">{entry.deed}</Text>
                  <Text
                    className="shrink-0 rounded-pill bg-bg px-2.5 py-0.5 text-meta text-ink"
                    testID={`deed-count-${entry.id}`}
                  >
                    {toArabicIndic(entry.intentions.length)} {INTENTIONS_COPY.countLabel}
                  </Text>
                  {expanded ? (
                    <ChevronUp accessible={false} color={theme['mute']} size={ICON_SIZE} />
                  ) : (
                    <ChevronDown accessible={false} color={theme['mute']} size={ICON_SIZE} />
                  )}
                </Pressable>
                {expanded && (
                  <View className="mb-4 me-4 ms-6 gap-3 border-s-2 border-gold/40 ps-3">
                    {entry.intentions.map((intention, intentionIndex) => (
                      <View className="gap-0.5" key={intention.text}>
                        <View className="flex-row items-start gap-2">
                          <Text className="shrink-0 pt-1 text-meta text-gold">
                            {INTENTION_GLYPH}
                          </Text>
                          <Text className="min-w-0 flex-1 text-body text-ink">
                            {intention.text}
                          </Text>
                        </View>
                        {intention.evidence && (
                          <Text
                            className="ms-6 font-text text-meta text-ink"
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
        <Text className="font-sans-bold text-chip text-ink">{INTENTIONS_COPY.attribution}</Text>
      </View>
    </ScreenContainer>
  )
}
