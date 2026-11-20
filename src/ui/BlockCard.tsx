import type { ReactNode } from 'react'
import { View } from 'react-native'

import { Text } from '../shell/Text'

type BlockCardProps = {
  title: string
  meta?: string
  now?: boolean
  shadow?: boolean
  children: ReactNode
  testID?: string
  titleTestID?: string
}

export function BlockCard({
  title,
  meta,
  now = false,
  shadow = true,
  children,
  testID,
  titleTestID,
}: BlockCardProps) {
  return (
    <View
      className={`rounded-card border px-3.5 pb-1 ${shadow ? 'shadow-card' : ''} ${
        now ? 'border-gold bg-now' : 'border-line bg-surface'
      }`}
      testID={testID}
    >
      <View className="flex-row items-center justify-between py-2.5 pb-1.5">
        <View className="flex-row items-center gap-2">
          <Text
            accessibilityRole="header"
            className="font-display text-card-title text-ink"
            testID={titleTestID}
          >
            {title}
          </Text>
          {now ? (
            <Text className="rounded-pill bg-gold px-2 py-0.5 font-sans-bold text-chip text-tick">
              الآن
            </Text>
          ) : null}
        </View>
        {meta ? <Text className="font-sans text-meta text-mute">{meta}</Text> : null}
      </View>
      {children}
    </View>
  )
}
