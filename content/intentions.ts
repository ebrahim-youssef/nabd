// The intentions (نوايا) reference library (NBD-13): for each deed, the intentions worth
// bringing to mind before it — النية الحاضرة تُحوِّل العادة عبادة. Authored static data —
// zero runtime imports per the /content boundary (architecture.md).

export type DeedIntention = {
  id: string
  deed: string
  intention: string
}

export const INTENTIONS_LIBRARY: DeedIntention[] = [
  {
    id: 'prayer',
    deed: 'الصلاة',
    intention:
      'أنوي امتثال أمر الله وإقامة ذكره، والوقوف بين يديه شاكرًا خاشعًا، وأن تكون صلاتي نورًا لي وناهيةً عن الفحشاء والمنكر.',
  },
  {
    id: 'quran',
    deed: 'قراءة القرآن',
    intention:
      'أنوي التعبّد لله بتلاوة كلامه، وتدبّر آياته والعمل بها، والاستشفاء به، وأن يكون حجةً لي لا عليّ.',
  },
  {
    id: 'dhikr',
    deed: 'الذكر',
    intention:
      'أنوي عمارة قلبي بذكر الله وطمأنينته، وموافقة أمره ﴿اذْكُرُوا اللَّهَ ذِكْرًا كَثِيرًا﴾، وأن يذكرني الله فيمن عنده.',
  },
  {
    id: 'fasting',
    deed: 'الصيام',
    intention:
      'أنوي التقرّب إلى الله بالإمساك عمّا يحب الإمساك عنه، وتهذيب نفسي وكسر شهوتها، ومواساة المحتاج، وابتغاء التقوى.',
  },
  {
    id: 'sadaqah',
    deed: 'الصدقة',
    intention:
      'أنوي شكر الله على ما رزق، وتطهير مالي ونفسي من الشحّ، وإدخال السرور على المحتاج، وابتغاء وجه الله وحده.',
  },
  {
    id: 'knowledge',
    deed: 'طلب العلم',
    intention:
      'أنوي رفع الجهل عن نفسي وعن غيري، وإحياء ما اندرس من الدين، والعمل بما أتعلّم، وسلوك طريقٍ يسهّل الله به إلى الجنة طريقًا.',
  },
  {
    id: 'kinship',
    deed: 'صلة الرحم',
    intention:
      'أنوي امتثال أمر الله بوصل ما أمر به أن يوصل، وطلب البركة في العمر والرزق، وإدخال السرور على الأهل والقرابة.',
  },
]
