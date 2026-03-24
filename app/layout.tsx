import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { AnimatedBackground } from '@/components/tripsync/animated-background'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

export const metadata: Metadata = {
  title: 'OutTheGC',
  description: 'finally get your trip out of the gc',
  generator: 'v0.app',
  icons: {
    icon: '/outthegc-mark.svg',
    shortcut: '/outthegc-mark.svg',
    apple: '/outthegc-mark.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased relative">
        <AnimatedBackground variant="subpage" />
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
