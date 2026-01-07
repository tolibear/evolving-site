'use client'

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { useTerminalSSE, TerminalLine, SessionInfo, ConnectionStatus } from './useTerminalSSE'

interface TerminalState {
  isFullScreen: boolean
  isVisible: boolean
  selectedSessionId: string | null // null = live mode
}

type TerminalAction =
  | { type: 'TOGGLE_FULLSCREEN' }
  | { type: 'SET_FULLSCREEN'; payload: boolean }
  | { type: 'TOGGLE_VISIBILITY' }
  | { type: 'SET_VISIBILITY'; payload: boolean }
  | { type: 'SELECT_SESSION'; payload: string | null }
  | { type: 'RESTORE_PREFS'; payload: Partial<TerminalState> }

const initialState: TerminalState = {
  isFullScreen: false,
  isVisible: true,
  selectedSessionId: null,
}

function terminalReducer(state: TerminalState, action: TerminalAction): TerminalState {
  switch (action.type) {
    case 'TOGGLE_FULLSCREEN':
      return { ...state, isFullScreen: !state.isFullScreen }
    case 'SET_FULLSCREEN':
      return { ...state, isFullScreen: action.payload }
    case 'TOGGLE_VISIBILITY':
      return { ...state, isVisible: !state.isVisible }
    case 'SET_VISIBILITY':
      return { ...state, isVisible: action.payload }
    case 'SELECT_SESSION':
      return { ...state, selectedSessionId: action.payload }
    case 'RESTORE_PREFS':
      return { ...state, ...action.payload }
    default:
      return state
  }
}

interface TerminalContextValue {
  // State
  state: TerminalState
  dispatch: React.Dispatch<TerminalAction>

  // SSE data
  lines: TerminalLine[]
  session: SessionInfo | null
  connectionStatus: ConnectionStatus

  // Actions
  toggleFullScreen: () => void
  toggleVisibility: () => void
  selectSession: (sessionId: string | null) => void
  reconnect: () => void
}

const TerminalContext = createContext<TerminalContextValue | null>(null)

export function useTerminal() {
  const context = useContext(TerminalContext)
  if (!context) {
    throw new Error('useTerminal must be used within a TerminalProvider')
  }
  return context
}

interface TerminalProviderProps {
  children: React.ReactNode
}

export function TerminalProvider({ children }: TerminalProviderProps) {
  const [state, dispatch] = useReducer(terminalReducer, initialState)

  // SSE connection - live mode when selectedSessionId is null
  const { lines, session, status, reconnect, clearLines } = useTerminalSSE({
    sessionId: state.selectedSessionId,
    replay: state.selectedSessionId !== null,
    enabled: true,
  })

  // Persist preferences to localStorage
  useEffect(() => {
    const prefs = localStorage.getItem('terminal-prefs')
    if (prefs) {
      try {
        const parsed = JSON.parse(prefs)
        dispatch({ type: 'RESTORE_PREFS', payload: parsed })
      } catch {
        // Invalid prefs, ignore
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(
      'terminal-prefs',
      JSON.stringify({
        isFullScreen: state.isFullScreen,
        isVisible: state.isVisible,
      })
    )
  }, [state.isFullScreen, state.isVisible])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      // 'T' to toggle fullscreen
      if (e.key === 't' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        dispatch({ type: 'TOGGLE_FULLSCREEN' })
      }

      // Escape to exit fullscreen
      if (e.key === 'Escape' && state.isFullScreen) {
        dispatch({ type: 'SET_FULLSCREEN', payload: false })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state.isFullScreen])

  // Actions
  const toggleFullScreen = useCallback(() => {
    dispatch({ type: 'TOGGLE_FULLSCREEN' })
  }, [])

  const toggleVisibility = useCallback(() => {
    dispatch({ type: 'TOGGLE_VISIBILITY' })
  }, [])

  const selectSession = useCallback((sessionId: string | null) => {
    clearLines()
    dispatch({ type: 'SELECT_SESSION', payload: sessionId })
  }, [clearLines])

  const value: TerminalContextValue = {
    state,
    dispatch,
    lines,
    session,
    connectionStatus: status,
    toggleFullScreen,
    toggleVisibility,
    selectSession,
    reconnect,
  }

  return (
    <TerminalContext.Provider value={value}>{children}</TerminalContext.Provider>
  )
}
