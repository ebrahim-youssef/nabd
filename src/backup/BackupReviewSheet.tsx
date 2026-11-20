import { TriangleAlert } from 'lucide-react-native'
import { View } from 'react-native'

import { Text } from '../shell/Text'
import { ConfirmSheet } from '../ui/ConfirmSheet'
import { ListGroup } from '../ui/ListGroup'
import { ListRow } from '../ui/ListRow'
import { StatusCard } from '../ui/StatusCard'
import { BACKUP_COPY, BACKUP_TABLE_LABELS, countLabel } from './copy'
import { BACKUP_TABLES } from './logic'
import type { BackupPreview } from './useBackup'

export function BackupReviewSheet({
  preview,
  isBusy,
  error,
  onCancel,
  onConfirm,
}: {
  preview: BackupPreview | null
  isBusy: boolean
  error: string | null
  onCancel: () => void
  onConfirm: () => void
}) {
  const previewTables = preview ? BACKUP_TABLES.filter((table) => preview.counts[table] > 0) : []
  const content = (
    <View className="gap-3" testID="backup-preview">
      {error ? <StatusCard tone="warn" icon={TriangleAlert} message={error} /> : null}
      {previewTables.length > 0 && preview ? (
        <ListGroup>
          {previewTables.map((table) => (
            <ListRow
              key={table}
              label={BACKUP_TABLE_LABELS[table]}
              value={countLabel(preview.counts[table])}
              testID={`backup-count-${table}`}
            />
          ))}
        </ListGroup>
      ) : (
        <Text className="font-sans text-body text-start text-ink">{BACKUP_COPY.previewEmpty}</Text>
      )}
    </View>
  )

  return (
    <ConfirmSheet
      visible={preview !== null}
      onClose={onCancel}
      title={BACKUP_COPY.previewTitle}
      explanation={BACKUP_COPY.previewBody}
      confirmLabel={BACKUP_COPY.confirm}
      cancelLabel={BACKUP_COPY.cancel}
      onConfirm={onConfirm}
      confirmDisabled={isBusy || previewTables.length === 0}
      busy={isBusy}
    >
      {content}
    </ConfirmSheet>
  )
}
