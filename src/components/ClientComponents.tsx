'use client'

import dynamic from 'next/dynamic'

// Dynamic imports with ssr:false to prevent hydration mismatches
// These components use browser-only APIs (localStorage, window, etc.)

export const SidebarDrawer = dynamic(
  () => import('./sidebar/SidebarDrawer').then(mod => ({ default: mod.SidebarDrawer })),
  { ssr: false, loading: () => null }
)

export const ChatWindow = dynamic(
  () => import('./chat/ChatWindow').then(mod => ({ default: mod.ChatWindow })),
  { ssr: false, loading: () => null }
)

// Terminal components also use browser-only APIs (EventSource, localStorage)
export const TerminalProvider = dynamic(
  () => import('./terminal/TerminalProvider').then(mod => ({ default: mod.TerminalProvider })),
  { ssr: false, loading: () => null }
)

export const TerminalContainer = dynamic(
  () => import('./terminal/TerminalContainer').then(mod => ({ default: mod.TerminalContainer })),
  { ssr: false, loading: () => null }
)

export const TerminalView = dynamic(
  () => import('./terminal/TerminalView').then(mod => ({ default: mod.TerminalView })),
  { ssr: false, loading: () => null }
)
