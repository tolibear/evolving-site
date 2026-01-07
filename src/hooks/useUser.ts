'use client'

import useSWR from 'swr'

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

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useUser(): UseUserReturn {
  const { data, isLoading, mutate } = useSWR<{ user: CurrentUser | null }>(
    '/api/auth/me',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 1 minute
    }
  )

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      mutate({ user: null }, false)
      // Force a page reload to clear any cached state
      window.location.href = '/'
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return {
    user: data?.user || null,
    isLoading,
    isLoggedIn: !!data?.user,
    logout,
    mutate: () => mutate(),
  }
}
