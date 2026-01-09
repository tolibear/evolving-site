'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/components/AuthProvider'
import useSWR from 'swr'

interface ChatMessage {
  id: number
  user_id: number
  content: string
  created_at: string
  username?: string
  avatar?: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function ChatWindow() {
  const { user, isLoggedIn, isLoading: authLoading } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isSending, setSending] = useState(false)
  const [mounted, setMounted] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch chat messages
  const { data, mutate } = useSWR<{ messages: ChatMessage[] }>(
    isOpen && !isMinimized ? '/api/chat' : null,
    fetcher,
    {
      refreshInterval: 3000, // Poll every 3 seconds when open
      revalidateOnFocus: true,
    }
  )

  const messages = data?.messages || []

  useEffect(() => {
    setMounted(true)
    // Check localStorage for saved state
    const savedState = localStorage.getItem('chat-window-open')
    if (savedState !== null) {
      // Use saved preference if it exists
      setIsOpen(savedState === 'true')
    } else {
      // Default open on desktop (screen width >= 768px)
      const isDesktop = window.innerWidth >= 768
      setIsOpen(isDesktop)
    }
  }, [])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && !isMinimized) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isMinimized])

  // Save state to localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('chat-window-open', isOpen.toString())
    }
  }, [isOpen, mounted])

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isSending || !isLoggedIn) return

    const content = inputValue.trim()
    setInputValue('')
    setSending(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send message')
      }

      // Refresh messages
      mutate()
    } catch {
      // Restore input on error
      setInputValue(content)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }, [inputValue, isSending, isLoggedIn, mutate])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const toggleOpen = () => {
    if (isMinimized) {
      setIsMinimized(false)
    } else {
      setIsOpen(!isOpen)
    }
  }

  const handleMinimize = () => {
    setIsMinimized(true)
  }

  const handleClose = () => {
    setIsOpen(false)
    setIsMinimized(false)
  }

  if (!mounted) return null

  // Taskbar button (always visible)
  const taskbarButton = (
    <button
      onClick={toggleOpen}
      className={`
        win96-taskbar-btn
        ${isOpen && !isMinimized ? 'win96-taskbar-btn-active' : ''}
      `}
      title="Chat"
    >
      <span className="win96-icon">💬</span>
      <span className="hidden sm:inline ml-1">Chat</span>
    </button>
  )

  if (!isOpen) {
    return (
      <div className="fixed bottom-0 left-0 z-50 p-1">
        <div className="win96-taskbar">
          {taskbarButton}
        </div>
      </div>
    )
  }

  // Minimized state - just show taskbar
  if (isMinimized) {
    return (
      <div className="fixed bottom-0 left-0 z-50 p-1">
        <div className="win96-taskbar">
          {taskbarButton}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Taskbar */}
      <div className="fixed bottom-0 left-0 z-50 p-1">
        <div className="win96-taskbar">
          {taskbarButton}
        </div>
      </div>

      {/* Chat Window */}
      <div className="fixed bottom-10 left-2 z-40 w-80 sm:w-96 win96-window">
        {/* Title Bar */}
        <div className="win96-titlebar">
          <div className="flex items-center gap-1.5">
            <span className="win96-icon text-sm">💬</span>
            <span className="font-bold text-sm">Chat.exe</span>
          </div>
          <div className="flex gap-0.5">
            <button
              onClick={handleMinimize}
              className="win96-btn win96-btn-titlebar"
              title="Minimize"
            >
              _
            </button>
            <button
              onClick={handleClose}
              className="win96-btn win96-btn-titlebar win96-btn-close"
              title="Close"
            >
              X
            </button>
          </div>
        </div>

        {/* Menu Bar */}
        <div className="win96-menubar">
          <span className="win96-menu-item">File</span>
          <span className="win96-menu-item">Edit</span>
          <span className="win96-menu-item">Help</span>
        </div>

        {/* Messages Area */}
        <div className="win96-content h-64 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 dark:text-neutral-400 text-sm">
              No messages yet. Be the first to say hi!
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`win96-message ${msg.user_id === user?.id ? 'win96-message-own' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    {msg.avatar ? (
                      <img
                        src={msg.avatar}
                        alt={msg.username || 'User'}
                        className="w-6 h-6 rounded-sm border border-neutral-400 dark:border-neutral-500"
                      />
                    ) : (
                      <div className="w-6 h-6 bg-neutral-300 dark:bg-neutral-600 rounded-sm border border-neutral-400 dark:border-neutral-500 flex items-center justify-center text-xs">
                        ?
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-xs text-blue-700 dark:text-blue-400">
                          {msg.username || 'Anonymous'}
                        </span>
                        <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-sm break-words">{msg.content}</p>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="win96-statusbar">
          {authLoading ? (
            <div className="text-xs text-neutral-500 dark:text-neutral-400 text-center py-1">Loading...</div>
          ) : isLoggedIn ? (
            <div className="flex gap-1">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                maxLength={500}
                disabled={isSending}
                className="win96-input flex-1"
              />
              <button
                onClick={handleSendMessage}
                disabled={isSending || !inputValue.trim()}
                className="win96-btn win96-btn-send"
              >
                Send
              </button>
            </div>
          ) : (
            <div className="text-xs text-center py-1">
              <a href="/api/auth/login" className="text-blue-700 dark:text-blue-400 underline hover:text-blue-600 dark:hover:text-blue-300">
                Sign in with Twitter
              </a>
              {' '}to chat
            </div>
          )}
        </div>
      </div>
    </>
  )
}
