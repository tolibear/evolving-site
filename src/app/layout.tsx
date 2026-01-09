import type { Metadata } from 'next'
import { ClientProviders } from '@/components/ClientProviders'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Evolving Site',
    template: '%s | Evolving Site',
  },
  description: 'Suggest features, vote, and watch Claude implement the winners. A self-evolving website powered by AI.',
  keywords: ['AI', 'Claude', 'feature voting', 'crowdsourced development', 'Ralph Wiggum', 'evolving site'],
  authors: [{ name: 'Evolving Site' }],
  creator: 'Evolving Site',
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://evolving-site.vercel.app'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Evolving Site',
    title: 'Evolving Site',
    description: 'Suggest features, vote, and watch Claude implement the winners. A self-evolving website powered by AI.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Evolving Site',
    description: 'Suggest features, vote, and watch Claude implement the winners. A self-evolving website powered by AI.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  )
}
