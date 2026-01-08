'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import useSWR from 'swr'
import { useAuth } from './AuthProvider'

interface CreditTier {
  id: 1 | 2 | 3
  credits: number
  priceCents: number
  priceDisplay: string
  discount: number
  perCreditCents: number
}

interface CreditState {
  balance: number
  totalPurchased: number
  hasEverPurchased: boolean
  tiers: CreditTier[]
  isLoading: boolean
}

interface CreditContextType extends CreditState {
  showCheckout: boolean
  openCheckout: () => void
  closeCheckout: () => void
  refreshCredits: () => void
}

const CreditContext = createContext<CreditContextType | null>(null)

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function CreditProvider({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth()
  const [showCheckout, setShowCheckout] = useState(false)

  const { data, isLoading, mutate } = useSWR(
    isLoggedIn ? '/api/credits' : null,
    fetcher,
    { refreshInterval: 30000 } // Refresh every 30 seconds
  )

  // Check URL params for success/cancel
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('credits') === 'success') {
      // Refresh credits after successful purchase
      mutate()
      // Clean up URL
      const url = new URL(window.location.href)
      url.searchParams.delete('credits')
      window.history.replaceState({}, '', url.toString())
    }
  }, [mutate])

  const openCheckout = useCallback(() => setShowCheckout(true), [])
  const closeCheckout = useCallback(() => setShowCheckout(false), [])
  const refreshCredits = useCallback(() => mutate(), [mutate])

  const value: CreditContextType = {
    balance: data?.balance ?? 0,
    totalPurchased: data?.totalPurchased ?? 0,
    hasEverPurchased: data?.hasEverPurchased ?? false,
    tiers: data?.tiers ?? [],
    isLoading,
    showCheckout,
    openCheckout,
    closeCheckout,
    refreshCredits,
  }

  return (
    <CreditContext.Provider value={value}>
      {children}
    </CreditContext.Provider>
  )
}

export function useCredits() {
  const context = useContext(CreditContext)
  if (!context) {
    throw new Error('useCredits must be used within a CreditProvider')
  }
  return context
}
