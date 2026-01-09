'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from './AuthProvider'

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
  const [data, setData] = useState<{ balance: number; totalPurchased: number; hasEverPurchased: boolean; tiers: CreditTier[] } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const previousBalanceRef = useRef<number>(0)

  const fetchCredits = useCallback(async () => {
    if (!isLoggedIn) {
      setData(null)
      setIsLoading(false)
      return null
    }
    try {
      const res = await fetch('/api/credits')
      const result = await res.json()
      setData(result)
      setIsLoading(false)
      return result
    } catch {
      setIsLoading(false)
      return null
    }
  }, [isLoggedIn])

  useEffect(() => {
    fetchCredits()
    // Refresh every 30 seconds
    const interval = setInterval(fetchCredits, 30000)
    return () => clearInterval(interval)
  }, [fetchCredits])

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
      const prevBalance = previousBalanceRef.current

      fetchCredits().then((newData) => {
        if (newData && newData.balance > prevBalance) {
          setAnimatingBoosts({ from: prevBalance, to: newData.balance })
        }
      })

      const url = new URL(window.location.href)
      url.searchParams.delete('credits')
      window.history.replaceState({}, '', url.toString())
    }
  }, [fetchCredits])

  const openCheckout = useCallback(() => setShowCheckout(true), [])
  const closeCheckout = useCallback(() => setShowCheckout(false), [])
  const refreshCredits = useCallback(() => { fetchCredits() }, [fetchCredits])
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
