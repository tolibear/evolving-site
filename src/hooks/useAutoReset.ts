'use client'

import { useState, useEffect, useCallback } from 'react'

/**
 * Hook that automatically resets state to a default value after a delay.
 * Useful for temporary UI states like animations, notifications, etc.
 *
 * @param initialValue - The initial/default value
 * @param delayMs - Delay in milliseconds before resetting
 * @returns [currentValue, setValue, resetNow] - Current state, setter, and manual reset function
 */
export function useAutoReset<T>(
  initialValue: T,
  delayMs: number
): [T, (value: T) => void, () => void] {
  const [value, setValue] = useState<T>(initialValue)

  useEffect(() => {
    if (value !== initialValue) {
      const timer = setTimeout(() => setValue(initialValue), delayMs)
      return () => clearTimeout(timer)
    }
  }, [value, initialValue, delayMs])

  const resetNow = useCallback(() => setValue(initialValue), [initialValue])

  return [value, setValue, resetNow]
}

/**
 * Simplified version that returns a boolean flag with auto-reset
 *
 * @param delayMs - Delay in milliseconds before resetting to false
 * @returns [isActive, trigger] - Current state and function to trigger it
 */
export function useAutoResetFlag(delayMs: number): [boolean, () => void] {
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => setIsActive(false), delayMs)
      return () => clearTimeout(timer)
    }
  }, [isActive, delayMs])

  const trigger = useCallback(() => setIsActive(true), [])

  return [isActive, trigger]
}
