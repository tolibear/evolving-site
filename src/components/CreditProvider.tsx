'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import useSWR from 'swr'
import { useAuth } from './AuthProvider'
import { fetcher } from '@/lib/utils'

interface CreditTier {
  id: 1 | 2 | 3
  credits: number
  priceCents: number
  priceDisplay: string
  discount: number
  perCreditCents: number
}

interface BoostAnimation {
  from: number
  to: number
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
  animatingBoosts: BoostAnimation | null
  clearAnimation: () => void
}

const CreditContext = createContext<CreditContextType | null>(null)

export function CreditProvider({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth()
  const [showCheckout, setShowCheckout] = useState(false)
  const [animatingBoosts, setAnimatingBoosts] = useState<BoostAnimation | null>(null)
  const previousBalanceRef = useRef<number>(0)

  const { data, isLoading, mutate } = useSWR(
    isLoggedIn ? '/api/credits' : null,
    fetcher,
    { refreshInterval: 30000 } // Refresh every 30 seconds
  )

  // Track balance for animation
  useEffect(() => {
    if (data?.balance !== undefined && !animatingBoosts) {
      previousBalanceRef.current = data.balance
    }
  }, [data?.balance, animatingBoosts])

  // Check URL params for success/cancel
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('credits') === 'success') {
      // Store previous balance before refresh
      const prevBalance = previousBalanceRef.current

      // Refresh credits after successful purchase
      mutate().then((newData) => {
        if (newData && newData.balance > prevBalance) {
          setAnimatingBoosts({ from: prevBalance, to: newData.balance })
        }
      })

      // Clean up URL
      const url = new URL(window.location.href)
      url.searchParams.delete('credits')
      window.history.replaceState({}, '', url.toString())
    }
  }, [mutate])

  const openCheckout = useCallback(() => setShowCheckout(true), [])
  const closeCheckout = useCallback(() => setShowCheckout(false), [])
  const refreshCredits = useCallback(() => mutate(), [mutate])
  const clearAnimation = useCallback(() => setAnimatingBoosts(null), [])

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
    animatingBoosts,
    clearAnimation,
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
