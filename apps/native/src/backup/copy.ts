import type { BackupTable } from './types'
import type { BackupStatus } from './useBackup'
import { BACKUP_TABLES } from './logic'

export const BACKUP_TABLE_LABELS: Record<BackupTable, string> = {
  onboarding_state: 'بيانات البداية',
  wird_versions: 'إصدارات الورد',
  wird_entries: 'إنجازات الورد',
  qada_events: 'أحداث القضاء',
  adhkar_flow_progress: 'تقدّم الأذكار',
  app_preferences: 'التفضيلات',
}

export const BACKUP_COPY = {
  title: 'النسخ الاحتياطي',
  description: 'احفظ بيانات نبض في ملف يمكنك مشاركته واستيراده لاحقًا.',
  export: 'تصدير نسخة احتياطية',
  import: 'استيراد نسخة احتياطية',
  busy: 'جارٍ تجهيز النسخة الاحتياطية…',
  previewTitle: 'مراجعة الاستيراد',
  previewBody: 'ستُضاف السجلات التالية إلى بياناتك، ولن تُستبدل السجلات الموجودة.',
  confirm: 'تأكيد الاستيراد',
  cancel: 'إلغاء',
  status: {
    exported: 'تم تجهيز النسخة الاحتياطية للمشاركة.',
    exportFailed: 'تعذر إنشاء ملف النسخة الاحتياطية، حاول مجددًا.',
    shareFailed: 'تعذر مشاركة النسخة الاحتياطية، حاول مجددًا.',
    snapshotFailed: 'تعذر تجهيز البيانات، حاول مجددًا.',
    oversizedFile: 'حجم الملف كبير جدًا، اختر ملفًا أصغر من نسخة نبض.',
    readFailed: 'تعذر قراءة الملف، اختر ملفًا آخر وحاول مجددًا.',
    invalidFile: 'هذا الملف ليس نسخة احتياطية من نبض، اختر ملفًا آخر.',
    conflict: 'تتعارض النسخة الاحتياطية مع بيانات موجودة، اختر نسخة أخرى.',
    restoreFailed: 'تعذر استيراد البيانات، حاول مجددًا.',
    restored: (count: number) => `تم استيراد ${countLabel(count)} بنجاح.`,
  },
} as const

export function countLabel(count: number): string {
  return count === 1 ? 'سجل واحد' : `${count} سجلات`
}

function totalRestoreCount(counts: Record<BackupTable, number>): number {
  return BACKUP_TABLES.reduce((total, table) => total + counts[table], 0)
}

export function backupStatusMessage(status: BackupStatus): string {
  if (status.kind === 'exported') return BACKUP_COPY.status.exported
  if (status.kind === 'restored') {
    return BACKUP_COPY.status.restored(totalRestoreCount(status.counts))
  }
  if (status.kind === 'export_failed') {
    if (status.error === 'share_failed') return BACKUP_COPY.status.shareFailed
    if (status.error === 'snapshot_failed') return BACKUP_COPY.status.snapshotFailed
    return BACKUP_COPY.status.exportFailed
  }
  if (status.kind === 'restore_failed') {
    if (status.error !== 'unknown' && status.error.reason === 'conflict') {
      return BACKUP_COPY.status.conflict
    }
    return BACKUP_COPY.status.restoreFailed
  }
  if (status.error.kind === 'conflict') return BACKUP_COPY.status.conflict
  if (status.error.kind === 'snapshot_failed') return BACKUP_COPY.status.snapshotFailed
  if (status.error.kind === 'transport' && status.error.error === 'oversized_file') {
    return BACKUP_COPY.status.oversizedFile
  }
  if (status.error.kind === 'transport') return BACKUP_COPY.status.readFailed
  return BACKUP_COPY.status.invalidFile
}
