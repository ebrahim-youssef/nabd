import { View } from 'react-native'
import { Download, ShieldCheck, TriangleAlert, Upload } from 'lucide-react-native'

import { Text } from '../shell/Text'
import { ListGroup } from '../ui/ListGroup'
import { ListRow } from '../ui/ListRow'
import { StatusCard } from '../ui/StatusCard'
import { useToast } from '../ui/ToastProvider'
import { BACKUP_COPY, backupStatusMessage } from './copy'
import { BackupReviewSheet } from './BackupReviewSheet'
import { useBackup } from './useBackup'

export function BackupSection({ onRestored }: { onRestored?: () => void } = {}) {
  const backup = useBackup()
  const toast = useToast()
  const error =
    backup.status && backup.status.kind !== 'exported' && backup.status.kind !== 'restored'
      ? backupStatusMessage(backup.status)
      : null

  async function handleExport() {
    const result = await backup.exportBackup()
    if (result?.ok) toast.show({ message: BACKUP_COPY.status.exported })
  }

  async function handleConfirm() {
    const result = await backup.confirmRestore()
    if (result?.ok) {
      toast.show({ message: backupStatusMessage({ kind: 'restored', counts: result.value }) })
      onRestored?.()
    }
  }

  return (
    <View className="gap-3" testID="settings-backup">
      <Text className="font-sans text-body text-start text-mute" selectable>
        {BACKUP_COPY.description}
      </Text>
      {error ? <StatusCard tone="warn" icon={TriangleAlert} message={error} /> : null}
      <ListGroup>
        <ListRow
          label={BACKUP_COPY.export}
          description={BACKUP_COPY.exportDescription}
          icon={Upload}
          disabled={backup.isBusy}
          onPress={() => void handleExport()}
          testID="backup-export"
        />
        <ListRow
          label={BACKUP_COPY.import}
          description={BACKUP_COPY.importDescription}
          icon={Download}
          disabled={backup.isBusy}
          onPress={() => void backup.chooseFile()}
          testID="backup-import"
        />
      </ListGroup>
      <StatusCard
        tone="info"
        icon={ShieldCheck}
        message={BACKUP_COPY.privacyTitle}
        detail={BACKUP_COPY.privacyDetail}
      />
      <BackupReviewSheet
        preview={backup.preview}
        isBusy={backup.isBusy}
        error={error}
        onCancel={backup.cancelRestore}
        onConfirm={() => void handleConfirm()}
      />
    </View>
  )
}
