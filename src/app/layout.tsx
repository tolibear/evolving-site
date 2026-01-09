import type { Metadata } from 'next'
import { TerminalProvider, TerminalContainer, TerminalView } from '@/components/terminal'
import { AuthProvider } from '@/components/AuthProvider'
import { CreditProvider } from '@/components/CreditProvider'
import { ThemeProvider } from '@/components/ThemeProvider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SidebarDrawer, ChatWindow } from '@/components/ClientComponents'
import { SidebarContent } from '@/components/sidebar'
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
        <ThemeProvider>
          <TooltipProvider delayDuration={200}>
          <AuthProvider>
            <CreditProvider>
              <TerminalProvider>
              <TerminalContainer>
                {/* Main body - the evolving canvas */}
                <div className="min-h-screen">
                  {/* Main content area - the blank canvas */}
                  <main className="p-4">
                    <div className="max-w-7xl mx-auto">
                      {children}
                    </div>
                  </main>
                </div>

                {/* Chat window (Windows 96 style) on left side */}
                <ChatWindow />

                {/* Sidebar drawer with all control panel components */}
                <SidebarDrawer
                  terminalSlot={<TerminalView className="h-full" />}
                >
                  <SidebarContent />
                </SidebarDrawer>
              </TerminalContainer>
            </TerminalProvider>
            </CreditProvider>
          </AuthProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
