import { landingCopy } from '@nabd/shared'

const arabicNumberFormatter = new Intl.NumberFormat('ar-EG', { useGrouping: false })

export function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <a className="font-display text-title font-bold text-primary" href="#main-content">
          {landingCopy.appName}
        </a>
        <span aria-hidden="true" className="text-title text-gold">
          ✦
        </span>
      </header>

      <main id="main-content">
        <section
          aria-labelledby="landing-title"
          className="mx-auto grid max-w-5xl items-center gap-8 px-4 pb-12 pt-8 sm:px-6 sm:pb-16 sm:pt-12 lg:grid-cols-2 lg:gap-12 lg:px-8 lg:pb-20 lg:pt-16"
        >
          <div className="text-start">
            <h1
              className="m-0 max-w-xl font-display text-display font-bold text-primary-deep"
              id="landing-title"
            >
              {landingCopy.tagline}
            </h1>
            <p className="mt-5 max-w-xl text-body text-muted-foreground">
              {landingCopy.description}
            </p>
          </div>

          <div
            aria-hidden="true"
            className="relative mx-auto flex aspect-square w-full max-w-sm items-center justify-center rounded-ring bg-primary shadow-card"
          >
            <img alt="" aria-hidden="true" className="size-full" src="/icon-foreground.svg" />
          </div>
        </section>

        <div className="bg-surface-2 py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <ul className="grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {landingCopy.valueProps.map((valueProp, index) => (
                <li
                  className="rounded-card border border-border bg-surface p-5 text-start text-body text-foreground shadow-card-sm sm:p-6"
                  key={valueProp}
                >
                  <span
                    aria-hidden="true"
                    className="mb-4 flex size-8 items-center justify-center rounded-icon bg-primary text-small font-bold text-on-primary"
                  >
                    {arabicNumberFormatter.format(index + 1)}
                  </span>
                  {valueProp}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>

      <footer className="border-t border-border bg-surface py-6 text-center text-small text-muted-foreground">
        <p className="m-0">{landingCopy.appName}</p>
      </footer>
    </div>
  )
}
