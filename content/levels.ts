import type { WirdDefinition, WirdItem } from '@/types/wird'

// The wird levels the onboarding questionnaire (NBD-6) places a new user in. Levels define
// the difficulty and time commitment of the daily wird (spec §1). Three levels ship since
// NBD-26; level 4 stays out of scope (docs/backlog.md "Later").
//
// Item ids are stable across levels (fajr, istighfar, …) so statistics and e2e selectors keep
// working whichever level seeded the wird. Voluntary (تطوّع) deeds and periodic صيام use the
// ADR-0008 vocabulary. `import type` is erased at build, so this file keeps zero runtime
// imports per the /content boundary (architecture.md).

export type WirdLevel = {
  id: 'level-1' | 'level-2' | 'level-3'
  // Display order and questionnaire rank (higher = more demanding).
  rank: number
  title: string
  description: string
  wird: WirdDefinition
}

export type LevelId = WirdLevel['id']

const AREAS = [
  { id: 'prayers', label: 'الصلوات', order: 0 },
  { id: 'quran', label: 'القرآن', order: 1 },
  { id: 'adhkar', label: 'الأذكار', order: 2 },
  { id: 'tatawwu', label: 'التطوّع', order: 3 },
]

// The five prayers in performance order (NBD-40, r4 §6). With `withSunnahAndAdhkar` (levels
// 2–3) every prayer becomes a sequence: سنة قبلية ← الصلاة ← أذكار الصلاة ← سنة بعدية, so the
// user checks items in the order they perform them. The confirmed rawatib set: الفجر ٢ قبل،
// الظهر ٤ قبل و٢ بعد، المغرب ٢ بعد، العشاء ٢ بعد (العصر لا راتبة مؤكدة له).
const PRAYERS: {
  id: string
  label: string
  before: string | null
  after: string | null
}[] = [
  { id: 'fajr', label: 'الفجر', before: 'ركعتان', after: null },
  { id: 'dhuhr', label: 'الظهر', before: '٤ ركعات', after: 'ركعتان' },
  { id: 'asr', label: 'العصر', before: null, after: null },
  { id: 'maghrib', label: 'المغرب', before: null, after: 'ركعتان' },
  { id: 'isha', label: 'العشاء', before: null, after: 'ركعتان' },
]

function prayerItems(inCongregation: boolean, withSunnahAndAdhkar = false): WirdItem[] {
  const suffix = inCongregation ? ' (جماعة)' : ''
  const items: WirdItem[] = []
  for (const prayer of PRAYERS) {
    if (withSunnahAndAdhkar && prayer.before) {
      items.push({
        id: `rawatib-${prayer.id}-before`,
        areaId: 'prayers',
        label: `سنة ${prayer.label} القبلية`,
        kind: 'checkbox',
        minimum: prayer.before,
      })
    }
    items.push({
      id: prayer.id,
      areaId: 'prayers',
      label: `${prayer.label}${suffix}`,
      kind: 'checkbox',
    })
    if (withSunnahAndAdhkar) {
      items.push({
        id: `prayer-adhkar-${prayer.id}`,
        areaId: 'prayers',
        label: `أذكار الصلاة (${prayer.label})`,
        kind: 'checkbox',
      })
    }
    if (withSunnahAndAdhkar && prayer.after) {
      items.push({
        id: `rawatib-${prayer.id}-after`,
        areaId: 'prayers',
        label: `سنة ${prayer.label} البعدية`,
        kind: 'checkbox',
        minimum: prayer.after,
      })
    }
  }
  return items
}

// The five daily adhkar counters shared by every level — only the target grows.
function dhikrCounters(target: number): WirdItem[] {
  return [
    {
      id: 'istighfar',
      areaId: 'adhkar',
      label: 'الاستغفار — أستغفر الله العظيم',
      kind: 'counter',
      target,
    },
    {
      id: 'habibatan',
      areaId: 'adhkar',
      label: 'الحبيبتان — سبحان الله وبحمده، سبحان الله العظيم',
      kind: 'counter',
      target,
    },
    {
      id: 'baqiyat',
      areaId: 'adhkar',
      label: 'الباقيات الصالحات — سبحان الله والحمد لله ولا إله إلا الله والله أكبر',
      kind: 'counter',
      target,
    },
    {
      id: 'tahlil',
      areaId: 'adhkar',
      label: 'التهليل — لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير',
      kind: 'counter',
      target,
    },
    {
      id: 'salawat',
      areaId: 'adhkar',
      label: 'الصلاة على النبي ﷺ',
      kind: 'counter',
      target,
    },
  ]
}

