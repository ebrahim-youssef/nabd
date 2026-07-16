// Best-effort share: the native share sheet where the platform has one, clipboard fallback
// otherwise. Returns how the text left the app so the UI can phrase its confirmation.
export async function shareText(text: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (typeof navigator.share === 'function') {
      await navigator.share({ text })
      return 'shared'
    }
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'failed'
  }
}
