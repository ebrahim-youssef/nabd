import { ImageResponse } from 'next/og'

// Generated Open Graph image (NBD-14), 1200×630. Uses only the brand mark + Latin wordmark so
// it needs no embedded Arabic font. Inline styles are required by Satori (next/og), which is
// why the project's "no inline styles" rule does not apply here.
export const alt = 'nabd — daily wird companion'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0e5a5a',
        color: '#ffffff',
      }}
    >
      <svg width="240" height="240" viewBox="0 0 512 512" fill="none">
        <path
          d="M64 256 H168 L200 168 L256 344 L312 200 L344 256 H448"
          stroke="#ffffff"
          strokeWidth="26"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div style={{ fontSize: 104, fontWeight: 700, marginTop: 16, letterSpacing: -2 }}>nabd</div>
      <div style={{ fontSize: 34, opacity: 0.85, marginTop: 4 }}>daily wird companion</div>
    </div>,
    { ...size },
  )
}
