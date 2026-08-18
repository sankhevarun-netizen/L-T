import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

import './globals.css'
import { AppShell } from '@/components/layout/app-shell'
import { BRAND } from '@/config/brand'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: `${BRAND.vendor} ${BRAND.product} — ${BRAND.appName}`,
  description: `${BRAND.tagline} ${BRAND.oneLiner}`,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
