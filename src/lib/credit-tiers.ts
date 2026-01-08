// Credit tier definitions - shared between client and server

export interface CreditTier {
  id: 1 | 2 | 3
  credits: number
  priceCents: number
  priceDisplay: string
  discount: number // percentage
  perCreditCents: number
}

export const CREDIT_TIERS: CreditTier[] = [
  { id: 1, credits: 1, priceCents: 100, priceDisplay: '$1', discount: 0, perCreditCents: 100 },
  { id: 2, credits: 5, priceCents: 400, priceDisplay: '$4', discount: 20, perCreditCents: 80 },
  { id: 3, credits: 10, priceCents: 700, priceDisplay: '$7', discount: 30, perCreditCents: 70 },
]

export function getCreditTier(tierId: 1 | 2 | 3): CreditTier | undefined {
  return CREDIT_TIERS.find(t => t.id === tierId)
}
