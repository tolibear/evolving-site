'use client'

import { useState } from 'react'

export function useCollapsibleList<T>(items: T[], initialCount = 5) {
  const [showAll, setShowAll] = useState(false)
  const displayedItems = showAll ? items : items.slice(0, initialCount)
  const hasMore = items.length > initialCount
  const remainingCount = items.length - initialCount
  const toggle = () => setShowAll(!showAll)

  return { displayedItems, hasMore, remainingCount, showAll, toggle }
}
