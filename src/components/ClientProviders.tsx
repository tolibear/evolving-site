'use client'

import dynamic from 'next/dynamic'
import type { ReactNode } from 'react'

// Dynamically import the actual providers implementation
const ClientProvidersImpl = dynamic(
  () => import('./ClientProvidersImpl').then(mod => ({ default: mod.ClientProvidersImpl })),
  { ssr: false }
)

interface ClientProvidersProps {
  children: ReactNode
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return <ClientProvidersImpl>{children}</ClientProvidersImpl>
}
