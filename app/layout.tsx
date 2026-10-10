import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { WhatsAppFloat } from '@/components/whatsapp-float'
import './globals.css'

export const metadata: Metadata = {
  title: 'Barokah Tour and Travel | Jelajahi Indonesia',
  description: 'Event wisata, transportasi, dan perjalanan terpercaya dari Sukabumi.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/papiconbarokahevent.png',
        type: 'image/png',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        {children}
        <WhatsAppFloat />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
