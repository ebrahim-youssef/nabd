import { useState } from 'react'
import { View } from 'react-native'

import { INTENTIONS_LIBRARY } from '../content/intentions'
import { toArabicIndic } from '../lib/format'
import { PageHeader } from '../shell/PageHeader'
import { ScreenContainer } from '../shell/ScreenContainer'
import { Text } from '../shell/Text'
import { Accordion } from '../ui/Accordion'
import { INTENTIONS_COPY } from './copy'

export function IntentionsRoute() {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <ScreenContainer testID="intentions-screen">
      <View className="gap-6">
        <PageHeader backHref="/more" title={INTENTIONS_COPY.libraryTitle} />
        <Text className="text-body text-start text-ink">{INTENTIONS_COPY.introduction}</Text>
        <View className="gap-3" testID="intentions-library">
          {INTENTIONS_LIBRARY.map((entry) => (
            <Accordion
              expanded={expandedId === entry.id}
              key={entry.id}
              onToggle={() =>
                setExpandedId((previous) => (previous === entry.id ? null : entry.id))
              }
              subtitle={`${toArabicIndic(entry.intentions.length)} ${INTENTIONS_COPY.countLabel}`}
              testID={`deed-${entry.id}`}
              title={entry.deed}
            >
              <View className="gap-3 py-3">
                {entry.intentions.map((intention, intentionIndex) => (
                  <View className="gap-0.5 border-s-2 border-gold-ink ps-3" key={intention.text}>
                    <Text className="font-text text-body text-start text-ink">
                      {intention.text}
                    </Text>
                    {intention.evidence ? (
                      <Text
                        className="font-text text-meta text-start text-mute"
                        testID={`deed-evidence-${entry.id}-${intentionIndex}`}
                      >
                        {intention.evidence}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </Accordion>
          ))}
        </View>
        <Text className="font-sans-bold text-chip text-ink">{INTENTIONS_COPY.attribution}</Text>
      </View>
    </ScreenContainer>
  )
}
