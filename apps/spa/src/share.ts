import { logger } from './logger'

// Best-effort sharing: the platform share sheet where there is one, the clipboard otherwise. The
// return value says how the text left the app so the caller can phrase its confirmation — the share
// sheet is its own feedback, a silent clipboard write is not.
//
// The full set of outcomes, because only one of them shows the user anything:
//   share sheet available, user completes  -> 'shared'  (the sheet already told them)
//   share sheet available, user cancels    -> 'failed'  (a cancel is a decision, not a fault: silent)
//   no share sheet, clipboard write works  -> 'copied'  (the only case that needs a confirmation)
//   no share sheet, clipboard refused      -> 'failed'  (insecure context or denied permission)
//   no clipboard object at all             -> 'failed'  (never throws into the caller)
export type ShareOutcome = 'shared' | 'copied' | 'failed'

export async function shareText(text: string): Promise<ShareOutcome> {
  try {
    if (typeof navigator.share === 'function') {
      await navigator.share({ text })
      return 'shared'
    }
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch (cause) {
    // A cancelled share sheet rejects with AbortError. That is the user's choice, so it is not worth
    // a breadcrumb; anything else means the button genuinely did nothing and is.
    if (!(cause instanceof Error) || cause.name !== 'AbortError') {
      logger.warn('share.shareText failed', {
        name: cause instanceof Error ? cause.name : 'unknown',
      })
    }
    return 'failed'
  }
}
