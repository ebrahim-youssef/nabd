import type { AdhkarCategory } from './adhkar'

export const DAILY_ADHKAR_CATEGORY: AdhkarCategory = {
  id: 'daily',
  title: 'الأذكار اليومية',
  items: [
    {
      id: 'istighfar',
      text: 'أستغفر الله العظيم',
      repeat: 10,
    },
    {
      id: 'habibatan',
      text: 'سبحان الله وبحمده، سبحان الله العظيم',
      repeat: 10,
    },
    {
      id: 'baqiyat',
      text: 'سبحان الله والحمد لله ولا إله إلا الله والله أكبر',
      repeat: 10,
    },
    {
      id: 'tahlil',
      text: 'لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير',
      repeat: 10,
    },
    {
      id: 'salawat',
      text: 'اللهم صلِّ وسلِّم على نبينا محمد',
      repeat: 10,
    },
  ],
}
