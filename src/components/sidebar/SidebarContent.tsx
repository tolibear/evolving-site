'use client'

// TEST: Adding header components
import UserInfo from './UserInfo'
import ThemeToggle from '@/components/ThemeToggle'
import { CompactStatusBar } from './CompactStatusBar'

export function SidebarContent() {
  return (
    <div className="flex flex-col h-full">
      {/* Header: Compact status + theme toggle + user info */}
      <div className="flex items-center justify-between mb-4">
        <CompactStatusBar />
        <div className="flex items-center gap-1">
          <ThemeToggle size={16} className="p-1.5" />
          <UserInfo compact />
        </div>
      </div>
      <div className="text-sm">Sidebar Test - Header added</div>
    </div>
  )
}
