'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useUser, CurrentUser } from '@/hooks/useUser'

interface AuthContextType {
  user: CurrentUser | null
  isLoading: boolean
  isLoggedIn: boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
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
