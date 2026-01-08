// Boost pricing - quantity-based with tier discounts
// Pricing: 1-4 = $1/each, 5-9 = $0.80/each, 10+ = $0.70/each

export interface BoostPricing {
  quantity: number
  totalCents: number
  perUnitCents: number
  savingsCents: number
  priceDisplay: string
  savingsDisplay: string | null
}

// Price tiers
const TIER_1_MAX = 4
const TIER_2_MAX = 9
const TIER_1_CENTS = 100 // $1.00
const TIER_2_CENTS = 80  // $0.80
const TIER_3_CENTS = 70  // $0.70

export const MIN_QUANTITY = 1
export const MAX_QUANTITY = 20

/**
 * Calculate boost pricing for a given quantity
 * Savings only shown after crossing tier thresholds (5+, 10+)
 */
export function getBoostPricing(quantity: number): BoostPricing {
  // Clamp quantity
  const qty = Math.max(MIN_QUANTITY, Math.min(MAX_QUANTITY, quantity))

  // Determine per-unit price based on quantity
  let perUnitCents: number
  if (qty <= TIER_1_MAX) {
    perUnitCents = TIER_1_CENTS
  } else if (qty <= TIER_2_MAX) {
    perUnitCents = TIER_2_CENTS
  } else {
    perUnitCents = TIER_3_CENTS
  }

  const totalCents = qty * perUnitCents
  const fullPriceCents = qty * TIER_1_CENTS
  const savingsCents = fullPriceCents - totalCents

  // Format price display
  const priceDisplay = formatPrice(totalCents)

  // Only show savings if user has crossed a tier threshold
  const savingsDisplay = savingsCents > 0 ? formatPrice(savingsCents) : null

  return {
    quantity: qty,
    totalCents,
    perUnitCents,
    savingsCents,
    priceDisplay,
    savingsDisplay,
  }
}

/**
 * Format cents as price string
 */
function formatPrice(cents: number): string {
  const dollars = cents / 100
  return dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`
}

/**
 * Get tier info for display purposes
 */
export function getTierInfo(quantity: number): { tier: number; nextTierAt: number | null; nextTierSavings: string | null } {
  if (quantity <= TIER_1_MAX) {
    const savingsAtTier2 = (TIER_1_CENTS - TIER_2_CENTS) * 5
    return {
      tier: 1,
      nextTierAt: 5,
      nextTierSavings: formatPrice(savingsAtTier2)
    }
  } else if (quantity <= TIER_2_MAX) {
    const savingsAtTier3 = (TIER_1_CENTS - TIER_3_CENTS) * 10
    return {
      tier: 2,
      nextTierAt: 10,
      nextTierSavings: formatPrice(savingsAtTier3)
    }
  } else {
    return { tier: 3, nextTierAt: null, nextTierSavings: null }
  }
}

// For backwards compatibility with existing API
export interface LegacyCreditTier {
  id: 1 | 2 | 3
  credits: number
  priceCents: number
  priceDisplay: string
  discount: number
  perCreditCents: number
}

// Map quantity to legacy tier ID for Stripe
export function getEffectiveTierId(quantity: number): 1 | 2 | 3 {
  if (quantity <= TIER_1_MAX) return 1
  if (quantity <= TIER_2_MAX) return 2
  return 3
}
