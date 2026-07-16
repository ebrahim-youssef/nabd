'use client'

import { Play, Square } from 'lucide-react'

import {
  playMomentSound,
  stopMomentSound,
  type NotificationMomentKind,
} from '@/lib/impure/notifications'

// The three notification moments (four sounds — الفجر has its own adhan), previewable so the
// user knows what each moment plays (NBD-42, r4 §5).
const PREVIEWS: {
  id: string
  label: string
  description: string
  kind: NotificationMomentKind
  prayerId?: string
}[] = [
  {
    id: 'before',
    label: 'اقتربت الصلاة',
    description: 'نغمة قصيرة قبل الأذان بربع ساعة.',
    kind: 'before',
  },
  {
    id: 'adhan',
    label: 'الأذان',
    description: 'أذان منصور الزهراني.',
    kind: 'adhan',
    prayerId: 'dhuhr',
  },
  {
    id: 'adhan-fajr',
    label: 'أذان الفجر',
    description: 'بلفظ «الصلاة خير من النوم».',
    kind: 'adhan',
    prayerId: 'fajr',
  },
  {
    id: 'iqama',
    label: 'الإقامة',
    description: 'إقامة الصلاة من المسجد الحرام.',
    kind: 'iqamah',
  },
]

const COPY = {
  title: 'أصوات التنبيهات',
  note: 'تُسمع هذه الأصوات والتطبيق مفتوح. مع التطبيق مغلقًا يصدر الجهاز صوته الافتراضي — حتى يكتمل نظام الإشعارات الخلفية.',
  stop: 'إيقاف',
} as const

// أصوات التنبيهات section (NBD-42): per-moment preview so the sounds are not a surprise at
// prayer time. Playback goes through the same playMomentSound the scheduler uses.
export function SoundSettings() {
  return (
    <section className="flex flex-col gap-3" data-testid="sound-settings">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-title text-primary">{COPY.title}</h2>
        <button
          type="button"
          onClick={() => stopMomentSound()}
          data-testid="sound-stop"
          className="border-border bg-surface text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-chip border px-3 py-1 text-small transition-colors"
        >
          <Square className="size-3.5" aria-hidden />
          {COPY.stop}
        </button>
      </div>

      <ul className="flex flex-col gap-2">
        {PREVIEWS.map((preview) => (
          <li
            key={preview.id}
            className="border-border bg-surface shadow-card-sm flex items-center justify-between gap-3 rounded-card border p-3"
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-body text-foreground font-medium">{preview.label}</span>
              <span className="text-muted-foreground text-small">{preview.description}</span>
            </span>
            <button
              type="button"
              onClick={() => playMomentSound(preview.kind, preview.prayerId)}
              aria-label={`تشغيل ${preview.label}`}
              data-testid={`sound-preview-${preview.id}`}
              className="border-primary/40 bg-primary/10 text-primary hover:bg-primary hover:text-on-primary flex size-10 shrink-0 items-center justify-center rounded-full border transition-colors"
            >
              <Play className="size-4.5" aria-hidden />
            </button>
          </li>
        ))}
      </ul>

      <p className="text-muted-foreground text-label">{COPY.note}</p>
    </section>
  )
}
