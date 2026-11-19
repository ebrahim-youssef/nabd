import { BACKUP_COPY } from '../backup/copy'
import { COPY as PRAYER_TIMES_COPY } from '../prayer-times/copy'
import { QADA_COPY } from '../qada/copy'
import { shellCopy } from '../shell/copy'
import { STATS_COPY } from '../stats/copy'

export const MORE_COPY = {
  title: shellCopy.nav.more,
  rows: [
    { label: PRAYER_TIMES_COPY.pageTitle, href: '/prayer-times' },
    { label: STATS_COPY.pageTitle, href: '/stats' },
    { label: QADA_COPY.pageTitle, href: '/qada' },
    { label: 'النيات', href: '/niyyat' },
    { label: 'المكتبات', href: '/libraries' },
    { label: 'الإعدادات', href: '/settings' },
    { label: BACKUP_COPY.title, href: '/backup' },
  ],
} as const
