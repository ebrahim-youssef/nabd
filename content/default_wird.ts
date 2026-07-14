import type { WirdDefinition } from '@/types/wird'

// Starter wird used to seed a new user's first version until the onboarding questionnaire
// (NBD-6) builds a level-sized wird. The five obligatory prayers only — deliberately minimal.
//
// `import type` is erased at build, so this file still has zero runtime imports per the
// /content boundary (architecture.md).
export const DEFAULT_WIRD: WirdDefinition = {
  areas: [
    { id: 'prayers', label: 'الصلوات', order: 0 },
    { id: 'adhkar', label: 'الأذكار', order: 1 },
  ],
  items: [
    { id: 'fajr', areaId: 'prayers', label: 'الفجر', kind: 'checkbox' },
    { id: 'dhuhr', areaId: 'prayers', label: 'الظهر', kind: 'checkbox' },
    { id: 'asr', areaId: 'prayers', label: 'العصر', kind: 'checkbox' },
    { id: 'maghrib', areaId: 'prayers', label: 'المغرب', kind: 'checkbox' },
    { id: 'isha', areaId: 'prayers', label: 'العشاء', kind: 'checkbox' },
    // A dhikr counter item (NBD-9): tap 33× to complete.
    { id: 'tasbih', areaId: 'adhkar', label: 'سبحان الله (٣٣)', kind: 'counter', target: 33 },
  ],
}
