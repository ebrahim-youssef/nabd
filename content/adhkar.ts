// The adhkar reference library (NBD-12): browsable independent of the user's wird. Authored
// static data — zero runtime imports per the /content boundary (architecture.md). Texts are
// the widely-transmitted formulas with their sources; repeat counts follow the narrations.

export type Dhikr = {
  id: string
  text: string
  // Recommended repetitions per the narration. 1 when the dhikr is said once.
  repeat: number
  source: string
}

export type AdhkarCategory = {
  id: string
  title: string
  items: Dhikr[]
}

export const ADHKAR_LIBRARY: AdhkarCategory[] = [
  {
    id: 'morning',
    title: 'أذكار الصباح',
    items: [
      {
        id: 'morning-sayyid-istighfar',
        text: 'اللهم أنت ربي لا إله إلا أنت، خلقتني وأنا عبدك، وأنا على عهدك ووعدك ما استطعت، أعوذ بك من شر ما صنعت، أبوء لك بنعمتك علي، وأبوء بذنبي فاغفر لي، فإنه لا يغفر الذنوب إلا أنت.',
        repeat: 1,
        source: 'سيد الاستغفار — رواه البخاري',
      },
      {
        id: 'morning-asbahna',
        text: 'أصبحنا وأصبح الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير.',
        repeat: 1,
        source: 'رواه مسلم',
      },
      {
        id: 'morning-ikhlas',
        text: 'قل هو الله أحد، والمعوذتان (قل أعوذ برب الفلق، قل أعوذ برب الناس).',
        repeat: 3,
        source: 'رواه أبو داود والترمذي',
      },
      {
        id: 'morning-bika-asbahna',
        text: 'اللهم بك أصبحنا، وبك أمسينا، وبك نحيا، وبك نموت، وإليك النشور.',
        repeat: 1,
        source: 'رواه الترمذي',
      },
    ],
  },
  {
    id: 'evening',
    title: 'أذكار المساء',
    items: [
      {
        id: 'evening-amsayna',
        text: 'أمسينا وأمسى الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير.',
        repeat: 1,
        source: 'رواه مسلم',
      },
      {
        id: 'evening-ayat-kursi',
        text: 'آية الكرسي: ﴿اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ…﴾ [البقرة: ٢٥٥].',
        repeat: 1,
        source: 'رواه الحاكم وصححه',
      },
      {
        id: 'evening-audhu-kalimat',
        text: 'أعوذ بكلمات الله التامات من شر ما خلق.',
        repeat: 3,
        source: 'رواه مسلم',
      },
      {
        id: 'evening-bika-amsayna',
        text: 'اللهم بك أمسينا، وبك أصبحنا، وبك نحيا، وبك نموت، وإليك المصير.',
        repeat: 1,
        source: 'رواه الترمذي',
      },
    ],
  },
  {
    id: 'after-prayer',
    title: 'أذكار بعد الصلاة',
    items: [
      {
        id: 'after-prayer-istighfar',
        text: 'أستغفر الله.',
        repeat: 3,
        source: 'رواه مسلم',
      },
      {
        id: 'after-prayer-allahumma-salam',
        text: 'اللهم أنت السلام ومنك السلام، تباركت يا ذا الجلال والإكرام.',
        repeat: 1,
        source: 'رواه مسلم',
      },
      {
        id: 'after-prayer-tasbih',
        text: 'سبحان الله (٣٣)، الحمد لله (٣٣)، الله أكبر (٣٣)، وتمام المائة: لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير.',
        repeat: 1,
        source: 'رواه مسلم',
      },
      {
        id: 'after-prayer-ayat-kursi',
        text: 'آية الكرسي: ﴿اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ…﴾ [البقرة: ٢٥٥].',
        repeat: 1,
        source: 'رواه النسائي في الكبرى',
      },
    ],
  },
  {
    id: 'sleep',
    title: 'أذكار النوم',
    items: [
      {
        id: 'sleep-bismika',
        text: 'باسمك اللهم أموت وأحيا.',
        repeat: 1,
        source: 'رواه البخاري',
      },
      {
        id: 'sleep-ayat-kursi',
        text: 'آية الكرسي: ﴿اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ…﴾ [البقرة: ٢٥٥].',
        repeat: 1,
        source: 'رواه البخاري',
      },
      {
        id: 'sleep-allahumma-qini',
        text: 'اللهم قني عذابك يوم تبعث عبادك.',
        repeat: 3,
        source: 'رواه أبو داود والترمذي',
      },
    ],
  },
]
