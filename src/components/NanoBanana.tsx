'use client'

/**
 * SimpleIcon - Generates consistent, unique minimal icons for each suggestion
 * Uses a deterministic hash of the content to create visually distinct icons
 */

interface SimpleIconProps {
  seed: string
  size?: number
  className?: string
}

// Simple hash function to generate consistent numbers from a string
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

// Muted, simple color palette
const COLORS = [
  '#6b7280', // Gray
  '#3b82f6', // Blue
  '#10b981', // Green
  '#8b5cf6', // Purple
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#ec4899', // Pink
]

export default function NanoBanana({ seed, size = 24, className = '' }: SimpleIconProps) {
  const hash = hashString(seed)

  // Generate deterministic properties from hash
  const colorIndex = hash % COLORS.length
  const patternType = (hash >> 4) % 6 // 6 simple patterns
  const color = COLORS[colorIndex]

  const viewBox = 24
  const center = viewBox / 2
  const strokeWidth = 2

  const renderPattern = () => {
    switch (patternType) {
      case 0: // Circle
        return (
          <circle
            cx={center}
            cy={center}
            r={8}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
          />
        )
      case 1: // Square
        return (
          <rect
            x={4}
            y={4}
            width={16}
            height={16}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            rx={2}
          />
        )
      case 2: // Diamond
        return (
          <polygon
            points="12,3 21,12 12,21 3,12"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
          />
        )
      case 3: // Triangle
        return (
          <polygon
            points="12,4 20,20 4,20"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        )
      case 4: // Hexagon
        return (
          <polygon
            points="12,3 20,7 20,17 12,21 4,17 4,7"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
          />
        )
      case 5: // Plus/Cross
        return (
          <g stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
            <line x1={center} y1={5} x2={center} y2={19} />
            <line x1={5} y1={center} x2={19} y2={center} />
          </g>
        )
      default:
        return null
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${viewBox} ${viewBox}`}
      className={className}
      aria-hidden="true"
    >
      {renderPattern()}
    </svg>
  )
}
