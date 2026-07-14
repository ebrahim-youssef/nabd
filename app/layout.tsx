import type { Metadata, Viewport } from 'next'
import { Amiri, Aref_Ruqaa, Reem_Kufi, Tajawal } from 'next/font/google'
import './globals.css'

import { UpdateNotifier } from '@/components/shared/UpdateNotifier'
import { SyncProvider } from '@/features/sync/components/SyncProvider'

// Body — Tajawal (both modes)
const tajawal = Tajawal({
  variable: '--font-tajawal',
  subsets: ['arabic'],
  weight: ['400', '500', '700'],
  display: 'swap',
})

// Scripture — Amiri (āyāt / aḥādīth)
const amiri = Amiri({
  variable: '--font-amiri',
  subsets: ['arabic'],
  weight: ['400', '700'],
  display: 'swap',
})

// Display, Classic mode — Aref Ruqaa (Ottoman Ruqʿah)
const arefRuqaa = Aref_Ruqaa({
  variable: '--font-aref-ruqaa',
  subsets: ['arabic'],
  weight: ['400', '700'],
  display: 'swap',
})

// Display, Modern mode — Reem Kufi (geometric Kufi)
const reemKufi = Reem_Kufi({
  variable: '--font-reem-kufi',
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const fontVariables = `${tajawal.variable} ${amiri.variable} ${arefRuqaa.variable} ${reemKufi.variable}`

export const metadata: Metadata = {
  title: 'نبض · nabd',
  description: 'رفيقك اليوميّ للوِرد — صلاة وأذكار ونيّات ومحاسبة.',
}

export const viewport: Viewport = {
  themeColor: '#0e5a5a',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      data-mode="classic"
      data-theme="light"
      className={`${fontVariables} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SyncProvider>{children}</SyncProvider>
        <UpdateNotifier />
      </body>
    </html>
  )
}
