import type { Metadata } from 'next'
import ThemeToggle from '@/components/ThemeToggle'
import ActiveUserCounter from '@/components/ActiveUserCounter'
import { TerminalProvider, TerminalContainer } from '@/components/terminal'
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
        <TerminalProvider>
          <TerminalContainer>
            <div className="max-w-3xl mx-auto px-4 py-8">
              {/* Header */}
              <header className="text-center mb-8 relative">
                <div className="absolute right-0 top-0">
                  <ThemeToggle />
                </div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Evolving Site
                </h1>
                <p className="text-muted">
                  Suggest features, vote, and watch Claude implement the winners
                </p>
              </header>

              {/* Main content */}
              <main>{children}</main>

              {/* Footer */}
              <footer className="mt-16 pt-8 border-t border-neutral-200 dark:border-neutral-700 text-center text-sm text-muted">
                <p>Powered by Claude + Ralph Wiggum</p>
                <div className="mt-2 flex justify-center">
                  <ActiveUserCounter />
                </div>
              </footer>
            </div>
          </TerminalContainer>
        </TerminalProvider>
      </body>
    </html>
  )
}
