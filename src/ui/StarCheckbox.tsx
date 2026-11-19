import { Pressable } from 'react-native'
import Svg, { Path, Polygon } from 'react-native-svg'

import { STAR_SIZE, useThemeColors } from '../../theme/tokens'

type StarCheckboxProps = {
  checked: boolean
  label: string
  onChange: (checked: boolean) => void
  interactive?: boolean
  accessible?: boolean
}

const CHECK_PATH = 'M8.4 14.2 12 17.7 19.8 9.8'

export function StarCheckbox({
  checked,
  label,
  onChange,
  interactive = true,
  accessible = true,
}: StarCheckboxProps) {
  const theme = useThemeColors()
  const stateLabel = `${label}، ${checked ? 'تم' : 'لم يُسجَّل'}`
  return (
    <Pressable
      accessible={accessible}
      accessibilityActions={
        accessible ? [{ name: 'activate', label: checked ? 'إلغاء التسجيل' : 'تسجيل' }] : undefined
      }
      accessibilityLabel={stateLabel}
      accessibilityRole={accessible ? 'checkbox' : undefined}
      accessibilityState={{ checked }}
      onPress={interactive ? () => onChange(!checked) : undefined}
      onAccessibilityAction={({ nativeEvent }) => {
        if (nativeEvent.actionName === 'activate') onChange(!checked)
      }}
    >
      <Svg accessible={false} height={STAR_SIZE} viewBox="0 0 28 28" width={STAR_SIZE}>
        <Polygon
          fill={checked ? theme.gold : 'none'}
          points={starPoints()}
          stroke={checked ? theme['gold-ink'] : theme.box}
          strokeLinejoin="round"
          strokeWidth={1.6}
        />
        {checked ? (
          <Path
            d={CHECK_PATH}
            fill="none"
            stroke={theme.tick}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.2}
          />
        ) : null}
      </Svg>
    </Pressable>
  )
}

function starPoints(): string {
  return Array.from({ length: 16 }, (_, index) => {
    const angle = (Math.PI * index) / 8 - Math.PI / 2
    const radius = index % 2 === 0 ? STAR_SIZE / 2 - 1 : STAR_SIZE / 2 - 5
    const center = STAR_SIZE / 2
    const x = (center + Math.cos(angle) * radius).toFixed(2)
    const y = (center + Math.sin(angle) * radius).toFixed(2)
    return `${x},${y}`
  }).join(' ')
}
