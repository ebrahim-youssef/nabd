import { Text } from '../shell/Text'

export function SectionHeader({ title }: { title: string }) {
  return (
    <Text accessibilityRole="header" className="font-sans-bold text-caption text-mute">
      {title}
    </Text>
  )
}
