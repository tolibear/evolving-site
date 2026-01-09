'use client'

import dynamic from 'next/dynamic'

export const SidebarDrawer = dynamic(
  () => import('./sidebar/SidebarDrawer').then(mod => ({ default: mod.SidebarDrawer })),
  { ssr: false }
)

export const ChatWindow = dynamic(
  () => import('./chat/ChatWindow').then(mod => ({ default: mod.ChatWindow })),
  { ssr: false }
)
