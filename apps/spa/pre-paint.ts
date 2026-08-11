import { APPEARANCE_INIT_SCRIPT } from './src/app/appearance'

const DOCUMENT_HEAD = '<head>'

// Fixed build-time injection: applies the stored theme/mode before the SPA module runs, so
// there is no flash of the default appearance. Deliberately a static string replacement with
// no user- or DOM-derived interpolation. Injecting at the start of <head> is important:
// Vite moves the production module script into <head>, so placing this beside the source
// module tag would run too late after a production transform.
export function injectPrePaintScript(html: string) {
  return html.replace(
    DOCUMENT_HEAD,
    `${DOCUMENT_HEAD}\n    <script>${APPEARANCE_INIT_SCRIPT}</script>`,
  )
}
