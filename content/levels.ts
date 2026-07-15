import type { WirdDefinition } from '@/types/wird'

// The wird levels the onboarding questionnaire (NBD-6) places a new user in. Levels define
// the difficulty and time commitment of the daily wird (spec §1). Four levels are planned;
// the MVP launches with two (levels 3 and 4 are out of scope — docs/backlog.md "Later").
//
// Item ids are stable across levels (fajr, dhuhr, …) so statistics and e2e selectors keep
// working whichever level seeded the wird. `import type` is erased at build, so this file
// keeps zero runtime imports per the /content boundary (architecture.md).

export type WirdLevel = {
  id: 'level-1' | 'level-2'
  // Display order and questionnaire rank (higher = more demanding).
  rank: number
  title: string
  description: string
  wird: WirdDefinition
}

export type LevelId = WirdLevel['id']

const LEVEL_1_WIRD: WirdDefinition = {
  areas: [
    { id: 'prayers', label: 'الصلوات', order: 0 },
    { id: 'quran', label: 'القرآن', order: 1 },
    { id: 'adhkar', label: 'الأذكار', order: 2 },
  ],
  items: [
    { id: 'fajr', areaId: 'prayers', label: 'الفجر', kind: 'checkbox' },
    { id: 'dhuhr', areaId: 'prayers', label: 'الظهر', kind: 'checkbox' },
    { id: 'asr', areaId: 'prayers', label: 'العصر', kind: 'checkbox' },
    { id: 'maghrib', areaId: 'prayers', label: 'المغرب', kind: 'checkbox' },
    { id: 'isha', areaId: 'prayers', label: 'العشاء', kind: 'checkbox' },
    { id: 'quran-pages', areaId: 'quran', label: 'قراءة صفحتين من القرآن', kind: 'checkbox' },
    { id: 'morning-adhkar', areaId: 'adhkar', label: 'أذكار الصباح', kind: 'checkbox' },
    { id: 'evening-adhkar', areaId: 'adhkar', label: 'أذكار المساء', kind: 'checkbox' },
    { id: 'tasbih', areaId: 'adhkar', label: 'سبحان الله (٣٣)', kind: 'counter', target: 33 },
  ],
}

const LEVEL_2_WIRD: WirdDefinition = {
  areas: [
    { id: 'prayers', label: 'الصلوات', order: 0 },
    { id: 'quran', label: 'القرآن', order: 1 },
    { id: 'adhkar', label: 'الأذكار', order: 2 },
  ],
  items: [
    { id: 'fajr', areaId: 'prayers', label: 'الفجر', kind: 'checkbox' },
    { id: 'dhuhr', areaId: 'prayers', label: 'الظهر', kind: 'checkbox' },
    { id: 'asr', areaId: 'prayers', label: 'العصر', kind: 'checkbox' },
    { id: 'maghrib', areaId: 'prayers', label: 'المغرب', kind: 'checkbox' },
    { id: 'isha', areaId: 'prayers', label: 'العشاء', kind: 'checkbox' },
    { id: 'rawatib', areaId: 'prayers', label: 'السنن الرواتب', kind: 'checkbox' },
    { id: 'witr', areaId: 'prayers', label: 'الوتر', kind: 'checkbox' },
    { id: 'quran-hizb', areaId: 'quran', label: 'قراءة حزب من القرآن', kind: 'checkbox' },
    { id: 'morning-adhkar', areaId: 'adhkar', label: 'أذكار الصباح', kind: 'checkbox' },
    { id: 'evening-adhkar', areaId: 'adhkar', label: 'أذكار المساء', kind: 'checkbox' },
    { id: 'tasbih', areaId: 'adhkar', label: 'سبحان الله (٣٣)', kind: 'counter', target: 33 },
    {
      id: 'istighfar',
      areaId: 'adhkar',
      label: 'الاستغفار (١٠٠)',
      kind: 'counter',
      target: 100,
    },
  ],
}

export const WIRD_LEVELS: WirdLevel[] = [
  {
    id: 'level-1',
    rank: 1,
    title: 'البداية',
    description: 'المحافظة على الفرائض مع وردٍ يسير من القرآن والأذكار — نحو ربع ساعة يوميًا.',
    wird: LEVEL_1_WIRD,
  },
  {
    id: 'level-2',
    rank: 2,
    title: 'المداومة',
    description: 'الفرائض والرواتب والوتر مع حزبٍ من القرآن وأذكارٍ أوسع — نحو ساعة يوميًا.',
    wird: LEVEL_2_WIRD,
  },
]
