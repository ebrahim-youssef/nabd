import { useCountdownPreference } from './useCountdownPreference'
import { requestPrayerReschedule } from '../device/prayerAlarms'
import { SwitchRow } from '../ui/SwitchRow'
import { NATIVE_SETTINGS_COPY } from './constants'

export function CountdownToggle({
  disabled,
  disabledReason,
}: {
  disabled: boolean
  disabledReason?: string
}) {
  const { enabled, setEnabled } = useCountdownPreference()
  async function change(value: boolean) {
    await setEnabled(value)
    requestPrayerReschedule()
  }
  return (
    <SwitchRow
      label={NATIVE_SETTINGS_COPY.notifications.countdownTitle}
      description={NATIVE_SETTINGS_COPY.notifications.countdownBody}
      value={enabled}
      onValueChange={(value) => void change(value)}
      disabled={disabled}
      disabledReason={disabledReason}
    />
  )
}
