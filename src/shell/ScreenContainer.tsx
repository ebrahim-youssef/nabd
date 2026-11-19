import type { ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { BOTTOM_NAV_CLEARANCE } from './BottomNav'

export function ScreenContainer({
  children,
  testID,
  fullBleed = false,
}: {
  children: ReactNode
  testID: string
  fullBleed?: boolean
}) {
  return (
    <SafeAreaView className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: BOTTOM_NAV_CLEARANCE }}
        testID={testID}
      >
        <View className={fullBleed ? 'pb-4' : 'px-6 py-8'}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  )
}
