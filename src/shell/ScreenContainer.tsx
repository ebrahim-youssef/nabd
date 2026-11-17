import type { ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { BOTTOM_NAV_CLEARANCE } from './BottomNav'

export function ScreenContainer({ children, testID }: { children: ReactNode; testID: string }) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: BOTTOM_NAV_CLEARANCE }}
        testID={testID}
      >
        <View className="px-6 py-8">{children}</View>
      </ScrollView>
    </SafeAreaView>
  )
}
