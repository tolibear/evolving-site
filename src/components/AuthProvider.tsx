'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useUser, CurrentUser } from '@/hooks/useUser'

interface AuthContextType {
  user: CurrentUser | null
  isLoading: boolean
  isLoggedIn: boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // During SSR and initial hydration, provide loading state
  // This prevents SWR hooks from running before React is ready
  if (!mounted) {
    return (
      <AuthContext.Provider value={{
        user: null,
        isLoading: true,
        isLoggedIn: false,
        logout: async () => {}
      }}>
        {children}
      </AuthContext.Provider>
    )
  }

  return <AuthProviderInner>{children}</AuthProviderInner>
}

// Inner component that uses hooks after mount
function AuthProviderInner({ children }: { children: ReactNode }) {
  const { user, isLoading, isLoggedIn, logout } = useUser()

  return (
    <AuthContext.Provider value={{ user, isLoading, isLoggedIn, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