const MORNING_EVENING: WirdItem[] = [
  { id: 'morning-adhkar', areaId: 'adhkar', label: 'أذكار الصباح', kind: 'checkbox' },
  { id: 'evening-adhkar', areaId: 'adhkar', label: 'أذكار المساء', kind: 'checkbox' },
]

// Voluntary deeds (ADR-0008): قيام + ضحى with minimums; صيام as a periodic goal.
function tatawwuItems(qiyamMinimum: string, fasting: WirdItem): WirdItem[] {
  return [
    {
      id: 'qiyam',
      areaId: 'tatawwu',
      label: 'قيام الليل',
      kind: 'checkbox',
      optional: true,
      minimum: qiyamMinimum,
    },
    {
      id: 'duha',
      areaId: 'tatawwu',
      label: 'صلاة الضحى',
      kind: 'checkbox',
      optional: true,
      minimum: 'ركعتان',
    },
    fasting,
  ]
}

const FASTING_MONTHLY: WirdItem = {
  id: 'fasting',
  areaId: 'tatawwu',
  label: 'صيام ثلاثة أيام من الشهر',
  kind: 'checkbox',
  optional: true,
  schedule: { type: 'monthly-goal', target: 3 },
}

// الإثنين (1) والخميس (4).
const FASTING_MON_THU: WirdItem = {
  id: 'fasting',
  areaId: 'tatawwu',
  label: 'صيام الإثنين والخميس',
  kind: 'checkbox',
  optional: true,
  schedule: { type: 'weekdays', days: [1, 4] },
}

const LEVEL_1_WIRD: WirdDefinition = {
  areas: AREAS,
  items: [
    ...prayerItems(false),
    { id: 'quran-pages', areaId: 'quran', label: 'قراءة صفحتين من القرآن', kind: 'checkbox' },
    ...MORNING_EVENING,
    ...dhikrCounters(10),
    ...tatawwuItems('ركعة واحدة على الأقل', FASTING_MONTHLY),
  ],
}

const LEVEL_2_WIRD: WirdDefinition = {
  areas: AREAS,
  items: [
    ...prayerItems(true, true),
    { id: 'quran-hizb', areaId: 'quran', label: 'قراءة حزب من القرآن', kind: 'checkbox' },
    ...MORNING_EVENING,
    ...dhikrCounters(50),
    ...tatawwuItems('٣ ركعات على الأقل', FASTING_MONTHLY),
  ],
}

const LEVEL_3_WIRD: WirdDefinition = {
  areas: AREAS,
  items: [
    ...prayerItems(true, true),
    {
      id: 'ghair-rawatib',
      areaId: 'prayers',
      label: 'غير الرواتب',
      kind: 'checkbox',
      minimum: '٤ قبل العصر، ٢ قبل المغرب، ٢ قبل العشاء، والظهر ٤ قبلها و٤ بعدها',
    },
    { id: 'quran-juz', areaId: 'quran', label: 'قراءة جزء من القرآن', kind: 'checkbox' },
    ...MORNING_EVENING,
    ...dhikrCounters(100),
    ...tatawwuItems('٣ ركعات على الأقل', FASTING_MON_THU),
  ],
}

export const WIRD_LEVELS: WirdLevel[] = [
  {
    id: 'level-1',
    rank: 1,
    title: 'البداية',
    description: 'الفرائض مع وردٍ يسير من القرآن والأذكار وتطوّعٍ خفيف — نحو ربع ساعة يوميًا.',
    wird: LEVEL_1_WIRD,
  },
  {
    id: 'level-2',
    rank: 2,
    title: 'المداومة',
    description:
      'الجماعة والرواتب وأذكار بعد الصلاة مع حزبٍ من القرآن وأذكارٍ أوسع — نحو ساعة يوميًا.',
    wird: LEVEL_2_WIRD,
  },
  {
    id: 'level-3',
    rank: 3,
    title: 'الاجتهاد',
    description:
      'الجماعة والرواتب وغيرها مع جزءٍ من القرآن ومئات الأذكار وصيام الإثنين والخميس — نحو ساعتين يوميًا.',
    wird: LEVEL_3_WIRD,
  },
]
