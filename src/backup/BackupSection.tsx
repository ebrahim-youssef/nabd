import { Pressable, View } from 'react-native'
import { Download, ShieldCheck, TriangleAlert, Upload } from 'lucide-react-native'

import { Text } from '../shell/Text'
import { ConfirmSheet } from '../ui/ConfirmSheet'
import { ListGroup } from '../ui/ListGroup'
import { ListRow } from '../ui/ListRow'
import { StatusCard } from '../ui/StatusCard'
import { useToast } from '../ui/ToastProvider'
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
      className={`rounded-button px-4 py-3 ${primary ? 'bg-accent' : 'border border-accent bg-accent/10'} ${disabled ? 'opacity-50' : ''}`}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
    >
      <Text
        className={`text-body text-center font-sans-medium ${primary ? 'text-on-accent' : 'text-accent'}`}
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
  const previewTables = preview ? BACKUP_TABLES.filter((table) => preview.counts[table] > 0) : []

  async function handleConfirm() {
    const result = await confirmRestore()
    if (result?.ok) onRestored?.()
  }

  return (
    <>
      {preview ? (
        <View className="gap-3" testID="backup-preview">
          {previewTables.length > 0 ? (
            <>
              <Text className="font-sans text-body text-start text-accent" selectable>
                {BACKUP_COPY.previewTitle}
              </Text>
              <Text className="text-meta text-start text-ink" selectable>
                {BACKUP_COPY.previewBody}
              </Text>
              <View className="gap-2">
                {previewTables.map((table) => (
                  <View className="flex-row items-center justify-between gap-3" key={table}>
                    <Text className="text-meta text-start text-ink" selectable>
                      {BACKUP_TABLE_LABELS[table]}
                    </Text>
                    <Text
                      className="text-meta text-start font-sans-medium text-accent"
                      selectable
                      testID={`backup-count-${table}`}
                    >
                      {countLabel(preview.counts[table])}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Text
              className="text-body text-start text-ink"
              selectable
              testID="backup-preview-empty"
            >
              {BACKUP_COPY.previewEmpty}
            </Text>
          )}
          <View className="gap-2">
            {previewTables.length > 0 ? (
              <BackupButton
                disabled={isBusy}
                label={BACKUP_COPY.confirm}
                onPress={handleConfirm}
                primary
                testID="backup-confirm"
              />
            ) : null}
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
        <Text className="text-meta text-start text-ink" selectable testID="backup-busy">
          {BACKUP_COPY.busy}
        </Text>
      ) : null}
      {status ? (
        <Text className="text-meta text-start text-ink" selectable testID="backup-status">
          {backupStatusMessage(status)}
        </Text>
      ) : null}
    </>
  )
}

export function BackupSection({ onRestored }: { onRestored?: () => void } = {}) {
  const backup = useBackup()
  const toast = useToast()
  const preview = backup.preview
  const previewTables = preview ? BACKUP_TABLES.filter((table) => preview.counts[table] > 0) : []
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
      <ConfirmSheet
        visible={backup.preview !== null}
        onClose={backup.cancelRestore}
        title={BACKUP_COPY.previewTitle}
        explanation={BACKUP_COPY.previewBody}
        confirmLabel={BACKUP_COPY.confirm}
        cancelLabel={BACKUP_COPY.cancel}
        onConfirm={() => void handleConfirm()}
        confirmDisabled={backup.isBusy || previewTables.length === 0}
        busy={backup.isBusy}
      >
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
          <Text className="font-sans text-body text-start text-ink">
            {BACKUP_COPY.previewEmpty}
          </Text>
        )}
      </ConfirmSheet>
    </View>
  )
}
