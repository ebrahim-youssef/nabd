import { ADHKAR_LIBRARY } from '../content/adhkar'
import { COPY as ADHKAR_COPY, DAILY_CATEGORY_ID, LIST_CATEGORIES } from './copy'
import type { AdhkarCategory } from '../content/adhkar'
import { useState } from 'react'
import { Pressable, View } from 'react-native'

import { PageHeader } from '../shell/PageHeader'
import { ScreenContainer } from '../shell/ScreenContainer'
import { Text } from '../shell/Text'
import { AdhkarList } from './AdhkarList'
import { AdhkarFlow } from './AdhkarFlow'
import { DailyAdhkarList } from './DailyAdhkarList'

export function AdhkarRoute() {
  const [selected, setSelected] = useState(ADHKAR_LIBRARY[0]?.id ?? '')
  const category = ADHKAR_LIBRARY.find((entry) => entry.id === selected) ?? ADHKAR_LIBRARY[0]

  return (
    <ScreenContainer testID="adhkar-screen">
      <View className="gap-6">
        <PageHeader backHref="/libraries" title={ADHKAR_COPY.libraryTitle} />
        <View accessibilityRole="tablist" className="flex-row gap-2" testID="adhkar-tabs">
          {ADHKAR_LIBRARY.map((entry) => (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: entry.id === selected }}
              className={`rounded-chip border px-3 py-2 ${entry.id === selected ? 'border-primary bg-primary' : 'border-border bg-surface'}`}
              key={entry.id}
              onPress={() => setSelected(entry.id)}
              testID={`adhkar-category-${entry.id}`}
            >
              <Text
                className={
                  entry.id === selected
                    ? 'text-small text-on-primary'
                    : 'text-small text-foreground'
                }
              >
                {entry.title}
              </Text>
            </Pressable>
          ))}
        </View>
        {category && <CategoryContent key={category.id} category={category} />}
      </View>
    </ScreenContainer>
  )
}

function CategoryContent({ category }: { category: AdhkarCategory }) {
  if (category.id === DAILY_CATEGORY_ID) return <DailyAdhkarList />
  return LIST_CATEGORIES.has(category.id) ? (
    <AdhkarList category={category} />
  ) : (
    <AdhkarFlow category={category} />
  )
}
