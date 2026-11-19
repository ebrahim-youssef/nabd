import { TriangleAlert } from 'lucide-react-native'

import { COPY as ONBOARDING_COPY } from '../onboarding/copy'
import { useBatteryOptimization } from '../device/useBatteryOptimization'
import { StatusCard } from '../ui/StatusCard'

export function BatterySection() {
  const { status, request } = useBatteryOptimization()
  if (status !== 'optimized') return null

  return (
    <StatusCard
      tone="warn"
      icon={TriangleAlert}
      message={ONBOARDING_COPY.powerTitle}
      detail={ONBOARDING_COPY.powerBody}
      action={{ label: ONBOARDING_COPY.powerButton, onPress: request }}
    />
  )
}
