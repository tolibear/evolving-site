import type { Metadata } from 'next'
import ThemeToggle from '@/components/ThemeToggle'
import './globals.css'

export const metadata: Metadata = {
  title: 'Evolving Site',
  description: 'A self-evolving website where users suggest features and Claude implements them',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased">
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
          </footer>
        </div>
      </body>
    </html>
  )
}
