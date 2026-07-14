import type { Metadata, Viewport } from 'next'
import { Amiri, Aref_Ruqaa, Reem_Kufi, Tajawal } from 'next/font/google'
import './globals.css'

import { UpdateNotifier } from '@/components/shared/UpdateNotifier'
import { SyncProvider } from '@/features/sync/components/SyncProvider'
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site'

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
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    // Child pages set their own title; this frames it with the brand.
    template: `%s · نبض`,
  },
  description: SITE_DESCRIPTION,
  applicationName: 'نبض',
  keywords: ['ورد', 'أذكار', 'صلاة', 'محاسبة', 'wird', 'adhkar', 'nabd'],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'ar_AR',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
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
