import type { SWRConfiguration } from 'swr'

/**
 * Standardized SWR configurations for consistent data fetching behavior
 */

// Real-time data that needs frequent updates (e.g., suggestions list, active users)
export const swrRealtime: SWRConfiguration = {
  refreshInterval: 5000,
  revalidateOnFocus: true,
}

// Standard data with moderate refresh (e.g., changelog, denied list)
export const swrStandard: SWRConfiguration = {
  refreshInterval: 30000,
  revalidateOnFocus: false,
  dedupingInterval: 5000,
}

// Status/polling data with adaptive refresh based on state
export const swrStatus = (isActive: boolean): SWRConfiguration => ({
  refreshInterval: isActive ? 2000 : 10000,
  revalidateOnFocus: true,
})

// Static-ish data that rarely changes (e.g., user profile)
export const swrStatic: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 60000,
}
