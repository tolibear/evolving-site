'use client'

import { useState, useEffect, useCallback } from 'react'

export interface CurrentUser {
  id: number
  username: string
  name: string | null
  avatar: string | null
}

interface UseUserReturn {
  user: CurrentUser | null
  isLoading: boolean
  isLoggedIn: boolean
  logout: () => Promise<void>
  mutate: () => void
}

export function useUser(): UseUserReturn {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      setUser(data.user || null)
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setUser(null)
      window.location.href = '/'
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const mutate = useCallback(() => {
    fetchUser()
  }, [fetchUser])

  return {
    user,
    isLoading,
    isLoggedIn: !!user,
    logout,
    mutate,
  }
}
