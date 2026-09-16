import { Tabs } from 'expo-router'

import { BottomNav } from '../../src/app/BottomNav'

export default function TabsLayout() {
  return <Tabs screenOptions={{ headerShown: false }} tabBar={() => <BottomNav />} />
}
