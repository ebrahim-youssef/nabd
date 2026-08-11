import { useEffect } from 'react'

// Only the public landing route is indexable (ADR-0014). Non-public route surfaces add a
// live robots directive while mounted and restore any pre-existing directive on cleanup.
export function useNoindex() {
  useEffect(() => {
    let meta = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')
    const previousContent = meta?.content
    const created = !meta

    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'robots'
      document.head.appendChild(meta)
    }

    meta.content = 'noindex, nofollow'

    return () => {
      const current = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')
      if (created && current) {
        document.head.removeChild(current)
      } else if (current && previousContent !== undefined) {
        current.content = previousContent
      }
    }
  }, [])
}
