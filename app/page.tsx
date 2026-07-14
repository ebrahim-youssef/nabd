import { Button } from '@/components/ui/button'

// Temporary token-preview surface for NBD-3 (design tokens). Verifies the palette, the three
// faces, radii, and RTL render correctly before real screens land. Replaced by the app shell
// in a later ticket.
const SWATCHES = [
  { name: 'primary', className: 'bg-primary text-on-primary' },
  { name: 'accent', className: 'bg-accent text-accent-foreground' },
  { name: 'gold', className: 'bg-gold text-on-primary' },
  { name: 'surface-2', className: 'bg-surface-2 text-foreground' },
] as const

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-display text-primary">نبض</h1>
        <p className="text-muted-foreground text-body">
          رفيقك اليوميّ للوِرد — صلاة وأذكار ونيّات ومحاسبة.
        </p>
      </header>

      <p className="font-scripture text-scripture text-foreground">
        ﴿ إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَوْقُوتًا ﴾
      </p>

      <section className="grid grid-cols-2 gap-3">
        {SWATCHES.map((s) => (
          <div key={s.name} className={`rounded-card p-4 text-small shadow-card-sm ${s.className}`}>
            {s.name}
          </div>
        ))}
      </section>

      <div className="flex flex-wrap gap-3">
        <Button>تمّ</Button>
        <Button variant="outline">لاحقًا</Button>
        <Button variant="secondary">قضاء</Button>
      </div>
    </main>
  )
}
