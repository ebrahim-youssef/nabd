import { Pressable, View } from 'react-native'

import { Text } from '../shell/Text'
import { BACKUP_COPY, BACKUP_TABLE_LABELS, backupStatusMessage, countLabel } from './copy'
import { BACKUP_TABLES } from './logic'
import { useBackup } from './useBackup'

type BackupImportProps = ReturnType<typeof useBackup> & {
  importLabel?: string
  importTestID?: string
  onRestored?: () => void
}

function BackupButton({
  label,
  onPress,
  testID,
  disabled,
  primary = false,
}: {
  label: string
  onPress: () => void
  testID: string
  disabled: boolean
  primary?: boolean
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      className={`rounded-button px-4 py-3 ${primary ? 'bg-primary' : 'border border-primary bg-primary/10'} ${disabled ? 'opacity-50' : ''}`}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
    >
      <Text
        className={`text-body text-center font-body-medium ${primary ? 'text-on-primary' : 'text-primary'}`}
        selectable
      >
        {label}
      </Text>
    </Pressable>
  )
}

export function BackupImport({
  cancelRestore,
  chooseFile,
  confirmRestore,
  importLabel = BACKUP_COPY.import,
  importTestID = 'backup-import',
  isBusy,
  onRestored,
  preview,
  status,
}: BackupImportProps) {
  async function handleConfirm() {
    const result = await confirmRestore()
    if (result?.ok) onRestored?.()
  }

  return (
    <>
      {preview ? (
        <View className="gap-3" testID="backup-preview">
          <Text className="font-display text-body text-start text-primary" selectable>
            {BACKUP_COPY.previewTitle}
          </Text>
          <Text className="text-small text-start text-muted-foreground" selectable>
            {BACKUP_COPY.previewBody}
          </Text>
          <View className="gap-2">
            {BACKUP_TABLES.map((table) => (
              <View className="flex-row items-center justify-between gap-3" key={table}>
                <Text className="text-small text-start text-foreground" selectable>
                  {BACKUP_TABLE_LABELS[table]}
                </Text>
                <Text
                  className="text-small text-start font-body-medium text-primary"
                  selectable
                  testID={`backup-count-${table}`}
                >
                  {countLabel(preview.counts[table])}
                </Text>
              </View>
            ))}
          </View>
          <View className="gap-2">
            <BackupButton
              disabled={isBusy}
              label={BACKUP_COPY.confirm}
              onPress={handleConfirm}
              primary
              testID="backup-confirm"
            />
            <BackupButton
              disabled={isBusy}
              label={BACKUP_COPY.cancel}
              onPress={cancelRestore}
              testID="backup-cancel"
            />
          </View>
        </View>
      ) : (
        <BackupButton
          disabled={isBusy}
          label={importLabel}
          onPress={() => void chooseFile()}
          testID={importTestID}
        />
      )}
      {isBusy ? (
        <Text
          className="text-small text-start text-muted-foreground"
          selectable
          testID="backup-busy"
        >
          {BACKUP_COPY.busy}
        </Text>
      ) : null}
      {status ? (
        <Text
          className="text-small text-start text-muted-foreground"
          selectable
          testID="backup-status"
        >
          {backupStatusMessage(status)}
        </Text>
      ) : null}
    </>
  )
}

export function BackupSection({ onRestored }: { onRestored?: () => void } = {}) {
  const backup = useBackup()

  return (
    <View className="gap-3" testID="settings-backup">
      <Text className="font-display text-label text-start text-muted-foreground" selectable>
        {BACKUP_COPY.title}
      </Text>
      <View className="gap-3 rounded-card border border-border bg-surface p-4" testID="backup-card">
        <Text className="text-body text-start text-foreground" selectable>
          {BACKUP_COPY.description}
        </Text>
        {backup.preview ? (
          <BackupImport {...backup} onRestored={onRestored} />
        ) : (
          <View className="gap-2">
            <BackupButton
              disabled={backup.isBusy}
              label={BACKUP_COPY.export}
              onPress={() => void backup.exportBackup()}
              primary
              testID="backup-export"
            />
            <BackupImport {...backup} onRestored={onRestored} />
          </View>
        )}
      </View>
    </View>
  )
}
